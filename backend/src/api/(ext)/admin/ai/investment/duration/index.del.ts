// /server/api/ai/investment-durations/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes AI Investment Durations by IDs",
  operationId: "bulkDeleteAIInvestmentDurations",
  tags: ["Admin", "AI Investment Duration"],
  parameters: commonBulkDeleteParams("AI Investment Durations"),
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
              description: "Array of AI Investment Duration IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("AI Investment Durations"),
  requiresAuth: true,
  permission: "delete.ai.investment.duration",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "aiInvestmentDuration",
    ids,
    query,
  });
};
