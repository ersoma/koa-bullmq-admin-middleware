'use strict';

const parameterValidator = require('../parameter-validator');
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
    parameterValidator.queues(this.queues);
    parameterValidator.optionalFunction(this.storeResult, 'storeResult');
  }
}

module.exports = (queues, config = {}) => {
  const instance = new GetAllQueueDetailsMiddleware(queues, config);
  return async (ctx, next) => instance.execute(ctx, next);
};
