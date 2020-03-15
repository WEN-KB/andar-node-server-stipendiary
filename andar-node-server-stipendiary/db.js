const { DynamoDB } = require('aws-sdk');

const {
  RAW_DATA_TABLE,
  RECORD_TABLE,
  SETTINGS_TABLE,
  SETTINGS_TABLE_PARENT_GSI,
  ALARM_TABLE,
  DEVICE_LOG_TABLE,
  BABY_TABLE,
} = require('./configs/aws-config');

class DbService {
  constructor() {
    this.dynamodb = new DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-east-2',
      convertEmptyValues: true,
    });
  }

  async getRaws(sn, dt, period) {
    try {
      const { Items } = await this.dynamodb
        .query({
          TableName: RAW_DATA_TABLE,
          KeyConditionExpression: 'sn = :sn and dt >= :st',
          ExpressionAttributeValues: {
            ':sn': sn,
            ':st': dt - period,
          },
        })
        .promise();

      return Items;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async getRecords(bId, dt, period) {
    try {
      const { Items } = await this.dynamodb
        .query({
          TableName: RECORD_TABLE,
          KeyConditionExpression: 'b_id = :b_id and dt >= :st',
          ExpressionAttributeValues: {
            ':b_id': bId,
            ':st': dt - period,
          },
        })
        .promise();

      return Items;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async getSettings(userId) {
    try {
      const {
        Item: { id, ...rest },
      } = await this.dynamodb
        .get({
          TableName: SETTINGS_TABLE,
          Key: { id: userId },
        })
        .promise();

      return rest;
    } catch (err) {
      console.error(err);
      return {};
    }
  }

  async getSubSettings(userId) {
    try {
      const { Items } = await this.dynamodb
        .query({
          TableName: SETTINGS_TABLE,
          IndexName: SETTINGS_TABLE_PARENT_GSI,
          KeyConditionExpression: 'parent_id = :parent_id',
          ExpressionAttributeValues: {
            ':parent_id': userId,
          },
        })
        .promise();

      return Items;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  updateBattery(id, date) {
    return this.dynamodb
      .update({
        TableName: BABY_TABLE,
        Key: { id },
        ExpressionAttributeValues: {
          ':battery': date,
        },
        UpdateExpression: 'SET battery = :battery',
      })
      .promise();
  }

  putRawData(raw) {
    return this.dynamodb
      .put({ TableName: RAW_DATA_TABLE, Item: raw })
      .promise();
  }

  putRecord(record) {
    return this.dynamodb
      .put({ TableName: RECORD_TABLE, Item: record })
      .promise();
  }

  putAlarms({b_id, dt, type, value, process,  ...rest}) {
    let UpdateExpression = []
    let ExpressionAttributeValues = {}
    Object.keys(rest).forEach(key => {
      UpdateExpression.push(`${key} = :${key}`);
      ExpressionAttributeValues[`:${key}`] = rest[key];
    });
    UpdateExpression.push('#type =:type')
    UpdateExpression.push('#value =:value')
    ExpressionAttributeValues[`:type`] = type
    ExpressionAttributeValues[`:value`] = value
    let ExpressionAttributeNames = {}
    ExpressionAttributeNames[`#type`] = "type"
    ExpressionAttributeNames[`#value`] = "value"
    const params = {
      ExpressionAttributeValues,
      TableName: ALARM_TABLE,
      Key: {
        dt,
        b_id,
      },
      UpdateExpression: `SET ${UpdateExpression.join(', ')}`,
      ExpressionAttributeNames
    };
    return this.dynamodb.update(params).promise();
  }

  putDeviceLog(log) {
    return this.dynamodb
      .put({ TableName: DEVICE_LOG_TABLE, Item: log })
      .promise();
  }
}

module.exports = new DbService();
