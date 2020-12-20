'use strict';

const middlewareFactory = require('../../src/queue/get-queue-details');

describe('getQueueDetailsMiddleware', () => {

  describe('works as a Koa middleware', () => {
    it('should export a factory function', () => {
      expect(middlewareFactory).to.be.a('function');
    });
  });
});