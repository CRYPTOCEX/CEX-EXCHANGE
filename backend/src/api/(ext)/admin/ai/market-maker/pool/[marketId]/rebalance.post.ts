import { models } from "@b/db";

import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Rebalance AI Market Maker pool assets",
  operationId: "rebalanceMarketMakerPool",
  tags: ["Admin", "AI Market Maker", "Pool"],
  description:
    "Rebalances the pool\'s asset allocation between base and quote currencies according to a target ratio. Can only be performed when the market maker is paused or stopped. The operation adjusts balances to match the specified ratio while maintaining total pool value.",
  logModule: "ADMIN_MM",
  logTitle: "Rebalance Market Maker Pool",
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
                "Target ratio of base currency value to total pool value (0-1, default 0.5 for 50/50 split)",
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
              message: {
                type: "string",
                description: "Success message",
              },
              rebalanceDetails: {
                type: "object",
                description: "Details of the rebalance operation",
                properties: {
                  targetRatio: {
                    type: "number",
                    description: "Target ratio used for rebalancing",
                  },
                  previousBaseBalance: {
                    type: "number",
                    description: "Base currency balance before rebalance",
                  },
                  previousQuoteBalance: {
                    type: "number",
                    description: "Quote currency balance before rebalance",
                  },
                  newBaseBalance: {
                    type: "number",
                    description: "Base currency balance after rebalance",
                  },
                  newQuoteBalance: {
                    type: "number",
                    description: "Quote currency balance after rebalance",
                  },
                  baseChange: {
                    type: "number",
                    description: "Change in base currency balance",
                  },
                  quoteChange: {
                    type: "number",
                    description: "Change in quote currency balance",
                  },
                  totalValue: {
                    type: "number",
                    description: "Total pool value in quote currency",
                  },
                },
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("AI Market Maker Pool"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ai.market-maker.pool",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;
  const targetRatio = body?.targetRatio ?? 0.5; // Default 50/50 split

  if (targetRatio < 0 || targetRatio > 1) {
    throw createError(400, "Target ratio must be between 0 and 1");
  }

  ctx?.step("Fetch market maker with pool");
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

  ctx?.step("Validate market maker is not active");
  // Check if market maker is paused or stopped
  if (marketMaker.status === "ACTIVE") {
    throw createError(
      400,
      "Cannot rebalance active market maker. Please pause it first."
    );
  }

  ctx?.step("Calculate new balances");
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

  ctx?.step("Update pool balances");
  // Update pool
  await pool.update({
    baseCurrencyBalance: newBaseBalance,
    quoteCurrencyBalance: newQuoteBalance,
    lastRebalanceAt: new Date(),
  });

  ctx?.step("Create history record for rebalance");
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

  ctx?.success("Pool rebalanced successfully");
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
