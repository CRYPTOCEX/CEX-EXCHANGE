// Public Copy Trading Platform Statistics
import { models } from "@b/db";
import { Op } from "sequelize";
import { calculateBatchLeaderStats } from "./utils/stats-calculator";

export const metadata = {
  summary: "Get Copy Trading Platform Statistics",
  description:
    "Retrieves public statistics about the copy trading platform including total leaders, followers, volume, and average ROI.",
  operationId: "getCopyTradingStats",
  tags: ["Copy Trading"],
  requiresAuth: false,
  logModule: "COPY",
  logTitle: "Get platform stats",
  responses: {
    200: {
      description: "Statistics retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              totalLeaders: { type: "number" },
              totalFollowers: { type: "number" },
              totalVolume: { type: "number" },
              avgRoi: { type: "number" },
              avgWinRate: { type: "number" },
              totalTrades: { type: "number" },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { ctx } = data;

  ctx?.step("Fetching platform statistics");

  // Get active public leaders
  const leaders = await models.copyTradingLeader.findAll({
    where: {
      status: "ACTIVE",
      isPublic: true,
    },
    attributes: ["id"],
    raw: true,
  });

  const totalLeaders = leaders.length;
  const leaderIds = leaders.map((l: any) => l.id);

  // Count active followers (unique users)
  const totalFollowers = await models.copyTradingFollower.count({
    where: {
      status: { [Op.in]: ["ACTIVE", "PAUSED"] },
    },
    distinct: true,
    col: "userId",
  });

  // Calculate stats for all leaders using batch function
  const leaderStatsMap = await calculateBatchLeaderStats(leaderIds);

  // Aggregate stats from all leaders
  let totalVolume = 0;
  let totalRoi = 0;
  let totalWinRate = 0;
  let totalTrades = 0;
  let leadersWithStats = 0;

  for (const stats of leaderStatsMap.values()) {
    totalVolume += stats.totalVolume;
    totalTrades += stats.totalTrades;

    // Only count leaders with trades for average calculations
    if (stats.totalTrades > 0) {
      totalRoi += stats.roi;
      totalWinRate += stats.winRate;
      leadersWithStats++;
    }
  }

  const avgRoi = leadersWithStats > 0 ? totalRoi / leadersWithStats : 0;
  const avgWinRate = leadersWithStats > 0 ? totalWinRate / leadersWithStats : 0;

  ctx?.success("Statistics retrieved");
  return {
    totalLeaders,
    totalFollowers,
    totalVolume: Math.round(totalVolume * 100) / 100,
    avgRoi: Math.round(avgRoi * 100) / 100,
    avgWinRate: Math.round(avgWinRate * 100) / 100,
    totalTrades,
  };
};
