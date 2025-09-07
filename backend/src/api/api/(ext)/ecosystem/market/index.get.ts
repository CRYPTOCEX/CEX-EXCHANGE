import { models } from "@b/db";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseMarketSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Retrieves all ecosystem markets",
  description:
    "Fetches a list of all active markets available in the ecosystem.",
  operationId: "listEcosystemMarkets",
  tags: ["Ecosystem", "Markets"],
  responses: {
    200: {
      description: "Markets retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: baseMarketSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Market"),
    500: serverErrorResponse,
  },
};

export default async () => {
  const markets = await models.ecosystemMarket.findAll({
    where: { status: true },
  });
  return markets;
};
