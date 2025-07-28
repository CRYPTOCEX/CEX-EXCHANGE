import { models } from "@b/db";

import { baseStringSchema, baseNumberSchema } from "@b/utils/schema";

export const baseTransactionSchema = {
  id: baseStringSchema("Transaction ID"),
  type: baseStringSchema("Transaction type"),
  status: baseStringSchema("Transaction status"),
  amount: baseNumberSchema("Transaction amount"),
  fee: baseNumberSchema("Transaction fee"),
  description: baseStringSchema("Transaction description"),
  metadata: {
    type: "object",
    description: "Additional metadata for the transaction",
    // Define specific properties if necessary
  },
  referenceId: baseStringSchema("Reference ID"),
  createdAt: baseStringSchema(
    "Creation time of the transaction",
    undefined,
    undefined,
    false,
    "date-time"
  ),
};

export const baseWalletSchema = {
  id: baseStringSchema("Wallet ID"),
  type: baseStringSchema("Wallet type"),
  currency: baseStringSchema("Wallet currency"),
  balance: baseNumberSchema("Wallet balance"),
  transactions: {
    type: "array",
    description: "List of transactions",
    items: {
      type: "object",
      properties: baseTransactionSchema,
      nullable: true,
    },
  },
  address: {
    type: "array",
    description: "Wallet addresses",
    items: baseStringSchema("Wallet address"),
    nullable: true,
  },
};

// In-memory cache for locked addresses
const lockedAddressesCache = new Map();

// Function to lock an address
export function lockAddress(address) {
  lockedAddressesCache.set(address, Date.now());
  console.info(`Locked address ${address}`);
}

// Function to check if an address is locked
export function isAddressLocked(address) {
  return lockedAddressesCache.has(address);
}

// Function to unlock an address
export function unlockAddress(address) {
  lockedAddressesCache.delete(address);
  console.info(`Unlocked address ${address}`);
}

// Function to unlock expired addresses
export function unlockExpiredAddresses() {
  const currentTimestamp = Date.now();
  lockedAddressesCache.forEach((lockTimestamp, address) => {
    if (currentTimestamp - lockTimestamp > 3600 * 1000) {
      unlockAddress(address);
    }
  });
}

export async function getActiveCustodialWallets(
  chain
): Promise<ecosystemCustodialWalletAttributes[]> {
  return await models.ecosystemCustodialWallet.findAll({
    where: {
      chain: chain,
      status: "ACTIVE",
    },
  });
}
