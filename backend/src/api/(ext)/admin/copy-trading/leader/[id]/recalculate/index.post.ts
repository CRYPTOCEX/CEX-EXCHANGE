// Admin force recalculate leader statistics
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog } from "@b/api/(ext)/copy-trading/utils";
import { Op } from "sequelize";

export const metadata = {
  summary: "Recalculate Leader Statistics",
  description: "Forces a recalculation of all statistics for a leader.",
  operationId: "adminRecalculateCopyTradingLeaderStats",
  tags: ["Admin", "Copy Trading", "Leaders"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Recalculate leader statistics",
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
    200: { description: "Statistics recalculated successfully" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Leader not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;
  const { id } = params;

  if (!user?.id) {
    ctx?.fail("Unauthorized");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching leader");
  const leader = await models.copyTradingLeader.findByPk(id);

  if (!leader) {
    ctx?.fail("Leader not found");
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  ctx?.step("Storing old statistics");
  const oldStats = {
    totalTrades: leader.totalTrades,
    winRate: leader.winRate,
    totalProfit: leader.totalProfit,
    totalVolume: leader.totalVolume,
    totalFollowers: leader.totalFollowers,
    roi: leader.roi,
  };

  ctx?.step("Fetching leader's closed trades");
  const trades = await models.copyTradingTrade.findAll({
    where: {
      leaderId: id,
      followerId: null,
      status: "CLOSED",
    },
  });

  ctx?.step("Calculating trade statistics");
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t: any) => (t.profit || 0) > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
  const totalVolume = trades.reduce((sum: number, t: any) => sum + (t.cost || 0), 0);

  ctx?.step("Calculating follower metrics");
  const totalFollowers = await models.copyTradingFollower.count({
    where: { leaderId: id, status: "ACTIVE" },
  });

  // Calculate total allocated from follower allocations
  const allocations = await models.copyTradingFollowerAllocation.findAll({
    where: { isActive: true },
    include: [{
      model: models.copyTradingFollower,
      as: "follower",
      where: { leaderId: id, status: { [Op.in]: ["ACTIVE", "PAUSED"] } },
      required: true,
    }],
  });

  const totalAllocated = allocations.reduce((sum: number, allocation: any) => {
    return sum + (parseFloat(allocation.baseAmount) || 0) + (parseFloat(allocation.quoteAmount) || 0);
  }, 0);

  // Calculate ROI
  const roi = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;

  // Calculate more advanced metrics
  const losses = trades.filter((t: any) => (t.profit || 0) < 0);
  const maxDrawdown = losses.length > 0
    ? Math.min(...losses.map((t: any) => t.profit || 0))
    : 0;

  // Calculate average trade duration if dates are available
  let avgTradeDuration = 0;
  const tradesWithDuration = trades.filter((t: any) => t.closedAt && t.createdAt);
  if (tradesWithDuration.length > 0) {
    const totalDuration = tradesWithDuration.reduce((sum: number, t: any) => {
      return sum + (new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime());
    }, 0);
    avgTradeDuration = totalDuration / tradesWithDuration.length / (1000 * 60); // in minutes
  }

  ctx?.step("Calculating follower trade statistics");
  const followerTrades = await models.copyTradingTrade.findAll({
    where: {
      leaderId: id,
      followerId: { [Op.ne]: null },
      status: "CLOSED",
    },
  });

  const totalCopiedTrades = followerTrades.length;
  const totalCopiedVolume = followerTrades.reduce((sum: number, t: any) => sum + (t.cost || 0), 0);
  const totalCopiedProfit = followerTrades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);

  ctx?.step("Updating leader with new statistics");
  const newStats = {
    totalTrades,
    winRate: Math.round(winRate * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalVolume: Math.round(totalVolume * 100) / 100,
    totalFollowers,
    roi: Math.round(roi * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
  };

  await leader.update(newStats);

  ctx?.step("Creating audit log");
  await createAuditLog({
    entityType: "LEADER",
    entityId: id,
    action: "RECALCULATE_STATS",
    oldValue: oldStats,
    newValue: newStats,
    adminId: user.id,
    reason: "Manual statistics recalculation",
    metadata: {
      totalCopiedTrades,
      totalCopiedVolume,
      totalCopiedProfit,
      totalAllocated,
      avgTradeDuration,
    },
  });

  ctx?.success("Statistics recalculated successfully");
  return {
    message: "Statistics recalculated successfully",
    leader: {
      id: leader.id,
      displayName: leader.displayName,
    },
    oldStats,
    newStats,
    changes: {
      totalTrades: newStats.totalTrades - oldStats.totalTrades,
      winRate: Math.round((newStats.winRate - oldStats.winRate) * 100) / 100,
      totalProfit: Math.round((newStats.totalProfit - oldStats.totalProfit) * 100) / 100,
      totalFollowers: newStats.totalFollowers - oldStats.totalFollowers,
      roi: Math.round((newStats.roi - oldStats.roi) * 100) / 100,
    },
    additionalMetrics: {
      totalCopiedTrades,
      totalCopiedVolume: Math.round(totalCopiedVolume * 100) / 100,
      totalCopiedProfit: Math.round(totalCopiedProfit * 100) / 100,
      totalAllocated: Math.round(totalAllocated * 100) / 100,
      avgTradeDurationMinutes: Math.round(avgTradeDuration * 100) / 100,
    },
  };
};
