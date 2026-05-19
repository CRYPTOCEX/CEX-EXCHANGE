"use strict";

const path = require("path");
const fs = require("fs");

// Load environment variables with multiple path fallbacks - prioritize root .env file
const envPaths = [
  path.resolve(process.cwd(), "../.env"),  // Root .env (one level up from backend)
  path.resolve(__dirname, "../.env"),     // Development relative path (same as above)
  path.resolve(process.cwd(), ".env"),    // Current working directory
  path.resolve(__dirname, ".env"),        // Fallback (same directory)
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const dotenvResult = require("dotenv").config({ path: envPath });
    if (!dotenvResult.error) {
      console.log(`Config: Environment loaded from: ${envPath}`);
      envLoaded = true;
      break;
    }
  }
}

if (!envLoaded) {
  console.warn(`Config: Warning: No .env file found. Tried paths: ${envPaths.join(", ")}`);
  // Try to load from process environment as fallback
  require("dotenv").config();
}

// Determine the correct environment - Sequelize CLI uses NODE_ENV
const environment = process.env.NODE_ENV || 'development';
console.log(`Config: Using environment: ${environment}`);
console.log(`Config: NODE_ENV = ${process.env.NODE_ENV}`);
console.log(`Config: Database config - Host: ${process.env.DB_HOST}, User: ${process.env.DB_USER}, Database: ${process.env.DB_NAME}`);

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Config: Error - Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error(`Config: Please ensure your .env file contains all required database configuration variables.`);
}

const dbConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  dialect: "mysql",
  port: process.env.DB_PORT || 3306,
  logging: environment === 'development' ? console.log : false,
  dialectOptions: {
    charset: 'utf8mb4',
    timezone: '+00:00',
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  }
};

module.exports = {
  development: dbConfig,
  test: dbConfig,
  production: dbConfig,
};
