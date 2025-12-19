// Get single leader details
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import { getLeaderStats } from "@b/api/(ext)/copy-trading/utils/stats-calculator";

export const metadata = {
  summary: "Get Copy Trading Leader Details",
  description: "Retrieves detailed information about a specific leader.",
  operationId: "getCopyTradingLeader",
  tags: ["Copy Trading", "Leaders"],
  requiresAuth: false,
  logModule: "COPY",
  logTitle: "Get leader details",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Leader ID",
    },
  ],
  responses: {
    200: {
      description: "Leader details retrieved successfully",
      content: {
        "application/json": {
          schema: { type: "object" },
        },
      },
    },
    404: { description: "Leader not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { params, user, ctx } = data;
  const { id } = params;

  ctx?.step("Fetching leader");
  // First, try to find the leader without public restriction to check ownership
  const leader = await models.copyTradingLeader.findOne({
    where: {
      id,
      status: "ACTIVE",
    },
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "avatar"],
      },
      {
        model: models.copyTradingLeaderMarket,
        as: "markets",
        where: { isActive: true },
        required: false,
      },
    ],
  });

  if (!leader) {
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  // Check if this is the user's own leader profile
  const isOwnProfile = user?.id === (leader as any).userId;

  // If not public and not own profile, deny access
  if (!(leader as any).isPublic && !isOwnProfile) {
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  ctx?.step("Fetching daily stats");
  // Get daily stats for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyStats = await models.copyTradingLeaderStats.findAll({
    where: {
      leaderId: id,
      date: { [Op.gte]: thirtyDaysAgo.toISOString().split("T")[0] },
    },
    order: [["date", "ASC"]],
  });

  ctx?.step("Fetching recent trades");
  // Get recent trades
  const recentTrades = await models.copyTradingTrade.findAll({
    where: {
      leaderId: id,
      isLeaderTrade: true,
      status: "CLOSED",
    },
    order: [["closedAt", "DESC"]],
    limit: 10,
  });

  ctx?.step("Checking user follow status");
  // Check if current user is following this leader
  let isFollowing = false;
  let followerId = null;
  let followerStatus = null;

  if (user?.id && !isOwnProfile) {
    const follow = await models.copyTradingFollower.findOne({
      where: {
        userId: user.id,
        leaderId: id,
        status: { [Op.in]: ["ACTIVE", "PAUSED"] },
      },
    });
    if (follow) {
      isFollowing = true;
      followerId = follow.id;
      followerStatus = follow.status;
    }
  }

  ctx?.step("Calculating leader stats");
  // Calculate leader statistics from trades
  const stats = await getLeaderStats(id);

  ctx?.success("Leader details retrieved");
  return {
    ...leader.toJSON(),
    ...stats, // Add computed stats: totalFollowers, totalTrades, winRate, totalProfit, totalVolume, roi, maxDrawdown
    dailyStats: dailyStats.map((s: any) => s.toJSON()),
    recentTrades: recentTrades.map((t: any) => ({
      id: t.id,
      symbol: t.symbol,
      side: t.side,
      profit: t.profit,
      profitPercent: t.profitPercent,
      closedAt: t.closedAt,
    })),
    isFollowing,
    followerId,
    followerStatus,
    isOwnProfile,
  };
};
