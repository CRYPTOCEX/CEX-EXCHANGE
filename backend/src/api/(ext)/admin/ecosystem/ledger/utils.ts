import { baseStringSchema, baseNumberSchema } from "@b/utils/schema";

const id = baseStringSchema("ID of the ecosystem private ledger entry");
const walletId = baseStringSchema(
  "Wallet ID associated with the private ledger entry"
);
const index = baseNumberSchema("Index of the ledger entry");
const currency = baseStringSchema("Currency of the ledger entry", 50);
const chain = baseStringSchema(
  "Blockchain chain associated with the ledger entry",
  50
);
const network = baseStringSchema("Network where the ledger operates", 50);
const offchainDifference = baseNumberSchema("Offchain balance difference");

export const ecosystemPrivateLedgerSchema = {
  id,
  walletId,
  index,
  currency,
  chain,
  network,
  offchainDifference,
};

export const baseEcosystemPrivateLedgerSchema = {
  id,
  walletId,
  index,
  currency,
  chain,
  network,
  offchainDifference,
};

export const privateLedgerUpdateSchema = {
  type: "object",
  properties: {
    index,
    currency,
    chain,
    network,
    offchainDifference,
  },
  required: ["index", "currency", "chain", "network"],
};

export const privateLedgerStoreSchema = {
  description: `Private ledger entry created or updated successfully`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: ecosystemPrivateLedgerSchema,
      },
    },
  },
};
