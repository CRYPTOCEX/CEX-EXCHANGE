import { baseMarketSchema } from "@b/api/exchange/market/utils";
import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific futures market by ID",
  operationId: "getFuturesMarketById",
  tags: ["Admin", "Futures Markets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the futures market to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Futures market details",
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
    404: notFoundMetadataResponse("Futures Market"),
    500: serverErrorResponse,
  },
  permission: "view.futures.market",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("futuresMarket", params.id);
};
