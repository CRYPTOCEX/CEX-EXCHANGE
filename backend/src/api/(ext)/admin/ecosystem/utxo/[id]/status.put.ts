import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Update ecosystem UTXO status",
  operationId: "updateEcosystemUtxoStatus",
  tags: ["Admin", "Ecosystem", "UTXO"],
  description:
    "Updates the operational status of a specific ecosystem UTXO. Use this endpoint to mark a UTXO as active (available for spending) or inactive (spent or unavailable). This is essential for maintaining accurate UTXO state in blockchain transaction management.",
  logModule: "ADMIN_ECO",
  logTitle: "Update UTXO status",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "Unique identifier of the UTXO to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    description:
      "New operational status (true for active/available, false for inactive/spent)",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "boolean",
              description:
                "New operational status (true for active/available, false for inactive/spent)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecosystem UTXO"),
  requiresAuth: true,
  permission: "edit.ecosystem.utxo",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating UTXO status to ${status}`);
  const result = await updateStatus("ecosystemUtxo", id, status);

  ctx?.success("UTXO status updated successfully");
  return result;
};
