// Admin dashboard for copy trading
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, Op } from "sequelize";
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get Copy Trading Admin Dashboard",
  description:
    "Retrieves admin dashboard statistics for copy trading including leader statistics by status, follower statistics with allocated amounts, today's trading statistics, failure rates, pending leader applications, and recent activity from audit logs.",
  operationId: "getCopyTradingAdminDashboard",
  tags: ["Admin", "Copy Trading", "Dashboard"],
  requiresAuth: true,
  logModule: "ADMIN_COPY",
  logTitle: "Get Copy Trading Dashboard",
  permission: "access.copy_trading",
  demoMask: ["pendingApplications.user.email"],
  responses: {
    200: {
      description: "Dashboard data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              stats: {
                type: "object",
                properties: {
                  totalLeaders: { type: "integer" },
                  activeLeaders: { type: "integer" },
                  pendingApplications: { type: "integer" },
                  suspendedLeaders: { type: "integer" },
                  totalFollowers: { type: "integer" },
                  activeSubscriptions: { type: "integer" },
                  todaysTrades: { type: "integer" },
                  todaysVolume: { type: "number" },
                  failureRate: { type: "number" },
                },
              },
              pendingApplications: {
                type: "array",
                description: "List of pending leader applications (max 10)",
              },
              recentActivity: {
                type: "array",
                description: "Recent activity from audit logs (max 20)",
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

  // Get leader statistics
  ctx?.step("Get Copy Trading Dashboard");

  const leaderStats = await models.copyTradingLeader.findAll({
    attributes: [
      "status",
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["status"],
    raw: true,
  });

  const leaderCounts = leaderStats.reduce((acc: any, stat: any) => {
    acc[stat.status] = parseInt(stat.count);
    return acc;
  }, {});

  // Get follower statistics
  const followerStats = await models.copyTradingFollower.findAll({
    attributes: [
      "status",
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["status"],
    raw: true,
  });

  const followerCounts = followerStats.reduce((acc: any, stat: any) => {
    acc[stat.status] = {
      count: parseInt(stat.count),
    };
  return acc;
  }, {});

  // Get today's stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysTrades = await models.copyTradingTrade.count({
    where: { createdAt: { [Op.gte]: today } },
  });

  const todaysVolume = await models.copyTradingTrade.sum("cost", {
    where: { createdAt: { [Op.gte]: today } },
  });

  // Get failed trades count for failure rate
  const failedTrades = await models.copyTradingTrade.count({
    where: {
      status: "FAILED",
      createdAt: { [Op.gte]: today },
    },
  });
  const failureRate = todaysTrades > 0 ? (failedTrades / todaysTrades) * 100 : 0;

  // Get pending leader applications
  const pendingApplications = await models.copyTradingLeader.findAll({
    where: { status: "PENDING" },
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"],
      },
    ],
    order: [["createdAt", "ASC"]],
    limit: 10,
  });

  // Get recent activity
  const recentActivity = await models.copyTradingAuditLog.findAll({
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName"],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit: 20,
  });

  ctx?.success("Get Copy Trading Dashboard retrieved successfully");
  return {
    stats: {
      leaders: {
        total: Object.values(leaderCounts).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0),
        active: leaderCounts.ACTIVE || 0,
        pending: leaderCounts.PENDING || 0,
        suspended: leaderCounts.SUSPENDED || 0,
      },
      followers: {
        total: Object.values(followerCounts).reduce((a: number, b: any) => a + (b?.count || 0), 0),
        active: followerCounts.ACTIVE?.count || 0,
        paused: followerCounts.PAUSED?.count || 0,
      },
      totalAllocated: 0, // TODO: Calculate from follower allocations
      platformRevenue: 0, // TODO: Calculate from profit share transactions
      todaysTrades,
      todaysVolume: todaysVolume || 0,
      failureRate,
    },
    pendingApplications: pendingApplications.map((a: any) => a.toJSON()),
    recentActivity: recentActivity.map((a: any) => a.toJSON()),
  };
};
