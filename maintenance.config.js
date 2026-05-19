/**
 * PM2 Configuration for Maintenance Mode
 * This runs a lightweight server that displays a maintenance page
 * when the main application is stopped.
 */
module.exports = {
  apps: [
    {
      name: "maintenance",
      script: "./maintenance/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        BACKEND_PORT: 4000,
      },
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "100M",
      autorestart: true,
      watch: false,
    },
  ],
};
