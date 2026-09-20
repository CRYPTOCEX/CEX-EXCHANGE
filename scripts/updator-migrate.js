/**
 * The schema-migration step of `pnpm updator`.
 *
 * WHAT IT REPLACES, AND WHY. The update chain used to read:
 *
 *     pnpm stop && ... && pnpm start:backend && <sleep 180s> && pnpm stop && pnpm seed && ...
 *
 * The point of that backend was never to serve traffic — it was to boot once so
 * Sequelize's auto-sync applies the new release's schema before the seeders run
 * against it. As a way of doing that it was broken in three separate ways, all
 * of which this script exists to fix:
 *
 *   1. IT COULD NOT START. `pnpm stop` puts the maintenance server on the
 *      frontend and backend ports; `production.backend.config.js` sets no port,
 *      so `backend/index.ts` bound `NEXT_PUBLIC_BACKEND_PORT` — the port the
 *      maintenance server had just taken. uWS hands `listen` a falsy socket,
 *      server.ts logs FATAL and exits 1, and PM2's `autorestart` brought it
 *      straight back. The whole 180 seconds was a crash loop.
 *   2. IT SCHEDULED. `production.backend.config.js` sets no CRON_MODE, so that
 *      backend defaulted to `inline` — it registered EVERY cron job. Because
 *      cron setup happens during initialisation, before the port is bound, the
 *      jobs were registered and running on each pass of that loop: withdrawals,
 *      settlement, price writes, deposit scanners, all against a database
 *      halfway through a migration and about to be seeded, and all killed
 *      mid-run by the failing bind.
 *   3. IT NEVER CHECKED. 180 seconds was a guess, and `&&` cannot tell a
 *      migration that finished from one that never started — so a backend that
 *      died on its first line still let `pnpm seed` run against the OLD schema.
 *
 * WHAT IT DOES INSTEAD. Runs the backend directly (no PM2, so nothing can
 * restart it behind our back and no stale app environment can outlive it),
 * with CRON_MODE=off so it migrates without scheduling anything, on a port
 * proven free so it can actually finish booting. Then it WAITS FOR READY —
 * the process answering HTTP is the observable that says initialisation, which
 * is where the schema sync lives, completed — and stops it. If the backend
 * exits early, or never becomes ready inside the cap, this exits non-zero and
 * the `&&` chain stops before anything seeds.
 *
 *     node scripts/updator-migrate.js [--timeout=180000]
 */

const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn, execFileSync } = require("child_process");

const {
  rootDir,
  isWindows,
  frontendPort,
  backendPort,
  isPortListening,
} = require("./pm2-lifecycle");

const arg = (name, dflt) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : dflt;
};

/**
 * Cap on the whole step. Unchanged from the old blind sleep on purpose: it was
 * chosen to cover a large install's schema sync, and the difference is that
 * this is now a DEADLINE rather than a duration — a normal update finishes in
 * whatever the migration actually takes.
 */
const TIMEOUT_MS = Number(arg("timeout", "180000"));

const ENTRY = path.join(rootDir, "backend", "dist", "index.js");

/** Ports the maintenance server is holding while this runs. Never reuse them. */
const RESERVED = new Set([frontendPort(), backendPort()]);

function canBind(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    // No host argument: the backend binds every interface in production, so a
    // probe pinned to 127.0.0.1 would be answering a different question.
    probe.once("listening", () => probe.close(() => resolve(true)));
    probe.listen(port);
  });
}

/**
 * A port this backend can have to itself for the length of the migration.
 *
 * Starts at the backend port + 1 — which on a default install is 4001, the port
 * the deployment already reserves for a backend process and which is free here
 * because `pnpm stop` deleted the `cron` app.
 *
 * BOTH CHECKS, and the second one is not redundant. Windows lets a socket bind
 * a specific address while another socket already holds 0.0.0.0 on the same
 * port, so `canBind` alone answers "yes, free" for a port something is already
 * serving on. That is not a theoretical hazard here: it would hand this script
 * a port that already has a backend on it, whose `/api/settings` then answers
 * immediately — and the step would report "schema is up to date" having
 * migrated nothing and started nothing. Refusing any port that ACCEPTS A
 * CONNECTION is what makes the later readiness probe mean "our process".
 */
async function findPort() {
  const first = backendPort() + 1;
  for (let port = first; port < first + 20; port++) {
    if (port > 65535 || RESERVED.has(port)) continue;
    if (await isPortListening(port)) continue;
    if (await canBind(port)) return port;
  }
  return null;
}

function ready(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: "/api/settings", timeout: 4000 },
      (res) => {
        res.resume();
        resolve(res.statusCode > 0);
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

/**
 * Kill the migration backend and everything it started.
 *
 * `child.kill()` on Windows kills only the process it was handed, leaving the
 * real worker orphaned and holding both the port and a database connection —
 * which the next step would then trip over. taskkill /T /F is the only thing
 * that takes the tree.
 */
function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode) return;
  try {
    if (isWindows) {
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      child.kill("SIGTERM");
      // Escalate if it is still there. This process exits seconds later, and a
      // migration backend that outlived it would hold the port and a database
      // connection through the seed that runs next.
      setTimeout(() => {
        if (child.exitCode === null && !child.signalCode) child.kill("SIGKILL");
      }, 5000).unref();
    }
  } catch {
    // Already gone.
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("→ Applying the new release's schema (migration backend, no scheduler)...");

  // The built backend is what applies the schema. Saying so here beats an
  // ENOENT from spawn, which arrives as an 'error' event several lines later
  // and reads like a problem with this script.
  if (!fs.existsSync(ENTRY)) {
    console.error(
      `\n✗ UPDATE HALTED: ${ENTRY} does not exist.\n` +
        "  The update package ships backend/dist — restore it (or run `pnpm bundle`) and try again.\n"
    );
    process.exit(1);
  }

  const port = await findPort();
  if (!port) {
    console.error(
      "\n✗ UPDATE HALTED: could not find a free port for the migration backend.\n" +
        `  Tried ${backendPort() + 1}..${backendPort() + 20}, excluding the maintenance server's ` +
        `${[...RESERVED].join(" and ")}.\n`
    );
    process.exit(1);
  }

  const child = spawn(process.execPath, [ENTRY], {
    cwd: rootDir, // backend/load-env.ts prefers `${cwd}/.env`.
    env: {
      ...process.env,
      NODE_ENV: "production",
      // The whole reason this is not `pnpm start:backend`. This process exists
      // to migrate a schema; a scheduler on top of that would be moving money
      // through a database that is mid-migration and about to be seeded.
      CRON_MODE: "off",
      // Boot only far enough to apply the schema. See isSchemaSyncOnly() in
      // backend/src/utils/process-role.ts.
      //
      // CRON_MODE=off alone was not enough. It stops the SCHEDULER, but the boot
      // still ran the "Extensions" phase: the ecosystem matching engine (which
      // loads every OPEN order into memory), the futures matcher, the forex venue
      // connections and the Hummingbot supervisor. On a live install that reached
      // the 7.7 GB heap cap and was killed —
      //
      //     FATAL ERROR: Ineffective mark-compacts near heap limit
      //     X UPDATE HALTED: the migration backend did not finish starting within 180s.
      //
      // — which meant an install could grow too large to update, while the update
      // was the thing that would have fixed it. Nothing in that phase has any
      // bearing on a schema migration: the sync is the `Database` phase and takes
      // about 38 ms.
      //
      // Raising --max-old-space-size would only move the cliff. Not loading data
      // proportional to install size removes it.
      BICRYPTO_SCHEMA_SYNC_ONLY: "true",
      // backend/index.ts binds NEXT_PUBLIC_BACKEND_PORT and ignores PORT.
      NEXT_PUBLIC_BACKEND_PORT: String(port),
      PORT: String(port),
    },
    stdio: ["ignore", "inherit", "inherit"],
    windowsHide: true,
  });

  let exited = null;
  child.on("exit", (code, signal) => {
    exited = { code, signal };
  });
  // An unhandled 'error' on a child process THROWS, which here would mean the
  // update dying with a stack trace instead of the message below.
  child.on("error", (error) => {
    exited = { code: null, signal: null, error };
  });

  const deadline = Date.now() + TIMEOUT_MS;
  let online = false;
  while (Date.now() < deadline) {
    if (exited) break;
    if (await ready(port)) {
      online = true;
      break;
    }
    await sleep(1000);
  }

  if (online) {
    console.log(
      `\n✓ Schema is up to date (migration backend answered on :${port} after ` +
        `${Math.round((TIMEOUT_MS - (deadline - Date.now())) / 1000)}s). Stopping it.\n`
    );
    stop(child);
    // Give the socket and the database pool a moment to close so the seeders do
    // not start against a connection that is still being torn down.
    await sleep(2000);
    return;
  }

  stop(child);
  await sleep(1000);

  if (exited) {
    // 78 is EX_CONFIG — an unreachable Redis or the native-module/Node-ABI
    // preflight. Both print their own actionable message just above this one.
    console.error(
      `\n✗ UPDATE HALTED: the migration backend ` +
        (exited.error
          ? `could not be started (${exited.error.message})`
          : exited.signal
            ? `exited on ${exited.signal}`
            : `exited with code ${exited.code}`) +
        ` before the schema was applied.\n` +
        `  Nothing has been seeded and the platform is still in maintenance mode.\n` +
        `  Fix the error printed above, then run \`pnpm updator\` again.\n`
    );
  } else {
    console.error(
      `\n✗ UPDATE HALTED: the migration backend did not finish starting within ` +
        `${Math.round(TIMEOUT_MS / 1000)}s.\n` +
        `  It was still initialising, which usually means a very large schema sync — re-run with\n` +
        `  a longer cap:  node scripts/updator-migrate.js --timeout=600000\n` +
        `  Nothing has been seeded and the platform is still in maintenance mode.\n`
    );
  }
  process.exit(1);
}

main().catch((error) => {
  console.error(`\n✗ UPDATE HALTED: ${error && error.message}\n`);
  process.exit(1);
});
