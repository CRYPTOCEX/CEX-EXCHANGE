import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of an AI Investment Plan",
  operationId: "updateAIInvestmentPlanStatus",
  tags: ["Admin", "AI Investment Plans"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Investment Plan to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New status to apply (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("AI Investment Plan"),
  requiresAuth: true,
  permission: "edit.ai.investment.plan",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("aiInvestmentPlan", id, status);
};
