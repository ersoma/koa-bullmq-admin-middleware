'use strict';

const ParameterError = require('../../src/parameter-error');

module.exports = {
  shouldExportFactoryFunction: middlewareFactory => {
    it('should export a factory function', () => {
      expect(middlewareFactory).to.be.a('function');
    });
  },
  shouldReturnFunctionWhenCalled: middlewareFactory => {
    it('should return a function when called', () => {
      const queues = [];
      const middleware = middlewareFactory(queues);
      expect(middleware).to.be.a('function');
    });
  },
  shouldThrowErrorQueueParameterMissing: middlewareFactory => {
    it('should throw an error if required queues parameter is missing for factory', () => {
      expect(middlewareFactory).to.throw(ParameterError, 'queues parameter is required');
    });
  },
  shouldThrowErrorQueueParameterNotArray: middlewareFactory => {
    it('should throw an error if required queues parameter is not an array for factory', () => {
      const shouldThrow = () => middlewareFactory('not array');
      expect(shouldThrow).to.throw(ParameterError, 'queues parameter must be an array');
    });
  },
  shouldThrowErrorQueueParameterMembersNotBullMq: middlewareFactory => {
    it('should throw an error if members of the queues parameter are not BullMQ queues', () => {
      const shouldThrow = () => middlewareFactory(['not a Queue']);
      expect(shouldThrow).to.throw(ParameterError, 'items in the queues parameter must be BullMQ Queues');
    });
  },
  shouldThrowErrorOptionalParameterNotFunction: (middlewareFactory, parameter) => {
    it(`should throw an error if optional ${parameter} parameter is not a function`, () => {
      const shouldThrow = () => middlewareFactory([], {
        [parameter]: 'not a function'
      });
      expect(shouldThrow).to.throw(ParameterError, `${parameter} parameter must be a function`);
    });
  }
};
