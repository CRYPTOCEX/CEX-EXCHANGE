import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes API keys by IDs",
  operationId: "bulkDeleteApiKeys",
  tags: ["Admin", "API Keys"],
  logModule: "ADMIN_API",
  logTitle: "Bulk delete APIs",
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
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Validating API key IDs");
  ctx?.step(`Deleting ${ids.length} API keys`);
  const result = await handleBulkDelete({
    model: "apiKey",
    ids,
    query,
  });
  ctx?.success();
  return result;
};
