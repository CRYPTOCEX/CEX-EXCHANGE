import { updateStatus } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Updates the status of a specific futures market",
  operationId: "updateFuturesMarketStatus",
  tags: ["Admin", "Futures", "Market"],
  description:
    "Updates the active/inactive status of a futures market. Active markets are available for trading, while inactive markets are hidden from users.",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the futures market to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply to the futures market (true for active, false for inactive)",
            },
          },
          required: ["status"],
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
    404: notFoundResponse("Futures Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.futures.market",
  logModule: "ADMIN_FUTURES",
  logTitle: "Update futures market status",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  try {
    ctx?.step(`Updating market status to ${status ? 'active' : 'inactive'}`);
    const result = await updateStatus("futuresMarket", id, status);
    ctx?.success("Futures market status updated successfully");
    return result;
  } catch (error: any) {
    ctx?.fail(`Failed to update market status: ${error.message}`);
    throw error;
  }
};
