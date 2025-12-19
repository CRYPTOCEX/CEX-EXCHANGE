// Update leader market settings (min amounts)
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog } from "@b/api/(ext)/copy-trading/utils";

export const metadata: OperationObject = {
  summary: "Update leader market settings",
  description:
    "Update settings for a market, such as minimum allocation amounts for base and quote currencies.",
  operationId: "updateLeaderMarket",
  tags: ["Copy Trading", "Leader"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Update leader market",
  parameters: [
    {
      name: "symbol",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "Market symbol (URL encoded, e.g., BTC%2FUSDT)",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            minBase: {
              type: "number",
              description: "Minimum base currency allocation amount",
            },
            minQuote: {
              type: "number",
              description: "Minimum quote currency allocation amount",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "Market updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
              symbol: { type: "string" },
              baseCurrency: { type: "string" },
              quoteCurrency: { type: "string" },
              minBase: { type: "number" },
              minQuote: { type: "number" },
              isActive: { type: "boolean" },
            },
          },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "Leader or Market not found" },
  },
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const symbol = decodeURIComponent(params.symbol);
  const { minBase, minQuote } = body;

  ctx?.step("Finding leader profile");
  const leader = await models.copyTradingLeader.findOne({
    where: { userId: user.id, status: "ACTIVE" },
  });

  if (!leader) {
    throw createError({
      statusCode: 404,
      message: "Active leader profile not found",
    });
  }

  const leaderId = (leader as any).id;

  ctx?.step("Finding market");
  const leaderMarket = await models.copyTradingLeaderMarket.findOne({
    where: { leaderId, symbol },
  });

  if (!leaderMarket) {
    throw createError({ statusCode: 404, message: "Market not found" });
  }

  const oldValues = {
    minBase: (leaderMarket as any).minBase,
    minQuote: (leaderMarket as any).minQuote,
  };

  ctx?.step("Updating market settings");
  const updateData: any = {};

  if (typeof minBase === "number" && minBase >= 0) {
    updateData.minBase = minBase;
  }
  if (typeof minQuote === "number" && minQuote >= 0) {
    updateData.minQuote = minQuote;
  }

  if (Object.keys(updateData).length === 0) {
    throw createError({
      statusCode: 400,
      message: "No valid fields to update",
    });
  }

  await leaderMarket.update(updateData);

  await createAuditLog({
    entityType: "LEADER",
    entityId: leaderId,
    action: "UPDATE",
    oldValue: oldValues,
    newValue: updateData,
    userId: user.id,
    reason: "Market settings updated",
  });

  ctx?.success("Market settings updated");
  return leaderMarket;
};
