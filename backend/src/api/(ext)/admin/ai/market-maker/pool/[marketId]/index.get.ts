import { models } from "@b/db";
import { aiMarketMakerPoolSchema } from "../../utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Get AI Market Maker pool status",
  operationId: "getAiMarketMakerPool",
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
  responses: {
    200: {
      description: "Pool status and balances",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...aiMarketMakerPoolSchema,
              market: {
                type: "object",
                description: "Market information",
              },
              pnlSummary: {
                type: "object",
                properties: {
                  unrealizedPnL: { type: "number" },
                  realizedPnL: { type: "number" },
                  totalPnL: { type: "number" },
                  pnlPercent: { type: "number" },
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
  permission: "view.ai.market-maker.pool",
};

export default async (data: Handler) => {
  const { params } = data;

  const marketMaker = await models.aiMarketMaker.findByPk(params.marketId, {
    include: [
      {
        model: models.aiMarketMakerPool,
        as: "pool",
      },
      {
        model: models.ecosystemMarket,
        as: "market",
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

  // Calculate P&L summary
  const unrealizedPnL = Number(pool.unrealizedPnL);
  const realizedPnL = Number(pool.realizedPnL);
  const totalPnL = unrealizedPnL + realizedPnL;
  const initialValue =
    Number(pool.initialBaseBalance) + Number(pool.initialQuoteBalance);
  const pnlPercent = initialValue > 0 ? (totalPnL / initialValue) * 100 : 0;

  return {
    ...pool.toJSON(),
    market: marketMaker.market,
    marketMakerStatus: marketMaker.status,
    pnlSummary: {
      unrealizedPnL,
      realizedPnL,
      totalPnL,
      pnlPercent: pnlPercent.toFixed(2),
    },
  };
};
