/**
 * Maintenance Mode ON Script
 * Stops the main servers and starts the maintenance server
 *
 * This script uses execFileSync with hardcoded commands (no user input)
 * to safely manage PM2 processes — see scripts/pm2-lifecycle.js for why the
 * Windows invocation needs a shell.
 *
 * IT IS ALSO THE "STOP" HALF OF EVERY DEPLOYMENT. `pnpm stop`, `pnpm restart`
 * and `pnpm updator` all come through here, so everything downstream — a
 * package update, a schema migration, a seed — is built on the claim this
 * script makes when it exits 0: the platform is down. It now proves that claim
 * instead of assuming it.
 */

const {
  OWNED_APPS,
  MAINTENANCE_APP,
  runPm2,
  pm2List,
  foreignBackendProcesses,
  frontendPort,
  backendPort,
  isPortListening,
  waitForPort,
} = require('./pm2-lifecycle');

/**
 * Which of our apps PM2 actually knows about right now.
 *
 * `pm2 stop backend` on an app PM2 has never heard of prints
 *
 *     [PM2][ERROR] Process or Namespace backend not found
 *
 * and exits non-zero. That is not a failure here — it is the EXPECTED state
 * every time this runs against a platform that is already down, which is
 * exactly when an operator is most likely to be running it: the site crashed,
 * they are trying to update out of the problem, and the first thing the updater
 * prints is a red ERROR for each of the three apps. It reads like the stop
 * failed and the update is unsafe to continue, when in fact there was simply
 * nothing to stop.
 *
 * Asking first turns that into a quiet, accurate line. Returns null when PM2
 * itself could not be read, which is a genuinely different situation from "no
 * apps running" and must not be silently treated as one.
 */
function knownApps(wanted) {
  const list = pm2List();
  if (list === null) return null;
  const names = new Set(list.map((p) => p && p.name).filter(Boolean));
  return wanted.filter((app) => names.has(app));
}

const knownOwnedApps = () => knownApps(OWNED_APPS);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║           ENTERING MAINTENANCE MODE                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

async function main() {
  // Step 1: Stop main services
  //
  // `cron` is in this list because the scheduler is its own process now
  // (production.config.js). Leaving it up during maintenance would be two
  // separate mistakes: a scheduler still moving money — withdrawals, settlement,
  // price writes — against a database that `pnpm updator` is about to seed and
  // migrate; and, once the update brings up a second backend, TWO processes
  // registering every job at once.
  // Only the apps PM2 actually has. See knownOwnedApps: naming an app PM2 does
  // not know prints a red [PM2][ERROR] per app, and on an install that is
  // already down — the common case for anyone running this — that is three
  // errors in a row that mean nothing is wrong.
  const present = knownOwnedApps();

  if (present === null) {
    // PM2 itself did not answer. Fall back to the old unconditional form: a
    // noisy stop is much safer than skipping the stop entirely and letting an
    // update run against a live backend.
    console.log('→ Stopping main services (PM2 list unavailable — stopping unconditionally)...');
    runPm2(['stop', ...OWNED_APPS]);
    console.log('→ Cleaning up PM2 processes...');
    runPm2(['delete', ...OWNED_APPS]);
  } else if (present.length === 0) {
    console.log('→ No platform apps are running under PM2 — nothing to stop.');
  } else {
    console.log(`→ Stopping main services (${present.join(', ')})...`);
    runPm2(['stop', ...present]);

    // Step 2: Delete main services from PM2
    //
    // Deleted, not just stopped: PM2 keeps a stopped app's ORIGINAL environment and
    // reuses it on the next `pm2 start`, so a stopped app is how a stale CRON_MODE
    // survives a config change. scripts/reconcile-scheduler.js exists for the paths
    // that do not come through here.
    console.log('→ Cleaning up PM2 processes...');
    runPm2(['delete', ...present]);
  }

  // Step 2b: retire a maintenance server left over from a previous run.
  //
  // THIS IS WHY RUNNING `pnpm stop` TWICE USED TO FAIL. The maintenance server
  // binds the frontend and backend ports on purpose — that is how callers get a
  // 503 page instead of a refused connection. It is deliberately NOT in
  // OWNED_APPS, because every caller of that list wants it on the opposite side
  // of whatever they are doing.
  //
  // But Step 3 below proves those exact ports are FREE before it will let an
  // update proceed. So on a second invocation — an interrupted update, a
  // re-run after fixing something, `pnpm restart` — the ports were held by our
  // own maintenance server from the first run, and the script concluded:
  //
  //     MAINTENANCE MODE NOT ENTERED - the platform is still running.
  //     Port 3000 (frontend) is still accepting connections...
  //
  // which is alarming, wrong, and blocks the update. It told the operator
  // something outside PM2 was serving when the thing serving was PM2, running
  // the script's own maintenance page.
  //
  // Deleting it here is safe precisely because Step 4 starts it again a few
  // lines later. Deleted rather than stopped, like the apps above: PM2 reuses a
  // stopped app's original environment, and this one carries resolved ports.
  const staleMaintenance = knownApps([MAINTENANCE_APP]);
  if (staleMaintenance === null || staleMaintenance.length > 0) {
    console.log('→ Retiring the previous maintenance server...');
    runPm2(['delete', MAINTENANCE_APP]);
  }

  // Step 3: Prove the ports are actually free before claiming anything stopped.
  //
  // `pm2 delete` exits 0 for an app it has never heard of, so its success says
  // nothing about what is listening. The state that matters is a frontend or
  // backend that PM2 does not manage — started by hand, by systemd, by a second
  // PM2 daemon under another user — which survives every command above and then
  // keeps serving, and keeps WRITING, through a migration and a seed. That is
  // the one failure here that damages data, so it stops the script.
  //
  // A short grace period first: PM2 returns from `delete` before the OS has
  // reaped the listening socket.
  const ports = [
    { label: 'frontend', port: frontendPort() },
    { label: 'backend', port: backendPort() },
  ];
  const stuck = [];
  for (const entry of ports) {
    if (await waitForPort(entry.port, { listening: false, timeoutMs: 15000 })) continue;
    stuck.push(entry);
  }

  // Step 3b: the SCHEDULER does not answer on either port checked above.
  //
  // The port probes are a complete test for the frontend and the API, and blind
  // to the process it matters most to catch. `cron` binds 4001 and serves
  // nothing, so an orphan left by a crash-loop — one PM2 has already given up on
  // and will never `delete` — sails straight through and keeps holding BullMQ
  // repeatable jobs against the database `pnpm updator` is about to migrate and
  // seed. A scheduler and a migration over the same rows is the exact failure
  // this whole step exists to prevent.
  const foreign = foreignBackendProcesses();
  if (foreign.length) {
    console.error('\n✗ MAINTENANCE MODE NOT ENTERED — a backend is running outside PM2.\n');
    for (const proc of foreign) {
      console.error(`  pid ${proc.pid}  ${proc.args}`);
    }
    console.error(
      '\n  PM2 does not manage these, so `pm2 delete` cannot stop them. If any schedules,\n' +
        '  it is moving money — withdrawals, settlement, price writes — through a database\n' +
        '  that is about to be migrated and seeded.\n' +
        '\n  Identify each one, then stop it:\n' +
        foreign.map((p) => `      ps -p ${p.pid} -o pid,etime,args\n      kill ${p.pid}\n`).join('') +
        '\n  Not killed automatically: this cannot tell your own tooling from a leftover,\n' +
        '  and killing a backend mid-withdrawal is its own damage.\n'
    );
    process.exit(1);
  }

  if (stuck.length) {
    console.error('\n✗ MAINTENANCE MODE NOT ENTERED — the platform is still running.\n');
    for (const entry of stuck) {
      console.error(
        `  Port ${entry.port} (${entry.label}) is still accepting connections after PM2 was told ` +
          'to delete the app that owns it.'
      );
    }
    console.error(
      '\n  Something outside this PM2 daemon is serving. Do NOT run an update: a live backend' +
        '\n  against a database being migrated and seeded is how data gets damaged.\n' +
        '\n    pm2 list' +
        (process.platform === 'win32'
          ? `\n    netstat -ano | findstr :${stuck[0].port}`
          : `\n    lsof -i :${stuck[0].port}`) +
        '\n'
    );
    process.exit(1);
  }

  // Step 4: Start maintenance server
  console.log('→ Starting maintenance server...');
  const started = runPm2(['start', 'maintenance.config.js']);

  // Step 5: Verify it actually bound.
  //
  // `pm2 start` exits 0 as soon as it has handed the script to the daemon, which
  // is well before the server has bound anything — and a server that then dies
  // on EADDRINUSE used to leave this script printing "Maintenance mode
  // activated!" over a crash loop. The ports above are proven free at this
  // point, so a failure here is the maintenance server's own (a missing file, a
  // permissions problem) and is a warning, not a stop: failing to show a
  // maintenance PAGE must never be the reason a deployment stays down.
  const online = started.ok
    ? (await waitForPort(frontendPort(), { listening: true, timeoutMs: 15000 })) &&
      (await isPortListening(backendPort()))
    : false;

  if (online) {
    console.log('\n✓ Maintenance mode activated!');
    console.log(`  - Frontend maintenance page: http://localhost:${frontendPort()}`);
    console.log(`  - Backend maintenance API:   http://localhost:${backendPort()}`);
    console.log('  - Scheduler (`cron`): stopped — nothing scheduled is running.');
    console.log('\n  Run "pnpm start" to exit maintenance mode.\n');
    return;
  }

  console.error('\n! The platform is STOPPED, but the maintenance page did not come up.');
  console.error(`  Callers will get connection refused on ${frontendPort()}/${backendPort()}`);
  console.error('  instead of a 503. Check `pm2 logs maintenance`.');
  console.error('  Continuing: the stop itself succeeded, which is what the rest depends on.\n');
}

main().catch((error) => {
  // Anything unexpected is reported as a FAILED stop. The alternative — treating
  // a crash in this script as "probably fine" — is what would let an update run
  // against a live platform.
  console.error(`\n✗ MAINTENANCE MODE NOT ENTERED: ${error && error.message}`);
  console.error(`  Verify with \`pm2 list\` before running anything that touches the database.\n`);
  process.exit(1);
});
