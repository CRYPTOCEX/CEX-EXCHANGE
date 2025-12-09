import { models } from "@b/db";
import {
  aiMarketMakerUpdateSchema,
  aiMarketMakerStoreSchema,
} from "../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Update AI Market Maker configuration",
  operationId: "updateAiMarketMaker",
  tags: ["Admin", "AI Market Maker", "Market Maker"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: aiMarketMakerUpdateSchema,
      },
    },
  },
  responses: {
    200: aiMarketMakerStoreSchema,
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Market Maker"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ai.market-maker.market",
};

export default async (data: Handler) => {
  const { params, body } = data;

  const marketMaker = await models.aiMarketMaker.findByPk(params.id, {
    include: [{ model: models.aiMarketMakerPool, as: "pool" }],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  const {
    targetPrice,
    priceRangeLow,
    priceRangeHigh,
    aggressionLevel,
    maxDailyVolume,
    volatilityThreshold,
    pauseOnHighVolatility,
    realLiquidityPercent,
  } = body;

  // Validate price range if updating
  const newLow = priceRangeLow ?? marketMaker.priceRangeLow;
  const newHigh = priceRangeHigh ?? marketMaker.priceRangeHigh;
  const newTarget = targetPrice ?? marketMaker.targetPrice;

  if (newLow >= newHigh) {
    throw createError(400, "Price range low must be less than price range high");
  }

  if (newTarget < newLow || newTarget > newHigh) {
    throw createError(400, "Target price must be within the price range");
  }

  // Validate real liquidity percent if updating
  if (realLiquidityPercent !== undefined) {
    if (realLiquidityPercent < 0 || realLiquidityPercent > 100) {
      throw createError(400, "Real liquidity percent must be between 0 and 100");
    }
  }

  // Track changes for history
  const changes: Record<string, { old: any; new: any }> = {};

  if (targetPrice !== undefined && targetPrice !== marketMaker.targetPrice) {
    changes.targetPrice = { old: marketMaker.targetPrice, new: targetPrice };
  }
  if (priceRangeLow !== undefined && priceRangeLow !== marketMaker.priceRangeLow) {
    changes.priceRangeLow = { old: marketMaker.priceRangeLow, new: priceRangeLow };
  }
  if (priceRangeHigh !== undefined && priceRangeHigh !== marketMaker.priceRangeHigh) {
    changes.priceRangeHigh = { old: marketMaker.priceRangeHigh, new: priceRangeHigh };
  }
  if (aggressionLevel !== undefined && aggressionLevel !== marketMaker.aggressionLevel) {
    changes.aggressionLevel = { old: marketMaker.aggressionLevel, new: aggressionLevel };
  }
  if (realLiquidityPercent !== undefined && realLiquidityPercent !== marketMaker.realLiquidityPercent) {
    changes.realLiquidityPercent = { old: marketMaker.realLiquidityPercent, new: realLiquidityPercent };
  }

  // Update the market maker
  await marketMaker.update({
    ...(targetPrice !== undefined && { targetPrice }),
    ...(priceRangeLow !== undefined && { priceRangeLow }),
    ...(priceRangeHigh !== undefined && { priceRangeHigh }),
    ...(aggressionLevel !== undefined && { aggressionLevel }),
    ...(maxDailyVolume !== undefined && { maxDailyVolume }),
    ...(volatilityThreshold !== undefined && { volatilityThreshold }),
    ...(pauseOnHighVolatility !== undefined && { pauseOnHighVolatility }),
    ...(realLiquidityPercent !== undefined && { realLiquidityPercent }),
  });

  // Log changes if any
  if (Object.keys(changes).length > 0) {
    const pool = marketMaker.pool as any;
    await models.aiMarketMakerHistory.create({
      marketMakerId: marketMaker.id,
      action: targetPrice !== undefined ? "TARGET_CHANGE" : "CONFIG_CHANGE",
      details: changes,
      priceAtAction: newTarget,
      poolValueAtAction: pool?.totalValueLocked || 0,
    });
  }

  // Return updated market maker
  return models.aiMarketMaker.findByPk(params.id, {
    include: [
      { model: models.aiMarketMakerPool, as: "pool" },
      { model: models.ecosystemMarket, as: "market" },
    ],
  });
};
