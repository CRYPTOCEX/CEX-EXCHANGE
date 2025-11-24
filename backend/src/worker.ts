import { threadId, parentPort, workerData } from "worker_threads";
import { MashServer } from ".";

async function initializeWorker() {
  try {
    // Step 2: Initialize MashServer and listen on assigned port
    const server = new MashServer();
    const workerPort = workerData.port;

    server.listen(workerPort, () => {
      parentPort?.postMessage(server.getDescriptor());
    });
  } catch (error) {
    console.error(`Initialization error in worker ${threadId}:`, error);
    process.exit(1); // Exit the worker with a non-zero code if an error occurs
  }
}

// Run the worker initialization
initializeWorker();
