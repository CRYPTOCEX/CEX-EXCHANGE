import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of investment plans",
  operationId: "bulkUpdateInvestmentPlanStatus",
  tags: ["Admin", "Investment Plan"],
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Update Plan Status",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of investment plan IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the investment plans (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("InvestmentPlan"),
  requiresAuth: true,
  permission: "edit.investment.plan",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Updating investment plan status");

  const result = await updateStatus("investmentPlan", ids, status);

  ctx?.success("Investment plan status updated successfully");
  return result;
};
