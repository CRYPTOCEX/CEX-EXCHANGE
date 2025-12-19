import { models } from "@b/db";
import { baseMarketSchema } from "@b/api/exchange/market/utils";
import {
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Retrieves a specific ecosystem market",
  description:
    "Fetches detailed information for a single ecosystem market by its ID, including currency, pair, trading status, trending/hot indicators, and metadata containing precision, limits, and fee information.",
  operationId: "getEcosystemMarket",
  tags: ["Admin", "Ecosystem", "Market"],
  logModule: "ADMIN_ECO",
  logTitle: "Get market details",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecosystem market to retrieve",
      schema: { type: "string", format: "uuid" },
    },
  ],
  responses: {
    200: {
      description: "Ecosystem market details retrieved successfully",
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
    404: notFoundMetadataResponse("Ecosystem Market"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.market",
  requiresAuth: true,
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Retrieving market details");
  const market = await models.ecosystemMarket.findOne({
    where: { id: params.id },
  });

  ctx?.success("Market details retrieved");
  return market;
};
