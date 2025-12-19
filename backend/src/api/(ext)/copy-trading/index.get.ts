// User Copy Trading Dashboard
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import { getLeaderByUserId, getCopyTradingSettings } from "./utils";

export const metadata = {
  summary: "Get Copy Trading Dashboard",
  description:
    "Retrieves the user's copy trading dashboard overview including leader profile (if any), subscriptions summary, and recent trades.",
  operationId: "getCopyTradingDashboard",
  tags: ["Copy Trading"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Get dashboard",
  responses: {
    200: {
      description: "Dashboard retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              isLeader: { type: "boolean" },
              leaderProfile: { type: "object", nullable: true },
              subscriptions: {
                type: "object",
                properties: {
                  active: { type: "number" },
                  paused: { type: "number" },
                  totalProfit: { type: "number" },
                  totalROI: { type: "number" },
                },
              },
              recentTrades: { type: "array" },
              settings: { type: "object" },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching leader profile");
  // Check if user is a leader
  const leaderProfile = await getLeaderByUserId(user.id);
  const isLeader = !!leaderProfile && leaderProfile.status === "ACTIVE";

  // Get leader stats if user is a leader
  let leaderStats = null;
  if (leaderProfile) {
    const activeFollowers = await models.copyTradingFollower.count({
      where: { leaderId: leaderProfile.id, status: "ACTIVE" },
    });
    const pausedFollowers = await models.copyTradingFollower.count({
      where: { leaderId: leaderProfile.id, status: "PAUSED" },
    });
    // Total allocated is now calculated from allocations, not follower records
    const totalAllocatedByFollowers = 0; // TODO: Calculate from allocations if needed

    // Get recent leader trades
    const recentLeaderTrades = await models.copyTradingTrade.findAll({
      where: { leaderId: leaderProfile.id, followerId: null },
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    leaderStats = {
      ...leaderProfile.toJSON(),
      activeFollowers,
      pausedFollowers,
      totalAllocatedByFollowers,
      recentTrades: recentLeaderTrades.map((t: any) => t.toJSON()),
    };
  }

  ctx?.step("Fetching subscriptions");
  // Get user's subscriptions (as follower)
  const subscriptions = await models.copyTradingFollower.findAll({
    where: { userId: user.id, status: { [Op.ne]: "STOPPED" } },
    include: [
      {
        model: models.copyTradingLeader,
        as: "leader",
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
      },
    ],
  });

  const activeCount = subscriptions.filter((s: any) => s.status === "ACTIVE").length;
  const pausedCount = subscriptions.filter((s: any) => s.status === "PAUSED").length;
  const totalProfit = subscriptions.reduce((sum: number, s: any) => sum + (s.totalProfit || 0), 0);
  // TODO: Calculate total allocated from allocations if needed for ROI
  const totalROI = 0; // ROI calculation needs to be based on allocations

  ctx?.step("Fetching recent trades");
  // Get recent trades as follower
  const followerIds = subscriptions.map((s: any) => s.id);
  let recentTrades: any[] = [];
  if (followerIds.length > 0) {
    recentTrades = await models.copyTradingTrade.findAll({
      where: { followerId: { [Op.in]: followerIds } },
      include: [
        {
          model: models.copyTradingLeader,
          as: "leader",
          attributes: ["id", "displayName"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 10,
    });
  }

  ctx?.step("Fetching settings");
  // Get settings
  const settings = await getCopyTradingSettings();

  ctx?.success("Dashboard retrieved");
  return {
    isLeader,
    leaderProfile: leaderStats,
    subscriptions: {
      active: activeCount,
      paused: pausedCount,
      total: subscriptions.length,
      totalProfit,
      totalROI: Math.round(totalROI * 100) / 100,
      items: subscriptions.map((s: any) => s.toJSON()),
    },
    recentTrades: recentTrades.map((t: any) => t.toJSON()),
    settings: {
      maxLeadersPerFollower: settings.maxLeadersPerFollower,
      minAllocationAmount: settings.minAllocationAmount,
      maxAllocationPercent: settings.maxAllocationPercent,
    },
  };
};
