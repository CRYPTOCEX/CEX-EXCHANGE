import { models } from "@b/db";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Update bot status (pause/resume/cooldown)",
  operationId: "updateAiMarketMakerBotStatus",
  tags: ["Admin", "AI Market Maker", "Bot"],
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
      description: "ID of the bot",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["ACTIVE", "PAUSED", "COOLDOWN"],
              description: "New bot status",
            },
            cooldownMinutes: {
              type: "number",
              description: "Cooldown duration in minutes (for COOLDOWN status)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Bot status updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              status: { type: "string" },
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
  const { params, body } = data;
  const { status, cooldownMinutes } = body;

  const bot = await models.aiBot.findOne({
    where: {
      id: params.botId,
      marketMakerId: params.marketId,
    },
  });

  if (!bot) {
    throw createError(404, "Bot not found");
  }

  // Get market maker to check status
  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId);
  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  // Can only activate bots if market maker is active
  if (status === "ACTIVE" && marketMaker.status !== "ACTIVE") {
    throw createError(
      400,
      "Cannot activate bot when market maker is not active"
    );
  }

  const previousStatus = bot.status;

  // Update bot status
  await bot.update({ status });

  // Log the change
  await models.aiMarketMakerHistory.create({
    marketMakerId: params.marketId,
    action: status === "PAUSED" ? "PAUSE" : "RESUME",
    details: {
      botId: bot.id,
      botName: bot.name,
      previousStatus,
      newStatus: status,
      cooldownMinutes: status === "COOLDOWN" ? cooldownMinutes : undefined,
    },
    priceAtAction: marketMaker.targetPrice,
    poolValueAtAction: 0,
  });

  return {
    message: `Bot status updated to ${status}`,
    botId: bot.id,
    botName: bot.name,
    previousStatus,
    newStatus: status,
  };
};
