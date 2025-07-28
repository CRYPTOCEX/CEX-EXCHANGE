// /server/api/investment/durations/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes Investment durations by IDs",
  operationId: "bulkDeleteInvestmentDurations",
  tags: ["Admin", "Investment", "Durations"],
  parameters: commonBulkDeleteParams("Investment Durations"),
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
              description: "Array of Investment duration IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Investment Durations"),
  requiresAuth: true,
  permission: "delete.investment.duration",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "investmentDuration",
    ids,
    query,
  });
};
