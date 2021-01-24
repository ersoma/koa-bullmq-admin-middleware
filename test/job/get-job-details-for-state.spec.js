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

  describe('works with custom getQueue parameter', () => {
    it('should throw an error if getQueue does not return a BullMQ queue instance', async () => {
      const middleware = middlewareFactory([queue], {
        getQueue: () => {}
      });
      const fakeCtx = {
        params: {}
      };

      await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'queue not found');
    });

    it('should set the details in default location', async () => {
      const middleware = middlewareFactory([queue], {
        getQueue: (ctx, queues) => queues.find(q => ctx.state.queueCustomName === q.name)
      });
      const fakeCtx = {
        params: {
          queueName: queue.name,
          state: 'waiting'
        },
        query: {},
        state: {
          queueCustomName: queue.name
        }
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.bullMqAdmin).to.be.eql(getExpectedResult(job));
    });
  });

  describe('works with custom getState parameter', () => {
    it('should throw an error if getQueue does not return a BullMQ queue instance', async () => {
      const middleware = middlewareFactory([queue], {
        getState: () => {}
      });
      const fakeCtx = {
        params: {
          queueName: queue.name
        }
      };

      await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'state is invalid');
    });

    it('should set the details in default location', async () => {
      const middleware = middlewareFactory([queue], {
        getState: ctx => ctx.state.customStateName
      });
      const fakeCtx = {
        params: {
          queueName: queue.name
        },
        query: {},
        state: {
          customStateName: 'waiting'
        }
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.bullMqAdmin).to.be.eql(getExpectedResult(job));
    });
  });

  describe('works with custom getPagination parameter', () => {
    it('should throw error if pagination does\'t return an object', async () => {
      const middleware = middlewareFactory([queue], {
        getPagination: () => 'pagination'
      });
      const fakeCtx = {
        params: {
          queueName: queue.name,
          state: 'waiting'
        }
      };

      const errorMessage = 'getPagination must return an object';
      await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, errorMessage);
    });

    [
      'pageSize',
      'start'
    ].forEach(key =>
      it(`should throw error if pagination has missing ${key} key`, async () => {
        const pagination = {
          pageSize: 10,
          start: 0
        };
        delete pagination[key];
        const middleware = middlewareFactory([queue], {
          getPagination: () => pagination
        });
        const fakeCtx = {
          params: {
            queueName: queue.name,
            state: 'waiting'
          }
        };

        const errorMessage = `getPagination\'s ${key} key must be a number`;
        await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, errorMessage);
      })
    );

    it('should set the details in default location for not empty state', async () => {
      const middleware = middlewareFactory([queue], {
        getPagination: () => ({
          pageSize: 100,
          start: 10
        })
      });
      const fakeCtx = {
        params: {
          queueName: queue.name,
          state: 'waiting'
        },
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      const expectedResult = getExpectedResult(job);
      expectedResult.pagination.pageSize = 100;
      expectedResult.pagination.start = 10;
      expect(fakeCtx.state.bullMqAdmin).to.be.eql(expectedResult);
    });
  });

  describe('works with custom storeResult parameter', () => {
    it('should set the details in custom location', async () => {
      const middleware = middlewareFactory([queue], {
        storeResult: (ctx, jobs, pagination) => {
          ctx.state.jobsDetails = jobs;
          ctx.state.pagination = pagination;
        }
      });
      const fakeCtx = {
        params: {
          queueName: queue.name,
          state: 'waiting'
        },
        query: {},
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state).to.be.eql(getExpectedResult(job));
    });
  });
});
