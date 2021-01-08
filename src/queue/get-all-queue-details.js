'use strict';

const { Queue } = require('bullmq');

const ParameterError = require('../parameter-error');
const getQueueDetailsFactory = require('./get-queue-details');

class GetAllQueueDetailsMiddleware {
  constructor(queues, {
    storeResult = (ctx, result) => {
      ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
      ctx.state.bullMqAdmin.allQueueDetails = result;
    }
  }) {
    this.queues = queues;
    this.storeResult = storeResult;

    this._validateParameters();
  }

  async execute(ctx, next) {
    const results = [];

    for (let i = 0; i < this.queues.length; i++) {
      const getQueueDetails = await getQueueDetailsFactory(this.queues, {
        getQueue: (_, queues) => queues[i],
        storeResult: (_, result) => results.push(result)
      });
      await getQueueDetails(ctx, () => {});
    }

    this.storeResult(ctx, results);

    await next();
  }

  _validateParameters() {
    if (!this.queues) {
      throw new ParameterError('queues parameter is required');
    }

    if (Array.isArray(this.queues) === false) {
      throw new ParameterError('queues parameter must be an array');
    }

    if (this.queues.every(i => i instanceof Queue) === false) {
      throw new ParameterError('items in the queues parameter must be BullMQ Queues');
    }

    if (this.storeResult instanceof Function === false) {
      throw new ParameterError('storeResult parameter must be a function');
    }
  }
}

module.exports = (queues, config = {}) => {
  const instance = new GetAllQueueDetailsMiddleware(queues, config);
  return async (ctx, next) => instance.execute(ctx, next);
};
