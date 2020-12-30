'use strict';

const Queue = require('bullmq').Queue;

const ParameterError = require('../parameter-error');

class GetQueueDetailsMiddleware {
  constructor(queues, {
    getQueue = (ctx, queues) => queues.find(q => ctx.params.queueName === q.name),
    storeResult = (ctx, result) => ctx.state.bullMqAdmin.queueDetails = result
  }) {
    this.queues = queues;
    this.getQueue = getQueue;
    this.storeResult = storeResult;

    this._validateParameters();
  }

  async execute(ctx, next) {
    const queue = this.getQueue(ctx, this.queues);
    if (queue instanceof Queue === false) {
      throw new ParameterError('queue not found');
    }

    const result = await this._getResult(queue);
    this.storeResult(ctx, result);

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

    if (this.getQueue instanceof Function === false) {
      throw new ParameterError('getQueue parameter must be a function');
    }

    if (this.storeResult instanceof Function === false) {
      throw new ParameterError('storeResult parameter must be a function');
    }
  }

  async _getResult(queue) {
    const promiseResults = await Promise.all([
      queue.isPaused().then(v => ({ isPaused: v })),
      queue.getActiveCount().then(v => ({ activeCount: v })),
      queue.getCompletedCount().then(v => ({ completedCount: v })),
      queue.getDelayedCount().then(v => ({ delayedCount: v })),
      queue.getFailedCount().then(v => ({ failedCount: v })),
      queue.getWaitingCount().then(v => ({ waitingCount: v }))
    ]);

    const nonPromiseResults = {
      name: queue.name
    };

    const mergedResults = promiseResults.reduce((p, c) => ({ ...p, ...c }), nonPromiseResults);
    return mergedResults;
  }
}

module.exports = (queues, config = {}) => {
  const instance = new GetQueueDetailsMiddleware(queues, config);
  return async (ctx, next) => instance.execute(ctx, next);
};
