// /server/api/ai/investment-plans/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk deletes AI Investment Plans",
  operationId: "bulkDeleteAiInvestmentPlans",
  tags: ["Admin", "AI Investment", "Plan"],
  description:
    "Deletes multiple AI Investment Plans by their IDs. This operation cannot be undone. Any related data may also be affected.",
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
  logModule: "ADMIN_AI",
  logTitle: "Bulk delete investment plans",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step(`Deleting ${ids.length} plan(s)`);
  const result = await handleBulkDelete({
    model: "aiInvestmentPlan",
    ids,
    query,
  });

  ctx?.success(`Deleted ${ids.length} plan(s)`);
  return result;
};
