// thread.ts
// MUST be first, above load-env: verifies this Node can actually load the
// native modules before anything requires one. Reads no env — see preflight.ts.
import "./preflight";

// MUST be first among modules that read env: populates process.env before any
// other module is imported. Kept in its own module because esbuild/tsx hoists
// imports above top-level statements — see load-env.ts.
import { envLoadedFrom, triedEnvPaths } from "./load-env";

if (envLoadedFrom) {
  console.log(`\x1b[32mEnvironment loaded from: ${envLoadedFrom}\x1b[0m`);
} else {
  console.warn(
    `\x1b[33mWarning: No .env file found. Tried paths: ${triedEnvPaths.join(", ")}\x1b[0m`
  );
}

import path from "path";
import { Worker, isMainThread, threadId } from "worker_threads";
import { MashServer } from "./src";
import { installEthersLogThrottle } from "./src/utils/console/ethers-log-guard";

// Must be active before any ethers provider exists — see ethers-log-guard.ts.
installEthersLogThrottle();

const port = Number(process.env.NEXT_PUBLIC_BACKEND_PORT) || 4000;
const threads = Number(process.env.NEXT_PUBLIC_BACKEND_THREADS) || 2;

// This entry ALWAYS ends up with more than one JS realm (the acceptor plus at
// least one worker), and every worker gets its own copy of every singleton —
// so every in-memory cache, and anything that must happen exactly once per
// deployment, needs cross-process coordination here. Stamped before the first
// Worker is constructed because a worker inherits a snapshot of process.env,
// which is what lets the workers see it too. Read by
// src/utils/settings-bus.ts:isMultiProcessDeployment().
process.env.MASH_BACKEND_MULTI_PROCESS = "1";

if (isMainThread) {
  const acceptorApp = new MashServer();

  acceptorApp.listen(port, (): void => {
    console.log(`Main Thread: listening on port ${port} (thread ${threadId})`);
  });

  // Spawn worker threads with incremental ports
  const cpuCount = require("os").cpus().length;
  if (threads > cpuCount) {
    console.warn(
      `WARNING: Number of threads (${threads}) is greater than the number of CPUs (${cpuCount})`
    );
  }
  const usableThreads = Math.min(threads, cpuCount);
  // Resolve the worker entry relative to THIS module: under tsx __dirname is
  // backend/ and __filename ends in .ts (worker at backend/src/worker.ts); when
  // compiled __dirname is backend/dist and __filename ends in .js (worker at
  // backend/dist/src/worker.js). The old "backend/worker.ts" path resolved to a
  // nonexistent backend/backend/worker.ts, so worker threads never spawned.
  const workerExt = path.extname(__filename) === ".js" ? ".js" : ".ts";
  const workerPath = path.resolve(__dirname, "src", `worker${workerExt}`);
  // The TypeScript loader is only needed while the worker entry is still .ts
  // (dev); compiled workers are plain .js and must not pull a compiler into the
  // thread — the previous unconditional "-r ts-node/register" did exactly that
  // in production.
  //
  // It must be "--import tsx", not "-r tsx/cjs": the CJS-only hook leaves
  // dynamic `import()` to Node's native ESM loader, which knows nothing about
  // @b/* and killed every worker with "Cannot find package '@b/services'".
  // `--import tsx` registers the ESM resolver too, and that one honours the
  // tsconfig `paths` mapping. Alias registration for plain require() lives in
  // src/worker.ts, which imports module-alias-setup as its first import.
  const workerExecArgv = workerExt === ".ts" ? ["--import", "tsx"] : [];
  for (let i = 0; i < usableThreads; i++) {
    const worker = new Worker(workerPath, {
      execArgv: workerExecArgv,
      workerData: { port: 4001 + i }, // Unique port for each worker
    });

    // Listen for messages and errors from the worker
    worker.on("message", (workerAppDescriptor) => {
      acceptorApp.addChildAppDescriptor(workerAppDescriptor);
    });

    worker.on("error", (err) => {
      console.error(`Error in worker ${i}:`, err);
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Worker ${i} stopped with exit code ${code}`);
      }
    });
  }
}
