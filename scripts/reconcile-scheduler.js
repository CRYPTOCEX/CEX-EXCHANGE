/**
 * Converge PM2 onto the scheduler layout of the config that is about to start.
 *
 * WHY THIS EXISTS. The cron scheduler is its own process now, so a deployment
 * has exactly one correct answer to "who registers jobs?" — and `pm2 start` is
 * unable to enforce it. PM2 skips an app that is already in its list ("already
 * launched") and keeps the environment that app was created with, so the config
 * file stops being the source of truth the moment PM2 has seen an older one.
 * Two ways that bites, both reachable by a normal operator on upgrade day:
 *
 *   - `backend` already exists from a release before the split, with no
 *     CRON_MODE, so it schedules inline. `pnpm start` leaves it exactly as it is
 *     and starts `cron` beside it — TWO schedulers, every job running twice
 *     against the same rows, withdrawals included. The per-job single-flight
 *     guard is in-process and coordinates nothing across processes.
 *   - `cron` is left over from a `pnpm start`, and the next command is
 *     `pnpm start:thread` or `pnpm start:backend`, whose backend schedules
 *     inline. Same outcome, from the other direction.
 *
 * WHAT IT DOES. Reads the config file it is handed, works out the CRON_MODE
 * each app is meant to have, asks PM2 what is actually running, and DELETES any
 * of this product's apps whose scheduling role disagrees. PM2 then recreates
 * them from the config on the very next command. Deleting is the only lever
 * that works: `pm2 restart --update-env` re-reads the environment PM2 stored,
 * not the file.
 *
 * WHAT IT WILL NOT TOUCH. Only the three names this product owns — `backend`,
 * `frontend`, `cron`. An operator's own PM2 apps are none of its business, and
 * a script that deletes by inference would eventually delete something that
 * mattered. It also never deletes an app whose role already agrees, so the
 * normal case (start, on a correctly configured box) does nothing at all and
 * costs no downtime.
 *
 * ALWAYS EXITS 0. It is chained ahead of `pm2 start` with `&&`; a scheduler
 * layout it could not verify must not be a reason to leave the platform down.
 */

const { execFileSync } = require("child_process");
const path = require("path");

// rootDir, and the Windows invocation rule: Node 18.20.2+/20.12.2+/22+
// (CVE-2024-27980) refuses to spawn .cmd/.bat via execFile without a shell.
// Args below are hardcoded, so the shell is safe.
const {
  rootDir,
  isWindows,
  pm2Cmd,
  OWNED_APPS,
  foreignBackendProcesses,
} = require("./pm2-lifecycle");

/**
 * The apps this product owns. Everything else in PM2 is off limits.
 *
 * Shared with the other lifecycle scripts rather than repeated here: this list
 * grew from two names to three when the scheduler became its own process, and a
 * copy that missed the update is a `cron` app nobody stops — the exact second
 * scheduler this file exists to prevent.
 */
const OWNED = new Set(OWNED_APPS);

/**
 * Normalised the same way backend/src/cron/mode.ts normalises it, including the
 * "anything unrecognised means inline" rule — the whole point is to model what
 * the process will actually DO, not what the string says.
 */
function schedulingRole(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "off") return "off";
  if (raw === "only") return "only";
  return "inline";
}

function run(args, capture) {
  return execFileSync(pm2Cmd, args, {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    shell: isWindows,
    stdio: capture ? ["ignore", "pipe", "ignore"] : "inherit",
  });
}

function main() {
  const configArg = process.argv[2];
  if (!configArg) return; // Nothing to reconcile against.

  let desired;
  try {
    const config = require(path.join(rootDir, configArg));
    desired = new Map(
      (config.apps || []).map((app) => [
        app.name,
        // env_production is what `--env production` selects, and every start
        // script passes it; env is the fallback for a config that has no
        // production block.
        schedulingRole(
          (app.env_production && app.env_production.CRON_MODE) ||
            (app.env && app.env.CRON_MODE)
        ),
      ])
    );
  } catch (error) {
    console.error(
      `→ Could not read ${configArg} to check the scheduler layout: ${error.message}`
    );
    return;
  }

  let running;
  try {
    const raw = run(["jlist"], true);
    // The first `jlist` after a reboot prints "[PM2] Spawning PM2 daemon..."
    // ahead of the JSON — and those lines start with a bracket too, so hunting
    // for the first `[` finds the banner and not the array. Drop them by prefix.
    const cleaned = raw
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("[PM2]"))
      .join("\n")
      .trim();
    const start = cleaned.indexOf("[");
    running = start === -1 ? [] : JSON.parse(cleaned.slice(start));
  } catch (error) {
    console.error(
      `→ Could not read the PM2 process list to check the scheduler layout: ${error.message}`
    );
    return;
  }

  const stale = [];
  for (const proc of running) {
    if (!proc || !OWNED.has(proc.name)) continue;
    const actual = schedulingRole(proc.pm2_env && proc.pm2_env.CRON_MODE);

    if (desired.has(proc.name)) {
      // Same app, different scheduling role: PM2 kept the old environment.
      if (actual !== desired.get(proc.name)) {
        stale.push([proc.name, `runs as "${actual}", this config says "${desired.get(proc.name)}"`]);
      }
      continue;
    }

    // Not in the config we are about to start. Harmless unless it schedules —
    // in which case it is a second scheduler the operator did not ask for.
    if (actual !== "off") {
      stale.push([proc.name, `schedules jobs ("${actual}") and ${configArg} does not define it`]);
    }
  }

  if (!stale.length) return;

  console.log("→ Reconciling the scheduler layout with " + configArg + "...");
  for (const [name, why] of stale) {
    console.log(`  removing PM2 app "${name}": ${why}`);
    try {
      run(["delete", name], true);
    } catch (error) {
      // Report and continue: a name that could not be deleted is one the
      // operator has to see, and the remaining ones still need doing.
      console.error(`  could not delete "${name}": ${error.message}`);
    }
  }
  console.log(
    "  " + configArg + " recreates the ones it defines, with the correct roles.\n"
  );
}

/**
 * Backends running OUTSIDE this PM2 daemon.
 *
 * WHY THE PM2 RECONCILIATION ABOVE IS NOT ENOUGH. Everything before this point
 * reasons about PM2's own process list, so a backend PM2 does not know about is
 * invisible to it — started by hand, left behind by a crash-loop that PM2 gave
 * up on ("too many unstable restarts"), or launched from a second daemon under
 * another user. Such a process still registers cron jobs against the same
 * database, and the backend detects that at runtime and says so:
 *
 *     A SECOND process is registering cron jobs against this database:
 *     host:200528 (this process is host:208685)
 *
 * That warning is correct but late: by the time it prints, both schedulers are
 * live, and BullMQ hands a repeatable job to whichever worker takes it. Every
 * scheduled job — withdrawals included — can then run twice over the same rows.
 *
 * Detected by COMMAND LINE, not by port: a duplicate scheduler need not be
 * listening on anything (CRON_MODE=only serves no traffic), so a port probe
 * would miss the exact process that matters most.
 *
 * Returns [] on any platform or tooling this cannot ask, because a detector that
 * guesses would block starts for no reason.
 */
function warnAboutForeignBackends() {
  // Shared with maintenance-on.js via pm2-lifecycle, deliberately: this file's
  // own header is about a name list that drifted between scripts, and a second
  // copy of the detection would drift the same way.
  const foreign = foreignBackendProcesses();
  if (!foreign.length) return;

  console.error(
    `\n  ⚠ ${foreign.length} backend process(es) are running OUTSIDE this PM2 daemon:\n\n` +
      foreign.map((p) => `        pid ${p.pid}  ${p.args}\n`).join("") +
      `\n  If any of them schedules (CRON_MODE unset or "only"), it registers the same\n` +
      `  repeatable jobs against the same database as the \`cron\` app about to start.\n` +
      `  BullMQ gives a repeatable job to whichever worker takes it and the\n` +
      `  single-flight guard is per-process, so withdrawals, settlement and price\n` +
      `  writes can each run TWICE over the same rows.\n` +
      `\n  Check what they are, then stop them:\n` +
      foreign.map((p) => `        kill ${p.pid}\n`).join("") +
      `\n  Deliberately not killed automatically: this cannot tell your own tooling\n` +
      `  from a leftover, and killing a backend mid-withdrawal is its own damage.\n`
  );
}

try {
  main();
  // After reconciliation, so the list reflects what PM2 is about to run.
  warnAboutForeignBackends();
} catch (error) {
  console.error(`→ Scheduler reconciliation skipped: ${error.message}`);
}

// Never block the start chain. See the header.
process.exitCode = 0;
