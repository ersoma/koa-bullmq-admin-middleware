'use strict';

const Queue = require('bullmq').Queue;

const ParameterError = require('../parameter-error');

module.exports = (
  queues, {
    getQueue = (ctx, queues) => queues.find(q => ctx.params.queueName === q.name),
    storeResult = (ctx, result) => ctx.state.bullMqAdmin.queueDetails = result
  } = {}) => {
  if (!queues) {
    throw new ParameterError('queues parameter is required');
  }

  if (Array.isArray(queues) === false) {
    throw new ParameterError('queues parameter must be an array');
  }

  if (queues.every(i => i instanceof Queue) === false) {
    throw new ParameterError('items in the queues parameter must be BullMQ Queues');
  }

  if (getQueue instanceof Function === false) {
    throw new ParameterError('getQueue parameter must be a function');
  }

  if (storeResult instanceof Function === false) {
    throw new ParameterError('storeResult parameter must be a function');
  }

  return async (ctx, next) => {
    const queue = getQueue(ctx, queues);
    if (queue instanceof Queue === false) {
      throw new ParameterError('queue not found');
    }

    const result = {
      name: queue.name,
      isPaused: await queue.isPaused(),
      activeCount: await queue.getActiveCount(),
      completedCount: await queue.getCompletedCount(),
      delayedCount: await queue.getDelayedCount(),
      failedCount: await queue.getFailedCount(),
      waitingCount: await queue.getWaitingCount()
    };

    storeResult(ctx, result);
    await next();
  };
};
