import { models } from "@b/db";
import { aiBotUpdateSchema, aiBotSchema } from "../../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Update AI Market Maker bot trading configuration",
  operationId: "updateMarketMakerBotConfig",
  tags: ["Admin", "AI Market Maker", "Bot"],
  description:
    "Updates the trading configuration parameters for a specific AI bot. Supports modifying risk tolerance, trade frequency, order size settings, and daily trade limits. All configuration changes are tracked in the market maker history with before/after values.",
  logModule: "ADMIN_MM",
  logTitle: "Update Bot Configuration",
  parameters: [
    {
      index: 0,
      name: "marketId",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker",
      schema: { type: "string" },
    },
    {
      index: 1,
      name: "botId",
      in: "path",
      required: true,
      description: "ID of the bot to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: aiBotUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Bot configuration updated successfully with change details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
              bot: {
                type: "object",
                description: "Updated bot configuration",
                properties: aiBotSchema,
              },
              changesApplied: {
                type: "number",
                description: "Number of configuration fields that were changed",
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid configuration parameters",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Error message (e.g., risk tolerance out of range)",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Bot"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ai.market-maker.bot",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;

  ctx?.step("Fetch bot from database");
  const bot = await models.aiBot.findOne({
    where: {
      id: params.botId,
      marketMakerId: params.marketId,
    },
  });

  if (!bot) {
    throw createError(404, "Bot not found");
  }

  const {
    riskTolerance,
    tradeFrequency,
    avgOrderSize,
    orderSizeVariance,
    preferredSpread,
    maxDailyTrades,
  } = body;

  ctx?.step("Validate bot configuration parameters");
  // Validate risk tolerance
  if (riskTolerance !== undefined) {
    if (riskTolerance < 0 || riskTolerance > 1) {
      throw createError(400, "Risk tolerance must be between 0 and 1");
    }
  }

  // Validate order size variance (max 0.5 = 50% variance is reasonable)
  if (orderSizeVariance !== undefined) {
    if (orderSizeVariance < 0 || orderSizeVariance > 0.5) {
      throw createError(400, "Order size variance must be between 0 and 0.5 (50%)");
    }
  }

  ctx?.step("Track configuration changes");
  // Track changes
  const changes: Record<string, { old: any; new: any }> = {};

  if (riskTolerance !== undefined && riskTolerance !== bot.riskTolerance) {
    changes.riskTolerance = { old: bot.riskTolerance, new: riskTolerance };
  }
  if (tradeFrequency !== undefined && tradeFrequency !== bot.tradeFrequency) {
    changes.tradeFrequency = { old: bot.tradeFrequency, new: tradeFrequency };
  }
  if (avgOrderSize !== undefined && avgOrderSize !== Number(bot.avgOrderSize)) {
    changes.avgOrderSize = { old: bot.avgOrderSize, new: avgOrderSize };
  }
  if (maxDailyTrades !== undefined && maxDailyTrades !== bot.maxDailyTrades) {
    changes.maxDailyTrades = { old: bot.maxDailyTrades, new: maxDailyTrades };
  }

  ctx?.step("Update bot configuration");
  // Update bot
  await bot.update({
    ...(riskTolerance !== undefined && { riskTolerance }),
    ...(tradeFrequency !== undefined && { tradeFrequency }),
    ...(avgOrderSize !== undefined && { avgOrderSize }),
    ...(orderSizeVariance !== undefined && { orderSizeVariance }),
    ...(preferredSpread !== undefined && { preferredSpread }),
    ...(maxDailyTrades !== undefined && { maxDailyTrades }),
  });

  // Log changes if any
  if (Object.keys(changes).length > 0) {
    ctx?.step("Create history record for configuration changes");
    const marketMaker = await models.aiMarketMaker.findByPk(params.marketId);
    await models.aiMarketMakerHistory.create({
      marketMakerId: params.marketId,
      action: "CONFIG_CHANGE",
      details: {
        botId: bot.id,
        botName: bot.name,
        changes,
      },
      priceAtAction: marketMaker?.targetPrice || 0,
      poolValueAtAction: 0,
    });
  }

  ctx?.step("Fetch updated bot data");
  // Return updated bot
  const updatedBot = await models.aiBot.findByPk(params.botId);

  ctx?.success("Bot configuration updated successfully");
  return {
    message: "Bot configuration updated successfully",
    bot: updatedBot,
    changesApplied: Object.keys(changes).length,
  };
};
