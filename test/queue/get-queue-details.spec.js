'use strict';

const Queue = require('bullmq').Queue;

const ParameterError = require('../../src/parameter-error');
const middlewareFactory = require('../../src/queue/get-queue-details');

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
    it('should export a factory function', () => {
      expect(middlewareFactory).to.be.a('function');
    });

    it('should return a function when called', () => {
      const queues = [];
      const middleware = middlewareFactory(queues);
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

    it('should throw an error if optional getQueue parameter is not a function', () => {
      const shouldThrow = () => middlewareFactory([], {
        getQueue: 'not a function'
      });
      expect(shouldThrow).to.throw(ParameterError, 'getQueue parameter must be a function');
    });

    it('should throw an error if optional storeResult parameter is not a function', () => {
      const shouldThrow = () => middlewareFactory([], {
        storeResult: 'not a function'
      });
      expect(shouldThrow).to.throw(ParameterError, 'storeResult parameter must be a function');
    });
  });

  describe('works with default parameters', () => {

    it('should throw error if queue is not found', async () => {
      const middleware = middlewareFactory([queue]);
      const fakeCtx = {
        params: {
          queueName: 'not-test'
        }
      };

      expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'queue not found');
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

      expect(middleware(fakeCtx, null)).to.be.rejectedWith(ParameterError, 'queue not found');
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
