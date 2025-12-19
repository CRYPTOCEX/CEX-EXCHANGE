import { models } from "@b/db";
import { targetPriceUpdateSchema } from "../../utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Update AI Market Maker market target price",
  operationId: "updateAiMarketMakerMarketTargetPrice",
  tags: ["Admin", "AI Market Maker", "Market"],
  description:
    "Updates the target price for an AI Market Maker market. Validates that the new target price falls within the configured price range, calculates percentage change from previous target, warns about large price changes (>5%), and logs the change to history with pool value at time of action.",
  logModule: "ADMIN_MM",
  logTitle: "Update Market Maker Target Price",
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
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("AI Market Maker Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ai.market-maker.market",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;
  const { targetPrice } = body;

  ctx?.step("Fetch market maker from database");
  const marketMaker = await models.aiMarketMaker.findByPk(params.id, {
    include: [{ model: models.aiMarketMakerPool, as: "pool" }],
  });

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  ctx?.step("Validate target price");
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

  ctx?.step("Update target price");
  // Update target price
  await marketMaker.update({ targetPrice });

  ctx?.step("Create history record for target price change");
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

  ctx?.success("Target price updated successfully");
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
