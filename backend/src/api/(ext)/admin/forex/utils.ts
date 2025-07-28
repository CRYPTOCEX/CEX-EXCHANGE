import { models } from "@b/db";
import { createError } from "@b/utils/error";

export function parseMetadata(metadataString: string): any {
  let metadata: any = {};

  if (!metadataString) {
    return metadata;
  }

  try {
    const cleanedString = metadataString.replace(/\\/g, "");
    metadata = JSON.parse(cleanedString) || {};
  } catch (e) {
    console.error("Invalid JSON in metadata:", metadataString, e);
    // Return empty object instead of throwing to prevent breaking the flow
  }
  return metadata;
}

export async function updateForexAccountBalance(
  account: any, 
  cost: number, 
  refund: boolean, 
  t: any
): Promise<any> {
  if (!account || !account.id) {
    throw createError({
      statusCode: 400,
      message: "Invalid forex account provided",
    });
  }

  let balance = Number(account.balance) || 0;
  balance = refund ? balance + cost : balance - cost;

  if (balance < 0) {
    throw createError({
      statusCode: 400,
      message: "Insufficient forex account balance",
    });
  }

  await models.forexAccount.update(
    { balance },
    { where: { id: account.id }, transaction: t }
  );

  return models.forexAccount.findOne({
    where: { id: account.id },
    transaction: t,
  });
}

export async function updateWalletBalance(
  wallet: any, 
  cost: number, 
  refund: boolean, 
  t: any
): Promise<any> {
  if (!wallet || !wallet.id) {
    throw createError({
      statusCode: 400,
      message: "Invalid wallet provided",
    });
  }

  let walletBalance = Number(wallet.balance) || 0;
  walletBalance = refund ? walletBalance + cost : walletBalance - cost;

  if (walletBalance < 0) {
    throw createError({
      statusCode: 400,
      message: "Insufficient wallet balance",
    });
  }

  await models.wallet.update(
    { balance: walletBalance },
    { where: { id: wallet.id }, transaction: t }
  );

  return wallet;
}
