"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const date_fns_1 = require("date-fns");
const db_1 = require("@b/db");
const cache_1 = require("@b/utils/cache");
exports.metadata = {
    summary: "Binary Trading Health Check",
    operationId: "binaryHealthCheck",
    tags: ["Binary", "Health"],
    description: "Checks the health status of the binary trading system including database connectivity, order processing, and system configuration.",
    responses: {
        200: {
            description: "Health check completed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                enum: ["healthy", "degraded", "down"],
                                description: "Overall system health status"
                            },
                            timestamp: {
                                type: "string",
                                description: "ISO 8601 timestamp of health check"
                            },
                            checks: {
                                type: "object",
                                properties: {
                                    system: { type: "object" },
                                    database: { type: "object" },
                                    durations: { type: "object" },
                                    markets: { type: "object" },
                                    orders: { type: "object" },
                                }
                            }
                        },
                    },
                },
            },
        },
        500: {
            description: "Health check failed",
        },
    },
    requiresAuth: false,
    logModule: "BINARY_HEALTH",
    logTitle: "Binary Trading Health Check",
};
exports.default = async (data) => {
    var _a;
    const { ctx } = data;
    const timestamp = (0, date_fns_1.formatDate)(new Date(), "yyyy-MM-dd HH:mm:ss");
    const checks = {
        system: { status: "up", message: "" },
        database: { status: "up", message: "" },
        durations: { status: "up", message: "" },
        markets: { status: "up", message: "" },
        orders: { status: "up", message: "" },
    };
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking binary trading system status");
        const cacheManager = cache_1.CacheManager.getInstance();
        const binaryStatus = (await cacheManager.getSetting("binaryStatus")) === "true";
        if (!binaryStatus) {
            checks.system = {
                status: "down",
                message: "Binary trading is disabled in system configuration",
                details: { enabled: false },
            };
        }
        else {
            checks.system = {
                status: "up",
                message: "Binary trading is enabled",
                details: { enabled: true },
            };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking database connectivity");
        try {
            await db_1.sequelize.authenticate();
            checks.database = {
                status: "up",
                message: "Database connection is healthy",
            };
        }
        catch (error) {
            checks.database = {
                status: "down",
                message: `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking binary durations");
        try {
            const durations = await ((_a = db_1.models.binaryDuration) === null || _a === void 0 ? void 0 : _a.findAll({
                where: { status: true },
                attributes: ["id", "duration", "status"],
            })) || [];
            if (durations.length === 0) {
                checks.durations = {
                    status: "warning",
                    message: "No active binary durations found",
                    details: { count: 0, active: 0 },
                };
            }
            else {
                checks.durations = {
                    status: "up",
                    message: `${durations.length} active duration(s) available`,
                    details: {
                        count: durations.length,
                        durations: durations.map(d => `${d.duration}m`).join(", ")
                    },
                };
            }
        }
        catch (error) {
            checks.durations = {
                status: "down",
                message: `Failed to fetch durations: ${error.message}`,
            };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking binary markets");
        try {
            const markets = await db_1.models.binaryMarket.count({
                where: { status: "ACTIVE" },
            });
            if (markets === 0) {
                checks.markets = {
                    status: "warning",
                    message: "No active binary markets found",
                    details: { active: 0 },
                };
            }
            else {
                checks.markets = {
                    status: "up",
                    message: `${markets} active market(s) available`,
                    details: { active: markets },
                };
            }
        }
        catch (error) {
            checks.markets = {
                status: "down",
                message: `Failed to fetch markets: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking order processing health");
        try {
            const pendingOrders = await db_1.models.binaryOrder.count({
                where: { status: "PENDING" },
            });
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const { Op } = await Promise.resolve().then(() => __importStar(require("sequelize")));
            const stuckOrders = await db_1.models.binaryOrder.count({
                where: {
                    status: "PENDING",
                    createdAt: { [Op.lt]: oneDayAgo },
                },
            });
            if (stuckOrders > 0) {
                checks.orders = {
                    status: "warning",
                    message: `${stuckOrders} order(s) stuck in pending status for >24h`,
                    details: { pending: pendingOrders, stuck: stuckOrders },
                };
            }
            else {
                checks.orders = {
                    status: "up",
                    message: `Order processing healthy. ${pendingOrders} pending order(s)`,
                    details: { pending: pendingOrders, stuck: 0 },
                };
            }
        }
        catch (error) {
            checks.orders = {
                status: "down",
                message: `Failed to check orders: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
        const statuses = Object.values(checks).map(c => c.status);
        let overallStatus;
        if (statuses.includes("down")) {
            overallStatus = "down";
        }
        else if (statuses.includes("warning")) {
            overallStatus = "degraded";
        }
        else {
            overallStatus = "healthy";
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Binary trading health check completed: ${overallStatus}`);
        return {
            status: overallStatus,
            timestamp,
            checks,
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Health check failed: ${error.message}`);
        return {
            status: "down",
            timestamp,
            checks: {
                ...checks,
                system: {
                    status: "down",
                    message: `Unexpected error during health check: ${error.message}`,
                },
            },
        };
    }
};
