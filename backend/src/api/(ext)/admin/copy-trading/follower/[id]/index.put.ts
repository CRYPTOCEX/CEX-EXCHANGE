import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
  commonFields,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Update copy trading follower subscription",
  description:
    "Updates configuration settings for a specific copy trading follower subscription. Allows modification of allocation amounts, copy mode, risk management parameters, and subscription status. Creates an audit log entry for tracking administrative changes.",
  operationId: "updateCopyTradingFollower",
  tags: ["Admin", "Copy Trading", "Follower"],
  requiresAuth: true,
  permission: "access.copy_trading",
  middleware: ["copyTradingAdmin"],
  logModule: "ADMIN_COPY",
  logTitle: "Update Copy Trading Follower Subscription",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "Unique identifier of the follower subscription",
      schema: { type: "string", format: "uuid" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            copyMode: {
              type: "string",
              enum: ["PROPORTIONAL", "FIXED_AMOUNT", "FIXED_RATIO"],
              description: "Copy trading mode to use",
            },
            fixedAmount: {
              type: "number",
              description: "Fixed amount per trade (for FIXED_AMOUNT mode, min: 0)",
            },
            fixedRatio: {
              type: "number",
              description: "Fixed ratio multiplier (for FIXED_RATIO mode, min: 0)",
            },
            maxTradeAmount: {
              type: "number",
              description: "Maximum amount per trade (min: 0)",
            },
            riskMultiplier: {
              type: "number",
              description: "Risk multiplier for position sizing (min: 0)",
            },
            stopLossPercent: {
              type: "number",
              description: "Stop loss percentage (0-100)",
            },
            takeProfitPercent: {
              type: "number",
              description: "Take profit percentage (min: 0)",
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "PAUSED", "STOPPED"],
              description: "Subscription status",
            },
          },
          description: "All fields are optional - only provided fields will be updated",
        },
      },
    },
  },
  responses: {
    200: {
      description: "Follower subscription updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                example: "Follower updated successfully",
              },
              follower: {
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
                    description: "Fixed amount per trade",
                  },
                  fixedRatio: {
                    type: "number",
                    nullable: true,
                    description: "Fixed ratio multiplier",
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
                  },
                  leader: {
                    type: "object",
                    description: "Leader details",
                  },
                },
              },
            },
            required: ["message", "follower"],
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Follower"),
    500: serverErrorResponse,
  },
};

export default async (data: any) => {
  const { user, params, body, ctx } = data;
  if (!user?.id) {
    ctx?.fail("Unauthorized");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;

  ctx?.step("Fetching follower subscription");
  const follower = await models.copyTradingFollower.findByPk(id);
  if (!follower) {
    ctx?.fail("Follower not found");
    throw createError({ statusCode: 404, message: "Follower not found" });
  }

  ctx?.step("Preparing update data");
  const allowedFields = [
    "copyMode",
    "fixedAmount",
    "fixedRatio",
    "maxTradeAmount",
    "riskMultiplier",
    "stopLossPercent",
    "takeProfitPercent",
    "status",
  ];

  const updates: any = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  ctx?.step("Updating follower subscription");
  await follower.update(updates);

  ctx?.step("Creating audit log");
  await models.copyTradingAuditLog.create({
    userId: user.id,
    action: "ADMIN_UPDATE",
    entityType: "copyTradingFollower",
    entityId: id,
    newValue: updates,
    ipAddress: data.request?.ip || "unknown",
  });

  ctx?.step("Fetching updated follower data");
  const updatedFollower = await models.copyTradingFollower.findByPk(id, {
    include: [
      { model: models.user, as: "user" },
      { model: models.copyTradingLeader, as: "leader" },
    ],
  });

  ctx?.success("Follower updated successfully");
  return {
    message: "Follower updated successfully",
    follower: updatedFollower,
  };
};
