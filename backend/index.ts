// File: index.ts

// Load environment variables with multiple path fallbacks
import path from "path";
import fs from "fs";

// Try multiple paths for .env file - prioritize root .env file
const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, ".env"),
  path.resolve(process.cwd(), "../.env"),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  require("dotenv").config();
}

import "./module-alias-setup";
import { MashServer } from "./src";
import { console$, logger } from "./src/utils/console";

const port = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

const startApp = async () => {
  try {
    const app = new MashServer();
    // Start server - this waits for init then listens, showing "ready" only when all is done
    await app.startServer(Number(port));
  } catch (error) {
    console$.error("Failed to start server", error);
    logger.error("APP", "Failed to initialize app", error);
    process.exit(1);
  }
};

startApp();
