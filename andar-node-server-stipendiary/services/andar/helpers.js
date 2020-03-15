const zlib = require('zlib');
const moment = require('moment')
const tz = require('moment-timezone');

const { VALID_TIME_RANGE, ALARM_TOLERANCE_TIME, EMPTY_BED_DURATION,  AlarmTypes : {  ABOVE, NOT_TURN_IN } } = require('./model');

function compress(signal) {
  return zlib.deflateSync(signal, { level: 9 });
}

function decompress(signal) {
  return zlib.inflateSync(signal).toString();
}

function validTimeRange(dt) {
  return data => dt - data.dt < VALID_TIME_RANGE;
}

function isSleeping(status) {
  return status === 4;
}

function isLeaving(status) {
  return status === 0;
}

function generateAlarms(
  { dt, ApneaDuration, bpm, rpm, sn },
  {
    heartRate: { min: hrMin, max: hrMax, period: hrPeriod },
    respirationRate: { max: rrMax, period: rrPeriod },
    apnea: { period: apneaPeriod },
  },
  records,
  {
    heartRate: { dt : hrPervDt },
    respirationRate: { dt : rrPervDt },
    apnea: { dt : apneaPervDt },
  },
) {
  let ret = {};
  const hrPeriodRecords = records.filter(
    record => record.dt >= dt - hrPeriod - ALARM_TOLERANCE_TIME,
  );
 
  
  if (dt - hrPeriodRecords[0].dt >= hrPeriod) {
    const validHrPeriodRecords = hrPeriodRecords.filter(
      ({ status, bpm }) =>
        isSleeping(status) && (bpm > hrMax || (bpm > 0 && bpm < hrMin)),
    );

    if (hrPeriodRecords.length === validHrPeriodRecords.length) {
      const st = hrPervDt ? hrPervDt :  dt + 0.1
      const isAbove = bpm > hrMax;
      ret = {
        ...ret,
        heartRate: {
          dt: dt + 0.1,
          st,
          attr: 0,
          type: isAbove ? 0 : 1,
          value: isAbove ? hrMax : hrMin,
          originalValue: bpm,
          period: hrPeriod,
        },
      };
    }
  }

  const rrPeriodRecords = records.filter(
    record => record.dt >= dt - rrPeriod - ALARM_TOLERANCE_TIME,
  );
  if (dt - rrPeriodRecords[0].dt >= rrPeriod) {
    const validRrPeriodRecords = rrPeriodRecords.filter(
      ({ status, rpm }) => isSleeping(status) && rpm > rrMax,
    );
    if (rrPeriodRecords.length === validRrPeriodRecords.length) {
      const st = rrPervDt ? rrPervDt :  dt + 0.2
      ret = {
        ...ret,
        respirationRate: {
          dt: dt + 0.2,
          st,
          attr: 1,
          type: 0,
          value: rrMax,
          originalValue: rpm,
          period: rrPeriod,
        },
      };
    }
  }

  if (ApneaDuration > apneaPeriod) {
    const st = apneaPervDt ? apneaPervDt :  dt
    ret = {
      ...ret,
      apnea: {
        dt,
        st,
        attr: 1,
        type: 4,
        value: apneaPeriod,
        originalValue: ApneaDuration,
        period: apneaPeriod,
      },
    };
  }

  return ret;
}

// st in 0 ~ 23, et in 0~ 24 
function shouldCheckLeavingAlarm(dt, st, et) {
  const currDate = moment(moment(dt * 1000).format("YYYY-MM-DD HH:00:00")).tz('Asia/Taipei');
  const currHour = currDate.get('hour');
  if (et > st && currHour >= st && currHour < et) {
    return true;
  }

  if (st > et) {
    return currHour >= st || currHour < et
  }
  return false;
}


// description : 在alarm真正起始時間(-period)前EMPTY_BED_DURATION秒的 status都不為sleep的話, 則alarm為未就寢
function generateLeavingAlarm(dt, leavingDuration, period, records, prevPeriod, st) {
  if (leavingDuration > period) {
    const verifyRecord = records.filter(({ time }) => (time <= dt - period) && time >= (dt - period - EMPTY_BED_DURATION))
    const leavingRecord = verifyRecord.filter(({ status }) => !isLeaving(status))
    // 紀錄web setting操作, 不要在一個alarm區間內改超過100次 or + 0.001...
    return {
      dt,
      st: period !== prevPeriod? st + 0.01 : st,
      attr: 2,
      type : verifyRecord.length == leavingRecord.length ? NOT_TURN_IN: ABOVE,
      period,
      value: period,
      originalValue: leavingDuration,
    };
  }
  return {};
}

function generateAlarmKey(sn, alarmType) {
  return `${sn}@${alarmType}`;
}

module.exports = {
  compress,
  decompress,
  validTimeRange,
  isSleeping,
  generateAlarms,
  isLeaving,
  generateLeavingAlarm,
  shouldCheckLeavingAlarm,
  generateAlarmKey,
};
