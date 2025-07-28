// /server/api/forex/investments/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes Forex investments by IDs",
  operationId: "bulkDeleteForexInvestments",
  tags: ["Admin", "Forex", "Investments"],
  parameters: commonBulkDeleteParams("Forex Investments"),
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
              description: "Array of Forex investment IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Forex Investments"),
  requiresAuth: true,
  permission: "delete.forex.investment",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "forexInvestment",
    ids,
    query,
  });
};
