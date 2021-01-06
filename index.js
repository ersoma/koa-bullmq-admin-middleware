'use strict';

const getQueueDetailsFactory = require('./src/queue/get-queue-details');

const ParameterError = require('./src/parameter-error');

module.exports = {
  getQueueDetailsFactory,
  ParameterError
};
