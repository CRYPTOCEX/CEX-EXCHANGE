import { models, sequelize } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Performs a custom fiat withdraw transaction",
  description:
    "Initiates a custom fiat withdraw transaction for the currently authenticated user",
  operationId: "createCustomFiatWithdraw",
  tags: ["Wallets"],
  requiresAuth: true,
  logModule: "FIAT_WITHDRAW",
  logTitle: "Process fiat withdrawal",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            methodId: { type: "string", description: "Withdraw method ID" },
            amount: { type: "number", description: "Amount to withdraw" },
            currency: { type: "string", description: "Currency to withdraw" },
            customFields: {
              type: "object",
              description: "Custom data for the withdraw",
            },
          },
          required: ["methodId", "amount", "currency", "customFields"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Custom withdraw transaction initiated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              transaction: { type: "object" },
              currency: { type: "string" },
              method: { type: "string" },
              balance: { type: "number" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Withdraw Method"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;

  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { methodId, amount, currency, customFields } = body;

  ctx?.step("Verifying user account");
  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    ctx?.fail("User account not found");
    throw createError({ statusCode: 404, message: "User not found" });
  }

  ctx?.step("Validating withdrawal method");
  const method = await models.withdrawMethod.findByPk(methodId);
  if (!method) {
    ctx?.fail(`Withdrawal method not found: ${methodId}`);
    throw createError({
      statusCode: 404,
      message: "Withdraw method not found",
    });
  }

  ctx?.step("Validating currency");
  const currencyData = await models.currency.findOne({
    where: { id: currency },
  });
  if (!currencyData) {
    ctx?.fail(`Currency not found: ${currency}`);
    throw createError({ statusCode: 404, message: "Currency not found" });
  }

  ctx?.step("Calculating withdrawal fees");
  const totalWithdrawAmount = Math.abs(parseFloat(amount)); // Total amount user wants to withdraw
  const fixedFee = method.fixedFee || 0;
  const percentageFee = method.percentageFee || 0;

  // Calculate fee based on the total withdrawal amount
  const feeAmount = parseFloat(
    Math.max((totalWithdrawAmount * percentageFee) / 100 + fixedFee, 0).toFixed(2)
  );

  // Net amount user will receive after fees are deducted
  const netReceiveAmount = parseFloat((totalWithdrawAmount - feeAmount).toFixed(2));

  ctx?.step("Processing withdrawal transaction");
  const result = await sequelize.transaction(async (t) => {
    ctx?.step("Locking user wallet for update");
    // Lock wallet row for update to ensure isolation
    const wallet = await models.wallet.findOne({
      where: { userId: user.id, currency: currency, type: "FIAT" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!wallet) {
      ctx?.fail(`${currency} FIAT wallet not found`);
      throw createError({ statusCode: 404, message: "Wallet not found" });
    }

    ctx?.step("Checking wallet balance");
    if (wallet.balance < totalWithdrawAmount) {
      ctx?.fail(`Insufficient balance: ${wallet.balance} < ${totalWithdrawAmount}`);
      throw createError({ statusCode: 400, message: "Insufficient funds" });
    }

    ctx?.step("Deducting funds from wallet");
    wallet.balance -= totalWithdrawAmount;
    await wallet.save({ transaction: t });

    ctx?.step("Creating withdrawal transaction record");
    const trx = await models.transaction.create(
      {
        userId: user.id,
        walletId: wallet.id,
        type: "WITHDRAW",
        amount: netReceiveAmount, // Amount user will actually receive
        fee: feeAmount,
        status: "PENDING",
        metadata: JSON.stringify({
          method: method.title,
          totalAmount: totalWithdrawAmount, // Store the total for reference
          ...customFields,
        }),
        description: `Withdrawal of ${netReceiveAmount} ${wallet.currency} (fee: ${feeAmount}) via ${method.title}`,
      },
      { transaction: t }
    );

    ctx?.step("Recording admin profit from fees");
    await models.adminProfit.create(
      {
        amount: feeAmount,
        currency: wallet.currency,
        type: "WITHDRAW",
        transactionId: trx.id,
        description: `User (${user.id}) withdrawal fee of ${feeAmount} ${wallet.currency} by ${method.title}`,
      },
      { transaction: t }
    );

    return {
      transaction: trx,
      currency: wallet.currency,
      method: method.title,
      balance: wallet.balance,
    };
  });

  ctx?.success(`Withdrawn ${totalWithdrawAmount} ${currency} (net: ${netReceiveAmount}) via ${method.title}`);
  return result;
};
