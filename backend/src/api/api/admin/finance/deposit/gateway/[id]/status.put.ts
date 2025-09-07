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
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("depositGateway", id, status);
};
