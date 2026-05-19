// index.ts
// Load environment variables with multiple path fallbacks
import path from "path";
import fs from "fs";

// Try multiple paths for .env file - prioritize root .env file
const envPaths = [
  path.resolve(process.cwd(), ".env"),    // Production/Development root .env (PRIORITY)
  path.resolve(__dirname, "../.env"),     // Development relative path
  path.resolve(__dirname, ".env"),        // Fallback (same directory)
  path.resolve(process.cwd(), "../.env"), // Another fallback
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    console.log(`\x1b[32mEnvironment loaded from: ${envPath}\x1b[0m`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn(`\x1b[33mWarning: No .env file found. Tried paths: ${envPaths.join(", ")}\x1b[0m`);
  // Try to load from process environment as fallback
  require("dotenv").config();
}

import { Worker, isMainThread, threadId } from "worker_threads";
import { MashServer } from "./src";

const port = Number(process.env.NEXT_PUBLIC_BACKEND_PORT) || 4000;
const threads = Number(process.env.NEXT_PUBLIC_BACKEND_THREADS) || 2;

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
  for (let i = 0; i < usableThreads; i++) {
    const worker = new Worker(path.resolve(__dirname, "backend", "worker.ts"), {
      execArgv: ["-r", "ts-node/register", "-r", "module-alias/register"], // Add module-alias/register here
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
