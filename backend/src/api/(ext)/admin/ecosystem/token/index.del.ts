// /server/api/ecosystem/tokens/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes ecosystem tokens by IDs",
  operationId: "bulkDeleteEcosystemTokens",
  tags: ["Admin", "Ecosystem", "Tokens"],
  parameters: commonBulkDeleteParams("Ecosystem Tokens"),
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
  responses: commonBulkDeleteResponses("Ecosystem Tokens"),
  requiresAuth: true,
  permission: "delete.ecosystem.token",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "ecosystemToken",
    ids,
    query,
  });
};
