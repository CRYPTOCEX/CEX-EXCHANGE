/**
 * Drain the outbound email queues.
 *
 *   cd backend
 *   npm run mail:purge            # report what is queued, change nothing
 *   npm run mail:purge -- --apply # remove every waiting/delayed/failed job
 *
 * WHY THIS EXISTS
 * ---------------
 * Both email paths are Bull queues persisted in Redis, so a backlog survives a
 * backend restart and a code change. A run that generated a lot of notification
 * traffic left hundreds of jobs behind, and every retry is a real SMTP login
 * against the production mail account — enough of them and the provider
 * throttles the account (Gmail: `454 4.7.0 Too many login attempts`), which
 * blocks mail to genuine users until it lifts.
 *
 * Clearing the backlog is therefore an operational action, not a test fixture.
 * It is report-only by default because a waiting job may be a real user's
 * password reset; read the summary before passing --apply.
 *
 * The two queues are independent:
 *   emailQueue          -> backend/src/utils/emails.ts            (transactional templates)
 *   notification-emails -> backend/src/services/notification/...  (notification service)
 */

import Bull from "bull";

const APPLY = process.argv.includes("--apply");

const QUEUES = ["emailQueue", "notification-emails"];

const redis = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  // Do not sit in a reconnect loop if Redis is unreachable; report and exit.
  retryStrategy: (times: number) => (times > 3 ? null : 500 * times),
  maxRetriesPerRequest: 3,
};

/** Job states worth clearing. `active` is left alone — something is mid-send. */
const STATES = ["wait", "waiting", "delayed", "failed", "paused"] as const;

async function main() {
  console.log(
    `Email queue purge (${APPLY ? "APPLY" : "report only"}) -> ${redis.host}:${redis.port}\n`
  );

  let grandTotal = 0;
  let removedTotal = 0;

  for (const name of QUEUES) {
    const queue = new Bull(name, { redis });

    try {
      const counts = await queue.getJobCounts();
      const total =
        (counts.waiting || 0) +
        (counts.delayed || 0) +
        (counts.failed || 0) +
        (counts.active || 0);
      grandTotal += total;

      console.log(`${name}`);
      console.log(
        `  waiting=${counts.waiting ?? 0} active=${counts.active ?? 0} ` +
          `delayed=${counts.delayed ?? 0} failed=${counts.failed ?? 0} completed=${counts.completed ?? 0}`
      );

      // Show a couple of real recipients so the operator can judge whether the
      // backlog is test traffic or genuine user mail.
      const sample = await queue.getJobs(["waiting", "failed", "delayed"], 0, 4);
      for (const job of sample) {
        const to =
          (job.data as any)?.emailData?.TO ??
          (job.data as any)?.emailData?.to ??
          "(unknown)";
        const kind =
          (job.data as any)?.emailType ??
          (job.data as any)?.notificationId ??
          "(unknown)";
        console.log(`    e.g. job ${job.id}: ${kind} -> ${to}`);
      }

      if (!APPLY) {
        console.log("  (report only — pass --apply to clear)\n");
        continue;
      }

      let removed = 0;
      for (const state of STATES) {
        // Page through: getJobs is bounded, and a large backlog is the whole
        // reason this script exists.
        for (;;) {
          const jobs = await queue.getJobs([state as any], 0, 500);
          if (!jobs.length) break;
          for (const job of jobs) {
            try {
              await job.remove();
              removed++;
            } catch {
              // A job that raced into `active` cannot be removed; leave it.
            }
          }
          if (jobs.length < 500) break;
        }
      }

      // Clears the retained completed/failed history too.
      await queue.clean(0, "completed");
      await queue.clean(0, "failed");

      removedTotal += removed;
      console.log(`  removed ${removed} job(s)\n`);
    } catch (err: any) {
      console.log(`  ERROR: ${err?.message || err}\n`);
    } finally {
      await queue.close();
    }
  }

  console.log("=".repeat(60));
  if (APPLY) {
    console.log(`removed ${removedTotal} job(s) across ${QUEUES.length} queues`);
  } else {
    console.log(
      `${grandTotal} job(s) queued across ${QUEUES.length} queues; re-run with --apply to clear`
    );
  }
  console.log(
    "Set MAIL_DISABLED=true in .env and restart the backend to stop new mail being attempted."
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("purge failed:", err);
  process.exit(1);
});
