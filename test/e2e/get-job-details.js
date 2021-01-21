'use strict';

const axios = require('axios');
const { Queue } = require('bullmq');

const FakeServer = require('./fake-server');
const prepareQueue = require('../prepare-queue');
const { getJobDetailsFactory } = require('../../');

describe('Tests getJobDetails middleware', () => {
  const selectedQueue = new Queue('test');
  let queues = [selectedQueue];
  let server;

  const expectedWaitingResult = job => ({
    id: job.id,
    name: job.name,
    state: 'waiting',
    attemptsMade: 0,
    data: JSON.stringify({ test: 'data' }),
    opts: JSON.stringify({ attempts: 0, delay: 0 }),
    progress: 0,
    returnvalue: 'null',
    stacktrace: '[]',
    timestamp: timestamp
  });

  const timestamp = Date.now();
  beforeEach(() => {
    global.sandbox.stub(Date, 'now').returns(timestamp);
  });

  let stackTraceLimit;
  before(()=>{
    stackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 0;
  });

  afterEach(async () => {
    if (server) {
      await server.stopFakeServer();
    }
  });

  after(async () => {
    await Promise.all(queues.map(q => q.close()));
    Error.stackTraceLimit = stackTraceLimit;
  });

  describe('with default parameters', () => {
    [
      {
        state: 'waiting',
        expectedResult: job => ({
          id: job.id,
          name: job.name,
          state: 'waiting',
          attemptsMade: 0,
          data: JSON.stringify({ test: 'data' }),
          opts: JSON.stringify({ attempts: 0, delay: 0 }),
          progress: 0,
          returnvalue: 'null',
          stacktrace: '[]',
          timestamp: timestamp
        })
      },
      {
        state: 'delayed',
        expectedResult: job => ({
          id: job.id,
          name: job.name,
          state: 'delayed',
          attemptsMade: 0,
          data: JSON.stringify({ test: 'data' }),
          opts: JSON.stringify({ attempts: 0, delay: 1 }),
          progress: 0,
          returnvalue: 'null',
          stacktrace: '[]',
          timestamp: timestamp
        })
      },
      {
        state: 'failed',
        expectedResult: job => ({
          id: job.id,
          name: job.name,
          state: 'failed',
          attemptsMade: 1,
          data: JSON.stringify({ test: 'data' }),
          opts: JSON.stringify({ attempts: 0, delay: 0 }),
          progress: 0,
          processedOn: timestamp,
          finishedOn: timestamp,
          returnvalue: 'null',
          failedReason: '"Failed job for testing"',
          stacktrace: JSON.stringify([new Error('Failed job for testing').stack]),
          timestamp: timestamp
        })
      },
      {
        state: 'completed',
        expectedResult: job => ({
          id: job.id,
          name: job.name,
          state: 'completed',
          attemptsMade: 0,
          data: JSON.stringify({ test: 'data' }),
          opts: JSON.stringify({ attempts: 0, delay: 0 }),
          progress: 0,
          returnvalue: '{}',
          processedOn: timestamp,
          finishedOn: timestamp,
          stacktrace: '[]',
          timestamp: timestamp
        })
      },
      {
        state: 'active',
        expectedResult: job => ({
          id: job.id,
          name: job.name,
          state: 'active',
          attemptsMade: 0,
          data: JSON.stringify({ test: 'data' }),
          opts: JSON.stringify({ attempts: 0, delay: 0 }),
          progress: 0,
          returnvalue: 'null',
          processedOn: timestamp,
          stacktrace: '[]',
          timestamp: timestamp
        })
      }
    ].forEach(testCase => {
      it(`shoud respond proper job details object for ${testCase.state} job`, async () => {
        const job = await prepareQueue.setJob(selectedQueue, testCase.state, { test: 'data' });
        const middleware = getJobDetailsFactory(queues);

        server = new FakeServer('/:queueName/:jobId', middleware);
        await server.startFakeServer();
        const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}/${job.id}`);

        const expectedBody = await testCase.expectedResult(job);
        expect(response.data.jobDetails).to.be.eql(expectedBody);
      });
    });
  });

  describe('with custom getQueue parameter', () => {
    it('shoud respond proper job details object', async () => {
      const job = await prepareQueue.setJob(selectedQueue, 'waiting', { test: 'data' });
      const middleware = getJobDetailsFactory(queues, {
        getQueue: (ctx, queues) => queues.find(q => ctx.headers['queue-name'] === q.name)
      });

      server = new FakeServer('/:jobId', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/${job.id}`, {
        headers: { 'queue-name': selectedQueue.name }
      });

      const expectedBody = expectedWaitingResult(job);
      expect(response.data.jobDetails).to.be.eql(expectedBody);
    });
  });

  describe('with custom getJob parameter', () => {
    it('shoud respond proper job details object', async () => {
      const job = await prepareQueue.setJob(selectedQueue, 'waiting', { test: 'data' });
      const middleware = getJobDetailsFactory(queues, {
        getJob: (ctx, queue) => queue.getJob(ctx.headers['job-id'])
      });

      server = new FakeServer('/:queueName', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}`, {
        headers: { 'job-id': job.id }
      });

      const expectedBody = expectedWaitingResult(job);
      expect(response.data.jobDetails).to.be.eql(expectedBody);
    });
  });

  describe('with custom storeResult parameter', () => {
    it('shoud respond proper job details object', async () => {
      const job = await prepareQueue.setJob(selectedQueue, 'waiting', { test: 'data' });
      const middleware = getJobDetailsFactory(queues, {
        storeResult: (ctx, result) => {
          ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
          ctx.state.bullMqAdmin.jobDetailsCustom = result;
        }
      });

      server = new FakeServer('/:queueName/:jobId', middleware);
      await server.startFakeServer();

      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}/${job.id}`);

      const expectedBody = expectedWaitingResult(job);
      expect(response.data.jobDetailsCustom).to.be.eql(expectedBody);
    });
  });
});
