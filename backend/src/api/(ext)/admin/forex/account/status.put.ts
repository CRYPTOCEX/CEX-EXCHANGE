import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates Forex account status",
  operationId: "bulkUpdateForexAccountStatus",
  tags: ["Admin", "Forex", "Account"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of forex account IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the forex accounts (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Forex Account"),
  requiresAuth: true,
  permission: "edit.forex.account",
  logModule: "ADMIN_FOREX",
  logTitle: "Bulk update forex account status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Validating ${ids.length} forex account IDs`);

  ctx?.step(`Updating status to ${status ? "active" : "inactive"} for ${ids.length} forex accounts`);
  const result = await updateStatus("forexAccount", ids, status);

  ctx?.success(`Successfully updated status for ${ids.length} forex accounts`);
  return result;
};
