import {
  updateStatus,
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { badRequestResponse, notFoundResponse } from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk updates ecosystem token status",
  description:
    "Updates the status (active/inactive) for multiple ecosystem tokens simultaneously. Use this endpoint to enable or disable tokens in bulk.",
  operationId: "bulkUpdateEcosystemTokenStatus",
  tags: ["Admin", "Ecosystem", "Token"],
  logModule: "ADMIN_ECO",
  logTitle: "Bulk update token status",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecosystem token IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the ecosystem tokens (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Ecosystem token status updated successfully",
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
    404: notFoundResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "edit.ecosystem.token",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status for ${ids.length} token(s) to ${status}`);
  const result = await updateStatus("ecosystemToken", ids, status);

  ctx?.success(`Status updated for ${ids.length} token(s)`);
  return result;
};
