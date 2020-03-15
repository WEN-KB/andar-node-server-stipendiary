'use strict';

const uuid = require('uuid');
const axios = require('axios');
const { Subject, timer } = require('rxjs');
const { concatMap, filter } = require('rxjs/operators');
const { isEmpty } = require('ramda');

const DEVICES = require('../../device-list.json');
const deviceService = require('../../device');
const dbService = require('../../db');
const { RECORD_TOPIC_PREFIX } = require('../../configs/aws-config');
const {
  FLASK_API_URL,
  MAX_RAWS,
  MAX_RECORDS,
  DEFAULT_LATEST_VITAL,
  PERIOD,
  ALARM_BLACKLIST_DURATION,
  DEFAULT_SETTINGS,
  DISCONNECTION_DURATION,
  SAFE_ALARM_DURATION,
  LEAVING_ALARM_TYPE,
  SAFE_LEAVING_ALARM_DURATION,
  EMPTY_BED_DURATION,
  ANDAR_DATA_RATE,
  RESET_LEAVING_ALARM_DURATION
} = require('./model');
const {
  validTimeRange,
  isSleeping,
  compress,
  decompress,
  isLeaving,
  generateAlarms,
  generateLeavingAlarm,
  shouldCheckLeavingAlarm,
  generateAlarmKey,
} = require('./helpers');

const PROD = process.env.STAGE === 'prod';

class AndarService {
  constructor() {
    this.raws = new Map();
    this.records = new Map();
    this.settings = new Map();
    this.queues = new Map();
    this.latestVital = new Map();
    this.alarms = new Map();
    this.alarmBlacklist = [];
    DEVICES.forEach(sn => {
      this.queues
        .set(sn, new Subject())
        .get(sn)
        .asObservable()
        .pipe(concatMap(this.handleRawData.bind(this)))
        .subscribe(async promises => {
          try {
            await Promise.all(promises);
          } catch (err) {
            console.error(err);
          }
        });
    });

    deviceService
      .onRawMessage()
      .pipe(filter(data => !this.hasDuplicateRawData(data)))
      .subscribe(data => this.queues.get(data.sn).next(data));
  }

  async handleRawData({
    sn,
    b_id,
    user_id,
    dt,
    log,
    hum = 0,
    tmp = 0,
    signal = '0/100',
    quality = '0/100',
    noise = '0/100',
    vital_raw_data = '',
    ssid = '',
    ...rest
  }) {
    const dbPromises = [];
    if (this.hasDuplicateRawData({sn, dt})) {
      return dbPromises;
    }
    const exp = dt + 86400 * 14;
    const payload = vital_raw_data.slice(20, 4116);
    const nextBid = PROD ? b_id : `_${b_id}`;
    let raw = {
      ...rest,
      sn,
      b_id,
      user_id,
      dt,
      exp,
      log,
      ssid,
      hum,
      tmp,
      signal,
      quality,
      noise,
      status: 0,
      hr: 0,
      rr: 0,
    };

    if (log && PROD) {
      dbPromises.push(dbService.putDeviceLog({ ...log, sn, up_dt: dt }));
      if (log.content.includes('device reboot')) {
        const date = new Date((dt + 86400) * 1000);
        const hours = date.getUTCHours();
        if ((hours >= 22 && hours <= 23) || hours === 0) {
          dbPromises.push(dbService.updateBattery(sn, date.toISOString()));
        }
      }
    }

    if (payload.length === 4096) {
      const buffer = Buffer.from(payload, 'hex');
      const arrayBuffer = new Uint8Array(buffer).buffer;
      const view = new DataView(arrayBuffer);
      const byteLen = view.byteLength;
      const signals = [[], [], [], []];
      for (let i = 0; i < byteLen; i += 4) {
        signals[(i / 4) % 4].push(view.getFloat32(i, true).toFixed(6));
      }

      let [I, Q, I2, Q2] = signals;
      raw = {
        ...raw,
        I: String(I),
        Q: String(Q),
        I2: String(I2),
        Q2: String(Q2),
      };

      [I, Q, I2, Q2] = signals.map(s => compress(String(s)));
      if (PROD) {
        dbPromises.push(dbService.putRawData({ ...raw, I, Q, I2, Q2 }));
      }
    } else {
      const dummySignal = String(Array.from({ length: 128 }, () => '0'));
      const compressedDummySignal = compress(dummySignal);
      raw = {
        ...raw,
        I: dummySignal,
        Q: dummySignal,
        I2: dummySignal,
        Q2: dummySignal,
        status: -1,
      };

      if (PROD) {
        dbPromises.push(
          dbService.putRawData({
            ...raw,
            I: compressedDummySignal,
            Q: compressedDummySignal,
            I2: compressedDummySignal,
            Q2: compressedDummySignal,
          }),
        );
      }

      return dbPromises;
    }

    if (!this.raws.has(sn)) {
      const fetchPromises = [
        dbService.getRaws(sn, dt, PERIOD),
        dbService.getRecords(nextBid, dt, PERIOD),
      ];

      if (!this.settings.has(user_id)) {
        fetchPromises.push(
          dbService.getSettings(user_id),
          dbService.getSubSettings(user_id),
        );
      }

      const [raws, records, settings, subSettings] = await Promise.all(
        fetchPromises,
      );

      this.updateRaws(
        sn,
        raws.map(({ I, Q, I2, Q2, ...rest }) => ({
          ...rest,
          I: decompress(I),
          Q: decompress(Q),
          I2: decompress(I2),
          Q2: decompress(Q2),
        })),
      );

      this.updateRecords(nextBid, records);
      if (settings) {
        this.updateSettings(user_id, isEmpty(settings) ? null : settings);
        subSettings.forEach(({ id, parent_id, ...rest }) =>
          this.updateSettings(id, rest),
        );
      }
    }

    const raws = this.raws
      .get(sn)
      .filter(validTimeRange(dt))
      .concat(raw);

    const records = this.records.get(nextBid).filter(validTimeRange(dt));
    const latestVital = this.latestVital.get(sn) || {
      ...DEFAULT_LATEST_VITAL,
      dt,
    };

    const settings = this.settings.get(b_id) || this.settings.get(user_id);
    try {
      const { data } = await axios.post(FLASK_API_URL, {
        raws,
        records,
        latestVital,
      });

      const {
        IScore,
        QScore,
        Alert,
        CurrApneaTime,
        StoreApneaTime,
        Pre_status_ary,
        Pre_state,
        vital_ary,
        novital_ary, 
        motion_ary,
        amp_ph_ary,
        ...restData
      } = data;
      const nextLatestVital = {
        ...latestVital,
        IScore,
        QScore,
        CurrApneaTime,
        StoreApneaTime,
        Pre_status_ary:JSON.parse(Pre_status_ary),
        Pre_state:JSON.parse(Pre_state),
        vital_ary:JSON.parse(vital_ary),
        novital_ary:JSON.parse(novital_ary),
        motion_ary:JSON.parse(motion_ary),
        amp_ph_ary:JSON.parse(amp_ph_ary)
      };
      
      this.latestVital.set(sn, nextLatestVital);
      const iotData = {
        ...restData,
        sn,
        b_id,
        hum,
        tmp,
        dt,
        signal,
        quality,
        noise,
        exp,
        ssid,
        alert:Alert
      };
      const { bpm, rpm, status } = iotData;
      let nextIotData = { ...iotData, leavingDuration: 0 };
      let alarms = {};
      if (settings) {
        const {
          leaving: { st, et, period },
        } = settings;

        const { leavingDuration = 0, dt: lastDt = 0 } =
          records.slice(-1)[0] || {};

        if (shouldCheckLeavingAlarm(dt, st, et) && shouldCheckLeavingAlarm(lastDt, st, et)) {
          let shouldGenerateLeavingAlarm = false;
          // spec the start time of alarm should start from st
          const diffDt =  dt - lastDt;
          const nextLeavingDuration = diffDt > DISCONNECTION_DURATION ? 0 : leavingDuration + diffDt;
          const alarmKey = generateAlarmKey(sn, LEAVING_ALARM_TYPE);
          const { dt: prevAlarmDt = 0, period: prevPeriod = period, prevSt = dt } = this.alarms.get(alarmKey) || {};

          if (isLeaving(status)) {
            shouldGenerateLeavingAlarm = true;
          } else {
            if (dt - prevAlarmDt < SAFE_LEAVING_ALARM_DURATION) {
              // if pre records, have continuous 30 sec data isn't leaving, then shouldn't  GenerateLeavingAlarm
              const checkPrevRecords = records.filter(({preDt}) => (dt - preDt >= RESET_LEAVING_ALARM_DURATION));
              const checkContinuousSleepRecords = checkPrevRecords.filter(({status}) => !isLeaving(status));
              shouldGenerateLeavingAlarm  = checkPrevRecords.length != 0 && (checkPrevRecords.length != checkContinuousSleepRecords.length)
            }
          }

          if (shouldGenerateLeavingAlarm) {
            nextIotData = {
              ...iotData,
              leavingDuration: nextLeavingDuration,
            };
            
            alarms = generateLeavingAlarm(dt, nextLeavingDuration, period, records.slice(-Math.floor(( period + EMPTY_BED_DURATION)/ANDAR_DATA_RATE)), prevPeriod, prevSt);
          }

          if (!isEmpty(alarms)) {
            const alarm = this.handleContinuousAlarm(
              LEAVING_ALARM_TYPE,
              alarms,
              nextIotData,
            );

            const firstPush = alarm.et === alarm.dt
            const process =  firstPush? { processTime: 0, processType: 0 }: undefined

            dbPromises.push(
              dbService.putAlarms({
                ...alarm,
                exp,
                b_id:nextBid,
                user_id,
                process
              }),
            );
          }
        }
      }

      this.updateRaws(sn, raws);
      this.updateRecords(nextBid, records.concat(nextIotData));
      // spec change, if have tje leaving alarm, then do not process other alarm
      if (isEmpty(alarms)) {
        if (isSleeping(status) && settings && bpm > 0 && rpm > 0) {
          if (bpm >= 50 && bpm <= 100 && rpm >= 10 && rpm <= 40) {
            this.latestVital.set(sn, {
              ...nextLatestVital,
              bpm,
              rpm,
            });
          }

          const prevAlarmDt = ['heartRate', 'respirationRate', 'apnea'].reduce((prev, key)=>{
            const alarmKey = generateAlarmKey(sn, key)
            const { dt = null } = this.alarms.get(alarmKey) || {};
            prev[`${key}`]= {
              dt
            }
            return prev
          }, {})

          alarms = generateAlarms(nextIotData, settings, this.records.get(nextBid), prevAlarmDt);
          if (!isEmpty(alarms)) {
            Object.entries(alarms).forEach(([key, value]) => {
              const alarm = this.handleContinuousAlarm(key, value, nextIotData);
              const firstPush = alarm.et === alarm.dt
              const process =  firstPush? { processTime: 0, processType: 0 }: undefined
              dbPromises.push(
                dbService.putAlarms({
                  ...alarm,
                  exp,
                  b_id:nextBid,
                  user_id,
                  ...process
                }),
              );
            });
          }
        }
      }

      if (isEmpty(alarms)) {
        deviceService.publish(`${RECORD_TOPIC_PREFIX}/${sn}`, {
          records: [nextIotData],
        });
      }

      dbPromises.push(dbService.putRecord({ ...iotData, b_id: nextBid }));
    } catch (error) {
      this.updateRaws(sn, raws);
      this.updateRecords(nextBid, records);
      const { response } = error;
      if (response) {
        console.error({ message: response.data.message });
      } else {
        console.error(error);
      }
    }

    return dbPromises;
  }

  updateRaws(sn, raws) {
    this.raws.set(sn, raws.slice(-MAX_RAWS));
  }

  updateRecords(bId, records) {
    this.records.set(bId, records.slice(-MAX_RECORDS));
  }

  updateSettings(id, settings) {
    const currentSettings = this.settings.get(id) || DEFAULT_SETTINGS;
    const nextSettings = { ...currentSettings, ...settings };
    this.settings.set(id, nextSettings);
    console.error('Update Settings: ', id, nextSettings);
  }

  deleteSettings(id) {
    this.settings.delete(id);
    console.error('Delete Settings: ', id);
  }


  genNewAlarmTimer(alarmType, alarmKey) {
    return timer(
      alarmType === LEAVING_ALARM_TYPE
        ? SAFE_LEAVING_ALARM_DURATION
        : SAFE_ALARM_DURATION,
    ).subscribe(() => {
      this.alarms.delete(alarmKey);
    })
  }

  // dt 修正為 leaving alarm 起始時間, 前端自己使用 originalValue + dt推斷結束時間, to reduce number of alarm through dynamodb put
  // if alarmType == LEAVING_ALARM_TYPE, dt is first alarm time of this alarmId, else is current data time 
  handleContinuousAlarm(alarmType, value, iotData) {
    const { sn, b_id:nextBid, status} = iotData;
    const alarmKey = generateAlarmKey(sn, alarmType);
    let { dt : dataTime, period, st: unused, ...rest } = value

    let { alarmTimer, alarmId = uuid.v4(), dt : st = dataTime } = this.alarms.get(alarmKey) || {};
  
    let alarm = { ...rest, alarmId, period, dt : st };

    if (alarmTimer) {
      if ((alarmType === LEAVING_ALARM_TYPE && isLeaving(status)) || alarmType !== LEAVING_ALARM_TYPE) {
        alarmTimer.unsubscribe();
        alarmTimer = this.genNewAlarmTimer(alarmType, alarmKey)
      } 
    } else {
      alarmTimer = this.genNewAlarmTimer(alarmType, alarmKey)
    }

    deviceService.publish(`${RECORD_TOPIC_PREFIX}/${sn}`, {
      records: [
        {
          ...iotData,
          //alarm: this.alarmBlacklist.includes(nextBid) ? undefined : {...alarm , dt: dataTime, st },
          //修改bug，警訓事件已,圖標扔餵紅色
          alarm:  {...alarm , dt: dataTime, st,backList:this.alarmBlacklist },
        },
      ],
    });

    alarm.et = dataTime
    this.alarms.set(alarmKey, {
      dt : st,
      period,
      alarmId,
      alarmTimer
    });

    return alarm;
  }

  addAlarmBlacklist(bId) {
    this.alarmBlacklist.push(bId);
    timer(ALARM_BLACKLIST_DURATION).subscribe(
      () =>
        (this.alarmBlacklist = this.alarmBlacklist.filter(id => id !== bId)),
    );
  }

  hasDuplicateRawData({ sn, dt }) {
    const raws = this.raws.get(sn);
    return raws && raws.findIndex(d => d.dt === dt) > -1;
  }
}

module.exports = new AndarService();
