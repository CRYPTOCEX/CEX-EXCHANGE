// Get current user's leader profile
import { models } from "@b/db";
import { fn, col } from "sequelize";
import { createError } from "@b/utils/error";
import { getLeaderStats } from "@b/api/(ext)/copy-trading/utils/stats-calculator";

export const metadata = {
  summary: "Get My Leader Profile",
  description: "Retrieves the current user's leader profile if they are a leader.",
  operationId: "getMyLeaderProfile",
  tags: ["Copy Trading", "Leaders"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Get my leader profile",
  responses: {
    200: {
      description: "Leader profile retrieved successfully",
      content: {
        "application/json": {
          schema: { type: "object" },
        },
      },
    },
    401: { description: "Unauthorized" },
    404: { description: "Not a leader" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching leader profile");
  const leader = await models.copyTradingLeader.findOne({
    where: { userId: user.id },
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
    ],
  });

  if (!leader) {
    throw createError({ statusCode: 404, message: "You are not a leader" });
  }

  ctx?.step("Fetching follower stats");
  // Get followers count by status
  const followerStats = await models.copyTradingFollower.findAll({
    where: { leaderId: leader.id },
    attributes: [
      "status",
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["status"],
    raw: true,
  });

  ctx?.step("Fetching recent transactions");
  // Get recent transactions (profit shares received)
  const recentTransactions = await models.copyTradingTransaction.findAll({
    where: {
      leaderId: leader.id,
      type: "PROFIT_SHARE",
    },
    order: [["createdAt", "DESC"]],
    limit: 10,
  });

  ctx?.step("Fetching recent trades");
  // Get recent trades
  const recentTrades = await models.copyTradingTrade.findAll({
    where: {
      leaderId: leader.id,
      isLeaderTrade: true,
    },
    order: [["createdAt", "DESC"]],
    limit: 10,
  });

  ctx?.step("Calculating leader stats");
  // Calculate leader statistics from trades
  const stats = await getLeaderStats(leader.id);

  ctx?.success("Leader profile retrieved");
  return {
    ...leader.toJSON(),
    ...stats, // Add computed stats: totalFollowers, totalTrades, winRate, totalProfit, totalVolume, roi, maxDrawdown
    followerStats: followerStats.reduce((acc: any, stat: any) => {
      acc[stat.status] = {
        count: parseInt(stat.count),
      };
      return acc;
    }, {}),
    recentTransactions: recentTransactions.map((t: any) => t.toJSON()),
    recentTrades: recentTrades.map((t: any) => t.toJSON()),
  };
};
