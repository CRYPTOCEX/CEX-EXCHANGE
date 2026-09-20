// File: index.ts

// MUST be first, above load-env: verifies this Node can actually load the
// native modules before anything requires one. Reads no env, so it is safe
// ahead of load-env — see preflight.ts.
import "./preflight";

// MUST be first among modules that read env: populates process.env before any
// other module is imported. Kept in its own module because esbuild/tsx hoists
// imports above top-level statements — see load-env.ts.
import "./load-env";

import "./module-alias-setup";

// Armed before the boot chain is imported so a module that throws while being
// required is caught too. Dev only; a no-op in production. See boot-guard.ts —
// nodemon does not watch src any more, so without this a boot failure would
// leave nothing watching for the fix.
import { installDevBootGuard, disarmDevBootGuard, waitForFix } from "./src/utils/dev/boot-guard";
import { applyTerminalTitle } from "./src/utils/process-role";

installDevBootGuard();

// Name the terminal window after the role this process plays. Here, at the entry
// point, rather than alongside the banner: nodemon restarts the child and not
// the terminal, so a title set by whatever launched the window (`wt --title`,
// `start "cron"`) goes stale as soon as the window is re-used — and a process
// that dies during boot should still have labelled its own window on the way
// down. No-op when stdout is not a TTY.
applyTerminalTitle();

import { MashServer } from "./src";
import { console$, logger } from "./src/utils/console";
import { installEthersLogThrottle } from "./src/utils/console/ethers-log-guard";

// Must be active before any ethers provider exists — see ethers-log-guard.ts.
installEthersLogThrottle();

const port = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

const startApp = async () => {
  try {
    const app = new MashServer();
    // Start server - this waits for init then listens, showing "ready" only when all is done
    await app.startServer(Number(port));

    // Boot is done: from here on a crash is a real runtime crash and must not
    // be swallowed by the guard.
    disarmDevBootGuard();

    // Development only: watch src and swap edited modules in place instead of
    // restarting the whole process, falling back to a restart for anything the
    // require graph says cannot be swapped safely. Imported lazily so neither
    // the watcher nor chokidar is ever loaded in production.
    if (process.env.NODE_ENV !== "production") {
      const { startHotReload } = await import("./src/utils/dev/hot-reload");
      startHotReload();
    }
  } catch (error) {
    console$.error("Failed to start server", error);
    logger.error("APP", "Failed to initialize app", error);
    // In development this parks the process on a watcher and restarts once the
    // offending file is fixed; in production it exits.
    waitForFix(error);
  }
};

startApp();
