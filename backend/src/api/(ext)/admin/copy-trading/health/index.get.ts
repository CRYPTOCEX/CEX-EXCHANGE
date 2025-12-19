// Admin get copy trading system health
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get Copy Trading System Health",
  description:
    "Retrieves system health status and metrics for copy trading including trade metrics from the last 24 hours, latency statistics (average, P95, P99), failure rates, active subscriptions and leaders, database connectivity, recent errors, and overall system status (healthy/degraded/critical).",
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
    401: unauthorizedResponse,
    403: forbiddenResponse,
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last1h = new Date(now.getTime() - 60 * 60 * 1000);

  // Get trade metrics from last 24h
  ctx?.step("Get Copy Trading Health");

  const trades24h = await models.copyTradingTrade.findAll({
    where: {
      createdAt: { [Op.gte]: last24h },
      followerId: { [Op.ne]: null }, // Only follower trades
    },
    attributes: ["status", "latencyMs"],
  });

  const totalTrades = trades24h.length;
  const executedTrades = trades24h.filter((t: any) => t.status === "EXECUTED" || t.status === "CLOSED").length;
  const failedTrades = trades24h.filter((t: any) => t.status === "FAILED").length;
  const pendingTrades = trades24h.filter((t: any) => t.status === "PENDING").length;

  // Calculate latency metrics
  const latencies = trades24h
    .map((t: any) => t.latencyMs)
    .filter((l: number) => l != null && l > 0)
    .sort((a: number, b: number) => a - b);

  const avgLatency = latencies.length > 0
    ? latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length
    : 0;
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);
  const p95Latency = latencies[p95Index] || 0;
  const p99Latency = latencies[p99Index] || 0;

  const failureRate = totalTrades > 0 ? (failedTrades / totalTrades) * 100 : 0;

  // Get active subscriptions count
  const activeSubscriptions = await models.copyTradingFollower.count({
    where: { status: "ACTIVE" },
  });

  // Get active leaders count
  const activeLeaders = await models.copyTradingLeader.count({
    where: { status: "ACTIVE" },
  });

  // Check database connectivity
  let databaseStatus = "up";
  try {
    await sequelize.authenticate();
  } catch {
    databaseStatus = "down";
  }

  // Get recent errors (from audit log)
  const recentErrors = await models.copyTradingAuditLog.findAll({
    where: {
      action: { [Op.like]: "%ERROR%" },
      createdAt: { [Op.gte]: last1h },
    },
    order: [["createdAt", "DESC"]],
    limit: 10,
  });

  // Determine overall status
  let status: "healthy" | "degraded" | "critical" = "healthy";
  const alerts: any[] = [];

  if (failureRate > 20) {
    status = "critical";
    alerts.push({
      severity: "critical",
      type: "high_failure_rate",
      message: `Trade failure rate is ${failureRate.toFixed(1)}%`,
      timestamp: now,
    });
  } else if (failureRate > 10) {
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

  ctx?.success("Get Copy Trading Health retrieved successfully");
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
    recentErrors: recentErrors.map((e: any) => ({
      id: e.id,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      createdAt: e.createdAt,
    })),
  };
};
