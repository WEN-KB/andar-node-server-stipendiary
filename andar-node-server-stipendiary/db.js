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
      return [];S
    }
  }

  // 获取个人设定
  async  getSubSettings(id) {
    try {
      return await this.dynamodb
        .get({
          TableName: SETTINGS_TABLE,
          Key: { id },
        })
        .promise();
    } catch (err) {
      console.error(err);
      return {};
    }
  }

  // 获取全局设定
  async getSettings(userId) {
    try {
      return await this.dynamodb
        .query({
          TableName: SETTINGS_TABLE,
          IndexName: SETTINGS_TABLE_PARENT_GSI,
          KeyConditionExpression: 'parent_id = :parent_id',
          ExpressionAttributeValues: {
            ':parent_id': userId,
          },
        })
        .promise();

    } catch (err) {
      console.error(err);
      return [];
    }
  }

  // 新增设定
  async addSettings(data) {
    return this.dynamodb
    .put({ 
      TableName: SETTINGS_TABLE, 
      Item: data 
    })
    .promise();
  }

  // 修改设定
  async updateSettings(data) {
    const {
      id,
      apnea,
      heartRate,
      respirationRate,
      temperature,
      leaving,
      parent_id,
      fallAlert,
      leaveAlert,
      turnSetting,
    } = data;
    return this.dynamodb
      .update({
        TableName: SETTINGS_TABLE,
        Key: { id },
        ExpressionAttributeValues: {
          // ':id': id,
          ':apnea': apnea,
          ':heartRate': heartRate,
          ':respirationRate': respirationRate,
          ':temperature': temperature,
          ':leaving': leaving,
          ':parent_id': parent_id,
          ':fallAlert': fallAlert,
          ':leaveAlert': leaveAlert,
          ':turnSetting': turnSetting,
        },
        UpdateExpression: `SET apnea=:apnea,heartRate=:heartRate,respirationRate=:respirationRate,temperature=:temperature,leaving=:leaving,parent_id=:parent_id,fallAlert=:fallAlert,leaveAlert=:leaveAlert,turnSetting=:turnSetting`,
        ReturnValues:"UPDATED_NEW",
      })
      .promise();
  }

  // 根据设备id 获取住民
  async getBabiesByDeviceid(deviceid, userId) {
    const params = {
      TableName: BABY_TABLE,
      FilterExpression:'parent_id = :parent_id and deviceid = :deviceid and isDelete = :isDelete',
        // KeyConditionExpression: 'deviceid = :deviceid',
      ExpressionAttributeValues: {
        ':deviceid': deviceid,
        ':isDelete': false,
        ':parent_id': userId
      },
    }
    const Items = await this.scanRecursively(params);
    return Items;
  }

  // 根据床号 获取住民
  async getBabiesByBed(bed, userId) {
    const params = {
      TableName: BABY_TABLE,
      FilterExpression:'parent_id = :parent_id and bed = :bed and isDelete = :isDelete',
      ExpressionAttributeValues: {
        ':bed': bed,
        ':isDelete': false,
        ':parent_id': userId
      },
    }
    const Items = await this.scanRecursively(params);
    return Items;
  }

  // 新增 住民
  async createBaby(data) {
    return this.dynamodb
      .put({ 
        TableName: BABY_TABLE, 
        Item: data 
      })
      .promise();
  }

  // 修改住民
  async updateBaby(id, data) {
    const {
      birthday,
      checkInDate,
      checkOutDate,
      bed,
      height,
      mom,
      notice,        
      sex,
      weight,
      battery,
      isPaused,
      hasAlarmHandled,
      cautious,
      deviceid,
      isFixed,
      isDelete,
      diseases,
      identityNumber
    } = data
    const ExpressionAttributeValues = {};
    let UpdateExpression = ``;
    if (isPaused == true || isPaused == false)  {
      ExpressionAttributeValues[':isPaused'] = isPaused;
      UpdateExpression = `,isPaused = :isPaused`
    }

    return this.dynamodb
      .update({
        TableName: BABY_TABLE,
        Key: { id },
        ExpressionAttributeValues: {
          ...ExpressionAttributeValues,
          ':identityNumber': identityNumber,
          ':birthday': birthday,
          ':checkInDate': checkInDate,
          ':checkOutDate': checkOutDate,
          ':bed': bed,
          ':height': height,
          ':mom': mom,
          ':notice': notice,
          ':sex': sex,
          ':weight': weight,
          ':deviceid': deviceid,
          ':diseases': diseases,
        },
        UpdateExpression: `SET identityNumber=:identityNumber, birthday = :birthday,checkInDate = :checkInDate,checkOutDate = :checkOutDate,bed = :bed,height = :height,mom = :mom,notice = :notice,sex = :sex,weight = :weight,deviceid = :deviceid,diseases=:diseases`+UpdateExpression,
        ReturnValues:"UPDATED_NEW",
      })
      .promise();
  }

  async getBabies() {
    const params = {
        TableName: BABY_TABLE,
        FilterExpression:'discharged = :discharged or attribute_not_exists(discharged)',
        // KeyConditionExpression: 'deviceid = :deviceid',
        ExpressionAttributeValues: {
          ':isDelete': false,
          ':discharged': false
        },
        // ProjectionExpression: 'patches, id, parent_id, isPaused,  device_sn, discharged',
        // FilterExpression:'discharged = :discharged or attribute_not_exists(discharged)',
        // ExpressionAttributeValues: {
        //   ':discharged': false,
        // },
    }
    try {
        const Items = await this.scanRecursively(params);
        return Items;
      } catch (err) {
        console.error(err);
        return [];
      }
  }

  async scanRecursively (params) {
    const data = await this.dynamodb.scan(params).promise();
    const { Items, LastEvaluatedKey } = data
    if (LastEvaluatedKey) {
        params.ExclusiveStartKey = LastEvaluatedKey;
        return Items.concat(await this.scanRecursively(params));
    } else {
        return Items;
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

  // 固顶
  updateIsFixed(id, flag) {
    return this.dynamodb
      .update({
        TableName: BABY_TABLE,
        Key: { id },
        ExpressionAttributeValues: {
          ':isFixed': flag,
        },
        UpdateExpression: 'SET isFixed = :isFixed',
      })
      .promise();
  }

    // 清空
    updateIsDelete(id, flag) {
      return this.dynamodb
        .update({
          TableName: BABY_TABLE,
          Key: { id },
          ExpressionAttributeValues: {
            ':isDelete': flag,
          },
          UpdateExpression: 'SET isDelete = :isDelete',
        })
        .promise();
    }
  // 暂停提醒
  async setPaused(id, flag) {
    return await this.dynamodb
      .update({
        TableName: BABY_TABLE,
        Key: { id },
        ExpressionAttributeValues: {
          ':isPaused': flag,
        },
        UpdateExpression: 'SET isPaused = :isPaused',
      })
      .promise();
  }



  // delete settings
  async deleteSetting(id) {
    return await this.dynamodb
      .delete({
        TableName: SETTINGS_TABLE,//待删除操作的表
        Key:{
            'id': id,
        },
        // ConditionExpression:"info.rating <= :val",//删除条件表达式
        // ExpressionAttributeValues: {
        //     ":val": 5.0   //条件值 
        // }
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
