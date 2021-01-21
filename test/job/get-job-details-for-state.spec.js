'use strict';

const { Queue } = require('bullmq');

const ParameterError = require('../../src/parameter-error');
const middlewareFactory = require('../../src/job/get-job-details-for-state');
const middlewareTests = require('../middleware/middleware-factory-tests');

describe('getJobDetailsForStateMiddleware', () => {
  let timestamp;
  const getExpectedResult = job => ({
    jobsDetails: [{
      id: job.id,
      name: job.name,
      state: 'waiting',
      attemptsMade: 0,
      data: '{}',
      failedReason: void 0,
      finishedOn: void 0,
      opts: JSON.stringify({ attempts: 0, delay: 0 }),
      processedOn: void 0,
      progress: 0,
      returnvalue: 'null',
      stacktrace: 'null',
      timestamp
    }],
    pagination: {
      start: 0,
      pageSize: 10,
      count: 1
    }
  });

  const resetStubIfExists = (targetObject, functionName) => {
    if (targetObject[functionName] && targetObject[functionName].restore && targetObject[functionName].restore.sinon) {
      targetObject[functionName].restore();
    }
  };

  let fakeNext;
  beforeEach(() => {
    fakeNext = global.sandbox.stub();
    global.sandbox.stub(Date, 'now').returns(timestamp);
    global.sandbox.stub(queue, 'getWaiting').resolves([job]);
    global.sandbox.stub(queue, 'getWaitingCount').resolves(1);
  });

  let queue;
  let job;
  before(async () => {
    queue = new Queue('test');
    const allTypes = ['completed', 'wait', 'active', 'paused', 'delayed', 'failed'].map(v => queue.clean(0, 0, v));
    await Promise.all(allTypes);
    job = await queue.add('test job');
    timestamp = job.timestamp;
  });
  after(() => {
    queue.close();
  });

  describe('works as a Koa middleware', () => {
    middlewareTests.shouldExportFactoryFunction(middlewareFactory);

    middlewareTests.shouldReturnFunctionWhenCalled(middlewareFactory);

    middlewareTests.shouldThrowErrorQueueParameterMissing(middlewareFactory);

    middlewareTests.shouldThrowErrorQueueParameterNotArray(middlewareFactory);

    middlewareTests.shouldThrowErrorQueueParameterMembersNotBullMq(middlewareFactory);

    middlewareTests.shouldThrowErrorOptionalParameterNotFunction(middlewareFactory, 'getQueue');

    middlewareTests.shouldThrowErrorOptionalParameterNotFunction(middlewareFactory, 'getState');

    middlewareTests.shouldThrowErrorOptionalParameterNotFunction(middlewareFactory, 'getPagination');

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

    it('should throw error if state is not valid', async () => {
      const middleware = middlewareFactory([queue]);
      const fakeCtx = {
        params: {
          queueName: queue.name,
          state: 'invalid'
        }
      };

      await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'state is invalid');
    });

    it('should call next if queue is found', async () => {
      const middleware = middlewareFactory([queue]);

      const fakeCtx = {
        params: {
          queueName: queue.name,
          state: 'waiting'
        },
        query: {},
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
          state: 'waiting'
        },
        query: {},
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeStoreResult).to.be.calledBefore(fakeNext);
    });

    [
      'waiting',
      'active',
      'delayed',
      'completed',
      'failed'
    ].forEach(state =>
      it(`should query with right pagination for ${state} state`, async () => {
        const start = 12;
        const pageSize = 34;
        const stateCapitalized = state.charAt(0).toUpperCase() + state.slice(1);
        resetStubIfExists(queue, `get${stateCapitalized}`);
        const stateGetterStub = global.sandbox.stub(queue, `get${stateCapitalized}`).resolves([]);
        const middleware = middlewareFactory([queue]);
        const fakeCtx = {
          params: {
            queueName: queue.name,
            state
          },
          query: {
            start,
            'page-size': pageSize
          },
          state: {}
        };

        await middleware(fakeCtx, fakeNext);

        expect(stateGetterStub).to.be.calledOnceWithExactly(start, start + pageSize - 1);
      })
    );

    [
      'waiting',
      'active',
      'delayed',
      'completed',
      'failed'
    ].forEach(state =>
      it(`should query with right job count for ${state} state`, async () => {
        const stateCapitalized = state.charAt(0).toUpperCase() + state.slice(1);
        resetStubIfExists(queue, `get${stateCapitalized}Count`);
        const stateCountGetterStub = global.sandbox.stub(queue, `get${stateCapitalized}Count`).resolves(99);
        const middleware = middlewareFactory([queue]);
        const fakeCtx = {
          params: {
            queueName: queue.name,
            state
          },
          query: {},
          state: {}
        };

        await middleware(fakeCtx, fakeNext);

        expect(stateCountGetterStub).to.be.called;
      })
    );

    it('should set the details in default location for empty queue', async () => {
      resetStubIfExists(queue, 'getWaiting');
      resetStubIfExists(queue, 'getWaitingCount');
      global.sandbox.stub(queue, 'getWaiting').resolves([]);
      global.sandbox.stub(queue, 'getWaitingCount').resolves(0);

      const middleware = middlewareFactory([queue]);
      const fakeCtx = {
        params: {
          queueName: queue.name,
          state: 'waiting'
        },
        query: {},
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      const expectedResult = {
        jobsDetails: [],
        pagination: {
          start: 0,
          pageSize: 10,
          count: 0
        }
      };
      expect(fakeCtx.state.bullMqAdmin).to.be.eql(expectedResult);
    });

    it('should set the details in default location for not empty state', async () => {
      const middleware = middlewareFactory([queue]);
      const fakeCtx = {
        params: {
          queueName: queue.name,
          state: 'waiting'
        },
        query: {},
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.bullMqAdmin).to.be.eql(getExpectedResult(job));
    });
  });

});
