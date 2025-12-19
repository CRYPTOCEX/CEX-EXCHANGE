import { updateStatus } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of futures markets",
  operationId: "bulkUpdateFuturesMarketStatus",
  tags: ["Admin", "Futures", "Market"],
  description:
    "Updates the active/inactive status of multiple futures markets simultaneously. Active markets are available for trading, while inactive markets are hidden from users.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of futures market IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the futures markets (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Futures market status updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("Futures Markets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.futures.market",
  logModule: "ADMIN_FUTURES",
  logTitle: "Bulk update futures market status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  try {
    ctx?.step(`Updating ${ids.length} markets to ${status ? 'active' : 'inactive'}`);
    const result = await updateStatus("futuresMarket", ids, status);
    ctx?.success(`Successfully updated status for ${ids.length} futures markets`);
    return result;
  } catch (error: any) {
    ctx?.fail(`Failed to bulk update market status: ${error.message}`);
    throw error;
  }
};
