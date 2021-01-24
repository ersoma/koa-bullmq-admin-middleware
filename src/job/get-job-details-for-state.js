'use strict';

const { Queue } = require('bullmq');

const ParameterError = require('../parameter-error');
const parameterValidator = require('../parameter-validator');

class GetJobDetailsForStateMiddleware {
  constructor(queues, {
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
  }) {
    this.queues = queues;
    this.getQueue = getQueue;
    this.getState = getState;
    this.getPagination = getPagination;
    this.storeResult = storeResult;

    this._validateParameters();
  }

  async execute(ctx, next) {
    const queue = this.getQueue(ctx, this.queues);
    this._validateQueue(queue);

    const jobGetters = this._getStateGetters(queue);

    const state = this.getState(ctx);
    this._validateState(state, Object.keys(jobGetters));

    const pagination = this.getPagination(ctx);
    this._validatePagination(pagination);

    const end = pagination.start + pagination.pageSize - 1;
    const jobs = await jobGetters[state].list(pagination.start, end);
    const jobsJson = jobs.map(job => ({
      ...job.asJSON(),
      state
    }));

    pagination.count = await jobGetters[state].count();

    this.storeResult(ctx, jobsJson, pagination);

    await next();
  }

  _validateParameters() {
    parameterValidator.queues(this.queues);
    parameterValidator.optionalFunction(this.getQueue, 'getQueue');
    parameterValidator.optionalFunction(this.getState, 'getState');
    parameterValidator.optionalFunction(this.getPagination, 'getPagination');
    parameterValidator.optionalFunction(this.storeResult, 'storeResult');
  }

  _validateQueue(queue) {
    if (queue instanceof Queue === false) {
      throw new ParameterError('queue not found');
    }
  }

  _validateState(state, allowedStates) {
    const stateIsValid = allowedStates.some(v => state === v);
    if (stateIsValid === false) {
      throw new ParameterError('state is invalid');
    }
  };

  _validatePagination(pagination) {
    if (typeof pagination !== 'object' || pagination === null) {
      throw new ParameterError('getPagination must return an object');
    }
    if (typeof pagination.pageSize !== 'number') {
      throw new ParameterError('pagination.pageSize must be a number');
    }
    if (typeof pagination.start !== 'number') {
      throw new ParameterError('pagination.start must be a number');
    }
  }

  _getStateGetters(queue) {
    return {
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
  }
}

module.exports = (queues, config = {}) => {
  const instance = new GetJobDetailsForStateMiddleware(queues, config);
  return async (ctx, next) => instance.execute(ctx, next);
};
