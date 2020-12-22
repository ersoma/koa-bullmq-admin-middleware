# koa-bullmq-admin-middleware

[![Codeship Status for ersoma/koa-bullmq-admin-middleware](https://app.codeship.com/projects/c9e00330-0c6e-4d1f-ac3b-812c82d77d72/status?branch=master)](https://app.codeship.com/projects/422419)

[Koa 2](https://koajs.com/) middleware to interact with the [BullMQ](https://docs.bullmq.io/) message queue

**Note:** This middleware does not contain [BullMQ](https://github.com/taskforcesh/bullmq) as an inner dependency, only as [peer dependency](https://nodejs.org/es/blog/npm/peer-dependencies/). This means it can be updated individually when a new version comes out but it also means you need to install it separately.