import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

export function parseMetadata(metadataString: string): any {
  let metadata: any = {};

  if (!metadataString) {
    return metadata;
  }

  try {
    const cleanedString = metadataString.replace(/\\/g, "");
    metadata = JSON.parse(cleanedString) || {};
  } catch (e) {
    logger.error("FOREX", "Invalid JSON in metadata", e);
    // Return empty object instead of throwing to prevent breaking the flow
  }
  return metadata;
}

export async function updateForexAccountBalance(
  account: any,
  cost: number,
  refund: boolean,
  t: any,
  ctx?: LogContext
): Promise<any> {
  try {
    ctx?.step?.("Validating forex account");

    if (!account || !account.id) {
      throw createError({
        statusCode: 400,
        message: "Invalid forex account provided",
      });
    }

    ctx?.step?.(`${refund ? "Refunding" : "Deducting"} ${cost} from forex account balance`);

    let balance = Number(account.balance) || 0;
    balance = refund ? balance + cost : balance - cost;

    if (balance < 0) {
      throw createError({
        statusCode: 400,
        message: "Insufficient forex account balance",
      });
    }

    ctx?.step?.("Updating forex account balance in database");

    await models.forexAccount.update(
      { balance },
      { where: { id: account.id }, transaction: t }
    );

    ctx?.step?.("Fetching updated forex account");

    const updatedAccount = await models.forexAccount.findOne({
      where: { id: account.id },
      transaction: t,
    });

    ctx?.success?.("Forex account balance updated successfully");

    return updatedAccount;
  } catch (error: any) {
    ctx?.fail?.(error.message);
    throw error;
  }
}

export async function updateWalletBalance(
  wallet: any,
  cost: number,
  refund: boolean,
  t: any,
  ctx?: LogContext
): Promise<any> {
  try {
    ctx?.step?.("Validating wallet");

    if (!wallet || !wallet.id) {
      throw createError({
        statusCode: 400,
        message: "Invalid wallet provided",
      });
    }

    ctx?.step?.(`${refund ? "Refunding" : "Deducting"} ${cost} from wallet balance`);

    let walletBalance = Number(wallet.balance) || 0;
    walletBalance = refund ? walletBalance + cost : walletBalance - cost;

    if (walletBalance < 0) {
      throw createError({
        statusCode: 400,
        message: "Insufficient wallet balance",
      });
    }

    ctx?.step?.("Updating wallet balance in database");

    await models.wallet.update(
      { balance: walletBalance },
      { where: { id: wallet.id }, transaction: t }
    );

    ctx?.success?.("Wallet balance updated successfully");

    return wallet;
  } catch (error: any) {
    ctx?.fail?.(error.message);
    throw error;
  }
}
