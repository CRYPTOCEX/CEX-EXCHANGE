import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates Forex signal statuses",
  description: "Updates the active/inactive status of multiple Forex signals at once. Active signals are available for user subscriptions.",
  operationId: "bulkUpdateForexSignalStatus",
  tags: ["Admin", "Forex", "Signal"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of forex signal IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "string",
              enum: ["ACTIVE", "INACTIVE"],
              description: "New status to apply to the forex signals",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Forex Signal"),
  requiresAuth: true,
  permission: "edit.forex.signal",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk update forex signal status",
};

export default async (data: Handler) => {
  const { body , ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Validating ${ids.length} IDs`);

  ctx?.step(`Updating status for ${ids.length} records`);
  const result = await updateStatus("forexSignal", ids, status);

  ctx?.success(`Successfully updated status for ${ids.length} records`);
  return result;
};
