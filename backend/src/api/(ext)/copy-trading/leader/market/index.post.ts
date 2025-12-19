import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { createAuditLog } from "@b/api/(ext)/copy-trading/utils";

export const metadata: OperationObject = {
  summary: "Add a market for leader to trade",
  description: "Declares a new market that the leader will trade on. Followers will need to provide liquidity for this market.",
  operationId: "addLeaderMarket",
  tags: ["Copy Trading", "Leader"],
  requiresAuth: true,
  logModule: "COPY",
  logTitle: "Add leader market",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Market symbol (e.g., BTC/USDT)",
            },
            minBase: {
              type: "number",
              description: "Minimum base currency allocation amount",
            },
            minQuote: {
              type: "number",
              description: "Minimum quote currency allocation amount",
            },
          },
          required: ["symbol"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Market added successfully",
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
  const { user, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { symbol, minBase, minQuote } = body;

  if (!symbol || typeof symbol !== "string") {
    throw createError({ statusCode: 400, message: "Symbol is required" });
  }

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

  ctx?.step("Parsing symbol");
  // Parse symbol
  const parts = symbol.split("/");
  if (parts.length !== 2) {
    throw createError({
      statusCode: 400,
      message: "Invalid symbol format. Use BASE/QUOTE (e.g., BTC/USDT)",
    });
  }
  const [baseCurrency, quoteCurrency] = parts;

  ctx?.step("Validating market exists");
  // Validate market exists in ecosystem
  const market = await models.ecosystemMarket.findOne({
    where: { currency: baseCurrency, pair: quoteCurrency, status: true },
  });

  if (!market) {
    throw createError({
      statusCode: 400,
      message: `Market ${symbol} not found or inactive`,
    });
  }

  ctx?.step("Checking existing market");
  // Check if already exists
  const existing = await models.copyTradingLeaderMarket.findOne({
    where: { leaderId: (leader as any).id, symbol },
  });

  if (existing) {
    if ((existing as any).isActive) {
      throw createError({ statusCode: 400, message: "Market already added" });
    }
    // Reactivate
    ctx?.step("Reactivating market");
    await existing.update({
      isActive: true,
      minBase: minBase ?? (existing as any).minBase,
      minQuote: minQuote ?? (existing as any).minQuote,
    });

    await createAuditLog({
      entityType: "LEADER",
      entityId: (leader as any).id,
      action: "UPDATE",
      oldValue: { symbol, isActive: false },
      newValue: { symbol, isActive: true, minBase, minQuote },
      userId: user.id,
      reason: "Market reactivated",
    });

    ctx?.success("Market reactivated");
    return existing;
  }

  ctx?.step("Creating market");
  // Create new
  const leaderMarket = await models.copyTradingLeaderMarket.create({
    leaderId: (leader as any).id,
    symbol,
    baseCurrency,
    quoteCurrency,
    minBase: minBase || 0,
    minQuote: minQuote || 0,
    isActive: true,
  });

  await createAuditLog({
    entityType: "LEADER",
    entityId: (leader as any).id,
    action: "UPDATE",
    newValue: { symbol, baseCurrency, quoteCurrency },
    userId: user.id,
    reason: "Market added",
  });

  ctx?.success("Market added");
  return leaderMarket;
};
