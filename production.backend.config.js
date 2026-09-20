/**
 * A BACKEND-ONLY HOST. `pnpm start:backend`.
 *
 * One process, serving the API on the port .env gives it
 * (backend/index.ts binds NEXT_PUBLIC_BACKEND_PORT), with no frontend beside it
 * — see the notes in src/api/admin/system/icon/utils.ts, which has to cope with
 * there being no frontend/ tree on such a host.
 *
 * IT SCHEDULES INLINE, and that is correct here: it sets no CRON_MODE, so
 * src/cron/mode.ts resolves `inline` and this process registers every job.
 * There is no second process on a host like this, so it has to. What it must
 * never be is a THIRD app beside production.config.js's `backend` and `cron` —
 * scripts/reconcile-scheduler.js is what stops that, by deleting a `backend`
 * whose scheduling role disagrees with the config about to start.
 *
 * NOT THE UPDATE PATH. `pnpm updator` used to start this config to apply a
 * schema migration, and it could not work: the maintenance server already holds
 * this port, so the bind failed and PM2 crash-looped it — while it registered
 * and ran every cron job against the database being migrated. The update now
 * uses scripts/updator-migrate.js, which runs the same entry point with
 * CRON_MODE=off on a port it has proven is free. Do not point the updator back
 * here.
 *
 * THE TRADING OPT-IN (plans/done/ORDER-SCALE-10K.md WP-2.1). ECO_TRADING_ENABLED=1
 * in .env adds a `trading` app (ECO_PROCESS_ROLE=trading, CRON_MODE=off, port
 * ECO_TRADING_PORT) that hosts the matcher and serves the trading routes the
 * proxy sends it (plans/done/order-scale/proxy-affinity.md). The one process above
 * cannot then stay inline: inline is a lease candidate and would race the
 * trading app for the matcher. So under the opt-in this host takes the same
 * shape as production.config.js minus the frontend: `backend` becomes the web
 * tier (CRON_MODE=off, ECO_PROCESS_ROLE=web, never a candidate) and a `cron`
 * app (CRON_MODE=only, 4001) carries the scheduler. scripts/reconcile-scheduler.js
 * already replaces a `backend` whose scheduling role disagrees with the config
 * about to start, so switching either way is one `pnpm start:backend`.
 */
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const tradingEnabled = ["1", "true", "yes", "on"].includes(
  String(process.env.ECO_TRADING_ENABLED || "").trim().toLowerCase()
);
const tradingPort = String(process.env.ECO_TRADING_PORT || "4010");
const backendPort = String(process.env.NEXT_PUBLIC_BACKEND_PORT || "4000");
if (tradingEnabled && (tradingPort === backendPort || tradingPort === "4001")) {
  throw new Error(
    `ECO_TRADING_PORT=${tradingPort} collides with the ${tradingPort === "4001" ? "cron" : "web"} ` +
      "backend's port; give the trading process a port of its own."
  );
}

// Nothing set without the opt-in: this process schedules inline, as the
// header says. With it, the web half of the split.
const web = tradingEnabled ? { CRON_MODE: "off", ECO_PROCESS_ROLE: "web" } : {};

const backendApp = {
  name: "backend",
  script: "./backend/dist/index.js",
  cwd: __dirname,
  env: {
    NODE_ENV: "production",
    ...web,
  },
  env_production: {
    NODE_ENV: "production",
    ...web,
  },
  exec_mode: "fork",
  instances: 1,
  max_memory_restart: "4G",
  watch: false,
  autorestart: true,
  // 78 = EX_CONFIG, raised for the two misconfigurations a restart cannot
  // fix: a runtime that cannot load the native modules (backend/preflight.ts
  // — wrong Node major for the shipped uWS ABI), and an unreachable Redis,
  // which is a hard dependency (backend/src/utils/redis.ts). Both print an
  // actionable message that 16 restarts would scroll away.
  stop_exit_codes: [78],
};

// The trading process, mirroring production.config.js's app of the same name:
// NEXT_PUBLIC_BACKEND_PORT pinned to ECO_TRADING_PORT because backend/index.ts
// binds the former for every role, and the plan's per-process pool sizes as
// defaults an operator's .env still overrides.
const tradingEnv = {
  NODE_ENV: "production",
  CRON_MODE: "off",
  ECO_PROCESS_ROLE: "trading",
  ECO_TRADING_PORT: tradingPort,
  PORT: Number(tradingPort) || 4010,
  NEXT_PUBLIC_BACKEND_PORT: tradingPort,
  DB_POOL_MAX: String(process.env.DB_POOL_MAX || "40"),
  WALLET_TX_CONCURRENCY: String(process.env.WALLET_TX_CONCURRENCY || "16"),
  SCYLLA_LOCAL_CONNECTIONS: String(process.env.SCYLLA_LOCAL_CONNECTIONS || "8"),
};
const tradingApp = {
  name: "trading",
  script: "./backend/dist/index.js",
  cwd: __dirname,
  env: { ...tradingEnv },
  env_production: { ...tradingEnv },
  exec_mode: "fork",
  instances: 1,
  max_memory_restart: "4G",
  watch: false,
  autorestart: true,
  stop_exit_codes: [78],
};

// The scheduler, exactly production.config.js's `cron` app: a distinct port
// purely to avoid EADDRINUSE, nothing connects to it.
const cronEnv = {
  NODE_ENV: "production",
  CRON_MODE: "only",
  PORT: 4001,
  NEXT_PUBLIC_BACKEND_PORT: "4001",
};
const cronApp = {
  name: "cron",
  script: "./backend/dist/index.js",
  cwd: __dirname,
  env: { ...cronEnv },
  env_production: { ...cronEnv },
  exec_mode: "fork",
  instances: 1,
  max_memory_restart: "2G",
  watch: false,
  autorestart: true,
  stop_exit_codes: [78],
};

module.exports = {
  apps: tradingEnabled ? [backendApp, tradingApp, cronApp] : [backendApp],
};
