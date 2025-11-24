// /api/admin/ecosystem/utxos/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { ecosystemUtxoStoreSchema, ecosystemUtxoUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Stores a new Ecosystem UTXO",
  operationId: "storeEcosystemUtxo",
  tags: ["Admin", "Ecosystem UTXOs"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: ecosystemUtxoUpdateSchema,
      },
    },
  },
  responses: storeRecordResponses(ecosystemUtxoStoreSchema, "Ecosystem UTXO"),
  requiresAuth: true,
  permission: "create.ecosystem.utxo",
};

export default async (data: Handler) => {
  const { body } = data;
  const { walletId, transactionId, index, amount, script, status } = body;

  return await storeRecord({
    model: "ecosystemUtxo",
    data: {
      walletId,
      transactionId,
      index,
      amount,
      script,
      status,
    },
  });
};
