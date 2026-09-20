/**
 * Registers the `@b` / `@db` path aliases. This is the FIRST thing the backend
 * loads, before preflight and before anything else.
 *
 * Being first is why the guard below exists. `module-alias` is a declared
 * production dependency, but a node_modules tree can be incomplete for reasons
 * that have nothing to do with the declaration — an install interrupted by
 * pnpm's no-TTY modules-purge abort, a half-built virtual store, a `--prod`
 * install against a mismatched lockfile, a disk that filled mid-write. When that
 * happens here, the failure is uniquely unhelpful:
 *
 *     Error: Cannot find module 'module-alias/register'
 *     Require stack:
 *     - /home/.../backend/dist/module-alias-setup.js
 *     - /home/.../backend/dist/index.js
 *     PM2 | Script had too many unstable restarts (16). Stopped. "errored"
 *
 * The operator gets a raw resolver stack, sixteen restarts of it, and no
 * indication that the answer is "your install is incomplete". Worse, exit code 1
 * is NOT in `stop_exit_codes`, so PM2 treats a permanent packaging fault as a
 * transient crash and loops on it — scrolling away whatever else was on screen.
 *
 * So: catch it, say what it means, and exit 78 (EX_CONFIG). 78 IS in
 * `stop_exit_codes` in production.config.js, which makes PM2 stop with the
 * message visible instead of burying it — the same convention an unreachable
 * Redis and a wrong Node major already use.
 */

let moduleAlias: typeof import("module-alias");

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("module-alias/register");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  moduleAlias = require("module-alias");
} catch (error: any) {
  if (error?.code !== "MODULE_NOT_FOUND") throw error;

  const isWindows = process.platform === "win32";
  process.stderr.write(
    "\n" +
      "  ✗ The backend cannot start: its dependencies are not installed.\n" +
      "\n" +
      `    Missing: module-alias (${error.message})\n` +
      "\n" +
      "  This is a declared production dependency, so the package.json is fine —\n" +
      "  node_modules is incomplete. That usually means an install was interrupted:\n" +
      "  pnpm aborts its node_modules purge when it has no TTY, which can leave the\n" +
      "  tree half-removed, and a later `pnpm install` trusts the lockfile and only\n" +
      "  fills gaps, so it cannot repair an inconsistent store.\n" +
      "\n" +
      "  Rebuild it from scratch:\n" +
      "\n" +
      "      pnpm reinstall\n" +
      "\n" +
      "  or by hand:\n" +
      "\n" +
      (isWindows
        ? "      rmdir /s /q node_modules backend\\node_modules frontend\\node_modules\n"
        : "      rm -rf node_modules backend/node_modules frontend/node_modules\n") +
      "      CI=true pnpm install\n" +
      "\n" +
      "  If that fails too, check for a full disk first:  df -h .\n" +
      "\n"
  );
  // 78 = EX_CONFIG. Listed in stop_exit_codes, so PM2 STOPS here rather than
  // restarting sixteen times into the same permanent fault.
  process.exit(78);
}

import path from "path";

const isProduction = process.env.NODE_ENV === "production";

// If this file is in `backend/` during development and compiled into `dist/backend/` in production:
const aliases = isProduction
  ? {
      // In production, code is compiled to `dist/src`,
      // so @b should point to `dist/src` and @db to `dist/models`.
      "@b": path.resolve(__dirname, "src"),
      "@db": path.resolve(__dirname, "models"),
    }
  : {
      // In development, `module-alias-setup.ts` is in `backend`.
      // `@b` points to `backend/src`.
      "@b": path.resolve(__dirname, "src"),
      // `@db` points to `models` which is one level up from `backend`.
      "@db": path.resolve(__dirname, "models"),
    };

for (const alias in aliases) {
  moduleAlias.addAlias(alias, aliases[alias]);
}
