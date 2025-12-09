import { models } from "@b/db";
import { aiMarketMakerPoolStoreSchema } from "../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Rebalance AI Market Maker pool",
  operationId: "rebalanceAiMarketMakerPool",
  tags: ["Admin", "AI Market Maker", "Pool"],
  parameters: [
    {
      index: 0,
      name: "marketId",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: false,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            targetRatio: {
              type: "number",
              description:
                "Target ratio of base to quote (0.5 = 50/50, default)",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Pool rebalanced successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              rebalanceDetails: {
                type: "object",
                properties: {
                  previousBaseBalance: { type: "number" },
                  previousQuoteBalance: { type: "number" },
                  newBaseBalance: { type: "number" },
                  newQuoteBalance: { type: "number" },
                  tradesExecuted: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Market Maker Pool"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ai.market-maker.pool",
};

export default async (data: Handler) => {
  const { params, body } = data;
  const targetRatio = body?.targetRatio ?? 0.5; // Default 50/50 split

  if (targetRatio < 0 || targetRatio > 1) {
    throw createError(400, "Target ratio must be between 0 and 1");
  }

  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId, {
    include: [
      {
        model: models.aiMarketMakerPool,
        as: "pool",
      },
    ],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  const pool = marketMaker.pool as any;
  if (!pool) {
    throw createError(404, "Pool not found for this market maker");
  }

  // Check if market maker is paused or stopped
  if (marketMaker.status === "ACTIVE") {
    throw createError(
      400,
      "Cannot rebalance active market maker. Please pause it first."
    );
  }

  const targetPrice = Number(marketMaker.targetPrice);
  const currentBaseBalance = Number(pool.baseCurrencyBalance);
  const currentQuoteBalance = Number(pool.quoteCurrencyBalance);

  // Calculate total value in quote currency
  const totalValueInQuote =
    currentBaseBalance * targetPrice + currentQuoteBalance;

  if (totalValueInQuote <= 0) {
    throw createError(400, "Pool has no value to rebalance");
  }

  // Calculate target balances
  // targetRatio is the ratio of base value to total value
  const targetBaseValueInQuote = totalValueInQuote * targetRatio;
  const targetQuoteValue = totalValueInQuote * (1 - targetRatio);

  const newBaseBalance = targetBaseValueInQuote / targetPrice;
  const newQuoteBalance = targetQuoteValue;

  // Calculate what trades would be needed
  const baseChange = newBaseBalance - currentBaseBalance;
  const quoteChange = newQuoteBalance - currentQuoteBalance;

  // In a real implementation, this would execute actual trades
  // For now, we just update the balances (simulated rebalance)

  // Update pool
  await pool.update({
    baseCurrencyBalance: newBaseBalance,
    quoteCurrencyBalance: newQuoteBalance,
    lastRebalanceAt: new Date(),
  });

  // Log rebalance
  await models.aiMarketMakerHistory.create({
    marketMakerId: marketMaker.id,
    action: "REBALANCE",
    details: {
      targetRatio,
      previousBaseBalance: currentBaseBalance,
      previousQuoteBalance: currentQuoteBalance,
      newBaseBalance,
      newQuoteBalance,
      baseChange,
      quoteChange,
      priceUsed: targetPrice,
    },
    priceAtAction: marketMaker.targetPrice,
    poolValueAtAction: totalValueInQuote,
  });

  return {
    message: "Pool rebalanced successfully",
    rebalanceDetails: {
      targetRatio,
      previousBaseBalance: currentBaseBalance,
      previousQuoteBalance: currentQuoteBalance,
      newBaseBalance,
      newQuoteBalance,
      baseChange,
      quoteChange,
      totalValue: totalValueInQuote,
    },
  };
};
