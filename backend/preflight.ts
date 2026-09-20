/**
 * Boot preflight — MUST be the first import of every entry point (index.ts,
 * thread.ts), above load-env.
 *
 * uWebSockets.js has no build step. `uws.js` is literally
 *   require('./uws_' + platform + '_' + arch + '_' + process.versions.modules + '.node')
 * so the runnable Node range is decided entirely by which prebuilt binaries the
 * pinned version happens to ship. v20.69.0 ships ABI 127/137/147 = Node 22/24/26;
 * Node 20 (ABI 115) has no binary and dies at require time with
 * "Cannot find module './uws_linux_x64_115.node'", four frames deep inside
 * handler/Request.js — which reads like a corrupt install, not a wrong runtime.
 * Under PM2 that repeats until "too many unstable restarts", burying the cause,
 * while the only visible symptom is ECONNREFUSED on :4000 from the frontend.
 *
 * This turns that into one readable message before anything else is loaded.
 * The supported list is READ FROM THE INSTALLED PACKAGE rather than hardcoded,
 * because the constraint moves every time uWS is bumped (v20.52.0 dropped
 * Node 18, v20.53.0 dropped 23, v20.67.0 dropped 20 and 25).
 */

import { readdirSync } from "fs";
import { dirname } from "path";

/**
 * sysexits.h EX_CONFIG. Paired with `stop_exit_codes` in the PM2 configs so an
 * unsupported runtime stops the app with the message on screen instead of
 * crash-looping 16 times and scrolling it away.
 */
const EXIT_UNSUPPORTED_RUNTIME = 78;

/** NODE_MODULE_VERSION -> Node major. Only used to phrase the message. */
const ABI_TO_NODE_MAJOR: Record<string, string> = {
  "108": "18",
  "115": "20",
  "127": "22",
  "131": "23",
  "137": "24",
  "143": "25",
  "147": "26",
};

/**
 * Real package root (require.resolve follows the pnpm symlink), which is where
 * the .node files sit. If it cannot be resolved the module is missing outright
 * and Node's own "Cannot find module 'uWebSockets.js'" is already clear enough.
 */
function uwsPackageDir(): string | null {
  try {
    return dirname(require.resolve("uWebSockets.js"));
  } catch {
    return null;
  }
}

function shippedAbis(dir: string): string[] {
  const prefix = `uws_${process.platform}_${process.arch}_`;
  try {
    return readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".node"))
      .map((f) => f.slice(prefix.length, -".node".length))
      .sort((a, b) => Number(a) - Number(b));
  } catch {
    return [];
  }
}

function nodeMajors(abis: string[]): string {
  return abis.map((abi) => ABI_TO_NODE_MAJOR[abi] ?? `ABI ${abi}`).join(", ");
}

function checkNativeRuntime(): void {
  const dir = uwsPackageDir();
  if (!dir) return;

  const supported = shippedAbis(dir);
  // No binary for this platform/arch at all (musl/Alpine, 32-bit, ...). That is
  // not a Node-version problem — let uWS raise its own, more accurate error.
  if (supported.length === 0) return;
  if (supported.indexOf(process.versions.modules) !== -1) return;

  const rule = "═".repeat(74);
  process.stderr.write(
    `\n${rule}\n` +
      ` UNSUPPORTED NODE.JS VERSION — the backend cannot start\n` +
      `${rule}\n` +
      ` Running:   Node ${process.version}  (ABI ${process.versions.modules})\n` +
      ` Required:  Node ${nodeMajors(supported)}  (ABI ${supported.join(", ")})\n` +
      `\n` +
      ` uWebSockets.js ships prebuilt binaries only for the versions above, so\n` +
      ` this runtime has no uws_${process.platform}_${process.arch}_${process.versions.modules}.node to load.\n` +
      `\n` +
      ` Fix on this server:\n` +
      `   1. Install a supported Node, e.g.\n` +
      `        curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -\n` +
      `        sudo apt-get install -y nodejs\n` +
      `      (or:  nvm install 26 && nvm use 26 && nvm alias default 26)\n` +
      `\n` +
      `   2. Re-point PM2 at it. The daemon keeps whatever Node started it, so\n` +
      `      this is required even when \`node -v\` already looks right:\n` +
      `        pm2 kill && npm install -g pm2\n` +
      `\n` +
      `   3. Rebuild the native modules against the new ABI, then start:\n` +
      `        pnpm rebuild -r\n` +
      `        pnpm start\n` +
      `${rule}\n\n`
  );
  process.exit(EXIT_UNSUPPORTED_RUNTIME);
}

/**
 * Every package the boot chain requires before it can report anything itself.
 *
 * WHY A LIST, CHECKED ALL AT ONCE. These are required in sequence by the first
 * three modules of the entry point (preflight -> load-env -> module-alias-setup
 * -> src), so an incomplete node_modules surfaces them ONE AT A TIME: fix
 * `module-alias`, restart, hit `dotenv`, restart, hit the next. Each round is a
 * PM2 crash-loop of sixteen restarts printing a raw resolver stack, and none of
 * them says "your install is incomplete".
 *
 * Resolving the whole set here turns that into a single message listing
 * everything missing, before any of it is actually needed.
 *
 * Deliberately short: this is not a manifest check. It is the set that must
 * exist for the backend to get far enough to diagnose itself — anything missing
 * later fails with a normal error from code that can explain its own context.
 */
const REQUIRED_AT_BOOT = [
  "dotenv", // load-env.ts
  "module-alias", // module-alias-setup.ts
  "ioredis", // utils/redis.ts — hard dependency, gates boot
  "sequelize", // db.ts
  "mysql2", // sequelize's driver; missing separately from sequelize
  "bullmq", // src/cron/index.ts — required while server.ts is still loading
  "uWebSockets.js", // the HTTP server itself
];

function checkRuntimeDependencies(): void {
  const missing: string[] = [];
  for (const name of REQUIRED_AT_BOOT) {
    try {
      require.resolve(name);
    } catch {
      missing.push(name);
    }
  }
  if (!missing.length) return;

  const isWindows = process.platform === "win32";
  const bar = "─".repeat(74);
  process.stderr.write(
    `\n${bar}\n` +
      `  ✗ The backend cannot start: ${missing.length} required package(s) are not installed.\n` +
      `\n` +
      missing.map((name) => `        ${name}\n`).join("") +
      `\n` +
      `  These are all declared production dependencies, so package.json is fine —\n` +
      `  node_modules is incomplete. That usually follows an interrupted install:\n` +
      `  pnpm aborts its node_modules purge when it has no TTY, which leaves the tree\n` +
      `  half-removed, and a later \`pnpm install\` trusts the lockfile and only fills\n` +
      `  gaps — so it cannot repair an inconsistent store.\n` +
      `\n` +
      `  Rebuild it from scratch:\n` +
      `\n` +
      `        pnpm reinstall\n` +
      `\n` +
      `  or by hand, from the repo root:\n` +
      `\n` +
      (isWindows
        ? `        rmdir /s /q node_modules backend\\node_modules frontend\\node_modules\n`
        : `        rm -rf node_modules backend/node_modules frontend/node_modules\n`) +
      `        CI=true pnpm install\n` +
      `\n` +
      `  Then check it took, from the repo root:\n` +
      `        node -e "require.resolve('dotenv')&&require.resolve('module-alias')&&console.log('ok')"\n` +
      `\n` +
      `  If the install fails again, check for a full disk first:  df -h .\n` +
      `${bar}\n\n`
  );
  // 78 = EX_CONFIG, listed in stop_exit_codes, so PM2 stops with this on screen
  // instead of restarting sixteen times into the same permanent fault.
  process.exit(EXIT_UNSUPPORTED_RUNTIME);
}

try {
  checkNativeRuntime();
} catch {
  // A preflight must never itself be the reason boot fails.
}

// AFTER the native check: a wrong Node major is the more fundamental problem and
// its message should win. This one must not be wrapped in a swallowing catch —
// a missing dependency is exactly the case it exists to report.
checkRuntimeDependencies();
