'use strict';

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}`;

class FakeServer {
  constructor(
    middlewares = [],
    controller = ctx => { ctx.status = 200; }
  ) {
    const app = new Koa();
    app.use(bodyParser());
    middlewares.forEach(middleware => app.use(middleware));
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
}

module.exports = FakeServer;
