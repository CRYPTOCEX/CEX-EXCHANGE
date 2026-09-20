/**
 * Maintenance Mode OFF Script
 * Stops the maintenance server before starting the main servers
 *
 * This script uses execFileSync with hardcoded commands (no user input)
 * to safely manage PM2 processes — see scripts/pm2-lifecycle.js for why the
 * Windows invocation needs a shell.
 *
 * WHAT IT HAS TO GUARANTEE. It is chained ahead of `pm2 start` with `&&`, and
 * the very next thing that happens is `frontend` and `backend` binding the two
 * ports this server is sitting on. `pm2 delete` returns as soon as the daemon
 * has signalled the process, not when the OS has reaped its listening socket —
 * so returning immediately handed the race to whoever won it, and losing it
 * costs a `next start` that exits on EADDRINUSE (PM2 restart-loops it) or a
 * backend that logs FATAL and exits 1. Wait for the sockets to actually go.
 */

const {
  MAINTENANCE_APP,
  runPm2,
  pm2List,
  frontendPort,
  backendPort,
  waitForPort,
} = require('./pm2-lifecycle');

async function main() {
  // Nothing to do on the overwhelmingly common path — `pnpm start` on a box
  // that was never in maintenance. Asking first keeps that path silent instead
  // of printing "Exiting maintenance mode..." followed by two PM2 errors.
  const list = pm2List();
  const present =
    list === null
      ? true // Could not read the list: do the work rather than assume it is absent.
      : list.some((proc) => proc && proc.name === MAINTENANCE_APP);

  if (!present) return;

  console.log('→ Exiting maintenance mode...');

  // Step 1: Stop maintenance server
  runPm2(['stop', MAINTENANCE_APP]);

  // Step 2: Delete maintenance server from PM2
  runPm2(['delete', MAINTENANCE_APP]);

  // Step 3: Wait for the ports it held to come free. See the header.
  const held = [
    { label: 'frontend', port: frontendPort() },
    { label: 'backend', port: backendPort() },
  ];
  for (const entry of held) {
    if (await waitForPort(entry.port, { listening: false, timeoutMs: 15000 })) continue;
    console.warn(
      `! Port ${entry.port} (${entry.label}) is still in use 15s after the maintenance server was ` +
        'deleted. The app that needs it may fail to bind — check `pm2 logs` after starting.'
    );
  }

  console.log('✓ Maintenance mode disabled\n');
}

main().catch((error) => {
  // Never block the start chain. A maintenance server that could not be tidied
  // away is a problem the operator has to see, but leaving the platform down
  // because of it would be a bigger one — the same rule
  // scripts/reconcile-scheduler.js follows, for the same reason.
  console.error(`→ Could not fully exit maintenance mode: ${error && error.message}`);
  console.error('  Continuing to start the platform; check `pm2 list` if ports fail to bind.');
});
