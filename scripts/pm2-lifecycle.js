/**
 * Shared plumbing for the deployment lifecycle scripts.
 *
 * WHY THIS EXISTS. A deployment is THREE PM2 apps now (`backend`, `frontend`,
 * `cron`) plus the maintenance server, and the name list was written out by
 * hand in every script that touches PM2 — maintenance-on, reconcile-scheduler,
 * `stop:all`. Lists like that drift, and the way they drift here is specific
 * and expensive: a script that still knows about two apps leaves the third one
 * running. A leftover `cron` beside a fresh `pnpm start:backend` is two
 * schedulers over one database; a `cron` nobody stopped during an update is a
 * scheduler moving money through a mid-migration schema. One list, imported.
 *
 * It also carries the two facts every one of those scripts has to get right:
 * how to invoke PM2 on Windows, and which ports the apps ACTUALLY bind.
 */

const net = require("net");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");

// Read the operator's .env the same way production.config.js does — it is the
// source of truth for anything site-specific, and dotenv never overwrites a
// variable that is already exported, so a value set in the shell still wins.
//
// Tolerated rather than required: maintenance mode is what an operator reaches
// for when the install is already in a bad way, and half of the reasons to
// reach for it (a botched `pnpm install`, a wiped node_modules) are reasons
// `dotenv` might not resolve. Falling back to the ambient environment keeps the
// maintenance page startable; it only costs the .env-derived port default.
//
// Resolved from the BACKEND's node_modules as well as the root's. These scripts
// run at the worst possible moment for module resolution: `pnpm stop` is the
// FIRST step of `pnpm updator`, so it executes before the install step that
// would repair a damaged tree — and a half-finished install is the most common
// reason someone is running an update in the first place. A root node_modules
// that pnpm purged and did not refill (see confirmModulesPurge in
// pnpm-workspace.yaml) leaves `require("dotenv")` throwing from the root while a
// perfectly good copy sits in backend/node_modules.
//
// Still tolerated if BOTH fail: maintenance mode is what an operator reaches for
// when the install is already in a bad way, and it must stay startable. The cost
// is only the .env-derived port default.
function loadEnv() {
  const candidates = [
    "dotenv",
    path.join(rootDir, "backend", "node_modules", "dotenv"),
    path.join(rootDir, "node_modules", "dotenv"),
  ];
  for (const candidate of candidates) {
    try {
      require(candidate).config({ path: path.join(rootDir, ".env") });
      return true;
    } catch {
      /* try the next location */
    }
  }
  return false;
}

if (!loadEnv()) {
  console.warn(
    "→ Could not load .env (dotenv is not installed in the root or backend node_modules);\n" +
      "  using the ambient environment for port resolution. If your API is not on the\n" +
      "  default port, export NEXT_PUBLIC_BACKEND_PORT before re-running."
  );
}

const isWindows = process.platform === "win32";

// Node 18.20.2+/20.12.2+/22+ (CVE-2024-27980) refuses to spawn .cmd/.bat files
// via execFile without a shell, throwing EINVAL. On Windows pm2 is pm2.cmd, so
// route through the shell there. Every argument these scripts pass is
// hardcoded (no user input), which is what makes the shell safe. Unix pm2 is a
// real binary and needs no shell.
const pm2Cmd = isWindows ? "pm2.cmd" : "pm2";

/**
 * The PM2 apps this product owns. Everything else in PM2 belongs to the
 * operator and is none of our business — a lifecycle script that deleted by
 * inference would eventually delete something that mattered.
 *
 * `maintenance` is deliberately NOT in here: it is ours, but it is the thing
 * that replaces the others, so every caller wants it on the opposite side of
 * whatever it is doing.
 */
const OWNED_APPS = ["backend", "frontend", "cron"];

/** The maintenance server's PM2 app name. */
const MAINTENANCE_APP = "maintenance";

/**
 * The port the FRONTEND listens on.
 *
 * Hardcoded, and correctly so: production.config.js sets `PORT: 3000` in the
 * frontend app's `env` block, and a PM2 env block OVERRIDES the inherited
 * environment — so `next start` sees 3000 whatever .env says. Deriving this
 * from NEXT_PUBLIC_FRONTEND_PORT would make the maintenance server bind a port
 * the real frontend never uses, which is worse than binding none.
 */
const frontendPort = () => 3000;

/**
 * The port the BACKEND listens on.
 *
 * From .env, because that is genuinely where it comes from: backend/index.ts
 * reads `process.env.NEXT_PUBLIC_BACKEND_PORT || 4000` and ignores `PORT`
 * entirely, and production.config.js does not set NEXT_PUBLIC_BACKEND_PORT on
 * the `backend` app. An operator who moved the API off 4000 previously got a
 * maintenance server on 4000 answering nothing while their real API port sat
 * refusing connections.
 */
const backendPort = () => {
  const raw = Number(process.env.NEXT_PUBLIC_BACKEND_PORT);
  return Number.isInteger(raw) && raw > 0 && raw < 65536 ? raw : 4000;
};

/**
 * Run a PM2 command. Returns { ok, output } and never throws — the callers are
 * lifecycle scripts where one failed sub-command must not abort the rest of
 * the cleanup.
 */
function runPm2(args, { capture = false } = {}) {
  try {
    const output = execFileSync(pm2Cmd, args, {
      cwd: rootDir,
      encoding: "utf8",
      windowsHide: true,
      shell: isWindows,
      stdio: capture ? ["ignore", "pipe", "ignore"] : "inherit",
    });
    return { ok: true, output: output || "" };
  } catch (error) {
    return { ok: false, output: "", error };
  }
}

/**
 * PM2's process list, or null when it could not be read.
 *
 * The first `jlist` after a reboot prints "[PM2] Spawning PM2 daemon..." ahead
 * of the JSON — and those lines start with a bracket too, so hunting for the
 * first `[` finds the banner and not the array. Drop them by prefix.
 */
function pm2List() {
  const { ok, output } = runPm2(["jlist"], { capture: true });
  if (!ok) return null;
  try {
    const cleaned = output
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("[PM2]"))
      .join("\n")
      .trim();
    const start = cleaned.indexOf("[");
    return start === -1 ? [] : JSON.parse(cleaned.slice(start));
  } catch {
    return null;
  }
}

/** Is anything accepting TCP connections on this port right now? */
function isPortListening(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (answer) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(answer);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, "127.0.0.1");
  });
}

/**
 * Wait until `port` is (or is no longer) accepting connections.
 *
 * Both directions are needed and neither is instant: PM2 returns from `delete`
 * before the OS has reaped the socket, and a freshly started server binds some
 * time after `pm2 start` exits 0.
 */
async function waitForPort(port, { listening, timeoutMs = 15000, intervalMs = 300 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if ((await isPortListening(port)) === listening) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Every backend process on this box, by COMMAND LINE, with PM2's own excluded.
 *
 * WHY NOT BY PORT. `pnpm stop` proves ports 3000 and 4000 are free before it
 * lets an update proceed, and that is a complete test for the frontend and the
 * API. It is blind to the one process most dangerous to leave running: the
 * scheduler binds 4001, serves nothing, and is not what either probe looks at.
 * A surviving `CRON_MODE=only` process therefore passes the port check while
 * still holding BullMQ repeatable jobs against a database about to be migrated
 * and seeded — and BullMQ hands a repeatable job to whichever worker takes it,
 * so withdrawals and settlement can run twice.
 *
 * PM2's own PIDs are filtered out, so callers see only what PM2 does NOT manage:
 * a process started by hand, one left behind by a crash-loop PM2 gave up on
 * ("too many unstable restarts"), or one from a second daemon under another
 * user. Those are exactly the processes no `pm2 delete` will ever reach.
 *
 * Returns [] on Windows and on any failure to ask — a detector that guesses
 * would block updates for no reason.
 */
function foreignBackendProcesses() {
  if (isWindows) return [];

  let pm2Pids = new Set();
  const list = pm2List();
  if (list === null) return []; // cannot tell ours from theirs; say nothing
  for (const proc of list) if (proc && proc.pid) pm2Pids.add(proc.pid);

  let out = "";
  try {
    out = execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8" });
  } catch {
    return [];
  }

  // THIS installation's entry points, as absolute paths.
  //
  // Matching on the SHAPE of the path (".../backend/dist/index.js") was wrong,
  // and wrong in the way that hurts most: a box hosting more than one Bicrypto —
  // a demo beside a staging copy, or several customers under one roof — has
  // other installs whose entry points look identical. On a real server this
  // flagged
  //
  //     pid 208768  node /home/updates/public_html/backend/dist/thread.js
  //
  // from a DIFFERENT account while running in /home/demo/public_html, and
  // refused to enter maintenance mode. A detector that blocks every update on a
  // shared host is worse than the orphan it is hunting, because the orphan is
  // rare and the block is certain.
  //
  // Anchoring to rootDir means a neighbouring install is invisible, which is
  // correct: another directory's scheduler is not ours to stop, and it drives
  // its own database.
  const ours = ["index.js", "thread.js"].map((entry) =>
    path.join(rootDir, "backend", "dist", entry)
  );

  const found = [];
  for (const line of out.split("\n")) {
    const match = line.trim().match(/^(\d+)\s+(.*)$/);
    if (!match) continue;
    const pid = Number(match[1]);
    const args = match[2];
    if (pid === process.pid || pm2Pids.has(pid)) continue;
    // Absolute-path match only. A process launched with a RELATIVE path is
    // missed, and that is the deliberate trade: a false negative costs the
    // runtime duplicate-scheduler warning the backend already prints, while a
    // false positive stops the operator updating at all.
    if (!ours.some((entry) => args.includes(entry))) continue;
    // The scripts that TALK about the entry point are not the entry point.
    if (/reconcile-scheduler|updator-migrate|maintenance-on|\bgrep\b/.test(args)) continue;
    found.push({ pid, args: args.slice(0, 120) });
  }
  return found;
}

module.exports = {
  rootDir,
  isWindows,
  pm2Cmd,
  OWNED_APPS,
  MAINTENANCE_APP,
  frontendPort,
  backendPort,
  runPm2,
  pm2List,
  foreignBackendProcesses,
  isPortListening,
  waitForPort,
};
