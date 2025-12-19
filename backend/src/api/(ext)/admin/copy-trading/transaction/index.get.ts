// Admin get all copy trading transactions
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, Op } from "sequelize";
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "List All Copy Trading Transactions",
  description:
    "Returns a paginated list of all copy trading transactions with filtering options. Supports filtering by transaction type (ALLOCATION, DEALLOCATION, PROFIT, LOSS, PROFIT_SHARE, PLATFORM_FEE, REFUND), user ID, leader ID, follower ID, minimum amount, and date range. Includes summary statistics grouped by transaction type.",
  operationId: "getAdminCopyTradingTransactions",
  tags: ["Admin", "Copy Trading", "Transactions"],
  requiresAuth: true,
  permission: "access.copy_trading",
  demoMask: ["items.user.email"],
  logModule: "ADMIN_COPY",
  logTitle: "Get Copy Trading Transactions",
  parameters: [
    {
      name: "type",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["ALLOCATION", "DEALLOCATION", "PROFIT", "LOSS", "PROFIT_SHARE", "PLATFORM_FEE", "REFUND"],
      },
      description: "Filter by transaction type",
    },
    {
      name: "userId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by user ID",
    },
    {
      name: "leaderId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by leader ID",
    },
    {
      name: "followerId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by follower/subscription ID",
    },
    {
      name: "minAmount",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Minimum transaction amount",
    },
    {
      name: "dateFrom",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter from date (inclusive)",
    },
    {
      name: "dateTo",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter until date (inclusive)",
    },
    {
      name: "page",
      in: "query",
      schema: { type: "integer", default: 1 },
      description: "Page number for pagination",
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", default: 20 },
      description: "Number of items per page (max 100)",
    },
  ],
  responses: {
    200: {
      description: "Transactions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                description: "List of copy trading transactions",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    userId: { type: "string" },
                    leaderId: { type: "string", nullable: true },
                    followerId: { type: "string", nullable: true },
                    tradeId: { type: "string", nullable: true },
                    type: { type: "string" },
                    amount: { type: "number" },
                    currency: { type: "string" },
                    fee: { type: "number" },
                    balanceBefore: { type: "number" },
                    balanceAfter: { type: "number" },
                    description: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    user: { type: "object" },
                    leader: { type: "object", nullable: true },
                    follower: { type: "object", nullable: true },
                    trade: { type: "object", nullable: true },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  total: { type: "integer" },
                  page: { type: "integer" },
                  limit: { type: "integer" },
                  totalPages: { type: "integer" },
                },
              },
              summary: {
                type: "array",
                description: "Summary statistics grouped by transaction type",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    total: { type: "number" },
                    count: { type: "integer" },
                  },
                },
              },
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

  ctx?.step("Fetching copy trading transactions");

  // Build where clause
  const where: any = {};

  if (query.type) {
    where.type = query.type;
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.leaderId) {
    where.leaderId = query.leaderId;
  }

  if (query.followerId) {
    where.followerId = query.followerId;
  }

  if (query.minAmount) {
    where.amount = { [Op.gte]: parseFloat(query.minAmount) };
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) {
      where.createdAt[Op.gte] = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      where.createdAt[Op.lte] = new Date(query.dateTo + "T23:59:59.999Z");
    }
  }

  // Pagination
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const { count, rows: transactions } = await models.copyTradingTransaction.findAndCountAll({
    where,
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email"],
      },
      {
        model: models.copyTradingLeader,
        as: "leader",
        attributes: ["id", "displayName"],
        required: false,
      },
      {
        model: models.copyTradingFollower,
        as: "follower",
        attributes: ["id"],
        required: false,
      },
      {
        model: models.copyTradingTrade,
        as: "trade",
        attributes: ["id", "symbol", "side", "amount"],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  // Get summary stats
  const summary = await models.copyTradingTransaction.findAll({
    attributes: [
      "type",
      [fn("SUM", col("amount")), "total"],
      [fn("COUNT", col("id")), "count"],
    ],
    group: ["type"],
  });

  ctx?.success(`Retrieved ${count} copy trading transactions`);

  return {
    items: transactions.map((t: any) => t.toJSON()),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
    summary: summary.map((s: any) => ({
      type: s.type,
      total: parseFloat(s.get("total")) || 0,
      count: parseInt(s.get("count")) || 0,
    })),
  };
};
