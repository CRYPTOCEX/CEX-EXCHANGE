"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./preflight");
const load_env_1 = require("./load-env");
if (load_env_1.envLoadedFrom) {
    console.log(`\x1b[32mEnvironment loaded from: ${load_env_1.envLoadedFrom}\x1b[0m`);
}
else {
    console.warn(`\x1b[33mWarning: No .env file found. Tried paths: ${load_env_1.triedEnvPaths.join(", ")}\x1b[0m`);
}
const path_1 = __importDefault(require("path"));
const worker_threads_1 = require("worker_threads");
const src_1 = require("./src");
const ethers_log_guard_1 = require("./src/utils/console/ethers-log-guard");
(0, ethers_log_guard_1.installEthersLogThrottle)();
const port = Number(process.env.NEXT_PUBLIC_BACKEND_PORT) || 4000;
const threads = Number(process.env.NEXT_PUBLIC_BACKEND_THREADS) || 2;
process.env.MASH_BACKEND_MULTI_PROCESS = "1";
if (worker_threads_1.isMainThread) {
    const acceptorApp = new src_1.MashServer();
    acceptorApp.listen(port, () => {
        console.log(`Main Thread: listening on port ${port} (thread ${worker_threads_1.threadId})`);
    });
    const cpuCount = require("os").cpus().length;
    if (threads > cpuCount) {
        console.warn(`WARNING: Number of threads (${threads}) is greater than the number of CPUs (${cpuCount})`);
    }
    const usableThreads = Math.min(threads, cpuCount);
    const workerExt = path_1.default.extname(__filename) === ".js" ? ".js" : ".ts";
    const workerPath = path_1.default.resolve(__dirname, "src", `worker${workerExt}`);
    const workerExecArgv = workerExt === ".ts" ? ["--import", "tsx"] : [];
    for (let i = 0; i < usableThreads; i++) {
        const worker = new worker_threads_1.Worker(workerPath, {
            execArgv: workerExecArgv,
            workerData: { port: 4001 + i },
        });
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
