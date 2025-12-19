import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseFuturesMarketSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a specific futures market",
  description: "Fetches details of a specific futures market.",
  operationId: "getFuturesMarket",
  tags: ["Futures", "Markets"],
  logModule: "FUTURES",
  logTitle: "Get futures market by ID",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Futures Market ID" },
    },
  ],
  responses: {
    200: {
      description: "Futures market details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseFuturesMarketSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Futures Market"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { params, ctx } = data;
  const { id } = params;

  ctx?.step?.(`Fetching futures market with ID: ${id}`);
  const market = await models.futuresMarket.findOne({
    where: { id },
    attributes: ["id", "currency", "pair", "status"],
  });

  if (!market) {
    ctx?.fail?.("Futures market not found");
    throw createError({ statusCode: 404, message: "Futures market not found" });
  }

  ctx?.success?.(`Retrieved futures market: ${market.currency}/${market.pair}`);
  return market;
};
