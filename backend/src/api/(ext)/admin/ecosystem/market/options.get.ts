import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves a list of exchange markets",
  description:
    "This endpoint retrieves active exchange markets formatted as options for UI selection.",
  operationId: "getExchangeMarketOptions",
  tags: ["Exchange", "Market"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Exchange markets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("ExchangeMarket"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) throw createError(401, "Unauthorized");

  try {
    const exchangeMarkets = await models.exchangeMarket.findAll({
      where: { status: true },
    });

    const formatted = exchangeMarkets.map((market) => ({
      id: market.id,
      name: `${market.currency} / ${market.pair}`,
    }));

    return formatted;
  } catch (error) {
    throw createError(500, "An error occurred while fetching exchange markets");
  }
};
