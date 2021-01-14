'use strict';

const Queue = require('bullmq').Queue;

const ParameterError = require('../../src/parameter-error');
const middlewareFactory = require('../..').getQueueDetailsFactory;
const middlewareTests = require('../middleware/middleware-factory-tests');

describe('getQueueDetailsMiddleware', () => {

  const stubQueueGetters = queue => {
    global.sandbox.stub(queue, 'isPaused').resolves(true);
    global.sandbox.stub(queue, 'getActiveCount').resolves(1);
    global.sandbox.stub(queue, 'getCompletedCount').resolves(2);
    global.sandbox.stub(queue, 'getDelayedCount').resolves(3);
    global.sandbox.stub(queue, 'getFailedCount').resolves(4);
    global.sandbox.stub(queue, 'getWaitingCount').resolves(5);
  };

  const expectedQueueDetails = {
    name: 'test',
    isPaused: true,
    activeCount: 1,
    completedCount: 2,
    delayedCount: 3,
    failedCount: 4,
    waitingCount: 5
  };

  let fakeNext;
  beforeEach(() => {
    fakeNext = global.sandbox.stub();
  });

  let queue;
  before(() => {
    queue = new Queue('test');
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

    middlewareTests.shouldThrowErrorOptionalParameterNotFunction(middlewareFactory, 'storeResult');
  });

  describe('works with default parameters', () => {

    it('should throw error if queue is not found', async () => {
      const middleware = middlewareFactory([queue]);
      const fakeCtx = {
        params: {
          queueName: 'not-test'
        }
      };

      await expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'queue not found');
    });

    it('should call next if queue is found', async () => {
      const middleware = middlewareFactory([queue]);

      const fakeCtx = {
        params: {
          queueName: 'test'
        },
        state: {
          bullMqAdmin: {}
        }
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeNext).to.be.calledOnce;
    });

    it('should call next after storeResult is called', async () => {
      const fakeStoreResult = global.sandbox.stub();
      const middleware = middlewareFactory([queue], { storeResult: fakeStoreResult });
      const fakeCtx = {
        params: {
          queueName: 'test'
        }
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeStoreResult).to.be.calledBefore(fakeNext);
    });

    it('should set the details in default location', async () => {
      const middleware = middlewareFactory([queue]);
      stubQueueGetters(queue);
      const fakeCtx = {
        params: {
          queueName: 'test'
        },
        state: {
          bullMqAdmin: {}
        }
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.bullMqAdmin.queueDetails).to.be.eql(expectedQueueDetails);
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
      stubQueueGetters(queue);
      const fakeCtx = {
        state: {
          queueCustomName: 'test',
          bullMqAdmin: {}
        }
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.bullMqAdmin.queueDetails).to.be.eql(expectedQueueDetails);
    });
  });

  describe('works with custom storeResult parameter', () => {

    it('should set the details in custom location', async () => {
      const middleware = middlewareFactory([queue], {
        storeResult: (ctx, result) => ctx.state.customQueueDetails = result
      });
      stubQueueGetters(queue);
      const fakeCtx = {
        params: {
          queueName: 'test'
        },
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.customQueueDetails).to.be.eql(expectedQueueDetails);
    });
  });
});
