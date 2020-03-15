const FLASK_API_URL = `http://${process.env.HOST || '0.0.0.0'}:8000/api/andar`;
const PERIOD = 100;
const MAX_RAWS = 36;

const VALID_TIME_RANGE = 300;
const DEFAULT_SETTINGS = {
  heartRate: {
    min: 100,
    max: 180,
    period: 30,
  },
  respirationRate: {
    max: 65,
    period: 30,
  },
  apnea: {
    period: 15,
  },
};

const DEFAULT_LATEST_VITAL = {
  bpm: 0,
  rpm: 0,
  IScore: -1,
  QScore: -1,
  CurrApneaTime: 0,
  StoreApneaTime: 0,
  Pre_status_ary :  [[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]],
  Pre_state :  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  vital_ary:[0.046074,0.046074,0.046074,0.046074,0.046074,0.046074],
  novital_ary:[0.013514,0.013514,0.013514,0.013514,0.013514,0.013514], 
  motion_ary:[0.195721,0.195721,0.195721,0.195721,0.195721,0.195721],
  amp_ph_ary:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]  
};


const AlarmTypes = {
  ABOVE : 0,
  BELOW : 1,
  INCREMENT : 2,
  DECREMENT : 3 ,
  APNEA :4,
  NOT_TURN_IN : 5
}

const ANDAR_DATA_RATE = 2.56;
const SAFE_ALARM_DURATION = 2 * 60 * 1000;
const EMPTY_BED_DURATION  = 30;
const RESET_LEAVING_ALARM_DURATION = 30
const SAFE_LEAVING_ALARM_DURATION = 2 * 60* 1000;
const ALARM_BLACKLIST_DURATION = 2 * 60 * 1000;
const ALARM_TOLERANCE_TIME = 1.5;
const DISCONNECTION_DURATION = 20;
const LEAVING_ALARM_TYPE = 'leaving';
const MAX_PERIOD_OF_LEAVING_DURATION = 150
//default is 36, here is 71
const MAX_RECORDS = 36

module.exports = {
  FLASK_API_URL,
  PERIOD,
  MAX_RAWS,
  MAX_RECORDS,
  VALID_TIME_RANGE,
  DEFAULT_SETTINGS,
  DEFAULT_LATEST_VITAL,
  SAFE_ALARM_DURATION,
  ALARM_BLACKLIST_DURATION,
  ALARM_TOLERANCE_TIME,
  DISCONNECTION_DURATION,
  LEAVING_ALARM_TYPE,
  SAFE_LEAVING_ALARM_DURATION,
  EMPTY_BED_DURATION,
  ANDAR_DATA_RATE,
  AlarmTypes,
  RESET_LEAVING_ALARM_DURATION
};
