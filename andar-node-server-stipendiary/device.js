const uuid = require('uuid');
const awsIot = require('aws-iot-device-sdk');
const { Subject } = require('rxjs');

const { IOT_ENDPOINT, RAW_DATA_TOPIC_PREFIX } = require('./configs/aws-config');
const DEVICES = require('./device-list.json');

class DeviceService {
  constructor() {
    this.device = awsIot.device({
      keyPath: './creds/t-private.pem.key',
      certPath: './creds/t-certificate.pem.crt',
      caPath: './creds/AmazonRootCA1.pem',
      clientId: uuid.v4(),
      host: IOT_ENDPOINT,
    });

    this.device.on('connect', this.onConnect.bind(this));
    this.device.on('message', this.onMessage.bind(this));
    this.rawMessage = new Subject();
  }

  onConnect() {
    DEVICES.forEach(device =>
      this.device.subscribe(`${RAW_DATA_TOPIC_PREFIX}/${device}`),
    );
  }

  onMessage(topic, payload) {
    const data = JSON.parse(payload.toString());
    if (Array.isArray(data)) {
      return data.forEach(d => this.rawMessage.next(d));
    }
  }

  onRawMessage() {
    return this.rawMessage.asObservable();
  }

  publish(topic, payload) {
    this.device.publish(topic, JSON.stringify(payload), { qos: 1 }, err => {
      if (err) {
        console.error(topic, { err });
        const sn = topic.split('/').slice(-1)[0];
        const rawDataTopic = `${RAW_DATA_TOPIC_PREFIX}/${sn}`;
        this.device.unsubscribe(rawDataTopic, () => {
          console.error(`Resubscribe to ${rawDataTopic}`);
          this.device.subscribe(rawDataTopic);
        });
      }
    });
  }
}

module.exports = new DeviceService();
