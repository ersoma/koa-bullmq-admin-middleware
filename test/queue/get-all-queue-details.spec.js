'use strict';

const Queue = require('bullmq').Queue;

const ParameterError = require('../../src/parameter-error');
const middlewareFactory = require('../../src/queue/get-all-queue-details');

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
    it('should export a factory function', () => {
      expect(middlewareFactory).to.be.a('function');
    });

    it('should return a function when called', () => {
      const emptyQueues = [];
      const middleware = middlewareFactory(emptyQueues);
      expect(middleware).to.be.a('function');
    });

    it('should throw an error if required queues parameter is missing for factory', () => {
      expect(middlewareFactory).to.throw(ParameterError, 'queues parameter is required');
    });

    it('should throw an error if required queues parameter is not an array for factory', () => {
      const shouldThrow = () => middlewareFactory('not array');
      expect(shouldThrow).to.throw(ParameterError, 'queues parameter must be an array');
    });

    it('should throw an error if members of the queues parameter are not BullMQ queues', () => {
      const shouldThrow = () => middlewareFactory(['not a Queue']);
      expect(shouldThrow).to.throw(ParameterError, 'items in the queues parameter must be BullMQ Queues');
    });

    it('should throw an error if optional storeResult parameter is not a function', () => {
      const shouldThrow = () => middlewareFactory([], {
        storeResult: 'not a function'
      });
      expect(shouldThrow).to.throw(ParameterError, 'storeResult parameter must be a function');
    });
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
