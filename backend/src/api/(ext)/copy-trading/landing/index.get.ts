import { models } from "@b/db";
import { Op } from "sequelize";
import { calculateBatchLeaderStats, LeaderStats } from "@b/api/(ext)/copy-trading/utils/stats-calculator";

export const metadata: OperationObject = {
  summary: "Get Copy Trading Landing Page Data",
  description:
    "Retrieves optimized data for the copy trading landing page including stats, top leaders, and recent activity.",
  operationId: "getCopyTradingLandingData",
  tags: ["Copy Trading", "Landing"],
  requiresAuth: false,
  responses: {
    200: {
      description: "Landing page data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              stats: { type: "object" },
              featuredLeader: { type: "object" },
              topLeaders: { type: "array" },
              byTradingStyle: { type: "object" },
              byRiskLevel: { type: "object" },
              recentTrades: { type: "array" },
              copyModes: { type: "array" },
            },
          },
        },
      },
    },
  },
};

export default async (data: Handler) => {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get basic counts and leaders in parallel
  const [
    totalLeaders,
    totalFollowers,
    volumeResult,
    totalTrades,
    leaders,
    recentTrades,
  ] = await Promise.all([
    // Total active public leaders
    models.copyTradingLeader.count({
      where: { status: "ACTIVE", isPublic: true },
    }),

    // Total followers (distinct users)
    models.copyTradingFollower.count({
      where: { status: { [Op.in]: ["ACTIVE", "PAUSED"] } },
      distinct: true,
      col: "userId",
    }),

    // Total volume from closed trades
    models.copyTradingTrade.sum("cost", {
      where: { status: "CLOSED" },
    }),

    // Total closed trades
    models.copyTradingTrade.count({ where: { status: "CLOSED" } }),

    // All active public leaders (we'll sort by calculated stats)
    models.copyTradingLeader.findAll({
      where: { status: "ACTIVE", isPublic: true },
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["firstName", "lastName", "avatar"],
        },
      ],
    }),

    // Recent closed trades (last 24 hours)
    models.copyTradingTrade.findAll({
      where: {
        status: "CLOSED",
        isLeaderTrade: true,
        closedAt: { [Op.gte]: twentyFourHoursAgo },
      },
      include: [
        {
          model: models.copyTradingLeader,
          as: "leader",
          attributes: ["displayName"],
        },
      ],
      order: [["closedAt", "DESC"]],
      limit: 10,
    }),
  ]);

  // Calculate stats for all leaders in batch
  const leaderIds = leaders.map((l: any) => l.id);
  const statsMap = leaderIds.length > 0
    ? await calculateBatchLeaderStats(leaderIds)
    : new Map<string, LeaderStats>();

  // Combine leaders with their stats and sort by ROI
  const leadersWithStats = leaders.map((leader: any) => {
    const stats = statsMap.get(leader.id) || {
      totalFollowers: 0,
      totalTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalVolume: 0,
      roi: 0,
    };
    return { leader, stats };
  });

  // Sort by ROI descending and take top 6
  leadersWithStats.sort((a, b) => b.stats.roi - a.stats.roi);
  const topLeadersWithStats = leadersWithStats.slice(0, 6);

  // Calculate aggregated stats
  let totalProfitGenerated = 0;
  let totalRoiSum = 0;
  let totalWinRateSum = 0;
  let topRoi = 0;

  leadersWithStats.forEach(({ stats }) => {
    totalProfitGenerated += stats.totalProfit;
    totalRoiSum += stats.roi;
    totalWinRateSum += stats.winRate;
    if (stats.roi > topRoi) topRoi = stats.roi;
  });

  const avgRoi = leadersWithStats.length > 0 ? totalRoiSum / leadersWithStats.length : 0;
  const avgWinRate = leadersWithStats.length > 0 ? totalWinRateSum / leadersWithStats.length : 0;

  // Get sparkline data for top leaders (last 14 days)
  const topLeaderIds = topLeadersWithStats.map(({ leader }) => leader.id);
  const sparklineData =
    topLeaderIds.length > 0
      ? await models.copyTradingLeaderStats.findAll({
          where: {
            leaderId: { [Op.in]: topLeaderIds },
            date: { [Op.gte]: fourteenDaysAgo },
          },
          attributes: ["leaderId", "date", "profit"],
          order: [["date", "ASC"]],
        })
      : [];

  // Group sparkline by leader
  const sparklineMap: Record<string, number[]> = {};
  sparklineData.forEach((s: any) => {
    if (!sparklineMap[s.leaderId]) sparklineMap[s.leaderId] = [];
    sparklineMap[s.leaderId].push(s.profit || 0);
  });

  // Format leaders with rank and sparkline
  const formattedLeaders = topLeadersWithStats.map(({ leader, stats }, index: number) => ({
    id: leader.id,
    displayName: leader.displayName,
    avatar: leader.avatar || leader.user?.avatar,
    bio: leader.bio,
    tradingStyle: leader.tradingStyle,
    riskLevel: leader.riskLevel,
    roi: stats.roi,
    winRate: stats.winRate,
    totalFollowers: stats.totalFollowers,
    totalProfit: stats.totalProfit,
    totalTrades: stats.totalTrades,
    profitSharePercent: leader.profitSharePercent || 0,
    maxFollowers: leader.maxFollowers,
    sparkline: sparklineMap[leader.id] || [],
    rank: index + 1,
  }));

  // Featured leader (top performer)
  const featuredLeader = formattedLeaders[0] || null;

  // Format recent trades with time ago
  const formattedTrades = recentTrades.map((trade: any) => {
    const leaderStats = statsMap.get(trade.leaderId);
    return {
      leaderDisplayName: trade.leader?.displayName || "Unknown",
      symbol: trade.symbol,
      side: trade.side,
      profit: Math.round((trade.profit || 0) * 100) / 100,
      profitPercent: Math.round((trade.profitPercent || 0) * 100) / 100,
      timeAgo: getTimeAgo(trade.closedAt),
      followersCount: leaderStats?.totalFollowers || 0,
    };
  });

  // Calculate stats by trading style
  const byTradingStyle: Record<string, { count: number; avgRoi: number; topRoi: number }> = {};
  const defaultStyles = ["SCALPING", "DAY_TRADING", "SWING", "POSITION"];

  // Initialize all styles with zeros
  defaultStyles.forEach((style) => {
    byTradingStyle[style] = { count: 0, avgRoi: 0, topRoi: 0 };
  });

  // Group leaders by style and calculate stats
  const styleGroups: Record<string, { count: number; roiSum: number; topRoi: number }> = {};
  leadersWithStats.forEach(({ leader, stats }) => {
    const style = leader.tradingStyle;
    if (!styleGroups[style]) {
      styleGroups[style] = { count: 0, roiSum: 0, topRoi: 0 };
    }
    styleGroups[style].count++;
    styleGroups[style].roiSum += stats.roi;
    if (stats.roi > styleGroups[style].topRoi) {
      styleGroups[style].topRoi = stats.roi;
    }
  });

  Object.entries(styleGroups).forEach(([style, group]) => {
    byTradingStyle[style] = {
      count: group.count,
      avgRoi: Math.round((group.roiSum / group.count) * 100) / 100,
      topRoi: Math.round(group.topRoi * 100) / 100,
    };
  });

  // Calculate stats by risk level
  const byRiskLevel: Record<string, { count: number; avgRoi: number }> = {};
  const defaultRisks = ["LOW", "MEDIUM", "HIGH"];

  // Initialize all risk levels
  defaultRisks.forEach((risk) => {
    byRiskLevel[risk] = { count: 0, avgRoi: 0 };
  });

  // Group leaders by risk and calculate stats
  const riskGroups: Record<string, { count: number; roiSum: number }> = {};
  leadersWithStats.forEach(({ leader, stats }) => {
    const risk = leader.riskLevel;
    if (!riskGroups[risk]) {
      riskGroups[risk] = { count: 0, roiSum: 0 };
    }
    riskGroups[risk].count++;
    riskGroups[risk].roiSum += stats.roi;
  });

  Object.entries(riskGroups).forEach(([risk, group]) => {
    byRiskLevel[risk] = {
      count: group.count,
      avgRoi: Math.round((group.roiSum / group.count) * 100) / 100,
    };
  });

  // Copy modes information
  const copyModes = [
    {
      mode: "PROPORTIONAL",
      title: "Proportional",
      description: "Copy trades proportionally based on your allocation",
      example:
        "If a leader uses 10% of their balance, you use 10% of your allocated amount",
      recommended: true,
      icon: "percent",
    },
    {
      mode: "FIXED_AMOUNT",
      title: "Fixed Amount",
      description: "Copy every trade with a fixed dollar amount",
      example:
        "Every trade copies exactly $50 regardless of the leader's position size",
      recommended: false,
      icon: "dollar",
    },
    {
      mode: "FIXED_RATIO",
      title: "Fixed Ratio",
      description: "Copy at a fixed ratio of the leader's position",
      example:
        "Copy at 0.5x means you copy half of the leader's position size each time",
      recommended: false,
      icon: "ratio",
    },
  ];

  return {
    stats: {
      totalLeaders: totalLeaders || 0,
      totalFollowers: totalFollowers || 0,
      totalVolume: Math.round((volumeResult || 0) * 100) / 100,
      avgRoi: Math.round(avgRoi * 100) / 100,
      avgWinRate: Math.round(avgWinRate * 100) / 100,
      totalTrades: totalTrades || 0,
      topLeaderRoi: Math.round(topRoi * 100) / 100,
      totalProfitGenerated: Math.round(totalProfitGenerated * 100) / 100,
    },
    featuredLeader,
    topLeaders: formattedLeaders,
    byTradingStyle,
    byRiskLevel,
    recentTrades: formattedTrades,
    copyModes,
  };
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
