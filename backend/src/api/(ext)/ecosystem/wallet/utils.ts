import { models } from "@b/db";

import { baseStringSchema, baseNumberSchema } from "@b/utils/schema";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

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
export function lockAddress(address, ctx?: LogContext) {
  ctx?.step?.(`Locking address ${address.substring(0, 10)}...`);
  lockedAddressesCache.set(address, Date.now());
  console.info(`Locked address ${address}`);
  ctx?.success?.(`Address ${address.substring(0, 10)}... locked`);
}

// Function to check if an address is locked
export function isAddressLocked(address, ctx?: LogContext) {
  ctx?.step?.(`Checking if address ${address.substring(0, 10)}... is locked`);
  const isLocked = lockedAddressesCache.has(address);
  if (isLocked) {
    ctx?.step?.(`Address ${address.substring(0, 10)}... is locked`);
  }
  return isLocked;
}

// Function to unlock an address
export function unlockAddress(address, ctx?: LogContext) {
  ctx?.step?.(`Unlocking address ${address.substring(0, 10)}...`);
  lockedAddressesCache.delete(address);
  console.info(`Unlocked address ${address}`);
  ctx?.success?.(`Address ${address.substring(0, 10)}... unlocked`);
}

// Function to unlock expired addresses
export function unlockExpiredAddresses(ctx?: LogContext) {
  ctx?.step?.("Checking for expired locked addresses");
  const currentTimestamp = Date.now();
  let unlockedCount = 0;
  lockedAddressesCache.forEach((lockTimestamp, address) => {
    if (currentTimestamp - lockTimestamp > 3600 * 1000) {
      unlockAddress(address, ctx);
      unlockedCount++;
    }
  });
  if (unlockedCount > 0) {
    ctx?.success?.(`Unlocked ${unlockedCount} expired address(es)`);
  } else {
    ctx?.step?.("No expired addresses found");
  }
}

export async function getActiveCustodialWallets(
  chain,
  ctx?: LogContext
): Promise<ecosystemCustodialWalletAttributes[]> {
  ctx?.step?.(`Fetching active custodial wallets for ${chain}`);
  const wallets = await models.ecosystemCustodialWallet.findAll({
    where: {
      chain: chain,
      status: "ACTIVE",
    },
  });
  ctx?.success?.(`Found ${wallets.length} active custodial wallet(s) for ${chain}`);
  return wallets;
}
