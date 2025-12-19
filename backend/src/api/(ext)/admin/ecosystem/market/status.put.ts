import { updateStatus } from "@b/utils/query";
import {
  unauthorizedResponse,
  serverErrorResponse,
  notFoundResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk updates ecosystem market status",
  description:
    "Updates the active/inactive status for multiple ecosystem markets at once. Accepts an array of market IDs and a boolean status value to apply to all specified markets.",
  operationId: "bulkUpdateEcosystemMarketStatus",
  tags: ["Admin", "Ecosystem", "Market"],
  logModule: "ADMIN_ECO",
  logTitle: "Bulk update market status",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecosystem market IDs to update (at least 1 required)",
              items: { type: "string", format: "uuid" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the ecosystem markets (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
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

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status for ${ids.length} market(s) to ${status}`);
  const result = await updateStatus("ecosystemMarket", ids, status);

  ctx?.success(`Market status updated for ${ids.length} market(s)`);
  return result;
};
