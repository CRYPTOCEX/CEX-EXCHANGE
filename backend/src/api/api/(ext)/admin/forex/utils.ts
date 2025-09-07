import { models } from "@b/db";

export function parseMetadata(metadataString) {
  let metadata: any = {};

  try {
    metadataString = metadataString.replace(/\\/g, "");
    metadata = JSON.parse(metadataString) || {};
  } catch (e) {
    console.error("Invalid JSON in metadata:", metadataString);
  }
  return metadata;
}

export async function updateForexAccountBalance(account, cost, refund, t) {
  let balance = Number(account.balance);
  balance = refund ? balance + cost : balance - cost;

  if (balance < 0) throw new Error("Insufficient forex account balance");

  await models.forexAccount.update(
    { balance },
    { where: { id: account.id }, transaction: t }
  );

  return models.forexAccount.findOne({
    where: { id: account.id },
    transaction: t,
  });
}

export async function updateWalletBalance(wallet, cost, refund, t) {
  let walletBalance = Number(wallet.balance);
  walletBalance = refund ? walletBalance + cost : walletBalance - cost;

  if (walletBalance < 0) throw new Error("Insufficient wallet balance");

  await models.wallet.update(
    { balance: walletBalance },
    { where: { id: wallet.id }, transaction: t }
  );

  return wallet;
}
