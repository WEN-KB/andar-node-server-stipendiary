'use strict'
const { bedDataFilter } = require('../model/bed/model');
const db = require('../db');
const uuid = require('uuid')
module.exports = async function (fastify, opts, next) {
  fastify.get('/', function (request, reply) {
    reply.send({ root: true })
  })

  fastify.get('/api/baby', async (request, reply) => {
    try {
      // console.log(await db.getbabies());
      const babies = await db.getBabies('1ecc1c86-19c9-41bf-b282-1c2ea406642a')
      reply.send({ babies })
    } catch (error) {
      console.log(error);
      reply.send({ test: error })
    }
})
fastify.get('/api/set', async (request, reply) => {
    try {
      // console.log(await db.getbabies());
    //   "id": "84899673-1083-48cb-9765-3252f98b3b29",
    //   "parent_id": "1ecc1c86-19c9-41bf-b282-1c2ea406642a"
      const babies = await db.getSettings('1ecc1c86-19c9-41bf-b282-1c2ea406642a')
      reply.send({ babies })
    } catch (error) {
      console.log(error);
      reply.send({ test: error })
    }
})


  const newBed = async(bedData = {}, userId) => {
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
    } = bedData;
    console.log('bedData', bedData)
    if (!deviceid) throw new Error(stateMsgList.DEVICE_ERR)
    if (!bed) throw new Error('床号不能为控');
    // 数据库查询这个设备是否被使用
    const _bedInfo = await db.getBabiesByDeviceid(deviceid)
    // 查询床号是否被使用
    const _bedInfo2 = await db.getBabiesByBed(bed)

    console.log('_bedInfo', _bedInfo)
    if (_bedInfo.length >= 1 || _bedInfo2.length >=1) {
        throw new Error('床位已存在');
    }
    await bedDataFilter(bedData);
    bedData.id = await uuid.v4();
    bedData.parent_id = userId || 'test_user_id';
    const res = await db.createBaby(bedData);
    console.log('res', res);
    return res;
}
// 参数
// {	"id": "mytest3xxx",
//     "birthday": "2019-12-11T16:00:00.000Z",
//     "checkInDate": "2019-12-12T16:00:00.000Z",
//     "checkOutDate": "2019-12-13T16:00:00.000Z",
//     "bed": 1008611,
//     "height": null,
//     "mom": "4010",
//     "notice": null,
//     "sex": "M",
//     "weight": null,
//     "battery": null,
//     "isPaused": true,
//     "hasAlarmHandled": true,
//     "cautious": false,
//  	"diseases":["嘿嘿","哈哈"]
//   }
  fastify.post('/api/baby', async (request, reply) => {
    // const b_id = request.params.id
    const bedData = request.body
    const { id, userId, ...rest } = bedData;
    rest.deviceid = id; // 设备id
    rest.isFixed = false; // 固首
    rest.isDelete = false; // 删除
    let data = false;
    console.log('rest', rest);
    try {
      await newBed(rest, userId)
      reply.send({ message: 'ok' })
    } catch (error) {
        console.error(error)
        reply.code(501).send(error);
    }
    reply.code(204);
  });

  // {	"deviceid": "mytest3xxx",
//     "birthday": "2019-12-11T16:00:00.000Z",
//     "checkInDate": "2019-12-12T16:00:00.000Z",
//     "checkOutDate": "2019-12-13T16:00:00.000Z",
//     "bed": 1008611,
//     "height": null,
//     "mom": "4010",
//     "notice": null,
//     "sex": "M",
//     "weight": null,
//     "battery": null,
//     "isPaused": true,
//     "hasAlarmHandled": true,
//     "cautious": false,
//  	"diseases":["嘿嘿","哈哈"]
//   }
  fastify.put('/api/baby/:id', async (request, reply) => {
    const b_id = request.params.id;
    const bedData = request.body;
    const { deviceid, bed } = bedData;
    try {
        // 检查设备 和 床是否已经被人使用
        if (!deviceid) throw new Error(stateMsgList.DEVICE_ERR)
        if (!bed) throw new Error('床号不能为控');
        // 数据库查询这个设备是否被使用
        const _bedInfo = await db.getBabiesByDeviceid(deviceid)
        // 查询床号是否被使用
        const _bedInfo2 = await db.getBabiesByBed(bed)
        // 这里检查如果村子，再判断是不是自己的信息
        if (_bedInfo.length >=1 && _bedInfo[0].id != b_id) throw new Error('设备已使用');
        if (_bedInfo2.length>=1 && _bedInfo2[0].id != b_id) throw new Error('床号已使用');
        await bedDataFilter(bedData);
        await db.updateBaby(b_id, bedData)
        reply.send({ message: 'ok' })
    } catch (error) {
        console.error(error)
        reply.code(501).send(error);
    }
  })

  // 固顶
  fastify.post('/api/fixed/:id', async(request, reply) => {
    const id = request.params.id
    const { userId, flag } = request.body
    const res = await db.updateIsFixed(id, flag)
    // ctx.body = {b_id, bedData}
    reply.send({ res })
    // reply.code(204);
  })

  // 清空床位
  fastify.delete('/api/baby/:id', async(request, reply) => {
    const id = request.params.id
    const { userId } = request.body
    const res = await db.updateIsDelete(id, true)
    reply.send({ id, res })
  })

  // 设置暂停
  fastify.put('/api/setPaused/:id', async(request, reply) => {
    const id = request.params.id
    const { flag, userId } = request.body
    const res = await db.setPaused(id, flag)
    reply.send({ id, res })
  })

  // 修改bedinfo
  fastify.put('/api/baby', async(request, reply) => {

  })
  next()
}
