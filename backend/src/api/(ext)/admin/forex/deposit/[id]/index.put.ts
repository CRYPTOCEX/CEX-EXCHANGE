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
  summary: "Updates a Forex deposit",
  operationId: "updateForexDeposit",
  tags: ["Admin", "Forex", "Deposit"],
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
  permission: "edit.forex.deposit",
  logModule: "ADMIN_FOREX",
  logTitle: "Update forex deposit",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const {
    status,
    amount,
    fee,
    description,
    referenceId,
    metadata: requestMetadata,
  } = body;

  ctx?.step(`Validating forex deposit ${id}`);
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
  ctx?.step("Updating transaction fields");
  transaction.amount = amount;
  transaction.fee = fee;
  transaction.description = description;
  transaction.referenceId = referenceId;

  ctx?.step("Processing deposit status update");
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
        ctx?.step("Refunding to wallet");
        await updateWalletBalance(wallet, cost, true, t, ctx);
      } else if (status === "COMPLETED") {
        ctx?.step("Updating forex account balance");
        await updateForexAccountBalance(account, cost, true, t, ctx);
      }

      ctx?.step("Sending notification email");
      const user = await models.user.findOne({
        where: { id: transaction.userId },
      });
      if (user) {
        await sendForexTransactionEmail(
          user,
          transaction,
          account,
          wallet.currency,
          transaction.type as "FOREX_DEPOSIT",
          ctx
        );
      }
    }

    if (requestMetadata) {
      metadata.message = requestMetadata.message;
    }

    transaction.metadata = JSON.stringify(metadata);

    transaction.status = status;
    ctx?.step("Saving transaction");
    await transaction.save({ transaction: t });

    ctx?.success("Forex deposit updated successfully");
    return { message: "Transaction updated successfully" };
  });
};
