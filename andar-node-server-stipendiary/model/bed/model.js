const moment = require('moment')

const bedDataFilter = (bedData) => {
    console.log('filter>>>>>')
    const {
        bed,
        battery,
        birthday,
        checkInDate,
        checkOutDate,
        hasAlarmHandled,
        height,
        isPaused,
        mom,
        notice,
        parent_id,
        sex,
        weight,
        diseases,
        isFixed,
        bodyTemp,
        identityNumber
    } = bedData;

    if (!birthday) throw new Error(stateMsgList.BIRTHDAY_NULL)
    if (!checkInDate) throw new Error(stateMsgList.CHECKIN_NULL)
    if (!checkOutDate) throw new Error(stateMsgList.CHECKOUT_NULL)
    
    if (moment(birthday).isAfter(checkInDate)) throw new Error(stateMsgList.BIRTHDAY_BEFORE)
    // if (moment(birthday).isAfter(checkOutDate)) throw new Error(stateMsgList.BIRTHDAY_ERR)
    if (moment(checkInDate).isAfter(checkOutDate)) throw new Error(stateMsgList.CHECKIN_BEFORE)

    // 这里可以直接调用, ....
    validate_identityNumber(identityNumber)
    validate_bed(bed);
    validate_mom(mom);
    validate_birthday(birthday);
    validate_checkInDate(checkInDate);
    validate_checkOutDate(checkOutDate);
    validate_height(height);
    validate_notice(notice);
    validate_weight(weight);
}

// 过滤中的 value

// 过滤电池
const validate_battery = value => {// 这个value battery
    if (value < 0 || value > 100 || value % 1 != 0) throw new Error(stateMsgList.BATTERR_ERR); 
}
// 过滤身份证
const validate_identityNumber = value => { // 这个value identityNumber
    // const reg = /^[1-9]\d{5}(18|19|20|(3\d))\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    const reg = /^[A-Z]\d{9}$/;
    if (value && !reg.test(value)) throw new Error(stateMsgList.IDCARD_ERR)
}
// 床号
const validate_bed = value => {
    if (!value) throw new Error(stateMsgList.BEDNUM_NULL) 
}
// 姓名
const validate_mom = value => {
    if (!value || (value.length > MOM.len_to || value.length < MOM.len_from)) {
        throw new Error(stateMsgList.NAME_ERR)
    }
}
// 生日
const validate_birthday = value => {
    if (!check(value)) throw new Error(stateMsgList.BIRTHDAY_ERR);
}
//
const validate_checkInDate = value => {
    if (!check(value)) throw new Error(stateMsgList.CHECKIN_DATA_ERR);
}
// 出院日期
const validate_checkOutDate = value => {
    if (!check(value)) throw new Error(stateMsgList.CHECKOUT_DATA_ERR) 
}
// 身高
const validate_height = value => {
    if (value && (value < HEIGHT.min || value > HEIGHT.max)) throw new Error(stateMsgList.HEIGHT_ERR) 
}
// 身体贴片
const validate_bodyTemp = value => {
    const _value = JSON.parse(value)
    if (!value) throw new Error(stateMsgList.BODYTEMP_ERR); 
}
// 备注
const validate_notice = value => {
    if (value && value.length > NOTICE.max) throw new Error(stateMsgList.NOTICE_ERR)
}
// 体重
const validate_weight = value => {
    if (value && (value < WEIGHT.min || value > WEIGHT.max)) throw new Error(stateMsgList.WEIGHT_ERR)
}

// 公共文件变量
stateMsgList = {
    DEVICE_ERR: '设备不能为空',
    DEVICE_USED: '设备已经被使用',
    BATTERR_ERR: '电量格式错误',
    BED_NOTFOUND: '床位不存在',
    BED_ALREADY: '床位已存在',
    BEDNUM_NULL: '床号不能为空',
    DEVICE_NOT_MATCH: '设备信息和床号不匹配',
    NAME_ERR: '姓名为空或格式错误',
    IDCARD_ERR: '身份证格式错误',
    BIRTHDAY_ERR: '出生日期格式错误',
    BIRTHDAY_NULL: '出生日期不能为空',
    BIRTHDAY_BEFORE: '出生日期必须在入住日期之前',
    CHECKIN_DATA_ERR: '入住时间错误',
    CHECKIN_NULL: '入住日期不能为空',
    CHECKIN_BEFORE: '入住日期必须在出院日期之前',
    CHECKOUT_DATA_ERR: '出院时间错误',
    CHECKOUT_NULL: '出院日期不能为空',
    BODYTEMP_ERR: '体温贴片机器编号不能为空',
    NOTICE_ERR: '备注小于100个字',
    HEIGHT_ERR: '身高输入错误',
    WEIGHT_ERR: '体重输入错误',
    CANT_CLEAR: '尚未到离院日期，确认是否清空床位',
}


const MOM = {
    len_from: 1,
    len_to: 5,
}

const HEIGHT = {
    min: 10,
    max: 300,
}

const NOTICE = {
    max: 100,
}

const WEIGHT = {
    min: 30,
    max: 300,
}

/**
 * @description 判断是不是无效效日期
 * @return true/false 有效/无效
 */
function check(date){
    if (moment(date).format('YYYY-MM-DD HH-mm-ss') === 'Invalid date') {
        return false
    }
    return true;
}


module.exports = { 
    bedDataFilter,
    validate_battery,
    validate_identityNumber
 }