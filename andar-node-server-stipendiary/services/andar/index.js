'use strict';

const andarService = require('./andar');

module.exports = async (fastify, opts) => {
  fastify.post('/api/andar', async (request, reply) => {
    reply.code(204);
  });

  fastify.post('/api/settings', async (request, reply) => {
    const {
      body: { id, parent_id, ...rest },
    } = request;

    andarService.updateSettings(id, rest);
    reply.code(204);
  });

  fastify.delete('/api/settings/:id', async (request, reply) => {
    andarService.deleteSettings(request.params.id);
    reply.code(204);
  });

  fastify.post('/api/alarms/blacklist', async (request, reply) => {
    andarService.addAlarmBlacklist(request.body.id);
    reply.code(204);
  });
};
