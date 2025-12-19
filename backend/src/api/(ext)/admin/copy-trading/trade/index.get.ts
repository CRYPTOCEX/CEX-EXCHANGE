import { models } from "@b/db";
import { Op } from "sequelize";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "List all copy trades",
  description:
    "Returns a paginated list of all copy trading trades with filtering options. Supports filtering by status, leader ID, follower ID, symbol, side (BUY/SELL), and trade type (leader/follower). Includes leader and follower information with associated user details.",
  operationId: "getAdminCopyTradingTrades",
  tags: ["Admin", "Copy Trading", "Trades"],
  requiresAuth: true,
  permission: "access.copy_trading",
  logModule: "ADMIN_COPY",
  logTitle: "Get Copy Trading Trades",
  parameters: [
    {
      name: "page",
      in: "query",
      schema: { type: "integer", default: 1 },
      description: "Page number for pagination",
    },
    {
      name: "limit",
      in: "query",
      schema: { type: "integer", default: 10 },
      description: "Number of items per page",
    },
    {
      name: "status",
      in: "query",
      schema: { type: "string" },
      description: "Filter by trade status",
    },
    {
      name: "leaderId",
      in: "query",
      schema: { type: "string" },
      description: "Filter by leader ID",
    },
    {
      name: "followerId",
      in: "query",
      schema: { type: "string" },
      description: "Filter by follower ID",
    },
    {
      name: "symbol",
      in: "query",
      schema: { type: "string" },
      description: "Filter by trading symbol",
    },
    {
      name: "side",
      in: "query",
      schema: { type: "string", enum: ["BUY", "SELL"] },
      description: "Filter by trade side",
    },
    {
      name: "type",
      in: "query",
      schema: { type: "string", enum: ["leader", "follower"] },
      description: "Filter by leader trades only or follower trades only",
    },
  ],
  responses: {
    200: {
      description: "Trades retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                description: "List of copy trading trades",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    leaderId: { type: "string" },
                    followerId: { type: "string", nullable: true },
                    symbol: { type: "string" },
                    side: { type: "string", enum: ["BUY", "SELL"] },
                    amount: { type: "number" },
                    price: { type: "number" },
                    status: { type: "string" },
                    profit: { type: "number" },
                    fee: { type: "number" },
                    latencyMs: { type: "integer" },
                    createdAt: { type: "string", format: "date-time" },
                    leader: { type: "object" },
                    follower: { type: "object", nullable: true },
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

export default async (data: any) => {
  const { user, query, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching copy trading trades");

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

  if (query.followerId) {
    where.followerId = query.followerId;
  }

  if (query.symbol) {
    where.symbol = query.symbol;
  }

  if (query.side) {
    where.side = query.side;
  }

  // Filter by trade type
  if (query.type === "leader") {
    where.followerId = null;
  } else if (query.type === "follower") {
    where.followerId = { [Op.ne]: null };
  }

  const { count, rows } = await models.copyTradingTrade.findAndCountAll({
    where,
    include: [
      {
        model: models.copyTradingLeader,
        as: "leader",
        attributes: ["id", "displayName", "userId"],
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      },
      {
        model: models.copyTradingFollower,
        as: "follower",
        attributes: ["id", "userId"],
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      },
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  ctx?.success(`Retrieved ${count} copy trading trades`);

  return {
    items: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};
