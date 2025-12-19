import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecosystemUtxoUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Update ecosystem UTXO",
  operationId: "updateEcosystemUtxo",
  tags: ["Admin", "Ecosystem", "UTXO"],
  description:
    "Updates a specific ecosystem Unspent Transaction Output (UTXO). Allows modification of wallet association, transaction ID, output index, amount, script, and operational status. Used to maintain accurate UTXO records for blockchain transaction management.",
  logModule: "ADMIN_ECO",
  logTitle: "Update UTXO",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Unique identifier of the UTXO to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description:
      "Updated UTXO data including wallet ID, transaction ID, index, amount, script, and status",
    content: {
      "application/json": {
        schema: ecosystemUtxoUpdateSchema,
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
  const { walletId, transactionId, index, amount, script, status } = body;

  ctx?.step("Updating UTXO record");
  const result = await updateRecord("ecosystemUtxo", id, {
    walletId,
    transactionId,
    index,
    amount,
    script,
    status,
  });

  ctx?.success("UTXO updated successfully");
  return result;
};
