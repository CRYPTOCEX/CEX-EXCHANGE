import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog } from "@b/api/(ext)/copy-trading/utils";
import { Op } from "sequelize";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Remove a market from leader's list",
  description: "Deactivates a market from the leader's declared trading markets. Cannot remove markets with open positions. Followers' allocations for this market will be deactivated.",
  operationId: "removeLeaderMarket",
  tags: ["Copy Trading", "Leader"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Remove leader market",
  parameters: [
    {
      name: "symbol",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Market symbol (URL encoded, e.g., BTC%2FUSDT)",
    },
  ],
  responses: {
    200: {
      description: "Market removed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              deactivatedAllocations: { type: "number" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request - Has open positions" },
    401: { description: "Unauthorized" },
    404: { description: "Leader or Market not found" },
  },
};

export default async (data: Handler) => {
  const { user, params, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const symbol = decodeURIComponent(params.symbol);

  ctx?.step("Finding leader profile");
  const leader = await models.copyTradingLeader.findOne({
    where: { userId: user.id },
  });

  if (!leader) {
    throw createError({ statusCode: 404, message: "Leader not found" });
  }

  const leaderId = (leader as any).id;

  ctx?.step("Checking for open positions");
  // Check for open positions (both leader and follower trades)
  const openTrades = await models.copyTradingTrade.count({
    where: {
      leaderId,
      symbol,
      status: { [Op.in]: ["OPEN", "PENDING", "PARTIALLY_FILLED"] },
    },
  });

  if (openTrades > 0) {
    throw createError({
      statusCode: 400,
      message: `Cannot remove market with ${openTrades} open positions. Please close all trades first.`,
    });
  }

  ctx?.step("Finding market");
  const leaderMarket = await models.copyTradingLeaderMarket.findOne({
    where: { leaderId, symbol },
  });

  if (!leaderMarket) {
    throw createError({ statusCode: 404, message: "Market not found" });
  }

  ctx?.step("Deactivating market");
  await leaderMarket.update({ isActive: false });

  // Deactivate all follower allocations for this market under this leader
  ctx?.step("Deactivating follower allocations");
  let deactivatedAllocations = 0;
  try {
    // Get all followers of this leader
    const followers = await models.copyTradingFollower.findAll({
      where: { leaderId },
      attributes: ["id"],
    });

    const followerIds = followers.map((f: any) => f.id);

    if (followerIds.length > 0) {
      // Deactivate allocations for this symbol
      const [affectedCount] = await models.copyTradingFollowerAllocation.update(
        { isActive: false },
        {
          where: {
            followerId: { [Op.in]: followerIds },
            symbol,
            isActive: true,
          },
        }
      );
      deactivatedAllocations = affectedCount;

      if (deactivatedAllocations > 0) {
        logger.info(
          "COPY_TRADING",
          `Deactivated ${deactivatedAllocations} follower allocations for ${symbol} when leader ${leaderId} removed market`
        );
      }
    }
  } catch (error: any) {
    logger.error("COPY_TRADING", `Error deactivating follower allocations: ${error.message}`);
    // Don't fail the operation, just log the error
  }

  await createAuditLog({
    entityType: "LEADER",
    entityId: leaderId,
    action: "UPDATE",
    oldValue: { symbol, isActive: true },
    newValue: { symbol, isActive: false, deactivatedAllocations },
    userId: user.id,
    reason: "Market removed",
  });

  ctx?.success("Market removed");
  return {
    success: true,
    message: `Market removed successfully. ${deactivatedAllocations} follower allocation(s) deactivated.`,
    deactivatedAllocations,
  };
};
