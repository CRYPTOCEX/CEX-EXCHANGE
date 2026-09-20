/**
 * Site-specific values come from the operator's .env, never from this file.
 * See the note at the top of production.config.js: a PM2 `env` block overrides
 * the process environment, so a literal here silently beats what the operator
 * configured — and every install of this product runs its own domain.
 *
 * Threaded backend entry (OPT-IN) — the counterpart to production.config.js.
 *
 * `pnpm start:thread` referenced this file, but the file itself was missing, so
 * the script failed on a config PM2 could not read. The entry point it drives
 * is real and built (backend/dist/thread.js spawns backend/dist/src/worker.js),
 * and utils/settings-bus.ts documents this deployment shape by name, so the
 * resolution is to restore the config rather than delete a working entry.
 *
 * WHAT IT DOES. backend/thread.ts binds the port on the main thread and spawns
 * NEXT_PUBLIC_BACKEND_THREADS worker threads that share it, so incoming
 * requests are spread across several JS realms. Use it when request handling
 * itself is CPU-bound.
 *
 * WHAT IT DOES NOT DO — read this before reaching for it to fix a stalling
 * site. Threads do NOT isolate cron work:
 *
 *   - Cron registration is main-thread-only by design (the `isMainThread`
 *     guards in src/cron/index.ts and src/server.ts), so every job still runs
 *     on the thread that accepts connections. Threading adds workers beside the
 *     scheduler; it does not move the scheduler off the loop.
 *   - Worker threads share ONE V8 heap limit with the process. A cron that
 *     leaks still exhausts the memory every thread depends on, and the
 *     resulting mark-compact pause stops all of them at once.
 *
 * Cron is already off the request loop by default: production.config.js starts
 * a separate `cron` process (CRON_MODE=only) with its own V8 heap, next to the
 * web backend it sets CRON_MODE=off on. THIS file does not — it defines a
 * threaded web tier only, and inherits whatever CRON_MODE the environment
 * carries, which for a bare `pnpm start:thread` is nothing at all. So a
 * deployment running this config alone runs the scheduler INLINE, on the main
 * thread, exactly as described above.
 *
 * The two shapes are independent and combinable — threaded web tier plus the
 * dedicated cron process — but combining them means starting the `cron` app
 * from production.config.js as well, and setting CRON_MODE=off here so the
 * scheduler is not registered twice.
 *
 * Each thread gets its own module registry and therefore its own copy of every
 * singleton and in-memory cache. thread.ts stamps MASH_BACKEND_MULTI_PROCESS=1
 * before spawning so utils/settings-bus.ts can tell, and anything cached
 * in-process converges through that bus — which means this shape needs a
 * reachable Redis to behave correctly.
 */

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

// The trading split (plans/done/ORDER-SCALE-10K.md WP-2.1) cannot be hosted here.
// Every worker thread this config spawns boots its own matcher, and the engine
// lease treats all of them as ONE holder (backend/src/utils/engine-lease.ts,
// "granularity: processes, not JS realms"): a threaded trading process would
// run N unarbitrated matchers over the same book, and a threaded web tier
// beside a trading app would be N realms of a process that must not claim at
// all. Refuse both spellings of the request, whole, before pm2 starts anything.
{
  const declaredRole = String(process.env.ECO_PROCESS_ROLE || "").trim().toLowerCase();
  const tradingEnabled = ["1", "true", "yes", "on"].includes(
    String(process.env.ECO_TRADING_ENABLED || "").trim().toLowerCase()
  );
  if (declaredRole === "trading" || tradingEnabled) {
    throw new Error(
      "production.thread.config.js cannot host the trading split: worker threads run " +
        "unarbitrated matchers. Unset " +
        (declaredRole === "trading" ? "ECO_PROCESS_ROLE" : "ECO_TRADING_ENABLED") +
        " or use `pnpm start` (production.config.js), which defines the trading app."
    );
  }
}

const site = {
  // No default URL — an absolute URL that is wrong is worse than one that is
  // absent, because it lands in canonical tags, emails and OAuth callbacks.
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "",
  NEXT_PUBLIC_BACKEND_PORT: process.env.NEXT_PUBLIC_BACKEND_PORT || "4000",
  NEXT_PUBLIC_FRONTEND_PORT: process.env.NEXT_PUBLIC_FRONTEND_PORT || "3000",
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto",
  NEXT_PUBLIC_SITE_DESCRIPTION:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Trading Platform",
};

module.exports = {
  apps: [
    {
      name: "backend",
      script: "./backend/dist/thread.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 4000,
        NEXT_PUBLIC_BACKEND_PORT: "4000",
        // Threads are capped at the CPU count by thread.ts regardless of this.
        NEXT_PUBLIC_BACKEND_THREADS: "2",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
        NEXT_PUBLIC_BACKEND_PORT: "4000",
        NEXT_PUBLIC_BACKEND_THREADS: "2",
      },
      // Must stay "fork". PM2 cluster mode would fork whole processes, each
      // spawning its own worker threads and each re-running the main-thread-only
      // startup — duplicate schedulers over the same rows.
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
  ],
};
