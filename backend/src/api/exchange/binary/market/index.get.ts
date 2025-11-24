import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "List Binary Markets",
  operationId: "listBinaryMarkets",
  tags: ["Exchange", "Binary", "Markets"],
  description: "Retrieves a list of all available binary trading markets.",
  responses: {
    200: {
      description: "A list of binary markets",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Market ID",
                },
                currency: {
                  type: "string",
                  description: "Base currency",
                },
                pair: {
                  type: "string",
                  description: "Quote currency",
                },
                isTrending: {
                  type: "boolean",
                  description: "Whether the market is trending",
                },
                isHot: {
                  type: "boolean",
                  description: "Whether the market is hot",
                },
                status: {
                  type: "boolean",
                  description: "Market status",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Binary Market"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  try {
    const binaryMarkets = await models.binaryMarket.findAll({
      where: {
        status: true,
      },
      order: [
        ['isTrending', 'DESC'],
        ['isHot', 'DESC'],
        ['currency', 'ASC'],
      ],
    });

    const markets = binaryMarkets.map((market) => ({
      ...market.get({ plain: true }),
      // Add formatted pair for display
      label: `${market.currency}/${market.pair}`,
      symbol: `${market.currency}/${market.pair}`,
    }));

    return markets;
  } catch (error) {
    console.error("Error fetching binary markets:", error);
    throw error;
  }
}; 