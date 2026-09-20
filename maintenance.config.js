/**
 * PM2 Configuration for Maintenance Mode
 * This runs a lightweight server that displays a maintenance page
 * when the main application is stopped.
 *
 * THE PORTS COME FROM THE SAME PLACE THE REAL APPS GET THEM. They used to be
 * literals — 3000 and 4000 — which is right for the frontend and wrong for the
 * backend. `backend/index.ts` binds `NEXT_PUBLIC_BACKEND_PORT || 4000` and
 * ignores `PORT` entirely, and production.config.js does not set that variable
 * on the `backend` app, so it comes from the operator's .env. An install that
 * moved its API off 4000 therefore got a maintenance server answering on a port
 * nothing used, while the port the world actually calls sat refusing
 * connections for the whole update. scripts/pm2-lifecycle.js resolves both,
 * and explains why the frontend's stays a literal.
 */
const { frontendPort, backendPort } = require("./scripts/pm2-lifecycle");

module.exports = {
  apps: [
    {
      name: "maintenance",
      script: "./maintenance/server.js",
      env: {
        NODE_ENV: "production",
        PORT: frontendPort(),
        BACKEND_PORT: backendPort(),
      },
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "100M",
      autorestart: true,
      watch: false,
      // 78 = EX_CONFIG, raised by maintenance/server.js when a port it needs is
      // already in use. That is not a transient fault to restart through — it
      // means the app this port belongs to was NOT stopped — and restarting
      // sixteen times would scroll the one message that says so off the screen
      // while `pnpm stop` reported success. Same convention as the backend.
      stop_exit_codes: [78],
    },
  ],
};
