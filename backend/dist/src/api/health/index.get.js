"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const redis_1 = require("@b/utils/redis");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Liveness and readiness probe",
    description: "Unauthenticated health probe for load balancers, uptime monitors and " +
        "deployment tooling. Answers 200 while this backend can serve requests " +
        "and 503 when it cannot. Cheap enough to poll continuously.",
    operationId: "getHealth",
    tags: ["Health"],
    requiresAuth: false,
    responses: {
        200: {
            description: "The backend is serving. `status` distinguishes ok from degraded.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                enum: ["ok", "degraded"],
                                description: "`ok` when every dependency is healthy; `degraded` when the " +
                                    "backend can still serve requests but something is wrong.",
                            },
                            uptime: {
                                type: "number",
                                description: "Whole seconds this process has been running.",
                            },
                            timestamp: {
                                type: "string",
                                description: "ISO 8601 time the probe ran.",
                            },
                            checks: {
                                type: "object",
                                description: "Per-dependency detail.",
                                properties: {
                                    database: { type: "object" },
                                    redis: { type: "object" },
                                },
                            },
                        },
                    },
                },
            },
        },
        503: {
            description: "A critical dependency is unreachable and this process cannot serve. " +
                "Body is the platform's standard `{ message, statusCode }`.",
        },
    },
};
const DB_TIMEOUT_MS = 2000;
const REDIS_TIMEOUT_MS = 1000;
async function withTimeout(work, ms, what) {
    let timer;
    try {
        return await Promise.race([
            work,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(`${what} did not answer within ${ms}ms`)), ms);
            }),
        ]);
    }
    finally {
        clearTimeout(timer);
    }
}
async function probeDatabase() {
    const start = Date.now();
    try {
        await withTimeout(db_1.sequelize.query("SELECT 1"), DB_TIMEOUT_MS, "database");
        return { status: "up", latency: Date.now() - start };
    }
    catch (error) {
        return {
            status: "down",
            latency: Date.now() - start,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Unknown error",
        };
    }
}
async function probeRedis() {
    const start = Date.now();
    if (!redis_1.RedisSingleton.isRedisUp()) {
        return {
            status: "down",
            latency: Date.now() - start,
            message: "Redis is unreachable. Scheduled jobs and cross-process cache " +
                "invalidation are stopped until it returns.",
        };
    }
    try {
        const pong = await withTimeout(redis_1.RedisSingleton.getInstance().ping(), REDIS_TIMEOUT_MS, "Redis");
        if (pong !== "PONG") {
            return {
                status: "down",
                latency: Date.now() - start,
                message: `Redis answered an unexpected reply to PING: ${String(pong)}`,
            };
        }
        return { status: "up", latency: Date.now() - start };
    }
    catch (error) {
        return {
            status: "down",
            latency: Date.now() - start,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Unknown error",
        };
    }
}
exports.default = async (data) => {
    var _a;
    var _b;
    (_a = data === null || data === void 0 ? void 0 : data.setResponseHeader) === null || _a === void 0 ? void 0 : _a.call(data, "Cache-Control", "no-store");
    const [database, redis] = await Promise.all([probeDatabase(), probeRedis()]);
    if (database.status === "down") {
        throw (0, error_1.createError)(503, `Database unreachable: ${(_b = database.message) !== null && _b !== void 0 ? _b : "Unknown error"}`);
    }
    return {
        status: redis.status === "up" ? "ok" : "degraded",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        checks: { database, redis },
    };
};
