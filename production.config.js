// The operator's .env is the source of truth for anything site-specific.
//
// This file used to hardcode NEXT_PUBLIC_SITE_URL (and the site name and
// description). A PM2 `env` block OVERRIDES the process environment, so those
// literals silently beat whatever the operator had set in .env — and this is a
// white-label product where every install runs its own domain. The result was
// that a client who correctly configured their own site still had our URL
// injected at boot.
//
// Read .env here and fall back only to values that are true for ANY install.
// `dotenv` never overwrites a variable that is already exported, so a value set
// in the shell or by PM2 itself still wins over the file.
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

// Cron runs in its OWN PROCESS by default. Both halves of that decision live
// here, in one file, so they cannot disagree.
//
// Why a process and not the web backend: every "Worker" the backend registers
// is a BullMQ worker, which runs IN THE PROCESS THAT CREATED IT — `await
// job.handler()` on the very event loop that serves HTTP. A job that grows the
// heap therefore stalls request serving through garbage collection, and a
// mark-compact pause near the heap limit measured 1.9 SECONDS with the site
// answering nothing. A separate process has its own heap, so cron work can
// misbehave without taking the site down with it. Worker threads would NOT do:
// threads share one V8 heap limit, which is the exact resource that runs out.
//
// These are NOT operator settings and deliberately do not appear in .env — the
// split is the supported shape, not a toggle.
//
// The one escape hatch, for an operator who genuinely wants the old
// single-process arrangement: CRON_MODE=inline, in .env or exported. It has to
// be read HERE and act on the app list, because a PM2 `env` block OVERRIDES the
// inherited environment for the process it spawns — `CRON_MODE: "off"` below
// would beat an exported `inline` and the opt-out would silently do nothing.
// Honouring it means dropping the `cron` app as well as the `off`, so the
// deployment ends up in one whole state rather than a web process that
// schedules nothing next to a scheduler nobody started.
const inlineCron =
  String(process.env.CRON_MODE || "").trim().toLowerCase() === "inline";

// The dedicated trading process (plans/done/ORDER-SCALE-10K.md WP-2.1) is OPT-IN:
// ECO_TRADING_ENABLED=1 in .env adds a fourth app, `trading`, running the same
// entry point with ECO_PROCESS_ROLE=trading on ECO_TRADING_PORT (4010). It
// serves the trading routes the reverse proxy sends it
// (plans/done/order-scale/proxy-affinity.md) and is then the ONLY process that may
// hold the ecosystem matching lease; the web app is marked ECO_PROCESS_ROLE=web
// so it never claims (backend/src/utils/engine-lease.ts). Without the opt-in
// this file is byte-for-byte what it was: three apps, no ECO_PROCESS_ROLE
// anywhere, the web app hosting the matcher as it always has.
//
// It needs the cron split. A trading process must run CRON_MODE=off (the role
// resolver refuses anything else, backend/src/utils/process-role.ts), and the
// inline opt-out above would leave a scheduling web process that is also a
// lease candidate racing the trading app for the matcher. Refuse the
// combination here, whole, rather than start half of it.
const tradingEnabled = ["1", "true", "yes", "on"].includes(
  String(process.env.ECO_TRADING_ENABLED || "").trim().toLowerCase()
);
if (tradingEnabled && inlineCron) {
  throw new Error(
    "ECO_TRADING_ENABLED needs the cron split: unset CRON_MODE=inline (the trading " +
      "process runs CRON_MODE=off and the web process must not host the matcher beside it)."
  );
}
const tradingPort = String(process.env.ECO_TRADING_PORT || "4010");
const backendPort = String(process.env.NEXT_PUBLIC_BACKEND_PORT || "4000");
if (tradingEnabled && (tradingPort === backendPort || tradingPort === "4001")) {
  throw new Error(
    `ECO_TRADING_PORT=${tradingPort} collides with the ${tradingPort === "4001" ? "cron" : "web"} ` +
      "backend's port; give the trading process a port of its own."
  );
}

const web = inlineCron
  ? {}
  : { CRON_MODE: "off", ...(tradingEnabled ? { ECO_PROCESS_ROLE: "web" } : {}) };
const cron = { CRON_MODE: "only" };
const trading = {
  CRON_MODE: "off",
  ECO_PROCESS_ROLE: "trading",
  ECO_TRADING_PORT: tradingPort,
};

const site = {
  // No default URL: an absolute URL that is wrong is worse than one that is
  // absent, because it ends up in canonical tags, emails and OAuth callbacks.
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "",
  NEXT_PUBLIC_BACKEND_PORT: process.env.NEXT_PUBLIC_BACKEND_PORT || "4000",
  NEXT_PUBLIC_FRONTEND_PORT: process.env.NEXT_PUBLIC_FRONTEND_PORT || "3000",
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto",
  NEXT_PUBLIC_SITE_DESCRIPTION:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Trading Platform",
};

const apps = [
    {
      name: "backend",
      script: "./backend/dist/index.js",
      env: {
        NODE_ENV: "production",
        // PORT is inert — backend/index.ts binds NEXT_PUBLIC_BACKEND_PORT and
        // ignores PORT entirely. Kept only because tooling reads it.
        PORT: Number(site.NEXT_PUBLIC_BACKEND_PORT) || 4000,
        // PINNED, exactly like the cron app pins 4001.
        //
        // This used to be left to inherit while `cron` hardcoded 4001, and that
        // asymmetry is a real failure: PM2's daemon keeps the environment it was
        // FIRST started with and passes it to every app that does not override
        // the variable. So a stray NEXT_PUBLIC_BACKEND_PORT=4001 anywhere in
        // that history — a shell that once started the scheduler by hand, a
        // harness, an earlier release — silently moved the API onto the
        // scheduler's port. The banner then reads `WEB / API · port 4001` while
        // the frontend, the maintenance server and every lifecycle script go on
        // addressing 4000, and the two apps fight over one socket.
        NEXT_PUBLIC_BACKEND_PORT: String(site.NEXT_PUBLIC_BACKEND_PORT || "4000"),
        ...web,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: Number(site.NEXT_PUBLIC_BACKEND_PORT) || 4000,
        NEXT_PUBLIC_BACKEND_PORT: String(site.NEXT_PUBLIC_BACKEND_PORT || "4000"),
        ...web,
      },
      exec_mode: "fork",
      instances: 1,
      // 78 = EX_CONFIG, raised for the two misconfigurations a restart cannot
      // fix: a runtime that cannot load the native modules (backend/preflight.ts
      // — wrong Node major for the shipped uWS ABI), and an unreachable Redis,
      // which is a hard dependency (backend/src/utils/redis.ts). Both print an
      // actionable message that 16 restarts would scroll away.
      stop_exit_codes: [78],
    },
    {
      name: "frontend",
      script: "./frontend/node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./frontend",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        ...site,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
        ...site,
      },
      exec_mode: "fork",
      instances: 1,
    },
    {
      // The scheduler. Same entry point as `backend`; CRON_MODE is the only
      // thing that makes it different, and the pair above guarantees exactly
      // one of the two registers jobs.
      name: "cron",
      script: "./backend/dist/index.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        ...cron,
        // A distinct port purely to avoid EADDRINUSE against the web backend.
        // Nothing is meant to connect to it — do not point a load balancer here.
        PORT: 4001,
        NEXT_PUBLIC_BACKEND_PORT: "4001",
      },
      env_production: {
        NODE_ENV: "production",
        ...cron,
        PORT: 4001,
        NEXT_PUBLIC_BACKEND_PORT: "4001",
      },
      exec_mode: "fork",
      instances: 1,
      // The point of the exercise: when cron work grows the heap without bound,
      // THIS process is what gets recycled — alone, while the web process keeps
      // serving. Far below the web backend's ceiling because a scheduler has no
      // reason to need more.
      //
      // PM2 measures RSS, which is always larger than the V8 heap, so keeping
      // this at or below the V8 cap guarantees PM2 restarts gracefully BEFORE
      // V8 hits "Ineffective mark-compacts near heap limit" — which arrives
      // preceded by the very multi-second GC pauses this split exists to avoid.
      max_memory_restart: "2G",
      watch: false,
      autorestart: true,
      stop_exit_codes: [78],
    },
];

// The trading process. Same entry point as `backend`; ECO_PROCESS_ROLE and the
// port are what make it different. Defined only under the opt-in so that an
// install without it has no fourth app to reconcile, stop or forget.
//
// Its NEXT_PUBLIC_BACKEND_PORT is pinned to ECO_TRADING_PORT because
// backend/index.ts binds NEXT_PUBLIC_BACKEND_PORT for every role; the pin is
// what keeps the bound port and the port the proxy config names the same.
// The per-process pool sizes the plan gives this tier (DB_POOL_MAX 40,
// WALLET_TX_CONCURRENCY 16, SCYLLA_LOCAL_CONNECTIONS 8) are defaults only: a
// value the operator set in .env still wins, exactly as for every other key
// in this file.
const tradingApp = {
  name: "trading",
  script: "./backend/dist/index.js",
  cwd: __dirname,
  env: {
    NODE_ENV: "production",
    ...trading,
    PORT: Number(tradingPort) || 4010,
    NEXT_PUBLIC_BACKEND_PORT: tradingPort,
    DB_POOL_MAX: String(process.env.DB_POOL_MAX || "40"),
    WALLET_TX_CONCURRENCY: String(process.env.WALLET_TX_CONCURRENCY || "16"),
    SCYLLA_LOCAL_CONNECTIONS: String(process.env.SCYLLA_LOCAL_CONNECTIONS || "8"),
  },
  env_production: {
    NODE_ENV: "production",
    ...trading,
    PORT: Number(tradingPort) || 4010,
    NEXT_PUBLIC_BACKEND_PORT: tradingPort,
    DB_POOL_MAX: String(process.env.DB_POOL_MAX || "40"),
    WALLET_TX_CONCURRENCY: String(process.env.WALLET_TX_CONCURRENCY || "16"),
    SCYLLA_LOCAL_CONNECTIONS: String(process.env.SCYLLA_LOCAL_CONNECTIONS || "8"),
  },
  exec_mode: "fork",
  instances: 1,
  watch: false,
  autorestart: true,
  stop_exit_codes: [78],
};

// Drop the scheduler app entirely under the inline opt-out. Leaving it defined
// and merely un-flagged would start a second process that also registers every
// job — the duplication this whole arrangement exists to prevent.
//
// The trading app goes in after `backend` and before `frontend`, so a
// `pm2 start` brings the two backends up together and the frontend last.
const layout = inlineCron ? apps.filter((app) => app.name !== "cron") : apps;

// THE SHARDS (plans/done/ORDER-SCALE-10K.md Phase 6, WP-6.2). Defined only when
// ECO_SHARDS names a count, so an install without Phase 6 has no shard apps to
// reconcile, stop or forget: one `shard-<id>` app per id, each its own
// process with its own lease (ecosystem-matching-shard-<id>), its own
// write-ahead log under ECO_WAL_DIR/shard-<id>, and its own loopback port
// (ECO_SHARD_PORT_BASE + id, 4300 by default). They take no HTTP traffic: the
// door processes (the backend and trading apps with ECO_DOOR=on) reach them
// over the transport. The per-process pool defaults are the plan's for the
// shard tier; a value the operator set in .env still wins.
const shardCount = Math.max(0, Math.floor(Number(process.env.ECO_SHARDS || 0)) || 0);
const shardApps = [];
for (let id = 0; id < shardCount; id++) {
  const env = {
    NODE_ENV: "production",
    CRON_MODE: "off",
    ECO_SHARDS: String(shardCount),
    ECO_SHARD_ID: String(id),
    ECO_WAL_DIR: String(process.env.ECO_WAL_DIR || "./backend/wal"),
    ECO_SHARD_PORT_BASE: String(process.env.ECO_SHARD_PORT_BASE || "4300"),
    DB_POOL_MAX: String(process.env.DB_POOL_MAX || "20"),
    WALLET_TX_CONCURRENCY: String(process.env.WALLET_TX_CONCURRENCY || "8"),
    SCYLLA_LOCAL_CONNECTIONS: String(process.env.SCYLLA_LOCAL_CONNECTIONS || "4"),
  };
  shardApps.push({
    name: `shard-${id}`,
    script: "./backend/dist/shard.js",
    cwd: __dirname,
    env,
    env_production: { ...env },
    exec_mode: "fork",
    instances: 1,
    watch: false,
    autorestart: true,
    stop_exit_codes: [78],
  });
}

const withTrading = tradingEnabled ? [layout[0], tradingApp, ...layout.slice(1)] : layout;
module.exports = {
  // The shards go in after the backends and before the frontend, so a
  // `pm2 start` brings every matcher up before the UI that reads them.
  apps: shardApps.length ? [...withTrading.filter((app) => app.name !== "frontend"), ...shardApps, ...withTrading.filter((app) => app.name === "frontend")] : withTrading,
};
