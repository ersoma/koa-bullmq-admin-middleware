'use strict';

const axios = require('axios');
const { Queue } = require('bullmq');

const FakeServer = require('./fake-server');
const prepareQueue = require('../prepare-queue');
const { getJobDetailsForStateFactory } = require('../..');

describe('Tests getJobDetailsForState middleware', () => {
  const selectedQueue = new Queue('test');
  let queues = [selectedQueue];
  let server;

  afterEach(async () => {
    if (server) {
      await server.stopFakeServer();
    }
  });
  after(async () => {
    await Promise.all(queues.map(q => q.close()));
  });

  describe('with default parameters', () => {
    it('should respond all waiting jobs', async () => {
      await prepareQueue.setQueueJobs(selectedQueue, true, { waitingCount: 5 });
      const middleware = getJobDetailsForStateFactory(queues);

      server = new FakeServer('/:queueName/:state', middleware);
      await server.startFakeServer();
      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}/waiting`);

      const expectedPagination = {
        count: 5,
        pageSize: 10,
        start: 0
      };
      const expectedJobsDetailsCount = 5;
      expect(response.data.pagination).to.be.eql(expectedPagination);
      expect(response.data.jobsDetails).to.have.length(expectedJobsDetailsCount);
    });

    it('should respond pageSize number of waiting jobs', async () => {
      await prepareQueue.setQueueJobs(selectedQueue, true, { waitingCount: 20 });
      const middleware = getJobDetailsForStateFactory(queues);

      server = new FakeServer('/:queueName/:state', middleware);
      await server.startFakeServer();
      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}/waiting`);

      const expectedPagination = {
        count: 20,
        pageSize: 10,
        start: 0
      };
      const expectedJobsDetailsCount = 10;
      expect(response.data.pagination).to.be.eql(expectedPagination);
      expect(response.data.jobsDetails).to.have.length(expectedJobsDetailsCount);
    });

    it('should respond the proper jobs when paginating', async () => {
      await prepareQueue.setQueueJobs(selectedQueue, true, { waitingCount: 20 });
      const middleware = getJobDetailsForStateFactory(queues);

      server = new FakeServer('/:queueName/:state', middleware);
      await server.startFakeServer();
      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}/waiting?page-size=5&start=10`);

      const expectedPagination = {
        count: 20,
        pageSize: 5,
        start: 10
      };
      const expectedNames = ['job-waiting-10', 'job-waiting-11', 'job-waiting-12', 'job-waiting-13', 'job-waiting-14'];
      expect(response.data.pagination).to.be.eql(expectedPagination);
      expect(response.data.jobsDetails.map(i => i.name)).to.be.eql(expectedNames);
    });

    it('should respond empty array when paginating out of range', async () => {
      await prepareQueue.setQueueJobs(selectedQueue, true, { waitingCount: 5 });
      const middleware = getJobDetailsForStateFactory(queues);

      server = new FakeServer('/:queueName/:state', middleware);
      await server.startFakeServer();
      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}/waiting?page-size=5&start=10`);

      const expectedPagination = {
        count: 5,
        pageSize: 5,
        start: 10
      };
      expect(response.data.pagination).to.be.eql(expectedPagination);
      expect(response.data.jobsDetails).to.be.eql([]);
    });
  });

  describe('with custom getQueue parameter', () => {
    it('should respond all waiting jobs', async () => {
      await prepareQueue.setQueueJobs(selectedQueue, true, { waitingCount: 5 });
      const middleware = getJobDetailsForStateFactory(queues, {
        getQueue: (ctx, queues) => queues.find(q => ctx.headers['queue-name'] === q.name)
      });

      server = new FakeServer('/:state', middleware);
      await server.startFakeServer();
      const response = await axios.get(`${server.baseUrl}/waiting`, {
        headers: { 'queue-name': selectedQueue.name }
      });

      const expectedPagination = {
        count: 5,
        pageSize: 10,
        start: 0
      };
      const expectedJobsDetailsCount = 5;
      expect(response.data.pagination).to.be.eql(expectedPagination);
      expect(response.data.jobsDetails).to.have.length(expectedJobsDetailsCount);
    });
  });

  describe('with custom getState parameter', () => {
    it('should respond all waiting jobs', async () => {
      await prepareQueue.setQueueJobs(selectedQueue, true, { waitingCount: 5 });
      const middleware = getJobDetailsForStateFactory(queues, {
        getState: ctx => ctx.headers['state-name']
      });

      server = new FakeServer('/:queueName', middleware);
      await server.startFakeServer();
      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}`, {
        headers: { 'state-name': 'waiting' }
      });

      const expectedPagination = {
        count: 5,
        pageSize: 10,
        start: 0
      };
      const expectedJobsDetailsCount = 5;
      expect(response.data.pagination).to.be.eql(expectedPagination);
      expect(response.data.jobsDetails).to.have.length(expectedJobsDetailsCount);
    });
  });

  describe('with custom getPagination parameter', () => {
    it('should respond the proper jobs when paginating', async () => {
      await prepareQueue.setQueueJobs(selectedQueue, true, { waitingCount: 20 });
      const middleware = getJobDetailsForStateFactory(queues, {
        getPagination: ctx => ({
          pageSize: parseInt(ctx.query.customPageSize),
          start: parseInt(ctx.query.customStart)
        })
      });

      server = new FakeServer('/:queueName/:state', middleware);
      await server.startFakeServer();
      const url = `${server.baseUrl}/${selectedQueue.name}/waiting?customPageSize=5&customStart=10`;
      const response = await axios.get(url);

      const expectedPagination = {
        count: 20,
        pageSize: 5,
        start: 10
      };
      const expectedNames = ['job-waiting-10', 'job-waiting-11', 'job-waiting-12', 'job-waiting-13', 'job-waiting-14'];
      expect(response.data.pagination).to.be.eql(expectedPagination);
      expect(response.data.jobsDetails.map(i => i.name)).to.be.eql(expectedNames);
    });
  });

  describe('with custom storeResult parameter', () => {
    it('should respond all waiting jobs', async () => {
      await prepareQueue.setQueueJobs(selectedQueue, true, { waitingCount: 5 });
      const middleware = getJobDetailsForStateFactory(queues, {
        storeResult: (ctx, jobs, pagination) => {
          ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
          ctx.state.bullMqAdmin.jobsDetailsCustom = jobs;
          ctx.state.bullMqAdmin.paginationCustom = pagination;
        }
      });

      server = new FakeServer('/:queueName/:state', middleware);
      await server.startFakeServer();
      const response = await axios.get(`${server.baseUrl}/${selectedQueue.name}/waiting`);

      const expectedPagination = {
        count: 5,
        pageSize: 10,
        start: 0
      };
      const expectedJobsDetailsCount = 5;
      expect(response.data.paginationCustom).to.be.eql(expectedPagination);
      expect(response.data.jobsDetailsCustom).to.have.length(expectedJobsDetailsCount);
    });
  });
});
