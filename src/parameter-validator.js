'use strict';

const Queue = require('bullmq').Queue;

const ParameterError = require('./parameter-error');

module.exports = {
  queues: queues => {
    if (!queues) {
      throw new ParameterError('queues parameter is required');
    }

    if (Array.isArray(queues) === false) {
      throw new ParameterError('queues parameter must be an array');
    }

    if (queues.every(i => i instanceof Queue) === false) {
      throw new ParameterError('items in the queues parameter must be BullMQ Queues');
    }
  },
  optionalFunction: (parameter, name) => {
    if (parameter instanceof Function === false) {
      throw new ParameterError(`${name} parameter must be a function`);
    }
  }
};
