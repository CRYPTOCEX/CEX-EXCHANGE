import { models, sequelize } from "@b/db";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";
import {
  getOpenBotEcosystemOrderIds,
  deleteAiBotOrdersByMarket,
} from "../utils/scylla/queries";
import { MatchingEngine } from "@b/api/(ext)/ecosystem/utils/matchingEngine";
import { CacheManager } from "@b/utils/cache";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Emergency stop all AI Market Maker operations",
  operationId: "emergencyStopAllMarketMakers",
  tags: ["Admin", "AI Market Maker", "Emergency"],
  description:
    "Immediately stops all AI Market Maker operations across the platform. This emergency endpoint halts all active market makers, pauses all associated AI bots, disables the global AI Market Maker feature, and optionally cancels all open orders in the ecosystem. All actions are performed within a database transaction and logged to the market maker history. Manual intervention is required to resume operations after an emergency stop.",
  logModule: "ADMIN_MM",
  logTitle: "Emergency Stop All Operations",
  requestBody: {
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for emergency stop",
            },
            cancelOpenOrders: {
              type: "boolean",
              description: "Whether to cancel all open orders (default: true)",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Emergency stop executed successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              marketsStopped: { type: "number" },
              botsStopped: { type: "number" },
              ordersCancelled: { type: "number" },
              reason: { type: "string" },
              timestamp: { type: "string" },
              warning: { type: "string" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ai.market-maker.emergency",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const reason = body?.reason || "Emergency stop triggered by admin";
  const cancelOpenOrders = body?.cancelOpenOrders !== false;

  ctx?.step("Initialize database transaction");
  const transaction = await sequelize.transaction();

  try {
    ctx?.step("Fetch active markets and bots");
    // Get count of active markets before stopping
    const activeMarkets = await models.aiMarketMaker.findAll({
      where: { status: "ACTIVE" },
      include: [{ model: models.aiMarketMakerPool, as: "pool" }],
      transaction,
    });

    const activeBots = await models.aiBot.count({
      where: { status: "ACTIVE" },
      transaction,
    });

    ctx?.step("Stop all markets and bots");
    // Stop all markets
    await models.aiMarketMaker.update(
      { status: "STOPPED" },
      {
        where: {},
        transaction
      }
    );

    // Stop all bots
    await models.aiBot.update(
      { status: "PAUSED" },
      {
        where: {},
        transaction
      }
    );

    ctx?.step("Update global settings");
    // Update global settings via centralized settings store
    const cacheManager = CacheManager.getInstance();
    await cacheManager.updateSetting("aiMarketMakerGlobalPauseEnabled", true);
    await cacheManager.updateSetting("aiMarketMakerEnabled", false);

    ctx?.step("Create history records for all markets");
    // Log emergency stop for all markets in bulk (N+1 optimization)
    if (activeMarkets.length > 0) {
      const historyRecords = activeMarkets.map((market) => {
        const pool = (market as any).pool;
        return {
          marketMakerId: market.id,
          action: "EMERGENCY_STOP",
          details: {
            reason,
            previousStatus: market.status,
            triggeredBy: "admin",
            cancelledOrders: cancelOpenOrders,
          },
          priceAtAction: market.targetPrice,
          poolValueAtAction: pool?.totalValueLocked || 0,
        };
      });
      await models.aiMarketMakerHistory.bulkCreate(historyRecords, { transaction });
    }

    ctx?.step("Cancel all open orders");
    // Cancel all open AI bot orders in Scylla and ecosystem
    let ordersCancelled = 0;
    if (cancelOpenOrders) {
      // Get all active market makers with their market info
      const allMarketMakers = await models.aiMarketMaker.findAll({
        include: [{ model: models.ecosystemMarket, as: "market" }],
        transaction,
      });

      for (const maker of allMarketMakers) {
        const market = (maker as any).market;
        if (market) {
          const symbol = `${market.currency}/${market.pair}`;

          try {
            // Get all open ecosystem orders placed by bots for this symbol
            const openOrderIds = await getOpenBotEcosystemOrderIds(symbol);

            if (openOrderIds.length > 0) {
              // Cancel orders in parallel for better performance
              const matchingEngine = await MatchingEngine.getInstance();
              const cancelResults = await Promise.allSettled(
                openOrderIds.map((orderId) =>
                  matchingEngine.handleOrderCancellation(orderId, symbol)
                )
              );

              // Count successful cancellations
              for (const result of cancelResults) {
                if (result.status === "fulfilled") {
                  ordersCancelled++;
                } else {
                  logger.warn("AI_MM", "Failed to cancel order", result.reason);
                }
              }
            }

            // Delete all AI bot orders from Scylla
            await deleteAiBotOrdersByMarket(maker.marketId);

            logger.info("AI_MM", `Cleaned up orders for ${symbol}`);
          } catch (err) {
            logger.error("AI_MM", `Error cleaning up ${symbol}`, err);
          }
        }
      }
    }

    ctx?.step("Commit transaction");
    await transaction.commit();

    ctx?.success("Emergency stop executed successfully");
    return {
      message: "Emergency stop executed successfully",
      marketsStopped: activeMarkets.length,
      botsStopped: activeBots,
      ordersCancelled,
      reason,
      timestamp: new Date().toISOString(),
      warning:
        "All AI market maker operations have been stopped. Manual intervention required to resume.",
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
