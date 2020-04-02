const moment = require('moment');
const db = require('../../db')

const deleteSetting = async (id, userId) => {
    if (!id) throw new Error(stateMsgList.SUBSETTING_ERR);
}

// id: "20180824003"
// isPaused: false
// fallAlert: false
// leaveAlert: false
// turnSetting: "6"
// apnea: {period: 20}
// heartRate: {min: 30, max: 120, period: 40}
// respirationRate: {max: 35, period: 30}
// temperature: {min: 36, max: 37.5}
// leaving: {st: 7, et: 22, period: 20}
// parent_id: "579f4f40-6424-11ea-88c6-1597d8d7b8bf"
const newSetting = async (settingDataJSON, userId) => {
    settingDataFilter(settingDataJSON)
    let { isPaused, ...params } = settingDataJSON;
    console.log(settingDataJSON.parent_id);
    let hasSetting = {};
    if (!settingDataJSON.parent_id) {
        // 全局设定，parent_id 为空， 那么id 就是用户id
        // params.id = userId
        params.id = userId;
        // params.parent_id = null;
        hasSetting = await db.getSettings(userId)
        console.log('====全局====', params)
    } else {
        console.log('====个别====', params)
        // 个别设定，parent_id 不为空，id 设备id得传
        if (!params.id) throw new Error(stateMsgList.SUBSETTING_ERR)
        hasSetting = await db.getSubSettings(params.id)
    }
    console.log('xxxx', hasSetting);
    params.fallAlert = params.fallAlert ? true : false
    params.leaveAlert = params.leaveAlert ? true : false
    let result = {};
    if (hasSetting && hasSetting.Item) {
        console.log('修改');
        result = await db.updateSettings(params)
    } else {
        console.log('新增')
        result = await db.addSettings(params)
    }
    return result;
}


const stateMsgList = {
    GLOBAL_ERR: '全局设定不可删除',
    NOTFOUNDSETTING: '未找到设定',
    SUBSETTING_ERR: '个别设定id不能为空',
    HEARTRATE_ERR: 'HR范围设置错误',
    RSPRATE_ERR: 'RR设置错误',
    LEAVING_ERR: '30-60，以10sec為單位',
    APNEA_ERR: '胸部起伏5-20',
    TURNSETTING_ERR: '翻身次数为1-8',
    TEMPERATURE_ERR: '体温设置错误',
    LEAVING_TIME_ERR: '离床时间设置错误',
}

const HR = {
    min_from: 30,
    min_to: 70,
    max_from: 80,
    max_to: 130,
    period_from: 30,
    period_to: 60,
    period_unit: 10,
    msg: 'HR范围设置错误'
}

const RR = {
    max_from: 10,
    max_to: 55,
    max_unit: 5,
    period_from: 30,
    period_to: 60,
    period_unit: 10,
    msg: 'RR设置错误'
}
const LV = {
    period_from: 10,
    period_to: 150,
    period_unit: 10,
    msg: '30-60，以10sec為單位'
}

const TS = {
    period_from: 0,
    period_to: 8,
    msg: '翻身次数为1-8'
}

const AP = {
    period_from: 5,
    period_to: 20,
    period_unit: 5,
    msg: '胸部起伏5-20',
}

const TP = {
    min_from: 35.0,
    min_to: 36.5,
    max_from: 37.0,
    max_to: 38.5,
    tp_unit: 0.5, 
    msg: '体温设置错误'
}

function checkPropertyNotNull(obj) {
    console.log('checkObjt', obj);
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const element = obj[key];
            console.log('element', element);
            if (!element) throw new Error(`${key}空值`)
            for (const key2 in element) {
                if (element.hasOwnProperty(key2)) {
                    const _element = element[key2];
                    if (!_element) {
                        throw new Error(`${key}+${key2}空值`)
                    }
                }
            }
        }
    }
}

const settingDataFilter = (settingData) => {
    let {
        id,
        isPaused,
        apnea,
        heartRate,
        respirationRate,
        temperature,
        leaving: {st, et, period},
        parent_id,
        fallAlert,
        leaveAlert,
        turnSetting,
    } = settingData;
    if((!st&&st!==0 || !et&&et!==0 || st > et)) {
        throw new Error(stateMsgList.LEAVING_TIME_ERR)
    }

    const checkObj = { apnea, heartRate, respirationRate, temperature, turnSetting }
    try {
        checkPropertyNotNull(checkObj)
        validate_apnea(apnea)
        validate_heartRate(heartRate)
        validate_respirationRate(respirationRate)
        validate_temperature(temperature)
        validate_leaving(settingData.leaving)
        validate_turnSetting(turnSetting)
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}

const validate_apnea = value => {
    if (value.period > AP.period_to || value.period < AP.period_from || value.period % AP.period_unit != 0) throw new Error(stateMsgList.APNEA_ERR)
}

const validate_heartRate = value => {
    if (value.min < HR.min_from || value.min > HR.min_to || value.max < HR.max_from || value.max > HR.max_to) {
        throw new Error(stateMsgList.HEARTRATE_ERR)
    }
    if (value.period > HR.period_to || value.period < HR.period_from || value.period % HR.period_unit != 0) throw new Error(stateMsgList.HEARTRATE_ERR)
}

const validate_respirationRate = value => {
    if (value.max < RR.max_from || value.max > RR.max_to || value.max % RR.max_unit != 0) {
        throw new Error(stateMsgList.RSPRATE_ERR)
    }
    if ((value.period > RR.period_to || value.period < RR.period_from) || value.period % RR.period_unit != 0) throw new Error(stateMsgList.RSPRATE_ERR)
}

const validate_temperature = value => {
    if (value.min < TP.min_from || value.min > TP.min_to || value.max > TP.max_to || value.max < TP.max_from || value.max % TP.tp_unit != 0 || value.min % TP.tp_unit != 0) {
        throw new Error(stateMsgList.TEMPERATURE_ERR)
    }
}

const validate_leaving = value => {
    if (value.period > LV.period_to || value.period < LV.period_from || value.period % LV.period_unit != 0) throw new Error(stateMsgList.LEAVING_ERR)
}

const validate_turnSetting = value => {
    if (value.period > TS.period_to || value.period < TS.period_from) throw new Error(stateMsgList.TURNSETTING_ERR)
}


module.exports = { 
    newSetting,
}