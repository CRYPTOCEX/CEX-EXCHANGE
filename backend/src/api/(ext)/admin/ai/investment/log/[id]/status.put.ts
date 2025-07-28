import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of an AI Investment",
  operationId: "updateAIInvestmentStatus",
  tags: ["Admin", "AI Investments"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "ID of the AI Investment to update",
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
              type: "string",
              enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
              description: "New status to apply",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("AI Investment"),
  requiresAuth: true,
  permission: "edit.ai.investment",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("aiInvestment", id, status);
};
