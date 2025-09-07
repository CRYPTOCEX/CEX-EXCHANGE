import { models } from "@b/db";
import { baseMarketSchema } from "@b/api/exchange/market/utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific ecosystem market by ID",
  operationId: "getEcosystemMarketById",
  tags: ["Admin", "Ecosystem Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecosystem market to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecosystem market details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseMarketSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem Market"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.market",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  const market = await models.ecosystemMarket.findOne({
    where: { id: params.id },
  });

  return market;
};
