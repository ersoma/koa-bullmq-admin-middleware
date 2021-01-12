'use strict';

const Queue = require('bullmq').Queue;

const middlewareFactory = require('../..').getAllQueueDetailsFactory;
const middlewareTests = require('../middleware/middleware-factory-tests');

describe('getAllQueueDetailsMiddleware', () => {

  const stubQueueGetters = queues => {
    queues.forEach((queue, i) => {
      global.sandbox.stub(queue, 'isPaused').resolves(i === 1);
      global.sandbox.stub(queue, 'getActiveCount').resolves(1 + i);
      global.sandbox.stub(queue, 'getCompletedCount').resolves(2 + i);
      global.sandbox.stub(queue, 'getDelayedCount').resolves(3 + i);
      global.sandbox.stub(queue, 'getFailedCount').resolves(4 + i);
      global.sandbox.stub(queue, 'getWaitingCount').resolves(5 + i);
    });
  };

  const expectedQueueDetails = queues => queues.map(q => ({
    name: q.name,
    isPaused: q.name.slice(-1) === '1',
    activeCount: +q.name.slice(-1) + 1,
    completedCount: +q.name.slice(-1) + 2,
    delayedCount: +q.name.slice(-1) + 3,
    failedCount: +q.name.slice(-1) + 4,
    waitingCount: +q.name.slice(-1) + 5
  }));

  let fakeNext;
  beforeEach(() => {
    fakeNext = global.sandbox.stub();
  });

  let queues;
  before(() => {
    queues = [new Queue('test-0'), new Queue('test-1')];
  });
  after(() => {
    queues.map(q => q.close());
  });

  describe('works as a Koa middleware', () => {
    middlewareTests.shouldExportFactoryFunction(middlewareFactory);

    middlewareTests.shouldReturnFunctionWhenCalled(middlewareFactory);

    middlewareTests.shouldThrowErrorQueueParameterMissing(middlewareFactory);

    middlewareTests.shouldThrowErrorQueueParameterNotArray(middlewareFactory);

    middlewareTests.shouldThrowErrorQueueParameterMembersNotBullMq(middlewareFactory);

    middlewareTests.shouldThrowErrorOptionalParameterNotFunction(middlewareFactory, 'storeResult');
  });

  describe('works with default parameters', () => {
    it('should call next', async () => {
      const middleware = middlewareFactory(queues);
      const fakeCtx = {
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeNext).to.be.calledOnce;
    });

    it('should call next after storeResult is called', async () => {
      const fakeStoreResult = global.sandbox.stub();
      const middleware = middlewareFactory(queues, { storeResult: fakeStoreResult });
      const fakeCtx = {};

      await middleware(fakeCtx, fakeNext);

      expect(fakeStoreResult).to.be.calledBefore(fakeNext);
    });

    it('should set the details in default location', async () => {
      const middleware = middlewareFactory(queues);
      stubQueueGetters(queues);
      const fakeCtx = {
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.bullMqAdmin.allQueueDetails).to.be.eql(expectedQueueDetails(queues));
    });
  });

  describe('works with custom storeResult parameter', () => {
    it('should set the details in custom location', async () => {
      const middleware = middlewareFactory(queues, {
        storeResult: (ctx, result) => ctx.state.customAllQueueDetails = result
      });
      stubQueueGetters(queues);
      const fakeCtx = {
        state: {}
      };

      await middleware(fakeCtx, fakeNext);

      expect(fakeCtx.state.customAllQueueDetails).to.be.eql(expectedQueueDetails(queues));
    });
  });
});
