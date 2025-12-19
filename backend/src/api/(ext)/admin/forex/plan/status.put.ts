import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates Forex plan statuses",
  description: "Updates the active/inactive status of multiple Forex plans at once. Active plans are visible to users for investment.",
  operationId: "bulkUpdateForexPlanStatus",
  tags: ["Admin", "Forex", "Plan"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of forex plan IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the forex plans (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Forex Plan"),
  requiresAuth: true,
  permission: "edit.forex.plan",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk update forex plan status",
};

export default async (data: Handler) => {
  const { body , ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Validating ${ids.length} IDs`);

  ctx?.step(`Updating status for ${ids.length} records`);
  const result = await updateStatus("forexPlan", ids, status);

  ctx?.success(`Successfully updated status for ${ids.length} records`);
  return result;
};
