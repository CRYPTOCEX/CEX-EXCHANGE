import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes API keys by IDs",
  operationId: "bulkDeleteApiKeys",
  tags: ["Admin", "API Keys"],
  parameters: commonBulkDeleteParams("API Keys"),
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
              description: "Array of API key IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("API Keys"),
  requiresAuth: true,
  permission: "delete.api.key",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "apiKey",
    ids,
    query,
  });
};
