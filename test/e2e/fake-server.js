'use strict';

const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

class FakeServer {
  constructor(
    route = '/',
    middlewares = [],
    controller = ctx => ctx.body = ctx.state.bullMqAdmin
  ) {
    const app = new Koa();
    const router = new Router();

    router.get(route, this._errorHandler, middlewares);

    app.use(bodyParser());
    app.use(router.routes());
    app.use(controller);
    app.silent = true;
    this.app = app;
  }

  startFakeServer() {
    this.stopFakeServer();
    return new Promise(resolve => {
      this.server = this.app.listen(PORT, '0.0.0.0', () => resolve());
    });
  }

  stopFakeServer() {
    if (this.server) {
      this.server.close();
    }
  }

  get baseUrl() {
    return BASE_URL;
  }

  async _errorHandler(ctx, next) {
    try {
      await next();
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = FakeServer;
