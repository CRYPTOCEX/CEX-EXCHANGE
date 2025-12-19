// Get user's copy trading transaction history
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get My Copy Trading Transactions",
  description:
    "Retrieves the user's copy trading financial transaction history with filtering and pagination.",
  operationId: "getMyCopyTradingTransactions",
  tags: ["Copy Trading", "Transactions"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Get my transactions",
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
      name: "followerId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by subscription/follower ID",
    },
    {
      name: "leaderId",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by leader ID",
    },
    {
      name: "dateFrom",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter transactions from this date",
    },
    {
      name: "dateTo",
      in: "query",
      required: false,
      schema: { type: "string", format: "date" },
      description: "Filter transactions until this date",
    },
    {
      name: "page",
      in: "query",
      required: false,
      schema: { type: "integer", default: 1 },
      description: "Page number",
    },
    {
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "integer", default: 20 },
      description: "Items per page",
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
              items: { type: "array" },
              pagination: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  page: { type: "number" },
                  limit: { type: "number" },
                  totalPages: { type: "number" },
                },
              },
              summary: {
                type: "object",
                properties: {
                  totalAllocated: { type: "number" },
                  totalDeallocated: { type: "number" },
                  totalProfit: { type: "number" },
                  totalFees: { type: "number" },
                },
              },
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
  const { user, query, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Building query");
  // Build where clause
  const where: any = { userId: user.id };

  if (query.type) {
    where.type = query.type;
  }

  if (query.followerId) {
    where.followerId = query.followerId;
  }

  if (query.leaderId) {
    where.leaderId = query.leaderId;
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

  ctx?.step("Fetching transactions");
  // Get transactions
  const { count, rows: transactions } = await models.copyTradingTransaction.findAndCountAll({
    where,
    include: [
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
        attributes: ["id", "symbol", "side"],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  ctx?.step("Calculating summary");
  // Calculate summary
  const allTransactions = await models.copyTradingTransaction.findAll({
    where: { userId: user.id },
    attributes: ["type", "amount"],
  });

  const summary = {
    totalAllocated: 0,
    totalDeallocated: 0,
    totalProfit: 0,
    totalFees: 0,
  };

  allTransactions.forEach((t: any) => {
    const amount = parseFloat(t.amount) || 0;
    switch (t.type) {
      case "ALLOCATION":
        summary.totalAllocated += amount;
        break;
      case "DEALLOCATION":
      case "REFUND":
        summary.totalDeallocated += amount;
        break;
      case "PROFIT":
        summary.totalProfit += amount;
        break;
      case "LOSS":
        summary.totalProfit -= amount;
        break;
      case "PROFIT_SHARE":
      case "PLATFORM_FEE":
        summary.totalFees += amount;
        break;
    }
  });

  ctx?.success(`Found ${count} transactions`);
  return {
    items: transactions.map((t: any) => t.toJSON()),
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
    summary: {
      totalAllocated: Math.round(summary.totalAllocated * 100) / 100,
      totalDeallocated: Math.round(summary.totalDeallocated * 100) / 100,
      totalProfit: Math.round(summary.totalProfit * 100) / 100,
      totalFees: Math.round(summary.totalFees * 100) / 100,
    },
  };
};
