import { models } from "@b/db";
import { targetPriceUpdateSchema } from "../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Update AI Market Maker target price",
  operationId: "updateAiMarketMakerTargetPrice",
  tags: ["Admin", "AI Market Maker", "Market Maker"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: targetPriceUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Target price updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              previousTarget: { type: "number" },
              newTarget: { type: "number" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("AI Market Maker"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ai.market-maker.market",
};

export default async (data: Handler) => {
  const { params, body } = data;
  const { targetPrice } = body;

  const marketMaker = await models.aiMarketMaker.findByPk(params.id, {
    include: [{ model: models.aiMarketMakerPool, as: "pool" }],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  // Validate target price is within range
  if (
    targetPrice < Number(marketMaker.priceRangeLow) ||
    targetPrice > Number(marketMaker.priceRangeHigh)
  ) {
    throw createError(
      400,
      `Target price must be within range: ${marketMaker.priceRangeLow} - ${marketMaker.priceRangeHigh}`
    );
  }

  // Calculate percentage change
  const previousTarget = Number(marketMaker.targetPrice);
  const percentChange = ((targetPrice - previousTarget) / previousTarget) * 100;

  // Warn if large change (but still allow)
  const isLargeChange = Math.abs(percentChange) > 5;

  // Update target price
  await marketMaker.update({ targetPrice });

  // Log change
  const pool = marketMaker.pool as any;
  await models.aiMarketMakerHistory.create({
    marketMakerId: marketMaker.id,
    action: "TARGET_CHANGE",
    details: {
      previousTarget,
      newTarget: targetPrice,
      percentChange: percentChange.toFixed(2),
      isLargeChange,
    },
    priceAtAction: targetPrice,
    poolValueAtAction: pool?.totalValueLocked || 0,
  });

  return {
    message: "Target price updated successfully",
    previousTarget,
    newTarget: targetPrice,
    percentChange: percentChange.toFixed(2),
    warning: isLargeChange
      ? `Large price change detected (${percentChange.toFixed(2)}%). Monitor closely.`
      : undefined,
  };
};
