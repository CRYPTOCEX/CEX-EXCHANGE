import {
  baseStringSchema,
  baseNumberSchema,
  baseBooleanSchema,
} from "@b/utils/schema";

const id = baseStringSchema("ID of the ecosystem UTXO");
const walletId = baseStringSchema("Wallet ID associated with the UTXO");
const transactionId = baseStringSchema(
  "Transaction ID associated with the UTXO"
);
const index = baseNumberSchema("Index of the UTXO within the transaction");
const amount = baseNumberSchema("Amount of the UTXO");
const script = baseStringSchema("Script associated with the UTXO");
const status = baseBooleanSchema("Operational status of the UTXO");

export const ecosystemUtxoSchema = {
  id,
  walletId,
  transactionId,
  index,
  amount,
  script,
  status,
};

export const baseEcosystemUtxoSchema = {
  id,
  walletId,
  transactionId,
  index,
  amount,
  script,
  status,
};

export const ecosystemUtxoUpdateSchema = {
  type: "object",
  properties: {
    walletId,
    transactionId,
    index,
    amount,
    script,
    status,
  },
  required: ["walletId", "transactionId", "index", "amount", "script"],
};

export const ecosystemUtxoStoreSchema = {
  description: `UTXO created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: ecosystemUtxoSchema,
      },
    },
  },
};
