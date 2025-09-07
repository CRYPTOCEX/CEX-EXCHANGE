import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of AI Investment Plans",
  operationId: "bulkUpdateAiInvestmentPlanStatus",
  tags: ["Admin", "AI Investment Plans"],
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
};

export default async (data: Handler) => {
  const { body } = data;
  const { ids, status } = body;
  return updateStatus("aiInvestmentPlan", ids, status);
};
