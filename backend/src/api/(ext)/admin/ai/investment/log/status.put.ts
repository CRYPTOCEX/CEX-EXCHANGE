import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of AI Investments",
  operationId: "bulkUpdateAiInvestmentStatus",
  tags: ["Admin", "AI Investments"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of AI Investment IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
              description: "New status to apply to the AI Investments",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("AI Investment"),
  requiresAuth: true,
  permission: "edit.ai.investment",
  logModule: "ADMIN_AI",
  logTitle: "Bulk update AI investment status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status to ${status} for ${ids.length} investment(s)`);
  const result = await updateStatus("aiInvestment", ids, status);

  ctx?.success(`Status updated for ${ids.length} investment(s)`);
  return result;
};
