import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates AI Investment Plan status",
  operationId: "bulkUpdateAiInvestmentPlanStatus",
  tags: ["Admin", "AI Investment", "Plan"],
  description:
    "Updates the active/inactive status for multiple AI Investment Plans simultaneously. Use this endpoint to activate or deactivate multiple plans in a single operation.",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of AI Investment Plan IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the AI Investment Plans (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("AI Investment Plan"),
  requiresAuth: true,
  permission: "edit.ai.investment.plan",
  logModule: "ADMIN_AI",
  logTitle: "Bulk update plan status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status for ${ids.length} plan(s) to ${status ? 'active' : 'inactive'}`);
  const result = await updateStatus("aiInvestmentPlan", ids, status);

  ctx?.success(`Status updated for ${ids.length} plan(s)`);
  return result;
};
