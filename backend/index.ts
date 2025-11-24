// File: index.ts

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

import "./module-alias-setup";
import { MashServer } from "./src";
import logger from "./src/utils/logger";

const port = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

const startApp = async () => {
  try {
    const app = new MashServer();
    app.listen(Number(port), () => {
      console.log(
        `\x1b[36mMain Thread: Server running on port ${port}...\x1b[0m`
      );
    });
  } catch (error) {
    logger(
      "error",
      "app",
      __filename,
      `Failed to initialize app: ${error.message}`
    );
    process.exit(1);
  }
};

startApp();
