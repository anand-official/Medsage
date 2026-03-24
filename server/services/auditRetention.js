'use strict';

/**
 * Audit Log Retention Service
 *
 * Runs a daily cron job to delete AuditLog documents older than
 * AUDIT_RETENTION_DAYS (default: 90 days).
 *
 * Note: MongoDB's built-in TTL index (180 days) acts as a hard backstop.
 * This cron provides a configurable, shorter retention window and logs
 * explicit deletion counts for compliance auditing.
 *
 * Schedule: 02:30 server-local time every day (low-traffic window).
 * Batched: deletes in chunks of BATCH_SIZE to avoid locking the collection.
 */

const cron = require('node-cron');
const AuditLog = require('../models/AuditLog');

const RETENTION_DAYS  = parseInt(process.env.AUDIT_RETENTION_DAYS) || 90;
const BATCH_SIZE      = parseInt(process.env.AUDIT_RETENTION_BATCH) || 500;
const CRON_SCHEDULE   = process.env.AUDIT_RETENTION_CRON || '30 2 * * *'; // 02:30 daily

/**
 * Deletes AuditLog documents older than `retentionDays` in batches.
 * Returns the total number of deleted documents.
 */
async function runRetention(retentionDays = RETENTION_DAYS) {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let totalDeleted = 0;

    console.log(`[AuditRetention] Starting purge — cutoff: ${cutoff.toISOString()} (${retentionDays}d)`);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        // Fetch a batch of IDs older than cutoff — avoids full-collection scans on large sets
        const batch = await AuditLog
            .find({ created_at: { $lt: cutoff } }, { _id: 1 })
            .limit(BATCH_SIZE)
            .lean();

        if (batch.length === 0) break;

        const ids = batch.map(doc => doc._id);
        const result = await AuditLog.deleteMany({ _id: { $in: ids } });
        totalDeleted += result.deletedCount;

        console.log(`[AuditRetention] Deleted batch of ${result.deletedCount} (total so far: ${totalDeleted})`);

        // Yield to the event loop between batches to avoid blocking
        await new Promise(resolve => setImmediate(resolve));
    }

    console.log(`[AuditRetention] Complete — ${totalDeleted} documents removed (cutoff: ${retentionDays}d)`);
    return totalDeleted;
}

/**
 * Registers the daily retention cron job.
 * Called once from server/index.js after MongoDB connects.
 */
function scheduleRetentionJob() {
    if (!cron.validate(CRON_SCHEDULE)) {
        console.error(`[AuditRetention] Invalid AUDIT_RETENTION_CRON value: "${CRON_SCHEDULE}". Job not scheduled.`);
        return;
    }

    const job = cron.schedule(CRON_SCHEDULE, async () => {
        try {
            await runRetention();
        } catch (err) {
            console.error('[AuditRetention] Job failed:', err.message);
        }
    }, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
    });

    console.log(`[AuditRetention] Scheduled — retention: ${RETENTION_DAYS}d, schedule: "${CRON_SCHEDULE}"`);
    return job;
}

module.exports = { scheduleRetentionJob, runRetention };
