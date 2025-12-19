import { updateRecord } from "@b/utils/query";
import { FuturesMarketUpdateSchema, baseFuturesMarketSchema } from "../utils";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Updates a specific futures market",
  operationId: "updateFuturesMarket",
  tags: ["Admin", "Futures", "Market"],
  description:
    "Updates futures market settings including trending indicators, hot status, and trading parameters (precision, limits, leverage, fees).",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the futures market to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the futures market",
    content: {
      "application/json": {
        schema: FuturesMarketUpdateSchema,
      },
    },
  },
  responses: {
    200: {
      description: "Futures market updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseFuturesMarketSchema,
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Futures Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.futures.market",
  logModule: "ADMIN_FUTURES",
  logTitle: "Update futures market",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { metadata } = body;

  try {
    ctx?.step("Updating futures market metadata");
    const result = await updateRecord("futuresMarket", id, {
      metadata,
    });
    ctx?.success("Futures market updated successfully");
    return result;
  } catch (error: any) {
    ctx?.fail(`Failed to update futures market: ${error.message}`);
    throw error;
  }
};
