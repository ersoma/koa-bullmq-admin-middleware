'use strict';

const axios = require('axios');
const { Queue } = require('bullmq');

const FakeServer = require('./fake-server');
const prepareQueue = require('../prepare-queue');
const getAllQueueDetailsFactory = require('../../src/queue/get-all-queue-details');

const startServerWith = async (middleware, route) => {
  const server = new FakeServer(route, middleware);
  await server.startFakeServer();
  return server;
};

describe('Tests getAllQueueDetails middleware', () => {
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
      server = await startServerWith(middleware, '/');

      const response = await axios.get(`${server.baseUrl}/`);

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
      server = await startServerWith(middleware, '/');

      const response = await axios.get(`${server.baseUrl}/`);

      expect(response.data.allQueueDetailsCustom).to.be.eql(expectedBody);
    });
  });
});
