import { models, sequelize } from "@b/db";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";
import {
  cleanupMarketMakerData,
  getOpenBotEcosystemOrderIds,
} from "../../utils/scylla/queries";
import { MatchingEngine } from "@b/api/(ext)/ecosystem/utils/matchingEngine";
import { getWalletByUserIdAndCurrency } from "@b/api/(ext)/ecosystem/utils/wallet";
import MarketMakerEngine from "../../utils/engine/MarketMakerEngine";

export const metadata: OperationObject = {
  summary: "Delete AI Market Maker market",
  operationId: "deleteAiMarketMakerMarket",
  tags: ["Admin", "AI Market Maker", "Market"],
  description:
    "Permanently deletes an AI Market Maker market. Automatically stops the market if active, cancels all open ecosystem orders, withdraws remaining pool balances to admin wallet, cleans up all ScyllaDB and MySQL data including trade history, and creates withdrawal transaction records. This operation cannot be undone.",
  logModule: "ADMIN_MM",
  logTitle: "Delete AI Market Maker",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker to delete",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "AI Market Maker deleted successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              withdrawal: {
                type: "object",
                properties: {
                  baseAmount: { type: "number" },
                  quoteAmount: { type: "number" },
                  baseCurrency: { type: "string" },
                  quoteCurrency: { type: "string" },
                },
              },
              cleanup: {
                type: "object",
                properties: {
                  ordersDeleted: { type: "number" },
                  tradesDeleted: { type: "number" },
                  priceHistoryDeleted: { type: "number" },
                  realLiquidityOrdersDeleted: { type: "number" },
                  orderbookEntriesCleared: { type: "number" },
                  ecosystemOrdersCancelled: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("AI Market Maker Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "delete.ai.market-maker.market",
};

export default async (data: Handler) => {
  const { params, user, ctx } = data;

  if (!user?.id) {
    throw createError(401, "Unauthorized");
  }

  ctx?.step("Fetch market maker with related data");
  const marketMaker = await models.aiMarketMaker.findByPk(params.id, {
    include: [
      { model: models.aiMarketMakerPool, as: "pool" },
      { model: models.aiBot, as: "bots" },
      { model: models.ecosystemMarket, as: "market" },
    ],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  const marketMakerAny = marketMaker as any;
  const pool = marketMakerAny.pool;
  const market = marketMakerAny.market;
  const symbol = market ? `${market.currency}/${market.pair}` : null;
  const ecosystemMarketId = marketMakerAny.marketId;

  ctx?.step("Stop market maker if active");
  // ============================================
  // Step 1: Stop market maker if active (with proper engine sync)
  // ============================================
  if (marketMaker.status === "ACTIVE" || marketMaker.status === "PAUSED") {
    // First, try to stop through the engine if it's running
    const engine = MarketMakerEngine;
    const marketManager = engine.getMarketManager();

    if (marketManager && marketManager.isMarketActive(params.id)) {
      logger.info("AI_MM", `Delete: Stopping market maker ${params.id} through engine...`);

      // Stop the market through the engine (this properly cancels orders and cleans up)
      const stopped = await marketManager.stopMarket(params.id);

      if (!stopped) {
        logger.warn("AI_MM", `Delete: Engine stopMarket returned false, forcing stop...`);
      }

      // Wait for engine to acknowledge shutdown with timeout
      const maxWaitMs = 10000; // 10 seconds max
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        const status = marketManager.getMarketStatus(params.id);
        if (!status || status === "STOPPED") {
          logger.info("AI_MM", `Delete: Engine confirmed market stopped`);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Update database status regardless
    await marketMaker.update({ status: "STOPPED" });
    logger.info("AI_MM", `Delete: Stopped market maker ${params.id}`);
  }

  ctx?.step("Cancel open ecosystem orders");
  // ============================================
  // Step 2: Cancel any open ecosystem orders placed by bots
  // This returns locked funds back to the pool
  // ============================================
  let ecosystemOrdersCancelled = 0;
  let failedCancellations: { orderId: string; error: string }[] = [];
  let totalOrdersFound = 0;

  if (symbol) {
    try {
      const openOrderIds = await getOpenBotEcosystemOrderIds(symbol);
      totalOrdersFound = openOrderIds.length;

      if (openOrderIds.length > 0) {
        const matchingEngine = await MatchingEngine.getInstance();

        // Cancel orders in parallel for better performance
        const cancelResults = await Promise.allSettled(
          openOrderIds.map((orderId) =>
            matchingEngine.handleOrderCancellation(orderId, symbol)
              .then(() => ({ orderId, success: true }))
              .catch((err) => ({ orderId, success: false, error: err.message || String(err) }))
          )
        );

        // Process results
        for (const result of cancelResults) {
          if (result.status === "fulfilled") {
            const { orderId, success, error } = result.value as { orderId: string; success: boolean; error?: string };
            if (success) {
              ecosystemOrdersCancelled++;
            } else if (error) {
              failedCancellations.push({ orderId, error });
            }
          } else {
            // Promise itself rejected (shouldn't happen with our wrapper, but just in case)
            logger.warn("AI_MM", `Delete: Order cancellation promise rejected: ${result.reason}`);
          }
        }

        logger.info("AI_MM", `Delete: Cancelled ${ecosystemOrdersCancelled}/${totalOrdersFound} orders for ${symbol}`);

        if (failedCancellations.length > 0) {
          logger.warn("AI_MM", `Delete: Failed to cancel ${failedCancellations.length} orders: ${failedCancellations.map((f) => f.orderId).join(", ")}`);
        }
      }
    } catch (error) {
      logger.error("AI_MM", `Delete: Failed to cancel orders: ${error}`);
    }
  }

  ctx?.step("Auto-withdraw pool balances to admin wallet");
  // ============================================
  // Step 3: Auto-withdraw all pool balances to admin wallet
  // ============================================
  let withdrawal = {
    baseAmount: 0,
    quoteAmount: 0,
    baseCurrency: market?.currency || "UNKNOWN",
    quoteCurrency: market?.pair || "UNKNOWN",
  };

  if (pool && market) {
    const baseBalance = Number(pool.baseCurrencyBalance) || 0;
    const quoteBalance = Number(pool.quoteCurrencyBalance) || 0;

    // Withdraw base currency if any
    if (baseBalance > 0) {
      try {
        const baseWallet = await getWalletByUserIdAndCurrency(user.id, market.currency);
        if (baseWallet) {
          const currentBalance = Number(baseWallet.balance || 0);
          await models.wallet.update(
            { balance: currentBalance + baseBalance },
            { where: { id: baseWallet.id } }
          );
          withdrawal.baseAmount = baseBalance;
          logger.info("AI_MM", `Delete: Withdrawn ${baseBalance} ${market.currency} to admin wallet`);
        } else {
          logger.warn("AI_MM", `Delete: Admin wallet not found for ${market.currency}, funds will be lost`);
        }
      } catch (error) {
        logger.error("AI_MM", `Delete: Failed to withdraw base currency: ${error}`);
      }
    }

    // Withdraw quote currency if any
    if (quoteBalance > 0) {
      try {
        const quoteWallet = await getWalletByUserIdAndCurrency(user.id, market.pair);
        if (quoteWallet) {
          const currentBalance = Number(quoteWallet.balance || 0);
          await models.wallet.update(
            { balance: currentBalance + quoteBalance },
            { where: { id: quoteWallet.id } }
          );
          withdrawal.quoteAmount = quoteBalance;
          logger.info("AI_MM", `Delete: Withdrawn ${quoteBalance} ${market.pair} to admin wallet`);
        } else {
          logger.warn("AI_MM", `Delete: Admin wallet not found for ${market.pair}, funds will be lost`);
        }
      } catch (error) {
        logger.error("AI_MM", `Delete: Failed to withdraw quote currency: ${error}`);
      }
    }
  }

  ctx?.step("Clean up ScyllaDB data");
  // ============================================
  // Step 4: Clean up ScyllaDB data
  // ============================================
  let cleanupStats = {
    ordersDeleted: 0,
    tradesDeleted: 0,
    priceHistoryDeleted: 0,
    realLiquidityOrdersDeleted: 0,
    orderbookEntriesCleared: 0,
  };

  if (ecosystemMarketId && symbol) {
    try {
      cleanupStats = await cleanupMarketMakerData(ecosystemMarketId, symbol);
    } catch (error) {
      logger.error("AI_MM", `Delete: ScyllaDB cleanup failed: ${error}`);
      // Continue with MySQL cleanup even if ScyllaDB cleanup fails
    }
  }

  ctx?.step("Clean up MySQL data");
  // ============================================
  // Step 5: Clean up MySQL data in transaction
  // ============================================
  const transaction = await sequelize.transaction();

  try {
    // Create withdrawal transaction records if funds were withdrawn
    if (withdrawal.baseAmount > 0) {
      const baseWallet = await getWalletByUserIdAndCurrency(user.id, market.currency);
      if (baseWallet) {
        await models.transaction.create({
          userId: user.id,
          walletId: baseWallet.id,
          type: "AI_INVESTMENT_ROI",
          status: "COMPLETED",
          amount: withdrawal.baseAmount,
          fee: 0,
          description: `Auto-withdraw ${withdrawal.baseAmount} ${market.currency} from deleted AI Market Maker Pool`,
          metadata: JSON.stringify({
            poolId: pool?.id,
            marketMakerId: marketMaker.id,
            marketSymbol: symbol,
            action: "DELETE_WITHDRAW",
          }),
        }, { transaction });
      }
    }

    if (withdrawal.quoteAmount > 0) {
      const quoteWallet = await getWalletByUserIdAndCurrency(user.id, market.pair);
      if (quoteWallet) {
        await models.transaction.create({
          userId: user.id,
          walletId: quoteWallet.id,
          type: "AI_INVESTMENT_ROI",
          status: "COMPLETED",
          amount: withdrawal.quoteAmount,
          fee: 0,
          description: `Auto-withdraw ${withdrawal.quoteAmount} ${market.pair} from deleted AI Market Maker Pool`,
          metadata: JSON.stringify({
            poolId: pool?.id,
            marketMakerId: marketMaker.id,
            marketSymbol: symbol,
            action: "DELETE_WITHDRAW",
          }),
        }, { transaction });
      }
    }

    // Delete bots
    await models.aiBot.destroy({
      where: { marketMakerId: marketMaker.id },
      transaction,
    });

    // Delete pool
    await models.aiMarketMakerPool.destroy({
      where: { marketMakerId: marketMaker.id },
      transaction,
    });

    // Delete history records for this market maker
    await models.aiMarketMakerHistory.destroy({
      where: { marketMakerId: marketMaker.id },
      transaction,
    });

    // Hard delete market maker
    await marketMaker.destroy({ transaction });

    await transaction.commit();

    ctx?.success("AI Market Maker deleted successfully");
    return {
      message: "AI Market Maker deleted successfully",
      withdrawal: {
        baseAmount: withdrawal.baseAmount,
        quoteAmount: withdrawal.quoteAmount,
        baseCurrency: withdrawal.baseCurrency,
        quoteCurrency: withdrawal.quoteCurrency,
      },
      cleanup: {
        ...cleanupStats,
        ecosystemOrdersCancelled,
        totalOrdersFound,
        failedCancellations: failedCancellations.length > 0 ? failedCancellations : undefined,
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
