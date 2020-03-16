module.exports = {
  RAW_DATA_TABLE: 'qt_raw_data',
  RECORD_TABLE: 'qt_record',
  SETTINGS_TABLE: 'qt_settings',
  SETTINGS_TABLE_PARENT_GSI: 'qt_parent_id-index',
  ALARM_TABLE: 'qt_alarm',
  DEVICE_LOG_TABLE: 'qt_device_log',
  BABY_TABLE: 'qt_baby',
  IOT_ENDPOINT: 'a3inbsgq46oz45-ats.iot.us-east-2.amazonaws.com',
  RECORD_TOPIC_PREFIX: process.env.STAGE === 'prod' ? 'data-qt' : 'data-test',
  RAW_DATA_TOPIC_PREFIX: 'deviceData-qt',
};
