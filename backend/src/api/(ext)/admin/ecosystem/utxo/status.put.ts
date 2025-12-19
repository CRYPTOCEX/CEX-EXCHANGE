import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk update ecosystem UTXO status",
  operationId: "bulkUpdateEcosystemUtxoStatus",
  tags: ["Admin", "Ecosystem", "UTXO"],
  description:
    "Bulk updates the operational status of multiple ecosystem UTXOs. This endpoint allows administrators to activate or deactivate multiple UTXOs simultaneously by providing an array of UTXO IDs and the desired status. Useful for managing UTXO availability across the ecosystem.",
  logModule: "ADMIN_ECO",
  logTitle: "Bulk update UTXO status",
  requestBody: {
    required: true,
    description:
      "Array of UTXO IDs and the new status to apply (true for active/available, false for inactive/spent)",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecosystem UTXO IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New operational status (true for active/available, false for inactive/spent)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecosystem UTXO"),
  requiresAuth: true,
  permission: "edit.ecosystem.utxo",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step(`Updating status for ${ids.length} UTXO(s) to ${status}`);
  const result = await updateStatus("ecosystemUtxo", ids, status);

  ctx?.success(`Status updated for ${ids.length} UTXO(s)`);
  return result;
};
