'use strict';

const { Queue, Job } = require('bullmq');

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
  queue: queue => {
    if (queue instanceof Queue === false) {
      throw new ParameterError('queue not found');
    }
  },
  job: job => {
    if (job instanceof Job === false) {
      throw new ParameterError('job not found');
    }
  },
  optionalFunction: (parameter, name) => {
    if (parameter instanceof Function === false) {
      throw new ParameterError(`${name} parameter must be a function`);
    }
  },
  stringMemberOfArray: (item, array, name) => {
    const itemIsValid = array.some(v => item === v);
    if (itemIsValid === false) {
      throw new ParameterError(`${name} is invalid`);
    }
  },
  objectWithNumbericKeys: (parameter, name, keys) => {
    if (typeof parameter !== 'object' || parameter === null) {
      throw new ParameterError(`${name} must return an object`);
    }
    keys.forEach(key => {
      if (typeof parameter[key] !== 'number') {
        throw new ParameterError(`${name}'s ${key} key must be a number`);
      }
    });
  }
};
