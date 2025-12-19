import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of deposit methods",
  operationId: "bulkUpdateDepositMethodStatus",
  tags: ["Admin", "Deposit Methods"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of deposit method IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the deposit methods (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("DepositMethod"),
  requiresAuth: true,
  permission: "edit.deposit.method",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk update deposit method status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status for ${ids.length} deposit method(s)`);
  const result = await updateStatus("depositMethod", ids, status);

  ctx?.success("Deposit method status updated successfully");
  return result;
};
