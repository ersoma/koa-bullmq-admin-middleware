'use strict';

const { Queue, Job } = require('bullmq');

const ParameterError = require('../parameter-error');
const parameterValidator = require('../parameter-validator');

class GetJobDetailsMiddleware {
  constructor(queues, {
    getQueue = (ctx, queues) => queues.find(q => ctx.params.queueName === q.name),
    getJob = (ctx, queue) => queue.getJob(ctx.params.jobId),
    storeResult = (ctx, result) => {
      ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
      ctx.state.bullMqAdmin.jobDetails = result;
    }
  }) {
    this.queues = queues;
    this.getQueue = getQueue;
    this.getJob = getJob;
    this.storeResult = storeResult;

    this._validateParameters();
  }

  async execute(ctx, next) {
    const queue = this.getQueue(ctx, this.queues);
    this._validateQueue(queue);

    const job = await this.getJob(ctx, queue);
    this._validateJob(job);

    const result = {
      ...job.asJSON(),
      state: await job.getState()
    };
    this.storeResult(ctx, result);

    await next();
  }

  _validateParameters() {
    parameterValidator.queues(this.queues);
    parameterValidator.optionalFunction(this.getQueue, 'getQueue');
    parameterValidator.optionalFunction(this.getJob, 'getJob');
    parameterValidator.optionalFunction(this.storeResult, 'storeResult');
  }

  _validateQueue(queue) {
    if (queue instanceof Queue === false) {
      throw new ParameterError('queue not found');
    }
  }

  _validateJob(job) {
    if (job instanceof Job === false) {
      throw new ParameterError('job not found');
    }
  }
}

module.exports = (queues, config = {}) => {
  const instance = new GetJobDetailsMiddleware(queues, config);
  return async (ctx, next) => instance.execute(ctx, next);
};
