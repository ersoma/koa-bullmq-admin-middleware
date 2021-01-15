'use strict';

const { Worker } = require('bullmq');

const LOCK_DURATION = 200;
const TOKEN = 'my-token';

const waitLockDuration = async () => new Promise(resolve => setTimeout(resolve, LOCK_DURATION));

const clearQueue = async (queue) => {
  const allTypes = ['completed', 'wait', 'active', 'paused', 'delayed', 'failed'].map(v => queue.clean(0, 0, v));
  return Promise.all(allTypes);
};

const addJobs = async (queue, numberOfJobs, jobName, jobData = null, jobSettings = {}) => {
  const addJobToQueue = i => queue.add(`job-${jobName}-${i}`, jobData, jobSettings);
  const allJobs = [...Array(numberOfJobs)].map(async (_, i) => await addJobToQueue(i));
  return Promise.all(allJobs);
};

const addCompletedJobs = async (queue, completedCount, worker) => {
  await addJobs(queue, completedCount, 'completed');
  for (let i = 0; i < completedCount; i++) {
    const job = await worker.getNextJob(TOKEN);
    await job.moveToCompleted('done', TOKEN, false);
  }
};

const addFailedJobs = async (queue, failedCount, worker) => {
  await addJobs(queue, failedCount, 'failed');
  for (let i = 0; i < failedCount; i++) {
    const job = await worker.getNextJob(TOKEN);
    await job.moveToFailed(new Error('failed'), TOKEN, false);
  }
};

const addActiveJobs = async (queue, activeCount, worker) => {
  await addJobs(queue, activeCount, 'active');
  for (let i = 0; i < activeCount; i++) {
    await worker.getNextJob(`${TOKEN}-${i}`);
  }
};

const addDelayedJobs = async (queue, delayedCount) => {
  await addJobs(queue, delayedCount, 'delay', null, { delay: 1 });
};

const addWaitingJobs = async (queue, waitingCount) => {
  await addJobs(queue, waitingCount, 'waiting');
};

const setQueueToState = (queue, isPaused) => isPaused ? queue.pause() : queue.resume();

const setQueueJobs = async (queue, isPaused, {
  completedCount = 0,
  delayedCount = 0,
  failedCount = 0,
  waitingCount = 0,
  activeCount = 0
} = {}) => {
  const worker = new Worker(queue.name, null, { lockDuration: LOCK_DURATION });

  await waitLockDuration();
  await clearQueue(queue);
  await queue.resume();

  await addCompletedJobs(queue, completedCount, worker);
  await addFailedJobs(queue, failedCount, worker);
  await addActiveJobs(queue, activeCount, worker);
  await addDelayedJobs(queue, delayedCount);
  await addWaitingJobs(queue, waitingCount);

  await setQueueToState(queue, isPaused);

  await worker.close(true);
};

const setJob = async (queue, status, jobData = {}) => {
  const worker = new Worker(queue.name, null, { lockDuration: LOCK_DURATION });

  await waitLockDuration();
  await clearQueue(queue);
  await queue.resume();
  let job;

  switch (status) {
    case 'waiting':
      job = queue.add('job-waiting', jobData);
      break;
    case 'delayed':
      job = queue.add('job-delayed', jobData, { delay: 1 });
      break;
    case 'active':
      await queue.add('job-active', jobData);
      job = await worker.getNextJob(TOKEN);
      break;
    case 'failed':
      await queue.add('job-failed', jobData);
      job = await worker.getNextJob(TOKEN);
      await job.moveToFailed(new Error('Failed job for testing'), TOKEN, false);
      break;
    case 'completed':
      await queue.add('job-completed', jobData);
      job = await worker.getNextJob(TOKEN);
      await job.moveToCompleted({}, TOKEN, false);
      break;
    default:
      throw new Error('Invalid status');
  }

  await worker.close(true);
  return job;
};

module.exports = {
  setQueueJobs,
  setJob
};
