'use strict';

const axios = require('axios');
const { Queue } = require('bullmq');

const FakeServer = require('./fake-server');
const prepareQueue = require('../prepare-queue');
const { getQueueDetailsFactory } = require('../..');

describe('Tests getQueueDetails middleware', () => {
  let queues = [new Queue('test')];
  let server;
  const expectedQueueCounts = {
    completedCount: 3,
    failedCount: 2,
    delayedCount: 1,
    activeCount: 5,
    waitingCount: 6
  };
  const expectedBody = {
    name: 'test',
    isPaused: true,
    activeCount: expectedQueueCounts.activeCount,
    completedCount: expectedQueueCounts.completedCount,
    delayedCount: expectedQueueCounts.delayedCount,
    failedCount: expectedQueueCounts.failedCount,
    waitingCount: expectedQueueCounts.waitingCount
  };

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
      await prepareQueue.setQueueJobs(queues[0], true, expectedQueueCounts);
      const middleware = getQueueDetailsFactory(queues);

      server = new FakeServer('/:queueName', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/${queues[0].name}`);

      expect(response.data.queueDetails).to.be.eql(expectedBody);
    });
  });

  describe('with custom getQueue parameter', () => {
    it('shoud respond proper number of jobs', async () => {
      await prepareQueue.setQueueJobs(queues[0], true, expectedQueueCounts);
      const middleware = getQueueDetailsFactory(queues, {
        getQueue: (ctx, queues) => queues.find(q => ctx.headers['queue-name'] === q.name)
      });

      server = new FakeServer('/', middleware);
      await server.startFakeServer();

      const response = await axios.get(server.baseUrl + '/', {
        headers: { 'queue-name': 'test' }
      });

      expect(response.data.queueDetails).to.be.eql(expectedBody);
    });
  });

  describe('with custom storeResult parameter', () => {
    it('shoud respond proper number of jobs', async () => {
      await prepareQueue.setQueueJobs(queues[0], true, expectedQueueCounts);
      const middleware = getQueueDetailsFactory(queues, {
        storeResult: (ctx, result) => {
          ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
          ctx.state.bullMqAdmin.queueDetailsCustom = result;
        }
      });

      server = new FakeServer('/:queueName', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/${queues[0].name}`);

      expect(response.data.queueDetailsCustom).to.be.eql(expectedBody);
    });
  });

});
