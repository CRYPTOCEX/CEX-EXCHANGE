import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates Forex investment statuses",
  description: "Updates the status of multiple Forex investments at once. Valid statuses are ACTIVE, COMPLETED, CANCELLED, or REJECTED.",
  operationId: "bulkUpdateForexInvestmentStatus",
  tags: ["Admin", "Forex", "Investment"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of forex investment IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "COMPLETED", "CANCELLED", "REJECTED"],
              description: "New status to apply to the forex investments",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Forex Investment"),
  requiresAuth: true,
  permission: "edit.forex.investment",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk update forex investment status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Validating ${ids.length} forex investment IDs`);

  ctx?.step(`Updating status to ${status} for ${ids.length} forex investments`);
  const result = await updateStatus("forexInvestment", ids, status);

  ctx?.success(`Successfully updated status for ${ids.length} forex investments`);
  return result;
};
