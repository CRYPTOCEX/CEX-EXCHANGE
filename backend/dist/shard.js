"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./preflight");
require("./load-env");
require("./module-alias-setup");
const db_1 = require("./src/db");
const console_1 = require("./src/utils/console");
const redis_1 = require("./src/utils/redis");
const safe_imports_1 = require("./src/utils/safe-imports");
const shard_1 = require("./src/api/(ext)/ecosystem/utils/scale/shard");
const projector_1 = require("./src/api/(ext)/ecosystem/utils/scale/projector");
const startShard = async () => {
    let shard = null;
    try {
        await db_1.db.initialize();
        await redis_1.RedisSingleton.assertRedisAvailable();
        if ((0, projector_1.projectorEnabled)())
            await (0, safe_imports_1.initializeScylla)();
        shard = await shard_1.ShardProcess.start();
        console_1.logger.info("ECO_SHARD", shard.isLeader()
            ? `Shard ${shard.shardId} of ${shard.shards} is leading on port ${shard.port()}`
            : `Shard ${shard.shardId} of ${shard.shards} is a follower; polling for promotion`);
    }
    catch (error) {
        console_1.console$.error("Failed to start the shard", error);
        console_1.logger.error("ECO_SHARD", "Failed to start the shard", error);
        process.exit(78);
    }
    const stop = async (signal) => {
        var _a;
        console_1.logger.info("ECO_SHARD", `Shard ${(_a = shard === null || shard === void 0 ? void 0 : shard.shardId) !== null && _a !== void 0 ? _a : "?"}: ${signal} received; handing the lease back`);
        try {
            await (shard === null || shard === void 0 ? void 0 : shard.stop());
        }
        finally {
            process.exit(0);
        }
    };
    process.once("SIGINT", () => void stop("SIGINT"));
    process.once("SIGTERM", () => void stop("SIGTERM"));
};
startShard();
