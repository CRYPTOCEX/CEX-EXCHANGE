import { models } from "@b/db";
import { Op } from "sequelize";
import { deleteAllMarketData } from "@b/api/(ext)/ecosystem/utils/scylla/queries";
import {
  deleteRecordParams,
  handleSingleDelete,
} from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Deletes a specific ecosystem market",
  description:
    "Deletes a single ecosystem market by its ID. This operation also removes all associated market data from the database for the market. The market is permanently deleted (force delete).",
  operationId: "deleteEcosystemMarket",
  tags: ["Admin", "Ecosystem", "Market"],
  parameters: deleteRecordParams("Ecosystem Market"),
  responses: {
    200: {
      description: "Market deleted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Ecosystem Market"),
    500: serverErrorResponse,
  },
  permission: "delete.ecosystem.market",
  requiresAuth: true,
  logModule: "ADMIN_ECO",
  logTitle: "Delete market",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;

  ctx?.step("Fetching market details");
  // Fetch the market currency and pair before deletion
  const market = await models.ecosystemMarket.findOne({
    where: { id: params.id },
    attributes: ["currency", "pair"],
    paranoid: false,
  });

  if (!market) {
    throw new Error("Market not found");
  }

  const currency = market.currency;
  const pair = (market as any).pair;
  const symbol = `${currency}/${pair}`;

  // Check for open copy trading trades on this market
  ctx?.step("Checking for open copy trading trades");
  try {
    const openCopyTrades = await models.copyTradingTrade?.count({
      where: {
        symbol,
        status: { [Op.in]: ["PENDING", "OPEN", "PARTIALLY_FILLED"] },
      },
    });

    if (openCopyTrades && openCopyTrades > 0) {
      throw createError({
        statusCode: 400,
        message: `Cannot delete market with ${openCopyTrades} open copy trading trades. Please close or cancel all copy trades first.`,
      });
    }
  } catch (error: any) {
    // If copy trading model doesn't exist, skip the check
    if (!error.message?.includes("copy trading")) {
      throw error;
    }
  }

  const postDelete = async () => {
    ctx?.step("Deleting market data from database");
    await deleteAllMarketData(currency);

    // Clean up copy trading data for this market (deactivate allocations and leader markets)
    ctx?.step("Cleaning up copy trading data");
    try {
      // Deactivate all follower allocations for this market
      await models.copyTradingFollowerAllocation?.update(
        { isActive: false },
        { where: { symbol } }
      );

      // Deactivate all leader markets for this symbol
      await models.copyTradingLeaderMarket?.update(
        { isActive: false },
        { where: { symbol } }
      );
    } catch (e) {
      // Copy trading module may not be installed, ignore errors
    }
  };

  ctx?.step("Deleting market record");
  const result = await handleSingleDelete({
    model: "ecosystemMarket",
    id: params.id,
    query: { ...query, force: true as any },
    postDelete,
  });

  ctx?.success("Market deleted successfully");
  return result;
};
