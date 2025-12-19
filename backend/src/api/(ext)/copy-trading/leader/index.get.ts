// List public leaders with filtering and pagination
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import { calculateBatchLeaderStats } from "@b/api/(ext)/copy-trading/utils/stats-calculator";

export const metadata = {
  summary: "Get Available Copy Trading Leaders",
  description:
    "Retrieves all active public leaders available for copy trading.",
  operationId: "getCopyTradingLeaders",
  tags: ["Copy Trading", "Leaders"],
  requiresAuth: false,
  logModule: "COPY",
  logTitle: "Get leaders list",
  parameters: [
    {
      name: "tradingStyle",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["SCALPING", "DAY_TRADING", "SWING", "POSITION"] },
      description: "Filter by trading style",
    },
    {
      name: "riskLevel",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
      description: "Filter by risk level",
    },
    {
      name: "minWinRate",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Minimum win rate filter",
    },
    {
      name: "minRoi",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Minimum ROI filter",
    },
    {
      name: "sortBy",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["roi", "winRate", "totalFollowers", "totalProfit"] },
      description: "Sort field",
    },
    {
      name: "sortOrder",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["asc", "desc"] },
      description: "Sort order",
    },
    {
      name: "page",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Page number",
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Items per page",
    },
  ],
  responses: {
    200: {
      description: "Leaders retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: { type: "array", items: { type: "object" } },
              pagination: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  page: { type: "number" },
                  limit: { type: "number" },
                  totalPages: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { query, user, ctx } = data;

  ctx?.step("Fetching leaders");
  // Build filter conditions
  const whereClause: any = {
    status: "ACTIVE",
    isPublic: true,
  };

  if (query.tradingStyle) {
    whereClause.tradingStyle = query.tradingStyle;
  }

  if (query.riskLevel) {
    whereClause.riskLevel = query.riskLevel;
  }

  // Note: minWinRate and minRoi filtering will be done after calculating stats
  // Store filter values for post-calculation filtering
  const minWinRate = query.minWinRate ? parseFloat(query.minWinRate) : null;
  const minRoi = query.minRoi ? parseFloat(query.minRoi) : null;

  // Pagination
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);

  // Sorting - will be done after calculating stats
  const sortBy = query.sortBy || "roi";
  const sortOrder = query.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  // Get ALL leaders matching basic filters (we'll filter/sort/paginate after calculating stats)
  const leaders = await models.copyTradingLeader.findAll({
    where: whereClause,
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "avatar"],
      },
    ],
  });

  ctx?.step("Calculating stats for leaders");
  // Calculate stats for all leaders in batch (optimized)
  const leaderIds = leaders.map((l: any) => l.id);
  const statsMap = await calculateBatchLeaderStats(leaderIds);

  // Enhance leaders with calculated stats
  let leadersWithStats = leaders.map((leader: any) => {
    const stats = statsMap.get(leader.id) || {
      totalFollowers: 0,
      totalTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalVolume: 0,
      roi: 0,
    };
    return {
      ...leader.toJSON(),
      ...stats,
    };
  });

  // Apply minWinRate and minRoi filters
  if (minWinRate !== null) {
    leadersWithStats = leadersWithStats.filter((l) => l.winRate >= minWinRate);
  }
  if (minRoi !== null) {
    leadersWithStats = leadersWithStats.filter((l) => l.roi >= minRoi);
  }

  // Sort by calculated stats
  leadersWithStats.sort((a, b) => {
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
    return sortOrder === "ASC" ? aValue - bValue : bValue - aValue;
  });

  // Apply pagination
  const count = leadersWithStats.length;
  const offset = (page - 1) * limit;
  const paginatedLeaders = leadersWithStats.slice(offset, offset + limit);

  ctx?.step("Checking user follows");
  // Check if current user is following any of these leaders
  let followingMap: Record<string, boolean> = {};
  if (user?.id) {
    const userFollows = await models.copyTradingFollower.findAll({
      where: {
        userId: user.id,
        leaderId: paginatedLeaders.map((l: any) => l.id),
        status: { [Op.ne]: "STOPPED" },
      },
      attributes: ["leaderId"],
    });
    followingMap = userFollows.reduce((acc: any, f: any) => {
      acc[f.leaderId] = true;
      return acc;
    }, {});
  }

  // Enhance leaders with following status
  const enhancedLeaders = paginatedLeaders.map((leader: any) => ({
    ...leader,
    isFollowing: followingMap[leader.id] || false,
  }));

  ctx?.success(`Found ${count} leaders`);
  return {
    items: enhancedLeaders,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};
