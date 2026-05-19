"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get Copy Trading System Health",
    description: "Retrieves system health status and metrics for copy trading including trade metrics from the last 24 hours, latency statistics (average, P95, P99), failure rates, active subscriptions and leaders, database connectivity, recent errors, and overall system status (healthy/degraded/critical).",
    operationId: "getAdminCopyTradingHealth",
    tags: ["Admin", "Copy Trading", "Health"],
    requiresAuth: true,
    logModule: "ADMIN_COPY",
    logTitle: "Get Copy Trading Health",
    permission: "access.copy_trading",
    responses: {
        200: {
            description: "Health status retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "string",
                                enum: ["healthy", "degraded", "critical"],
                                description: "Overall system health status",
                            },
                            timestamp: { type: "string", format: "date-time" },
                            metrics: {
                                type: "object",
                                properties: {
                                    totalTrades24h: { type: "integer" },
                                    executedTrades24h: { type: "integer" },
                                    failedTrades24h: { type: "integer" },
                                    pendingTrades: { type: "integer" },
                                    failureRate: { type: "number" },
                                    avgLatencyMs: { type: "integer" },
                                    p95LatencyMs: { type: "integer" },
                                    p99LatencyMs: { type: "integer" },
                                    activeSubscriptions: { type: "integer" },
                                    activeLeaders: { type: "integer" },
                                },
                            },
                            services: {
                                type: "object",
                                properties: {
                                    database: { type: "string", description: "Database service status" },
                                    copyTradingEngine: { type: "string", description: "Copy trading engine status" },
                                },
                            },
                            alerts: {
                                type: "array",
                                description: "Active system alerts",
                                items: {
                                    type: "object",
                                    properties: {
                                        severity: { type: "string" },
                                        type: { type: "string" },
                                        message: { type: "string" },
                                        timestamp: { type: "string", format: "date-time" },
                                    },
                                },
                            },
                            recentErrors: {
                                type: "array",
                                description: "Recent errors from audit log",
                            },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        403: errors_1.forbiddenResponse,
        500: errors_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1h = new Date(now.getTime() - 60 * 60 * 1000);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Get Copy Trading Health");
    const trades24h = await db_1.models.copyTradingTrade.findAll({
        where: {
            createdAt: { [sequelize_1.Op.gte]: last24h },
            followerId: { [sequelize_1.Op.ne]: null },
        },
        attributes: ["status", "latencyMs"],
    });
    const totalTrades = trades24h.length;
    const executedTrades = trades24h.filter((t) => t.status === "EXECUTED" || t.status === "CLOSED").length;
    const failedTrades = trades24h.filter((t) => t.status === "FAILED").length;
    const pendingTrades = trades24h.filter((t) => t.status === "PENDING").length;
    const latencies = trades24h
        .map((t) => t.latencyMs)
        .filter((l) => l != null && l > 0)
        .sort((a, b) => a - b);
    const avgLatency = latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    const p95Latency = latencies[p95Index] || 0;
    const p99Latency = latencies[p99Index] || 0;
    const failureRate = totalTrades > 0 ? (failedTrades / totalTrades) * 100 : 0;
    const activeSubscriptions = await db_1.models.copyTradingFollower.count({
        where: { status: "ACTIVE" },
    });
    const activeLeaders = await db_1.models.copyTradingLeader.count({
        where: { status: "ACTIVE" },
    });
    let databaseStatus = "up";
    try {
        await db_1.sequelize.authenticate();
    }
    catch (_a) {
        databaseStatus = "down";
    }
    const recentErrors = await db_1.models.copyTradingAuditLog.findAll({
        where: {
            action: { [sequelize_1.Op.like]: "%ERROR%" },
            createdAt: { [sequelize_1.Op.gte]: last1h },
        },
        order: [["createdAt", "DESC"]],
        limit: 10,
    });
    let status = "healthy";
    const alerts = [];
    if (failureRate > 20) {
        status = "critical";
        alerts.push({
            severity: "critical",
            type: "high_failure_rate",
            message: `Trade failure rate is ${failureRate.toFixed(1)}%`,
            timestamp: now,
        });
    }
    else if (failureRate > 10) {
        status = "degraded";
        alerts.push({
            severity: "warning",
            type: "elevated_failure_rate",
            message: `Trade failure rate is ${failureRate.toFixed(1)}%`,
            timestamp: now,
        });
    }
    if (avgLatency > 5000) {
        status = status === "critical" ? "critical" : "degraded";
        alerts.push({
            severity: "warning",
            type: "high_latency",
            message: `Average latency is ${avgLatency.toFixed(0)}ms`,
            timestamp: now,
        });
    }
    if (databaseStatus === "down") {
        status = "critical";
        alerts.push({
            severity: "critical",
            type: "database_down",
            message: "Database connection failed",
            timestamp: now,
        });
    }
    if (pendingTrades > 100) {
        alerts.push({
            severity: "warning",
            type: "queue_backlog",
            message: `${pendingTrades} trades pending execution`,
            timestamp: now,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Copy Trading Health retrieved successfully");
    return {
        status,
        timestamp: now,
        metrics: {
            totalTrades24h: totalTrades,
            executedTrades24h: executedTrades,
            failedTrades24h: failedTrades,
            pendingTrades,
            failureRate: Math.round(failureRate * 100) / 100,
            avgLatencyMs: Math.round(avgLatency),
            p95LatencyMs: Math.round(p95Latency),
            p99LatencyMs: Math.round(p99Latency),
            activeSubscriptions,
            activeLeaders,
        },
        services: {
            database: databaseStatus,
            copyTradingEngine: pendingTrades < 100 ? "up" : "degraded",
        },
        alerts,
        recentErrors: recentErrors.map((e) => ({
            id: e.id,
            action: e.action,
            entityType: e.entityType,
            entityId: e.entityId,
            createdAt: e.createdAt,
        })),
    };
};
