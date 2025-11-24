// /server/api/investment/investments/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes investments by IDs",
  operationId: "bulkDeleteInvestments",
  tags: ["Admin", "General", "Investments"],
  parameters: commonBulkDeleteParams("Investments"),
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
              description: "Array of investment IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Investments"),
  requiresAuth: true,
  permission: "delete.investment",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "investment",
    ids,
    query,
  });
};
