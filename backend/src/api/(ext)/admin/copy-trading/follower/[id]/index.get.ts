import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  commonFields,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Get copy trading follower details",
  description:
    "Retrieves detailed information about a specific copy trading follower subscription, including user and leader details, recent trades (up to 50), and recent transactions (up to 50). This provides a comprehensive view of the follower's copy trading activity.",
  operationId: "getCopyTradingFollowerById",
  tags: ["Admin", "Copy Trading", "Follower"],
  requiresAuth: true,
  logModule: "ADMIN_COPY",
  logTitle: "Get Copy Trading Follower Details",
  permission: "access.copy_trading",
  demoMask: ["user.email"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Unique identifier of the follower subscription",
      schema: { type: "string", format: "uuid" },
    },
  ],
  responses: {
    200: {
      description: "Follower details retrieved successfully",
      content: {
        "application/json": {
          schema: {
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
                  profitSharePercent: { type: "number", nullable: true },
                },
              },
              trades: {
                type: "array",
                description: "Recent trades (up to 50)",
                items: {
                  type: "object",
                  properties: {
                    ...commonFields,
                    leaderId: { type: "string", format: "uuid" },
                    followerId: { type: "string", format: "uuid", nullable: true },
                    leaderOrderId: { type: "string", nullable: true },
                    symbol: { type: "string", description: "Trading pair symbol" },
                    side: {
                      type: "string",
                      enum: ["BUY", "SELL"],
                      description: "Trade side",
                    },
                    type: {
                      type: "string",
                      enum: ["MARKET", "LIMIT"],
                      description: "Order type",
                    },
                    amount: { type: "number", description: "Trade amount" },
                    price: { type: "number", description: "Trade price" },
                    cost: { type: "number", description: "Total cost" },
                    fee: { type: "number", description: "Trading fee" },
                    feeCurrency: { type: "string", description: "Fee currency" },
                    executedAmount: { type: "number", description: "Executed amount" },
                    executedPrice: { type: "number", description: "Executed price" },
                    slippage: { type: "number", nullable: true, description: "Slippage" },
                    latencyMs: {
                      type: "integer",
                      nullable: true,
                      description: "Execution latency in milliseconds",
                    },
                    profit: { type: "number", nullable: true, description: "Trade profit/loss" },
                    profitPercent: {
                      type: "number",
                      nullable: true,
                      description: "Profit percentage",
                    },
                    profitCurrency: { type: "string", nullable: true },
                    status: {
                      type: "string",
                      enum: [
                        "PENDING",
                        "PENDING_REPLICATION",
                        "REPLICATED",
                        "REPLICATION_FAILED",
                        "OPEN",
                        "CLOSED",
                        "PARTIALLY_FILLED",
                        "FAILED",
                        "CANCELLED",
                      ],
                    },
                    errorMessage: { type: "string", nullable: true },
                    isLeaderTrade: { type: "boolean" },
                    closedAt: { type: "string", format: "date-time", nullable: true },
                  },
                },
              },
              transactions: {
                type: "array",
                description: "Recent transactions (up to 50)",
                items: {
                  type: "object",
                  properties: {
                    ...commonFields,
                    userId: { type: "string", format: "uuid" },
                    leaderId: { type: "string", format: "uuid", nullable: true },
                    followerId: { type: "string", format: "uuid", nullable: true },
                    tradeId: { type: "string", format: "uuid", nullable: true },
                    type: {
                      type: "string",
                      enum: [
                        "ALLOCATION",
                        "DEALLOCATION",
                        "PROFIT_SHARE",
                        "TRADE_PROFIT",
                        "TRADE_LOSS",
                        "FEE",
                        "REFUND",
                      ],
                    },
                    amount: { type: "number" },
                    currency: { type: "string" },
                    fee: { type: "number" },
                    balanceBefore: { type: "number" },
                    balanceAfter: { type: "number" },
                    status: {
                      type: "string",
                      enum: ["PENDING", "COMPLETED", "FAILED"],
                    },
                    description: { type: "string", nullable: true },
                    metadata: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Follower"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  ctx?.step("Get Copy Trading Follower");

  const follower = await models.copyTradingFollower.findByPk(id, {
    include: [
      {
        model: models.user,
        as: "user",
        attributes: ["id", "firstName", "lastName", "email", "avatar"],
      },
      {
        model: models.copyTradingLeader,
        as: "leader",
        attributes: [
          "id",
          "displayName",
          "avatar",
          "tradingStyle",
          "riskLevel",
          "profitSharePercent",
        ],
      },
    ],
  });

  if (!follower) {
    throw createError({ statusCode: 404, message: "Follower not found" });
  }

  // Get trades for this follower
  const trades = await models.copyTradingTrade.findAll({
    where: { followerId: id },
    order: [["createdAt", "DESC"]],
    limit: 50,
  });

  // Get transactions
  const transactions = await models.copyTradingTransaction.findAll({
    where: { followerId: id },
    order: [["createdAt", "DESC"]],
    limit: 50,
  });

  ctx?.success("Get Copy Trading Follower retrieved successfully");
  return {
    ...follower.get({ plain: true }),
    trades,
    transactions,
  };
};
