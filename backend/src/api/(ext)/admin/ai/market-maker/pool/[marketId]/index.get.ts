import { models } from "@b/db";
import { aiMarketMakerPoolSchema } from "../../utils";
import {
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Get AI Market Maker pool details",
  operationId: "getMarketMakerPool",
  tags: ["Admin", "AI Market Maker", "Pool"],
  description:
    "Retrieves detailed information about an AI Market Maker pool, including current balances, total value locked (TVL), and profit/loss summary. Returns pool status with market information and calculated P&L metrics.",
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
      description: "Pool details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ...aiMarketMakerPoolSchema,
              market: {
                type: "object",
                description: "Associated ecosystem market information",
              },
              marketMakerStatus: {
                type: "string",
                description: "Current status of the market maker",
                enum: ["ACTIVE", "PAUSED", "STOPPED"],
              },
              pnlSummary: {
                type: "object",
                description: "Profit and loss summary",
                properties: {
                  unrealizedPnL: {
                    type: "number",
                    description: "Unrealized profit/loss",
                  },
                  realizedPnL: {
                    type: "number",
                    description: "Realized profit/loss",
                  },
                  totalPnL: {
                    type: "number",
                    description: "Total profit/loss (realized + unrealized)",
                  },
                  pnlPercent: {
                    type: "string",
                    description: "P&L as percentage of initial investment",
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("AI Market Maker Pool"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  logModule: "ADMIN_AI",
  logTitle: "Get Market Maker Pool",
  permission: "view.ai.market-maker.pool",
};

export default async (data: Handler) => {
  const { params, ctx } = data;

  ctx?.step("Get Market Maker Pool");

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

  ctx?.success("Get Market Maker Pool retrieved successfully");
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
