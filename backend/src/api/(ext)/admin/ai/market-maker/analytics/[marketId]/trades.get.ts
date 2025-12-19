import { models } from "@b/db";
import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata: OperationObject = {
  summary: "Get trade history for an AI Market Maker",
  operationId: "getAiMarketMakerTrades",
  tags: ["Admin", "AI Market Maker", "Analytics"],
  parameters: [
    {
      index: 0,
      name: "marketId",
      in: "path",
      required: true,
      description: "ID of the AI Market Maker",
      schema: { type: "string" },
    },
    ...crudParameters,
    {
      name: "startDate",
      in: "query",
      required: false,
      description: "Start date for trade history",
      schema: { type: "string", format: "date-time" },
    },
    {
      name: "endDate",
      in: "query",
      required: false,
      description: "End date for trade history",
      schema: { type: "string", format: "date-time" },
    },
    {
      name: "botId",
      in: "query",
      required: false,
      description: "Filter by specific bot ID",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Paginated trade history",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    timestamp: { type: "string" },
                    side: { type: "string" },
                    price: { type: "number" },
                    amount: { type: "number" },
                    botId: { type: "string" },
                    botName: { type: "string" },
                    pnl: { type: "number" },
                  },
                },
              },
              pagination: paginationSchema,
              summary: {
                type: "object",
                properties: {
                  totalTrades: { type: "number" },
                  totalVolume: { type: "number" },
                  avgPrice: { type: "number" },
                  totalPnL: { type: "number" },
                },
              },
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
  logModule: "ADMIN_AI",
  logTitle: "Get Market Maker Trades",
  permission: "view.ai.market-maker.analytics",
};

export default async (data: Handler) => {
  const { params, query, ctx } = data;
  const {
    page = 1,
    perPage = 20,
    startDate,
    endDate,
    botId,
  } = query;

  ctx?.step("Get Market Maker Trades");

  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId);

  if (!marketMaker) {
    throw createError(404, "AI Market Maker not found");
  }

  // Build where clause
  const where: any = {
    marketMakerId: params.marketId,
    action: "TRADE",
  };

  if (startDate) {
    where.createdAt = { ...where.createdAt, [Op.gte]: new Date(startDate) };
  }
  if (endDate) {
    where.createdAt = { ...where.createdAt, [Op.lte]: new Date(endDate) };
  }

  // Get trades from history
  const { count, rows: trades } = await models.aiMarketMakerHistory.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: Number(perPage),
    offset: (Number(page) - 1) * Number(perPage),
  });

  // Filter by botId if specified (from details JSON)
  let filteredTrades = trades;
  if (botId) {
    filteredTrades = trades.filter(
      (t: any) => t.details?.botId === botId
    );
  }

  // Transform trades
  const transformedTrades = filteredTrades.map((trade: any) => ({
    id: trade.id,
    timestamp: trade.createdAt,
    side: trade.details?.side || "UNKNOWN",
    price: trade.priceAtAction,
    amount: trade.details?.amount || 0,
    botId: trade.details?.botId || null,
    botName: trade.details?.botName || "Unknown",
    pnl: trade.details?.pnl || 0,
    type: trade.details?.type || "AI_ONLY",
  }));

  // Calculate summary
  let totalVolume = 0;
  let totalPnL = 0;
  let priceSum = 0;

  for (const trade of filteredTrades) {
    const details = (trade as any).details || {};
    totalVolume += details.amount || 0;
    totalPnL += details.pnl || 0;
    priceSum += Number((trade as any).priceAtAction) || 0;
  }

  const avgPrice = filteredTrades.length > 0 ? priceSum / filteredTrades.length : 0;

  // Pagination
  const totalPages = Math.ceil(count / Number(perPage));

  ctx?.success("Get Market Maker Trades retrieved successfully");
  return {
    data: transformedTrades,
    pagination: {
      currentPage: Number(page),
      perPage: Number(perPage),
      total: count,
      totalPages,
    },
    summary: {
      totalTrades: count,
      totalVolume,
      avgPrice,
      totalPnL,
    },
  };
};
