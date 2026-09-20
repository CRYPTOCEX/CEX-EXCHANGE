/**
 * `pnpm stop:all` — take every part of THIS product out of PM2.
 *
 * WHAT IT USED TO BE, AND WHY THAT WAS WRONG ON THREE COUNTS:
 *
 *     "stop:all": "pm2 stop all 2>/dev/null || echo 'No PM2 processes to stop'"
 *
 *   - `all` is not ours. It stops every app in the operator's PM2 daemon,
 *     including the ones this product knows nothing about. Every other script
 *     here is careful to touch only the names we own; this one was not.
 *   - `stop` is not `delete`. PM2 keeps a stopped app's ORIGINAL environment and
 *     reuses it on the next `pm2 start`, which is precisely how a stale
 *     CRON_MODE survives a config change — a `backend` stopped from a release
 *     before the cron split comes back scheduling inline, beside the `cron` app,
 *     and every scheduled job runs twice. scripts/reconcile-scheduler.js exists
 *     to clean that up at start time; not creating it is better.
 *   - `2>/dev/null` is not portable. npm runs scripts through `cmd.exe` on
 *     Windows, where that redirects into a directory that does not exist and the
 *     command fails on its own syntax.
 *
 * It also left `maintenance` running, so "stop everything" could leave a
 * maintenance page serving on the frontend and backend ports — which is then
 * exactly what the next `pnpm start` has to fight for.
 *
 * THIS IS NOT `pnpm stop`. `pnpm stop` means "take the platform down and show
 * visitors a maintenance page"; this means "leave nothing of this product
 * running", maintenance page included. Ports end up closed, not 503.
 */

const { OWNED_APPS, MAINTENANCE_APP, runPm2, pm2List } = require('./pm2-lifecycle');

const targets = [...OWNED_APPS, MAINTENANCE_APP];

const list = pm2List();
if (list === null) {
  // No daemon, or an unreadable list. `pm2 delete` on a name that does not exist
  // is harmless, so ask for them anyway rather than guessing.
  console.log('→ Could not read the PM2 process list; asking PM2 to delete our apps anyway.');
} else {
  const present = list.filter((proc) => proc && targets.includes(proc.name));
  if (!present.length) {
    console.log('✓ Nothing of this product is running in PM2.');
    process.exit(0);
  }
  console.log(`→ Stopping: ${present.map((proc) => proc.name).join(', ')}`);
}

// Stop first, then delete. `pm2 delete` alone does stop the process, but the
// two-step is what the rest of the lifecycle scripts do and it gives a process
// its kill_timeout to shut down cleanly before the entry disappears.
runPm2(['stop', ...targets]);
runPm2(['delete', ...targets]);

const remaining = pm2List();
const survivors = (remaining || []).filter((proc) => proc && targets.includes(proc.name));

if (survivors.length) {
  console.error(
    `\n✗ Still present in PM2 after delete: ${survivors.map((proc) => proc.name).join(', ')}.\n` +
      '  Check `pm2 list` — a leftover `cron` is a scheduler nobody is watching.\n'
  );
  process.exit(1);
}

console.log('✓ backend, frontend, cron and maintenance are stopped and removed from PM2.');
console.log('  Nothing is serving. Run "pnpm start" to bring the platform back.\n');
