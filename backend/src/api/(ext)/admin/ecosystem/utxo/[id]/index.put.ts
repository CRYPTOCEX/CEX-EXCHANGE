import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { ecosystemUtxoUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific ecosystem UTXO",
  operationId: "updateEcosystemUtxo",
  tags: ["Admin", "Ecosystem", "UTXOs"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the UTXO to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the UTXO",
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
  const { body, params } = data;
  const { id } = params;
  const { walletId, transactionId, index, amount, script, status } = body;

  return await updateRecord("ecosystemUtxo", id, {
    walletId,
    transactionId,
    index,
    amount,
    script,
    status,
  });
};
