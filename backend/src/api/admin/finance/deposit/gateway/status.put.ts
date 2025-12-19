import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata = {
  summary: "Bulk updates the status of deposit gateways",
  operationId: "bulkUpdateDepositGatewayStatus",
  tags: ["Admin", "Deposit Gateways"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of deposit gateway IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the deposit gateways (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Deposit Gateway"),
  requiresAuth: true,
  permission: "edit.deposit.gateway",
  logModule: "ADMIN_FIN",
  logTitle: "Bulk update deposit gateway status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status for ${ids.length} deposit gateway(s)`);
  const result = await updateStatus("depositGateway", ids, status);

  ctx?.success("Deposit gateway status updated successfully");
  return result;
};
