// /api/admin/transactions/[id]/update.put.ts
import { updateRecordResponses } from "@b/utils/query";
import { models, sequelize } from "@b/db";
import { transactionUpdateSchema } from "@b/api/finance/transaction/utils";
import { sendForexTransactionEmail } from "@b/utils/emails";
import { createError } from "@b/utils/error";
import {
  parseMetadata,
  updateForexAccountBalance,
  updateWalletBalance,
} from "../../utils";

export const metadata = {
  summary: "Updates a Forex withdrawal transaction",
  description: "Updates a pending Forex withdrawal transaction including status, amount, fee, and description. Handles balance adjustments and sends notification emails based on status changes (COMPLETED or REJECTED).",
  operationId: "updateForexWithdrawal",
  tags: ["Admin", "Forex", "Withdraw"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The ID of the transaction to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated data for the transaction",
    content: {
      "application/json": {
        schema: transactionUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Transaction"),
  requiresAuth: true,
  permission: "edit.forex.withdraw",
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex withdrawal",
};

export default async (data: Handler) => {
  const { body, params , ctx } = data;
  const { id } = params;
  const {
    status,
    amount,
    fee,
    description,
    referenceId,
    metadata: requestMetadata,
  } = body;

  ctx?.step("Validating data");

  ctx?.step(`Updating record ${id}`);

  const transaction = await models.transaction.findOne({
    where: { id },
  });

  if (!transaction) {
    throw createError({
      statusCode: 404,
      message: "Transaction not found",
    });
  }

  if (transaction.status !== "PENDING") {
    throw createError({
      statusCode: 400,
      message: "Only pending transactions can be updated",
    });
  }
  transaction.amount = amount;
  transaction.fee = fee;
  transaction.description = description;
  transaction.referenceId = referenceId;

  return await sequelize.transaction(async (t) => {
    const metadata: any = parseMetadata(transaction.metadata);

    const cost = Number(transaction.amount) * Number(metadata.price);

    if (transaction.status === "PENDING") {
      const account = await models.forexAccount.findOne({
        where: { userId: transaction.userId, type: "LIVE" },
        transaction: t,
      });
      if (!account) {
        throw createError({
          statusCode: 404,
          message: "Forex account not found",
        });
      }

      const wallet = await models.wallet.findOne({
        where: { id: transaction.walletId },
        transaction: t,
      });
      if (!wallet) {
        throw createError({
          statusCode: 404,
          message: "Wallet not found",
        });
      }

      if (status === "REJECTED") {
        await updateForexAccountBalance(account, cost, true, t, ctx);
      } else if (status === "COMPLETED") {
        await updateWalletBalance(wallet, cost, true, t, ctx);
      }

      const user = await models.user.findOne({
        where: { id: transaction.userId },
      });
      if (user) {
        await sendForexTransactionEmail(
          user,
          transaction,
          account,
          wallet.currency,
          transaction.type as "FOREX_WITHDRAW",
          ctx
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
