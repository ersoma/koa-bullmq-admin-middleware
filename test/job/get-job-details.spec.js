'use strict';

const { Queue } = require('bullmq');

const ParameterError = require('../../src/parameter-error');
const middlewareFactory = require('../../src/job/get-job-details');
const middlewareTests = require('../middleware/middleware-factory-tests');

describe('getJobDetailsMiddleware', () => {

  let queue;
  let job;
  before(async () => {
    queue = new Queue('test');
    const allTypes = ['completed', 'wait', 'active', 'paused', 'delayed', 'failed'].map(v => queue.clean(0, 0, v));
    await Promise.all(allTypes);
    job = await queue.add('job');
  });
  after(() => {
    queue.close();
  });

  let fakeNext;
  beforeEach(() => {
    fakeNext = global.sandbox.stub();
  });

  const expectedJodDetailsKeys = [
    'id', 'name', 'data', 'opts', 'progress', 'attemptsMade', 'finishedOn', 'processedOn',
    'timestamp', 'failedReason', 'stacktrace', 'returnvalue', 'state'
  ];
  const getExpectedJobDetails = async () => ({
    ...(await queue.getJob(job.id)).asJSON(),
    state: 'waiting'
  });

  describe('works as a Koa middleware', () => {
    middlewareTests.shouldExportFactoryFunction(middlewareFactory);

    middlewareTests.shouldReturnFunctionWhenCalled(middlewareFactory);

    middlewareTests.shouldThrowErrorQueueParameterMissing(middlewareFactory);

    middlewareTests.shouldThrowErrorQueueParameterNotArray(middlewareFactory);

    middlewareTests.shouldThrowErrorQueueParameterMembersNotBullMq(middlewareFactory);

    middlewareTests.shouldThrowErrorOptionalParameterNotFunction(middlewareFactory, 'getQueue');

    middlewareTests.shouldThrowErrorOptionalParameterNotFunction(middlewareFactory, 'getJob');

    middlewareTests.shouldThrowErrorOptionalParameterNotFunction(middlewareFactory, 'storeResult');
  });

  describe('works with default parameters', () => {
    it('should throw error if queue is not found', async () => {
      const middleware = middlewareFactory([queue]);
      const fakeCtx = {
        params: {
          queueName: 'wrong-name'
        }
      };

      await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'queue not found');
    });

    it('should throw error if job is not found', async () => {
      const middleware = middlewareFactory([queue]);
      const fakeCtx = {
        params: {
          queueName: queue.name,
          jobId: 'wrong-id'
        }
      };

      await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'job not found');
    });

    it('should call next if queue is found', async () => {
      const middleware = middlewareFactory([queue]);

      const fakeCtx = {
        params: {
          queueName: queue.name,
          jobId: job.id
        },
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeNext).to.be.calledOnce;
    });

    it('should call next after storeResult is called', async () => {
      const fakeStoreResult = global.sandbox.stub();
      const middleware = middlewareFactory([queue], { storeResult: fakeStoreResult });
      const fakeCtx = {
        params: {
          queueName: queue.name,
          jobId: job.id
        },
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeStoreResult).to.be.calledBefore(fakeNext);
    });

    it('should set the details in default location', async () => {
      const middleware = middlewareFactory([queue]);
      const fakeCtx = {
        params: {
          queueName: queue.name,
          jobId: job.id
        },
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.bullMqAdmin.jobDetails).to.be.eql(await getExpectedJobDetails());
      expect(fakeCtx.state.bullMqAdmin.jobDetails).to.have.all.keys(expectedJodDetailsKeys);
    });
  });

  describe('works with custom getQueue parameter', () => {
    it('should throw an error if getQueue does not return a BullMQ queue instance', async () => {
      const middleware = middlewareFactory([queue], {
        getQueue: () => {}
      });
      const fakeCtx = {
        params: {
          queueName: queue.name
        }
      };

      await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'queue not found');
    });

    it('should set the details in default location', async () => {
      const middleware = middlewareFactory([queue], {
        getQueue: (ctx, queues) => queues.find(q => ctx.state.queueCustomName === q.name)
      });
      const fakeCtx = {
        params: {
          jobId: job.id
        },
        state: {
          queueCustomName: queue.name,
          bullMqAdmin: {}
        }
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.bullMqAdmin.jobDetails).to.be.eql(await getExpectedJobDetails());
      expect(fakeCtx.state.bullMqAdmin.jobDetails).to.have.all.keys(expectedJodDetailsKeys);
    });
  });

  describe('works with custom getJob parameter', () => {
    it('should throw an error if getJob does not return a BullMQ Job instance', async () => {
      const middleware = middlewareFactory([queue], {
        getJob: () => {}
      });
      const fakeCtx = {
        params: {
          queueName: queue.name,
          jobId: job.id
        }
      };

      await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'job not found');
    });

    it('should set the details in default location', async () => {
      const middleware = middlewareFactory([queue], {
        getJob: (ctx, queue) => queue.getJob(ctx.state.jobId)
      });
      const fakeCtx = {
        params: {
          queueName: queue.name
        },
        state: {
          jobId: job.id,
          bullMqAdmin: {}
        }
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.bullMqAdmin.jobDetails).to.be.eql(await getExpectedJobDetails());
      expect(fakeCtx.state.bullMqAdmin.jobDetails).to.have.all.keys(expectedJodDetailsKeys);
    });
  });

  describe('works with custom storeResult parameter', () => {

    it('should set the details in custom location', async () => {
      const middleware = middlewareFactory([queue], {
        storeResult: (ctx, result) => ctx.state.customJobDetails = result
      });
      const fakeCtx = {
        params: {
          queueName: queue.name,
          jobId: job.id
        },
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.customJobDetails).to.be.eql(await getExpectedJobDetails());
      expect(fakeCtx.state.customJobDetails).to.have.all.keys(expectedJodDetailsKeys);
    });
  });
});
