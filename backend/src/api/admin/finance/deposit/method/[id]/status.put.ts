// /server/api/admin/deposit/gateways/[id]/status.put.ts
import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of a deposit method",
  operationId: "updateDepositMethodStatus",
  tags: ["Admin", "Deposit Methods"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the deposit method to update",
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
  responses: updateRecordResponses("Deposit Method"),
  requiresAuth: true,
  permission: "edit.deposit.method",
  logModule: "ADMIN_FIN",
  logTitle: "Update deposit method status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Fetching deposit method record");
  ctx?.step("Updating deposit method status");
  const result = await updateStatus("depositMethod", id, status);

  ctx?.success("Deposit method status updated successfully");
  return result;
};
