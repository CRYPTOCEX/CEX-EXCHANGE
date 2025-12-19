// Admin list all leaders
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import { calculateBatchLeaderStats } from "@b/api/(ext)/copy-trading/utils/stats-calculator";

export const metadata = {
  summary: "List All Copy Trading Leaders (Admin)",
  description: "Retrieves all copy trading leaders with filtering options.",
  operationId: "adminListCopyTradingLeaders",
  tags: ["Admin", "Copy Trading"],
  requiresAuth: true,
  logModule: "ADMIN_COPY",
  logTitle: "Get Copy Trading Leaders",
  permission: "access.copy_trading",
  demoMask: ["items.user.email"],
  parameters: [
    {
      name: "status",
      in: "query",
      schema: { type: "string" },
      description: "Filter by status (comma-separated)",
    },
    {
      name: "search",
      in: "query",
      schema: { type: "string" },
      description: "Search by display name or email",
    },
    {
      name: "page",
      in: "query",
      schema: { type: "number" },
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "number" },
    },
  ],
  responses: {
    200: { description: "Leaders retrieved successfully" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { query, ctx } = data;


  ctx?.step("Get Copy Trading Leaders");
  const whereClause: any = {};
  const userWhereClause: any = {};

  // Status filter
  if (query.status) {
    const statuses = query.status.split(",");
    whereClause.status = { [Op.in]: statuses };
  }

  // Search filter
  if (query.search) {
    const searchTerm = `%${query.search}%`;
    whereClause[Op.or] = [{ displayName: { [Op.like]: searchTerm } }];
    userWhereClause[Op.or] = [
      { email: { [Op.like]: searchTerm } },
      { firstName: { [Op.like]: searchTerm } },
      { lastName: { [Op.like]: searchTerm } },
    ];
  }

  // Pagination
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const { count, rows: leaders } = await models.copyTradingLeader.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
        where: query.search ? userWhereClause : undefined,
        required: query.search ? true : false,
      },
      {
        model: models.copyTradingLeaderMarket,
        as: "markets",
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  // Calculate stats for all leaders in batch
  ctx?.step("Calculating stats for leaders");
  const leaderIds = leaders.map((l: any) => l.id);
  const statsMap = await calculateBatchLeaderStats(leaderIds);

  // Merge stats with leader data
  const leadersWithStats = leaders.map((l: any) => {
    const leaderData = l.toJSON();
    const stats = statsMap.get(l.id);
    return {
      ...leaderData,
      ...stats, // Adds: totalFollowers, totalTrades, winRate, totalProfit, totalVolume, roi
    };
  });

  ctx?.success("Get Copy Trading Leaders retrieved successfully");
  return {
    items: leadersWithStats,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};
