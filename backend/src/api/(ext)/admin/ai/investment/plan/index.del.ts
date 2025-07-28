// /server/api/ai/investment-plans/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes AI Investment Plans by IDs",
  operationId: "bulkDeleteAIInvestmentPlans",
  tags: ["Admin", "AI Investment Plan"],
  parameters: commonBulkDeleteParams("AI Investment Plans"),
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
              description: "Array of AI Investment Plan IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("AI Investment Plans"),
  requiresAuth: true,
  permission: "delete.ai.investment.plan",
};

export default async (data: Handler) => {
  const { body, query } = data;
  const { ids } = body;
  return handleBulkDelete({
    model: "aiInvestmentPlan",
    ids,
    query,
  });
};
