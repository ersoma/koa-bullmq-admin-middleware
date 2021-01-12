'use strict';

const axios = require('axios');
const { Queue } = require('bullmq');

const FakeServer = require('./fake-server');
const prepareQueue = require('../prepare-queue');
const getAllQueueDetailsFactory = require('../../src/queue/get-all-queue-details');

describe('Tests getAllQueueDetails middleware', () => {
  const firstQueueName = 'test1';
  const secondQueueName = 'test2';
  let queues = [new Queue(firstQueueName), new Queue(secondQueueName)];
  let server;

  const expectedQueueCounts = [...Array(queues.length)].map((_, i) => ({
    completedCount: i + 1,
    failedCount: i + 2,
    delayedCount: i + 3,
    activeCount: i + 4,
    waitingCount: i + 5
  }));
  const expectedBodies = [...Array(queues.length)].map((_, i) => ({
    name: queues[i].name,
    isPaused: i % 2 === 0,
    activeCount: expectedQueueCounts[i].activeCount,
    completedCount: expectedQueueCounts[i].completedCount,
    delayedCount: expectedQueueCounts[i].delayedCount,
    failedCount: expectedQueueCounts[i].failedCount,
    waitingCount: expectedQueueCounts[i].waitingCount
  }));

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
      await prepareQueue.setQueueJobs(queues[0], true, expectedQueueCounts[0]);
      await prepareQueue.setQueueJobs(queues[1], false, expectedQueueCounts[1]);
      const middleware = getAllQueueDetailsFactory(queues);

      server = new FakeServer('/', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/`);

      expect(response.data.allQueueDetails).to.be.eql(expectedBodies);
    });
  });

  describe('with custom storeResult parameter', () => {
    it('shoud respond proper number of jobs', async () => {
      await prepareQueue.setQueueJobs(queues[0], true, expectedQueueCounts[0]);
      await prepareQueue.setQueueJobs(queues[1], false, expectedQueueCounts[1]);
      const middleware = getAllQueueDetailsFactory(queues, {
        storeResult: (ctx, result) => {
          ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
          ctx.state.bullMqAdmin.allQueueDetailsCustom = result;
        }
      });

      server = new FakeServer('/', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/`);

      expect(response.data.allQueueDetailsCustom).to.be.eql(expectedBodies);
    });
  });
});
