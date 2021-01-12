'use strict';

const getQueueDetailsFactory = require('./src/queue/get-queue-details');
const getAllQueueDetailsFactory = require('./src/queue/get-all-queue-details');

const ParameterError = require('./src/parameter-error');

module.exports = {
  getQueueDetailsFactory,
  getAllQueueDetailsFactory,
  ParameterError
};
