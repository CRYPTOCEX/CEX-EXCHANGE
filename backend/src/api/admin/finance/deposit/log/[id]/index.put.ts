// /api/admin/transactions/[id]/update.put.ts
import { updateRecordResponses } from "@b/utils/query";
import { models, sequelize } from "@b/db";
import { depositUpdateSchema } from "../utils";
import { sendTransactionStatusUpdateEmail } from "@b/utils/emails";

export const metadata = {
  summary: "Updates an existing deposit transaction",
  operationId: "updateDepositTransaction", 
  tags: ["Admin", "Finance", "Deposits"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the deposit transaction to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the deposit transaction",
    content: {
      "application/json": {
        schema: depositUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Deposit Transaction"),
  requiresAuth: true,
  permission: "edit.deposit",
};

export default async (data: Handler) => {
  const { body, params } = data;
  const { id } = params;
  const {
    status,
    amount,
    fee,
    description,
    referenceId,
    metadata: requestMetadata,
  } = body;

  const transaction = await models.transaction.findOne({
    where: { id },
  });

  if (!transaction) throw new Error("Transaction not found");

  if (transaction.status !== "PENDING") {
    throw new Error("Only pending transactions can be updated");
  }
  transaction.amount = amount;
  transaction.fee = fee;
  transaction.description = description;
  transaction.referenceId = referenceId;

  return await sequelize.transaction(async (t) => {
    const metadata = parseMetadata(transaction.metadata);

    const wallet = await models.wallet.findOne({
      where: { id: transaction.walletId },
      transaction: t,
    });
    if (!wallet) throw new Error("Wallet not found");

    if (transaction.status === "PENDING") {
      if (status === "REJECTED") {
        await handleWalletRejection(wallet, t);
      } else if (status === "COMPLETED") {
        await handleWalletCompletion(transaction, wallet, t);
      }

      const user = await models.user.findOne({
        where: { id: transaction.userId },
      });
      if (user) {
        await sendTransactionStatusUpdateEmail(
          user,
          transaction,
          wallet,
          wallet.balance,
          metadata.message || null
        );
      }
    }

    if (requestMetadata) {
      metadata.message = requestMetadata.message;
    }

    transaction.metadata = JSON.stringify(metadata);

    transaction.status = status;
    await transaction.save({ transaction: t });

    return { message: "Transaction updated successfully" };
  });
};

function parseMetadata(metadataString) {
  let metadata: any = {};

  try {
    metadataString = metadataString.replace(/\\/g, "");
    metadata = JSON.parse(metadataString) || {};
  } catch (e) {
    console.error("Invalid JSON in metadata:", metadataString);
  }
  return metadata;
}

async function handleWalletRejection(wallet, t) {
  const balance = Number(wallet.balance);
  if (wallet.balance !== balance) {
    await models.wallet.update(
      { balance },
      { where: { id: wallet.id }, transaction: t }
    );
  }
}

async function handleWalletCompletion(transaction, wallet, t) {
  const balance =
    Number(wallet.balance) +
    (Number(transaction.amount) - Number(transaction.fee));
  await models.wallet.update(
    { balance },
    { where: { id: wallet.id }, transaction: t }
  );
}
