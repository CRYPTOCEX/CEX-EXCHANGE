import { models } from "@b/db";
import { fn, col, literal, Op } from "sequelize";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Get copy trading analytics",
  description:
    "Returns comprehensive analytics for copy trading including leader stats, follower stats, trade stats, revenue metrics, top performers, and daily statistics for charting. Supports filtering by time period (day, week, month, all).",
  operationId: "getCopyTradingAnalytics",
  tags: ["Admin", "Copy Trading", "Analytics"],
  requiresAuth: true,
  logModule: "ADMIN_COPY",
  logTitle: "Get Copy Trading Analytics",
  permission: "access.copy_trading",
  parameters: [
    {
      name: "period",
      in: "query",
      schema: {
        type: "string",
        enum: ["day", "week", "month", "all"],
        default: "month",
      },
      description: "Time period for analytics data",
    },
  ],
  responses: {
    200: {
      description: "Analytics data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              leaders: { type: "object", description: "Leader statistics" },
              followers: { type: "object", description: "Follower statistics" },
              trades: { type: "object", description: "Trade statistics" },
              revenue: { type: "object", description: "Platform revenue statistics" },
              topLeaders: { type: "array", description: "Top 10 performing leaders by ROI" },
              dailyStats: { type: "array", description: "Daily statistics for the last 30 days" },
              period: { type: "string", description: "Time period used for analytics" },
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
  const { user, query, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const period = query.period || "month";
  let dateFilter: any = {};

  const now = new Date();
  switch (period) {
    case "day":
      dateFilter = { [Op.gte]: new Date(now.setDate(now.getDate() - 1)) };
      break;
    case "week":
      dateFilter = { [Op.gte]: new Date(now.setDate(now.getDate() - 7)) };
      break;
    case "month":
      dateFilter = { [Op.gte]: new Date(now.setMonth(now.getMonth() - 1)) };
      break;
    case "all":
    default:
      dateFilter = {};
  }

  // Leader stats
  ctx?.step("Get Copy Trading Analytics");

  const leaderStats = await models.copyTradingLeader.findAll({
    attributes: [
      [fn("COUNT", col("id")), "totalLeaders"],
      [
        fn(
          "SUM",
          literal(`CASE WHEN "status" = 'ACTIVE' THEN 1 ELSE 0 END`)
        ),
        "activeLeaders",
      ],
      [
        fn(
          "SUM",
          literal(`CASE WHEN "status" = 'PENDING' THEN 1 ELSE 0 END`)
        ),
        "pendingLeaders",
      ],
      [fn("SUM", col("totalFollowers")), "totalFollowersSum"],
      [fn("AVG", col("winRate")), "avgWinRate"],
      [fn("AVG", col("roi")), "avgRoi"],
    ],
    raw: true,
  });

  // Follower stats
  const followerStats = await models.copyTradingFollower.findAll({
    attributes: [
      [fn("COUNT", col("id")), "totalSubscriptions"],
      [
        fn(
          "SUM",
          literal(`CASE WHEN "status" = 'ACTIVE' THEN 1 ELSE 0 END`)
        ),
        "activeSubscriptions",
      ],
      [fn("SUM", col("totalProfit")), "totalProfit"],
    ],
    raw: true,
  });

  // Trade stats
  const tradeWhere: any = {};
  if (Object.keys(dateFilter).length > 0) {
    tradeWhere.createdAt = dateFilter;
  }

  const tradeStats = await models.copyTradingTrade.findAll({
    where: tradeWhere,
    attributes: [
      [fn("COUNT", col("id")), "totalTrades"],
      [
        fn(
          "SUM",
          literal(`CASE WHEN "status" = 'CLOSED' THEN 1 ELSE 0 END`)
        ),
        "closedTrades",
      ],
      [
        fn(
          "SUM",
          literal(`CASE WHEN "profit" > 0 THEN 1 ELSE 0 END`)
        ),
        "profitableTrades",
      ],
      [fn("SUM", col("profit")), "totalProfit"],
      [fn("SUM", col("amount")), "totalVolume"],
      [fn("SUM", col("fee")), "totalFees"],
    ],
    raw: true,
  });

  // Transaction stats (platform revenue)
  const transactionWhere: any = {};
  if (Object.keys(dateFilter).length > 0) {
    transactionWhere.createdAt = dateFilter;
  }

  const platformFees = await models.copyTradingTransaction.findAll({
    where: {
      ...transactionWhere,
      type: "PLATFORM_FEE",
    },
    attributes: [[fn("SUM", col("amount")), "totalPlatformFees"]],
    raw: true,
  });

  const profitShares = await models.copyTradingTransaction.findAll({
    where: {
      ...transactionWhere,
      type: "PROFIT_SHARE",
    },
    attributes: [[fn("SUM", col("amount")), "totalProfitShares"]],
    raw: true,
  });

  // Top performers
  const topLeaders = await models.copyTradingLeader.findAll({
    where: { status: "ACTIVE" },
    order: [["roi", "DESC"]],
    limit: 10,
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "avatar"],
      },
    ],
  });

  // Daily stats for chart
  const dailyStats = await models.copyTradingTrade.findAll({
    where: {
      createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    attributes: [
      [fn("DATE", col("createdAt")), "date"],
      [fn("COUNT", col("id")), "trades"],
      [fn("SUM", col("profit")), "profit"],
      [fn("SUM", col("amount")), "volume"],
    ],
    group: [fn("DATE", col("createdAt"))],
    order: [[fn("DATE", col("createdAt")), "ASC"]],
    raw: true,
  });

  ctx?.success("Get Copy Trading Analytics retrieved successfully");
  return {
    leaders: leaderStats[0] || {},
    followers: followerStats[0] || {},
    trades: tradeStats[0] || {},
    revenue: {
      platformFees: (platformFees[0] as any)?.totalPlatformFees || 0,
      profitShares: (profitShares[0] as any)?.totalProfitShares || 0,
    },
    topLeaders,
    dailyStats,
    period,
  };
};
