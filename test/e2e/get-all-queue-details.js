'use strict';

const axios = require('axios');
const { Queue } = require('bullmq');
const Router = require('@koa/router');

const FakeServer = require('./fake-server');
const prepareQueue = require('../prepare-queue');
const getAllQueueDetailsFactory = require('../../src/queue/get-all-queue-details');

const startServerWith = async (middleware, route, port) => {
  const router = new Router();
  router.get(route,
    async (ctx, next) => { try { await next(); } catch (err) { console.log(err); } },
    middleware, ctx => ctx.body = ctx.state.bullMqAdmin);

  const server = new FakeServer([router.routes()]);
  await server.startFakeServer(port);

  return server;
};

describe('Tests getAllQueueDetails middleware', () => {
  const PORT = 8080;
  const BASE_URL = `http://localhost:${PORT}`;
  let queues = [
    new Queue('test-1'),
    new Queue('test-2')
  ];
  let server;
  const expectedQueueCountsForQueue1 = {
    completedCount: 3,
    failedCount: 2,
    delayedCount: 1,
    activeCount: 5,
    waitingCount: 6
  };
  const expectedQueueCountsForQueue2 = {
    completedCount: 3,
    failedCount: 2,
    delayedCount: 1,
    activeCount: 5,
    waitingCount: 6
  };
  const expectedBody = [
    {
      name: 'test-1',
      isPaused: true,
      activeCount: expectedQueueCountsForQueue1.activeCount,
      completedCount: expectedQueueCountsForQueue1.completedCount,
      delayedCount: expectedQueueCountsForQueue1.delayedCount,
      failedCount: expectedQueueCountsForQueue1.failedCount,
      waitingCount: expectedQueueCountsForQueue1.waitingCount
    },
    {
      name: 'test-2',
      isPaused: false,
      activeCount: expectedQueueCountsForQueue2.activeCount,
      completedCount: expectedQueueCountsForQueue2.completedCount,
      delayedCount: expectedQueueCountsForQueue2.delayedCount,
      failedCount: expectedQueueCountsForQueue2.failedCount,
      waitingCount: expectedQueueCountsForQueue2.waitingCount
    }
  ];

  afterEach(async () => {
    if (server) {
      await server.stopFakeServer();
    }
  });
  after(async () => {
    await Promise.all(queues.map(q => q.close()));
  });

  describe('with default parameters', () => {
    it('shoud respond proper number of jobs', async () => {
      await prepareQueue.setQueueJobs(queues[0], true, expectedQueueCountsForQueue1);
      await prepareQueue.setQueueJobs(queues[1], false, expectedQueueCountsForQueue2);
      const middleware = getAllQueueDetailsFactory(queues);
      server = await startServerWith(middleware, '/', PORT);

      const response = await axios.get(`${BASE_URL}/`);

      expect(response.data.allQueueDetails).to.be.eql(expectedBody);
    });
  });

  describe('with custom storeResult parameter', () => {
    it('shoud respond proper number of jobs', async () => {
      await prepareQueue.setQueueJobs(queues[0], true, expectedQueueCountsForQueue1);
      await prepareQueue.setQueueJobs(queues[1], false, expectedQueueCountsForQueue2);
      const middleware = getAllQueueDetailsFactory(queues, {
        storeResult: (ctx, result) => {
          ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
          ctx.state.bullMqAdmin.allQueueDetailsCustom = result;
        }
      });
      server = await startServerWith(middleware, '/', PORT);

      const response = await axios.get(`${BASE_URL}/`);

      expect(response.data.allQueueDetailsCustom).to.be.eql(expectedBody);
    });
  });
});
