import { models } from "@b/db";
import {
  baseBooleanSchema,
  baseDateTimeSchema,
  baseNumberSchema,
  baseObjectSchema,
  baseStringSchema,
} from "@b/utils/schema";

export const baseWalletSchema = {
  id: baseStringSchema("ID of the wallet"),
  userId: baseStringSchema("ID of the user who owns the wallet"),
  type: baseStringSchema("Type of the wallet"),
  currency: baseStringSchema("Currency of the wallet"),
  balance: baseNumberSchema("Current balance of the wallet"),
  inOrder: baseNumberSchema("Amount currently in order"),
  address: baseStringSchema("Address associated with the wallet"),
  status: baseBooleanSchema("Status of the wallet"),
  createdAt: baseDateTimeSchema("Date and time when the wallet was created"),
  updatedAt: baseDateTimeSchema(
    "Date and time when the wallet was last updated"
  ),
};

export const baseTransactionSchema = {
  id: baseStringSchema("ID of the transaction"),
  userId: baseStringSchema("ID of the user who created the transaction"),
  walletId: baseStringSchema(
    "ID of the wallet associated with the transaction"
  ),
  type: baseStringSchema("Type of the transaction"),
  status: baseStringSchema("Status of the transaction"),
  amount: baseNumberSchema("Amount of the transaction"),
  fee: baseNumberSchema("Fee charged for the transaction"),
  description: baseStringSchema("Description of the transaction"),
  metadata: baseObjectSchema("Metadata of the transaction"),
  referenceId: baseStringSchema("Reference ID of the transaction"),
  createdAt: baseDateTimeSchema(
    "Date and time when the transaction was created"
  ),
  updatedAt: baseDateTimeSchema(
    "Date and time when the transaction was last updated"
  ),
};

export async function getWallet(
  userId: string,
  type: string,
  currency: string,
  hasTransactions = false
) {
  const include = hasTransactions
    ? [
        {
          model: models.transaction,
          as: "transactions",
        },
      ]
    : [];

  const response = await models.wallet.findOne({
    where: {
      userId,
      currency,
      type,
    },
    include,
    order: hasTransactions ? [["transactions.createdAt", "DESC"]] : [],
  });

  if (!response) {
    throw new Error("Wallet not found");
  }

  return response.get({ plain: true });
}

export async function getWalletSafe(
  userId: string,
  type: string,
  currency: string,
  hasTransactions = false
) {
  const include = hasTransactions
    ? [
        {
          model: models.transaction,
          as: "transactions",
        },
      ]
    : [];

  const response = await models.wallet.findOne({
    where: {
      userId,
      currency,
      type,
    },
    include,
    order: hasTransactions ? [["transactions.createdAt", "DESC"]] : [],
  });

  if (!response) {
    return null;
  }

  return response.get({ plain: true });
}

export async function getWalletById(id: string): Promise<walletAttributes> {
  const response = await models.wallet.findOne({
    where: { id },
  });

  if (!response) {
    throw new Error("Wallet not found");
  }

  return response.get({ plain: true }) as unknown as walletAttributes;
}

export async function getTransactions(
  id: string
): Promise<transactionAttributes[]> {
  const wallet = await models.wallet.findOne({
    where: { id },
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  return (
    await models.transaction.findAll({
      where: { walletId: wallet.id },
    })
  ).map(
    (transaction) => transaction.get({ plain: true }) as unknown as transactionAttributes
  );
}
