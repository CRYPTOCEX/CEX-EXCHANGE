// /api/admin/ecosystem/utxos/store.post.ts

import { storeRecord, storeRecordResponses } from "@b/utils/query";
import { ecosystemUtxoStoreSchema, ecosystemUtxoUpdateSchema } from "./utils";

export const metadata: OperationObject = {
  summary: "Create ecosystem UTXO",
  operationId: "createEcosystemUtxo",
  tags: ["Admin", "Ecosystem", "UTXO"],
  description:
    "Creates a new ecosystem Unspent Transaction Output (UTXO) record. A UTXO represents an unspent output from a blockchain transaction that can be used as input for new transactions. Requires wallet ID, transaction ID, output index, amount, script, and operational status.",
  logModule: "ADMIN_ECO",
  logTitle: "Create UTXO",
  requestBody: {
    required: true,
    description:
      "UTXO data including wallet ID, transaction ID, index, amount, script, and status",
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
  const { body, ctx } = data;
  const { walletId, transactionId, index, amount, script, status } = body;

  ctx?.step("Creating UTXO record");
  const result = await storeRecord({
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

  ctx?.success("UTXO created successfully");
  return result;
};
