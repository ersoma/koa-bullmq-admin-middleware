'use strict';

const ParameterError = require('../../src/parameter-error');

const middlewareFactory = require('../../src/queue/get-queue-details');

describe('getQueueDetailsMiddleware', () => {

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

  });
});
