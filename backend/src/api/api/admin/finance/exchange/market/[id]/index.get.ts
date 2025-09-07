import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseMarketSchema } from "../utils";

export const metadata = {
  summary: "Retrieves detailed information of a specific exchange market by ID",
  operationId: "getExchangeMarketById",
  tags: ["Admin", "Exchange Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the exchange market to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Exchange market details",
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
    404: notFoundMetadataResponse("Exchange Market"),
    500: serverErrorResponse,
  },
  permission: "view.exchange.market",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("exchangeMarket", params.id);
};
