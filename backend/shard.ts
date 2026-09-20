/**
 * THE SHARD PROCESS ENTRY (plans/done/ORDER-SCALE-10K.md WP-6.2 "one process per
 * market group"). Started by pm2 as the `shard-<id>` apps production.config.js
 * defines when ECO_SHARDS is set, or by hand:
 *
 *   ECO_SHARDS=4 ECO_SHARD_ID=2 ECO_WAL_DIR=/var/lib/bicrypto/wal node backend/dist/shard.js
 *
 * The same preamble as backend/index.ts (preflight, env, aliases), then the
 * databases this process needs and nothing it does not: MySQL (the ledger of
 * record, through the batcher), Redis (the lease's fast arbiter and the order
 * key hints), Scylla only when the in-process projector is on. No HTTP server:
 * the door reaches a shard over the loopback transport, and the health
 * payload travels the same way (door.ts health).
 */
import "./preflight";
import "./load-env";
import "./module-alias-setup";

import { db } from "./src/db";
import { console$, logger } from "./src/utils/console";
import { RedisSingleton } from "./src/utils/redis";
import { initializeScylla } from "./src/utils/safe-imports";
import { ShardProcess } from "./src/api/(ext)/ecosystem/utils/scale/shard";
import { projectorEnabled } from "./src/api/(ext)/ecosystem/utils/scale/projector";

const startShard = async () => {
  let shard: ShardProcess | null = null;
  try {
    await db.initialize();
    await RedisSingleton.assertRedisAvailable();
    if (projectorEnabled()) await initializeScylla();
    shard = await ShardProcess.start();
    logger.info(
      "ECO_SHARD",
      shard.isLeader()
        ? `Shard ${shard.shardId} of ${shard.shards} is leading on port ${shard.port()}`
        : `Shard ${shard.shardId} of ${shard.shards} is a follower; polling for promotion`
    );
  } catch (error) {
    console$.error("Failed to start the shard", error);
    logger.error("ECO_SHARD", "Failed to start the shard", error);
    // 78 is the exit code pm2 is told not to restart on (production.config.js
    // stop_exit_codes): a shard that cannot start needs an operator, not a loop.
    process.exit(78);
  }

  const stop = async (signal: string) => {
    logger.info("ECO_SHARD", `Shard ${shard?.shardId ?? "?"}: ${signal} received; handing the lease back`);
    try {
      await shard?.stop();
    } finally {
      process.exit(0);
    }
  };
  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));
};

startShard();
