import {
  commonBulkDeleteParams,
  unauthorizedResponse,
  serverErrorResponse,
  handleBulkDelete,
} from "@b/utils/query";
import {
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Bulk deletes ecosystem tokens",
  description:
    "Deletes multiple ecosystem tokens by their IDs. This operation performs a soft delete, marking the tokens as deleted without removing them from the database permanently.",
  operationId: "bulkDeleteEcosystemTokens",
  tags: ["Admin", "Ecosystem", "Token"],
  parameters: commonBulkDeleteParams("Ecosystem Tokens"),
  logModule: "ADMIN_ECO",
  logTitle: "Bulk delete tokens",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Array of ecosystem token IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Ecosystem tokens deleted successfully",
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
  permission: "delete.ecosystem.token",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Deleting ${ids.length} token(s)`);
  const result = await handleBulkDelete({
    model: "ecosystemToken",
    ids,
    query,
  });

  ctx?.success(`${ids.length} token(s) deleted successfully`);
  return result;
};
