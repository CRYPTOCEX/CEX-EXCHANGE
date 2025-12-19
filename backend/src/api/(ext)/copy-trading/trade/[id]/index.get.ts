// Get specific copy trade details
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Copy Trade Details",
  description: "Retrieves detailed information about a specific copy trade.",
  operationId: "getCopyTradeDetails",
  tags: ["Copy Trading", "Trades"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Get trade details",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Trade ID",
    },
  ],
  responses: {
    200: {
      description: "Trade details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
    404: { description: "Trade not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;
  const { id } = params;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching trade");
  // Get the trade with all related data
  const trade = await models.copyTradingTrade.findByPk(id, {
    include: [
      {
        model: models.copyTradingLeader,
        as: "leader",
        attributes: ["id", "displayName", "userId", "profitSharePercent"],
        include: [
          {
            model: models.user,
            as: "user",
            attributes: ["id", "firstName", "lastName", "avatar"],
          },
        ],
      },
      {
        model: models.copyTradingFollower,
        as: "follower",
        attributes: ["id", "userId", "allocatedAmount", "currency", "copyMode"],
      },
    ],
  });

  if (!trade) {
    throw createError({ statusCode: 404, message: "Trade not found" });
  }

  // Check if user owns this trade (as follower) or is the leader
  const isFollower = trade.follower?.userId === user.id;
  const isLeader = trade.leader?.userId === user.id;

  if (!isFollower && !isLeader) {
    throw createError({ statusCode: 403, message: "Access denied" });
  }

  ctx?.step("Fetching related transactions");
  // Get related transactions for this trade
  const transactions = await models.copyTradingTransaction.findAll({
    where: { tradeId: id },
    order: [["createdAt", "ASC"]],
  });

  ctx?.step("Fetching leader trade");
  // Get the leader's original trade if this is a follower trade
  let leaderTradeData: any = null;
  if ((trade as any).leaderTradeId) {
    const leaderTrade = await models.copyTradingTrade.findByPk((trade as any).leaderTradeId, {
      attributes: ["id", "symbol", "side", "type", "amount", "price", "cost", "status", "createdAt"],
    });
    if (leaderTrade) {
      leaderTradeData = leaderTrade.toJSON();
    }
  }

  ctx?.success("Trade details retrieved");
  return {
    ...(trade as any).toJSON(),
    transactions: transactions.map((t: any) => t.toJSON()),
    leaderTrade: leaderTradeData,
    viewerRole: isLeader ? "leader" : "follower",
  };
};
