import { getRecord } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";
import { futuresMarketSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific futures market",
  operationId: "getFuturesMarketById",
  tags: ["Admin", "Futures", "Market"],
  description:
    "Fetches complete details of a futures market including currency pair, status, trending indicators, and trading parameters such as precision, limits, and fees.",
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
      description: "Futures market details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: futuresMarketSchema,
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Futures Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.futures.market",
  logModule: "ADMIN_FUT",
  logTitle: "Get Futures Market",
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Fetching futures market record");
  const result = await getRecord("futuresMarket", params.id);

  ctx?.success("Retrieved futures market");
  return result;
};
