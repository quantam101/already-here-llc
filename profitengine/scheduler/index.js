'use strict';

const cron = require('node-cron');
const { runContentPipeline } = require('../pipeline');

const DEFAULT_SCHEDULE = '0 7,19 * * *'; // 7 AM and 7 PM daily

let scheduledTask = null;

function start() {
  const schedule = process.env.CONTENT_CRON_SCHEDULE || DEFAULT_SCHEDULE;

  if (!cron.validate(schedule)) {
    console.error(`[scheduler] Invalid cron expression: "${schedule}"`);
    process.exit(1);
  }

  console.log(`[scheduler] Starting with schedule: "${schedule}"`);

  scheduledTask = cron.schedule(schedule, async () => {
    console.log(`[scheduler] Firing content pipeline at ${new Date().toISOString()}`);
    try {
      await runContentPipeline();
    } catch (err) {
      console.error('[scheduler] Pipeline run failed:', err.message);
    }
  });

  console.log('[scheduler] Active — waiting for next scheduled run');
}

function stop() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[scheduler] Stopped');
  }
}

module.exports = { start, stop };
