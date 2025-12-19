import { models } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";
import { getFollowerStats } from "@b/api/(ext)/copy-trading/utils/stats-calculator";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  commonFields,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "List copy trading followers",
  description:
    "Retrieves a paginated list of all copy trading follower subscriptions. Supports filtering by status, leader, user, and searching by user details (name, email). Includes related user and leader information for each follower.",
  operationId: "listCopyTradingFollowers",
  tags: ["Admin", "Copy Trading", "Follower"],
  requiresAuth: true,
  logModule: "ADMIN_COPY",
  logTitle: "List Copy Trading Followers",
  permission: "access.copy_trading",
  demoMask: ["items.user.email"],
  parameters: [
    {
      name: "page",
      in: "query",
      description: "Page number for pagination (min: 1, default: 1)",
      schema: { type: "integer", default: 1 },
    },
    {
      name: "limit",
      in: "query",
      description: "Number of items per page (1-100, default: 10)",
      schema: { type: "integer", default: 10 },
    },
    {
      name: "status",
      in: "query",
      description: "Filter by follower status",
      schema: { type: "string", enum: ["ACTIVE", "PAUSED", "STOPPED"] },
    },
    {
      name: "leaderId",
      in: "query",
      description: "Filter by specific leader ID",
      schema: { type: "string", format: "uuid" },
    },
    {
      name: "userId",
      in: "query",
      description: "Filter by specific user ID",
      schema: { type: "string", format: "uuid" },
    },
    {
      name: "search",
      in: "query",
      description: "Search by user first name, last name, or email",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Follower list retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ...commonFields,
                    userId: {
                      type: "string",
                      format: "uuid",
                      description: "ID of the user following the leader",
                    },
                    leaderId: {
                      type: "string",
                      format: "uuid",
                      description: "ID of the leader being followed",
                    },
                    copyMode: {
                      type: "string",
                      enum: ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"],
                      description: "Copy trading mode",
                    },
                    fixedAmount: {
                      type: "number",
                      nullable: true,
                      description: "Fixed amount per trade (if using FIXED_AMOUNT mode)",
                    },
                    fixedRatio: {
                      type: "number",
                      nullable: true,
                      description: "Fixed ratio multiplier (if using FIXED_RATIO mode)",
                    },
                    maxDailyLoss: {
                      type: "number",
                      nullable: true,
                      description: "Maximum daily loss limit",
                    },
                    maxPositionSize: {
                      type: "number",
                      nullable: true,
                      description: "Maximum position size limit",
                    },
                    stopLossPercent: {
                      type: "number",
                      nullable: true,
                      description: "Stop loss percentage",
                    },
                    takeProfitPercent: {
                      type: "number",
                      nullable: true,
                      description: "Take profit percentage",
                    },
                    totalProfit: {
                      type: "number",
                      description: "Total profit/loss from all trades",
                    },
                    totalTrades: {
                      type: "integer",
                      description: "Total number of trades executed",
                    },
                    winRate: {
                      type: "number",
                      description: "Win rate percentage",
                    },
                    roi: {
                      type: "number",
                      description: "Return on investment percentage",
                    },
                    status: {
                      type: "string",
                      enum: ["ACTIVE", "PAUSED", "STOPPED"],
                      description: "Current subscription status",
                    },
                    user: {
                      type: "object",
                      description: "User details",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        email: { type: "string", format: "email" },
                        avatar: { type: "string", nullable: true },
                      },
                    },
                    leader: {
                      type: "object",
                      description: "Leader details",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        displayName: { type: "string" },
                        avatar: { type: "string", nullable: true },
                        tradingStyle: { type: "string", nullable: true },
                        riskLevel: { type: "string", nullable: true },
                      },
                    },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  total: {
                    type: "integer",
                    description: "Total number of followers",
                  },
                  page: {
                    type: "integer",
                    description: "Current page number",
                  },
                  limit: {
                    type: "integer",
                    description: "Items per page",
                  },
                  totalPages: {
                    type: "integer",
                    description: "Total number of pages",
                  },
                },
                required: ["total", "page", "limit", "totalPages"],
              },
            },
            required: ["items", "pagination"],
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;

  ctx?.step("Get Copy Trading Followers");
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;

  const where: any = {};

  if (query.status) {
    where.status = query.status;
  }

  if (query.leaderId) {
    where.leaderId = query.leaderId;
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  const include: any[] = [
    {
      model: models.user,
      as: "user",
      attributes: ["id", "firstName", "lastName", "email", "avatar"],
    },
    {
      model: models.copyTradingLeader,
      as: "leader",
      attributes: ["id", "displayName", "avatar", "tradingStyle", "riskLevel"],
    },
    {
      model: models.copyTradingFollowerAllocation,
      as: "allocations",
      required: false,
    },
  ];

  // Handle search
  if (query.search) {
    include[0].where = {
      [Op.or]: [
        { firstName: { [Op.like]: `%${query.search}%` } },
        { lastName: { [Op.like]: `%${query.search}%` } },
        { email: { [Op.like]: `%${query.search}%` } },
      ],
    };
    include[0].required = true;
  }

  const { count, rows } = await models.copyTradingFollower.findAndCountAll({
    where,
    include,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  // Calculate stats for each follower
  ctx?.step("Calculating stats for followers");
  const followersWithStats = await Promise.all(
    rows.map(async (follower: any) => {
      const followerData = follower.toJSON();
      const stats = await getFollowerStats(follower.id);
      return {
        ...followerData,
        ...stats, // Adds: totalProfit, totalTrades, winRate, roi
      };
    })
  );

  ctx?.success("Get Copy Trading Followers retrieved successfully");
  return {
    items: followersWithStats,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};
