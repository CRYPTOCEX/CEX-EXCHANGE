// /server/api/forex/accounts/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex accounts by IDs",
  operationId: "bulkDeleteForexAccounts",
  tags: ["Admin", "Forex"],
  parameters: commonBulkDeleteParams("Forex Accounts"),
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
              description: "Array of Forex account IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Forex Accounts"),
  requiresAuth: true,
  permission: "delete.forex.account",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "forexAccount",
    ids,
    query,
  });
};
