import { updateStatus } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Updates ecosystem market status",
  description:
    "Updates the active/inactive status of a single ecosystem market. Setting status to false will disable the market for trading, while true will enable it.",
  operationId: "updateEcosystemMarketStatus",
  tags: ["Admin", "Ecosystem", "Market"],
  logModule: "ADMIN_ECO",
  logTitle: "Update market status",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecosystem market to update",
      schema: { type: "string", format: "uuid" },
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
                "New status to apply to the ecosystem market (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Market status updated successfully",
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
    404: notFoundResponse("Ecosystem Market"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ecosystem.market",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating market status to ${status}`);
  const result = await updateStatus("ecosystemMarket", id, status);

  ctx?.success("Market status updated successfully");
  return result;
};
