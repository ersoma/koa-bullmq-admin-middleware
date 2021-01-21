'use strict';

const { Queue } = require('bullmq');

const ParameterError = require('../parameter-error');

module.exports = (queues, {
  getQueue = (ctx, queues) => queues.find(q => ctx.params.queueName === q.name),
  getState = ctx => ctx.params.state,
  getPagination = ctx => ({
    pageSize: parseInt(ctx.query['page-size']) || 10,
    start: parseInt(ctx.query.start) || 0
  }),
  storeResult = (ctx, jobs, pagination) => {
    ctx.state.bullMqAdmin = ctx.state.bullMqAdmin || {};
    ctx.state.bullMqAdmin.jobsDetails = jobs;
    ctx.state.bullMqAdmin.pagination = pagination;
  }
} = {}) => {

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

  if (getState instanceof Function === false) {
    throw new ParameterError('getState parameter must be a function');
  }

  if (getPagination instanceof Function === false) {
    throw new ParameterError('getPagination parameter must be a function');
  }

  if (storeResult instanceof Function === false) {
    throw new ParameterError('storeResult parameter must be a function');
  }

  return async (ctx, next) => {
    const queue = getQueue(ctx, queues);
    if (queue instanceof Queue === false) {
      throw new ParameterError('queue not found');
    }

    const jobGetters = {
      waiting: {
        list: queue.getWaiting.bind(queue),
        count: queue.getWaitingCount.bind(queue)
      },
      active: {
        list: queue.getActive.bind(queue),
        count: queue.getActiveCount.bind(queue)
      },
      delayed: {
        list: queue.getDelayed.bind(queue),
        count: queue.getDelayedCount.bind(queue)
      },
      completed: {
        list: queue.getCompleted.bind(queue),
        count: queue.getCompletedCount.bind(queue)
      },
      failed: {
        list: queue.getFailed.bind(queue),
        count: queue.getFailedCount.bind(queue)
      }
    };

    const state = getState(ctx);
    const stateIsValid = Object.keys(jobGetters).some(v => state === v);
    if (stateIsValid === false) {
      throw new ParameterError('state is invalid');
    }

    const pagination = getPagination(ctx);

    const end = pagination.start + pagination.pageSize - 1;
    const jobs = await jobGetters[state].list(pagination.start, end);
    const jobsJson = jobs.map(job => ({
      ...job.asJSON(),
      state
    }));

    pagination.count = await jobGetters[state].count();

    storeResult(ctx, jobsJson, pagination);

    await next();
  };
};
