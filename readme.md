# koa-bullmq-admin-middleware

[![Codeship Status for ersoma/koa-bullmq-admin-middleware](https://app.codeship.com/projects/c9e00330-0c6e-4d1f-ac3b-812c82d77d72/status?branch=master)](https://app.codeship.com/projects/422419)

Collection of [Koa 2](https://koajs.com/) middlewares to interact with the [BullMQ](https://docs.bullmq.io/) message queue.
Every middleware exposes a factory function. Set the necessary parameter and customize the optional ones when calling the factory and you will get your custom middleware that can be inserted to any Koa 2 application.

**Note:** This module does not contain [BullMQ](https://github.com/taskforcesh/bullmq) as an inner dependency, only as [peer dependency](https://nodejs.org/es/blog/npm/peer-dependencies/). This means it can be updated individually when a new version comes out but it also means you need to install it separately.

```
npm i bullmq
npm i koa-bullmq-admin-middleware
```

## Get All Queue Details

Collects basic information about all the queues, like their name, if they're paused or not and the number of jobs for each state.

```JavaScript
const result = [{
  name: String,           // queue's name
  isPaused: Boolean,      // queue is paused or not
  activeCount: Number,    // number of active jobs
  completedCount: Number, // number of completed jobs
  delayedCount: Number,   // number of delayed jobs
  failedCount: Number,    // number of failed jobs
  waitingCount: Number    // number of waiting jobs
}];
```

<details><summary>Show details</summary>
<p>

Throws `ParameterError` when:
- queues parameter is not set, not an array or members are not BullMQ Queues
- storeResult parameter not a function, when set

### Example

```JavaScript
//...
const { getAllQueueDetailsFactory } = require('koa-bullmq-admin-middleware');
///...
const getAllQueueDetailsMiddleware = getAllQueueDetailsFactory(queues, {
  storeResult = (ctx, result) => {...}
});
app.use(getAllQueueDetailsMiddleware);
///...
```

### Parameters

Parameter | Required | Type | Description
--- | --- | --- | ---
queues | yes | Array | BullMQ queues
config | no | Object | config parameters | -
config.storeResult | no | Function(ctx, result) => undefined | By default result will be saved to `ctx.state.bullMqAdmin.allQueueDetails`

</p>
</details>

## Get Queue Details

Collects basic information about a queue, like it's name, if it's paused or not and the number of jobs for each state.

```JavaScript
const result = {
  name: String,           // queue's name
  isPaused: Boolean,      // queue is paused or not
  activeCount: Number,    // number of active jobs
  completedCount: Number, // number of completed jobs
  delayedCount: Number,   // number of delayed jobs
  failedCount: Number,    // number of failed jobs
  waitingCount: Number    // number of waiting jobs
};
```

<details><summary>Show details</summary>
<p>

Throws `ParameterError` when:
- queues parameter is not set, not an array or members are not BullMQ Queues
- getQueue or storeResult parameter not a function, when set

### Example

```JavaScript
//...
const { getQueueDetailsFactory } = require('koa-bullmq-admin-middleware');
///...
const getQueueDetailsMiddleware = getQueueDetailsFactory(queues, {
  getQueue = (ctx, queues) => {...},
  storeResult = (ctx, result) => {...}
});
app.use(getQueueDetailsMiddleware);
///...
```

### Parameters

Parameter | Required | Type | Description
--- | --- | --- | ---
queues | yes | Array | BullMQ queues
config | no | Object | config parameters | -
config.getQueue | no | Function(ctx, queues) => Queue | By default `ctx.params.queueName` will be used
config.storeResult | no | Function(ctx, result) => undefined | By default result will be saved to `ctx.state.bullMqAdmin.queueDetails`

</p>
</details>

## Get Job Details

Collects information about a job by merging the results of it's `asJSON` and `getState` functions into one.

```JavaScript
// Soma properties are only available on certain states
// check BullMQ's documentation for more details
const result = {
  name: String,             // job's name
  id: String,               // job's id
  attemptsMade: Number,     // job's attemps
  data: JSON,               // job's data
  opts: JSON,               // job's options
  progress: Number | JSON   // job's progress if updated
  returnvalue: JSON         // job's return value when completed
  stacktrace: JSON          // job's stacktrace when it failed
  failedReason: JSON,       // job's reason when it failed
  timestamp: Number,        // job's timestamp when created
  processedOn: Number,      // job's time when processedd
  finishedOn: Number,       // job's time when finished
  state: String,            // job's state
};
```

<details><summary>Show details</summary>
<p>

Throws `ParameterError` when:
- queues parameter is not set, not an array or members are not BullMQ Queues
- getQueue, getJob or storeResult parameter not a function, when set

### Example

```JavaScript
//...
const { getJobDetailsFactory } = require('koa-bullmq-admin-middleware');
///...
const getJobDetailsMiddleware = getJobDetailsFactory(queues, {
  getQueue = (ctx, queues) => {...},
  getJob = async (ctx, queues) => {...},
  storeResult = (ctx, result) => {...}
});
app.use(getJobDetailsMiddleware);
///...
```

### Parameters

Parameter | Required | Type | Description
--- | --- | --- | ---
queues | yes | Array | BullMQ queues
config | no | Object | config parameters | -
config.getQueue | no | Function(ctx, queues) => Queue | By default `ctx.params.queueName` will be used
config.getJob | no | async Function(ctx, queues) => Job | By default `ctx.params.jobId` will be used
config.storeResult | no | Function(ctx, result) => undefined | By default result will be saved to `ctx.state.bullMqAdmin.jobDetails`

</p>
</details>