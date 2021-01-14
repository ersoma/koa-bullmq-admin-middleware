'use strict';

const { Queue, Job } = require('bullmq');

const ParameterError = require('../parameter-error');
const parameterValidator = require('../parameter-validator');

module.exports = (queues, {
  getQueue = (ctx, queues) => queues.find(q => ctx.params.queueName === q.name),
  getJob = (ctx, queue) => queue.getJob(ctx.params.jobId),
  storeResult = (ctx, result) => {
    ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
    ctx.state.bullMqAdmin.jobDetails = result;
  }
} = {}) => {
  parameterValidator.queues(queues);
  parameterValidator.optionalFunction(getQueue, 'getQueue');
  parameterValidator.optionalFunction(getJob, 'getJob');
  parameterValidator.optionalFunction(storeResult, 'storeResult');

  return async (ctx, next) => {
    const queue = getQueue(ctx, queues);
    if (queue instanceof Queue === false) {
      throw new ParameterError('queue not found');
    }

    const job = await getJob(ctx, queue);

    if (job instanceof Job === false) {
      throw new ParameterError('job not found');
    }

    const result = {
      ...job.asJSON(),
      state: await job.getState()
    };
    storeResult(ctx, result);

    await next();
  };
};
