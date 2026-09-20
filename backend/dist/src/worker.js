"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../module-alias-setup");
const worker_threads_1 = require("worker_threads");
const _1 = require(".");
const ethers_log_guard_1 = require("./utils/console/ethers-log-guard");
(0, ethers_log_guard_1.installEthersLogThrottle)();
async function initializeWorker() {
    try {
        const server = new _1.MashServer();
        const workerPort = worker_threads_1.workerData.port;
        server.listen(workerPort, () => {
            worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage(server.getDescriptor());
        });
    }
    catch (error) {
        console.error(`Initialization error in worker ${worker_threads_1.threadId}:`, error);
        process.exit(1);
    }
}
initializeWorker();
