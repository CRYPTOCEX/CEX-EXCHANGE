// /server/api/admin/deposit/gateways/[id]/status.put.ts

import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata = {
  summary: "Updates the status of a deposit gateway",
  operationId: "updateDepositGatewayStatus",
  tags: ["Admin", "Deposit Gateways"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the deposit gateway to update",
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
  responses: updateRecordResponses("Deposit Gateway"),
  requiresAuth: true,
  permission: "edit.deposit.gateway",
  logModule: "ADMIN_FIN",
  logTitle: "Update deposit gateway status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Fetching deposit gateway record");
  ctx?.step("Updating deposit gateway status");
  const result = await updateStatus("depositGateway", id, status);

  ctx?.success("Deposit gateway status updated successfully");
  return result;
};
