"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const envPaths = [
    path_1.default.resolve(process.cwd(), ".env"),
    path_1.default.resolve(__dirname, "../.env"),
    path_1.default.resolve(__dirname, ".env"),
    path_1.default.resolve(process.cwd(), "../.env"),
];
let envLoaded = false;
for (const envPath of envPaths) {
    if (fs_1.default.existsSync(envPath)) {
        require("dotenv").config({ path: envPath });
        console.log(`\x1b[32mEnvironment loaded from: ${envPath}\x1b[0m`);
        envLoaded = true;
        break;
    }
}
if (!envLoaded) {
    console.warn(`\x1b[33mWarning: No .env file found. Tried paths: ${envPaths.join(", ")}\x1b[0m`);
    require("dotenv").config();
}
const worker_threads_1 = require("worker_threads");
const src_1 = require("./src");
const port = Number(process.env.NEXT_PUBLIC_BACKEND_PORT) || 4000;
const threads = Number(process.env.NEXT_PUBLIC_BACKEND_THREADS) || 2;
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
    for (let i = 0; i < usableThreads; i++) {
        const worker = new worker_threads_1.Worker(path_1.default.resolve(__dirname, "backend", "worker.ts"), {
            execArgv: ["-r", "ts-node/register", "-r", "module-alias/register"],
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
