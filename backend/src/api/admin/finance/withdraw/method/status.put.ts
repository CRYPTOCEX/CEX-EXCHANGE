import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of withdraw methods",
  operationId: "bulkUpdateWithdrawaethodStatus",
  tags: ["Admin", "Withdraw Methods"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of withdraw method IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the withdraw methods (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Withdraw Method"),
  requiresAuth: true,
  permission: "edit.withdraw.method",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk Update Method Status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Bulk updating withdraw method status");
  const result = await updateStatus("withdrawMethod", ids, status);

  ctx?.success("Withdraw method status updated successfully");
  return result;
};
