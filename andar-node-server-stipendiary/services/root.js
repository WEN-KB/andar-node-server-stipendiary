'use strict'
const { bedDataFilter } = require('../model/bed/model');
module.exports = async function (fastify, opts, next) {
  fastify.get('/', function (request, reply) {
    reply.send({ root: true })
  })


  const newBed = async(bedData = {}, userId) => {
    
    console.log("come==========1"+bedData.id)
    const { deviceid } = bedData;
    if (!deviceid) throw new Error(stateMsgList.DEVICE_ERR)
    // 数据库查询这个设备是否被使用
    const _bedInfo = await bedInfo.findOne({ where: { deviceid, isDelete: false } })
    console.log("_bedInfo",JSON.stringify(request.body))
    if (_bedInfo) {
        throw new Error(error);
    }
    try { 
        // await checkRoomBed(bedData.bed, deviceid)
        // 对参数进行检测
        bedDataFilter(bedData);
    } catch (error) {
        throw new Error(error)
    }
    // 住民是哪家医院的。 userId 是token 中获取
   // bedData.parent_id = userId;
    // id 格式uuid
   // bedData.id = await uuid.v1();
    // nosql 可以直接存储json， 不需要这不
   // bedDataJSON = toJsonString(bedData)
    // 写入数据库
   // return await bedInfo.create(bedDataJSON);
}


  fastify.put('/api/baby/:id', async (request, reply) => {
    const b_id = request.params.id
   
    const bedData = request.body
    console.log('bedData>>>', bedData);
    const { deviceid, user_id, ...rest } = bedData;  // 这个id 前端传的设备id
   // bedData.deviceid = deviceid; // 设备id 你那边应该是device_sn
    let data = false;
    try {
        data = await newBed(bedData, user_id)
       ctx.body = data
    } catch (error) {
        console.error(error)
        reply.code(501).send(error);
       // ctx.status = 400;
        //ctx.body = new ErrorModel(error.message)
    }




    // try {
    //   if (!isEmpty(device_sn) && device_sn != old_device_sn) {
    //     await updateThingShadow(device_sn, b_id)
    //     andarService.updateRecords(b_id, []) 
        
    //     if (!isEmpty(old_device_sn)) {
    //       await updateThingShadow(old_device_sn, DEFAULT_B_ID)
    //     }
    //   }
    // } catch(e) {
    //   console.error(e)
    //   reply.code(501).send(e);
    // }
  
    // if (isPaused != undefined) {
    //   andarService.updatePausedList(b_id, isPaused);
    //   patchService.updatePausedList(b_id, isPaused, user_id);
    // }
    
    // if (device_sn && !isEmpty(device_sn)) {
    //   andarService.workaroundUpdateBabyId(device_sn, b_id)
    // }
    // patchService.updatePatch(b_id, user_id, rest);
    reply.code(204);
  });

  next()
}

// If you prefer async/await, use the following
//
// module.exports = async function (fastify, opts) {
//   fastify.get('/', async function (request, reply) {
//     return { root: true }
//   })
// }
