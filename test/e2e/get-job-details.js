'use strict';

const axios = require('axios');
const { Queue } = require('bullmq');

const FakeServer = require('./fake-server');
const prepareQueue = require('../prepare-queue');
const getJobDetailsFactory = require('../../src/job/get-job-details');

describe('Tests getJobDetails middleware', () => {
  const selectedQueue = new Queue('test');
  let queues = [selectedQueue];
  let server;

  const testData = { key: 'value' };
  const getExpectedBody = async (jobId, state) => {
    const job = await selectedQueue.getJob(jobId);
    const jobJson = job.asJSON();
    const bodyWithAllKeys = {
      id: jobJson.id,
      name: jobJson.name,
      attemptsMade: jobJson.attemptsMade,
      data: jobJson.data,
      opts: jobJson.opts,
      progress: jobJson.progress,
      returnvalue: jobJson.returnvalue,
      stacktrace: jobJson.stacktrace,
      state,
      timestamp: jobJson.timestamp,
      failedReason: jobJson.failedReason,
      finishedOn: jobJson.finishedOn,
      processedOn: jobJson.processedOn
    };
    const filteredBody = {};
    Object.keys(bodyWithAllKeys).forEach(k => {
      if (typeof bodyWithAllKeys[k] !== 'undefined') {
        filteredBody[k] = bodyWithAllKeys[k];
      }
    });
    return filteredBody;
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
    [
      'waiting',
      'delayed',
      'failed',
      'completed',
      'active'
    ].forEach(state => {
      it(`shoud respond proper job details object for ${state} job`, async () => {
        const job = await prepareQueue.setJob(selectedQueue, state, testData);
        const middleware = getJobDetailsFactory(queues);

        server = new FakeServer('/:queueName/:jobId', middleware);
        await server.startFakeServer();
        const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}/${job.id}`);

        const expectedBody = await getExpectedBody(job.id, state);
        expect(response.data.jobDetails).to.be.eql(expectedBody);
      });
    });
  });

  describe('with custom getQueue parameter', () => {
    it('shoud respond proper job details object', async () => {
      const job = await prepareQueue.setJob(selectedQueue, 'waiting', testData);
      const middleware = getJobDetailsFactory(queues, {
        getQueue: (ctx, queues) => queues.find(q => ctx.headers['queue-name'] === q.name)
      });

      server = new FakeServer('/:jobId', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/${job.id}`, {
        headers: { 'queue-name': selectedQueue.name }
      });

      const expectedBody = await getExpectedBody(job.id, 'waiting');
      expect(response.data.jobDetails).to.be.eql(expectedBody);
    });
  });

  describe('with custom getJob parameter', () => {
    it('shoud respond proper job details object', async () => {
      const job = await prepareQueue.setJob(selectedQueue, 'waiting', testData);
      const middleware = getJobDetailsFactory(queues, {
        getJob: (ctx, queue) => queue.getJob(ctx.headers['job-id'])
      });

      server = new FakeServer('/:queueName', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}`, {
        headers: { 'job-id': job.id }
      });

      const expectedBody = await getExpectedBody(job.id, 'waiting');
      expect(response.data.jobDetails).to.be.eql(expectedBody);
    });
  });

  describe('with custom storeResult parameter', () => {
    it('shoud respond proper job details object', async () => {
      const job = await prepareQueue.setJob(selectedQueue, 'waiting', testData);
      const middleware = getJobDetailsFactory(queues, {
        storeResult: (ctx, result) => {
          ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
          ctx.state.bullMqAdmin.jobDetailsCustom = result;
        }
      });

      server = new FakeServer('/:queueName/:jobId', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}/${job.id}`);

      const expectedBody = await getExpectedBody(job.id, 'waiting');
      expect(response.data.jobDetailsCustom).to.be.eql(expectedBody);
    });
  });
});
