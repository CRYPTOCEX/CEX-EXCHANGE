// /server/api/admin/investment/plans/delete.del.ts

import {
  commonBulkDeleteParams,
  commonBulkDeleteResponses,
  handleBulkDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Bulk deletes investment plans by IDs",
  operationId: "bulkDeleteInvestmentPlans",
  tags: ["Admin", "Investment Plans"],
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Delete Investment Plans",
  parameters: commonBulkDeleteParams("Investment Plans"),
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
              description: "Array of investment plan IDs to delete",
            },
          },
          required: ["ids"],
        },
      },
    },
  },
  responses: commonBulkDeleteResponses("Investment Plans"),
  requiresAuth: true,
  permission: "delete.investment.plan",
};

export default async (data: Handler) => {
  const { body, query, ctx } = data;
  const { ids } = body;

  ctx?.step("Deleting investment plans");

  const result = await handleBulkDelete({
    model: "investmentPlan",
    ids,
    query,
  });

  ctx?.success("Investment plans deleted successfully");
  return result;
};
