import { models } from "@b/db";
import { createError } from "@b/utils/error";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { baseMarketSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves a specific ecosystem market",
  description: "Fetches details of a specific market in the ecosystem.",
  operationId: "getEcosystemMarket",
  tags: ["Ecosystem", "Markets"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "number", description: "Market ID" },
    },
  ],
  responses: {
    200: {
      description: "Market details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseMarketSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Market"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { params } = data;
  const { id } = params;

  const market = await models.ecosystemMarket.findOne({
    where: { id },
    attributes: ["id", "name", "status"],
  });

  if (!market)
    throw createError({ statusCode: 404, message: "Market not found" });

  return market;
};
