import { models, sequelize } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Performs a custom fiat deposit transaction",
  description:
    "Initiates a custom fiat deposit transaction for the currently authenticated user",
  operationId: "createCustomFiatDeposit",
  tags: ["Wallets"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            methodId: { type: "string", description: "Deposit method ID" },
            amount: { type: "number", description: "Amount to deposit" },
            currency: { type: "string", description: "Currency to deposit" },
            customFields: {
              type: "object",
              description: "Custom data for the deposit",
            },
          },
          required: ["methodId", "amount", "currency", "customFields"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Custom deposit transaction initiated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              transaction: { type: "object" },
              currency: { type: "string" },
              method: { type: "string" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Deposit Method"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { methodId, amount, currency, customFields } = body;

  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  const method = await models.depositMethod.findByPk(methodId);
  if (!method) {
    throw createError({ statusCode: 404, message: "Deposit method not found" });
  }

  const currencyData = await models.currency.findOne({
    where: { id: currency },
  });
  if (!currencyData) {
    throw createError({ statusCode: 404, message: "Currency not found" });
  }

  const parsedAmount = parseFloat(amount);
  const fixedFee = method.fixedFee || 0;
  const percentageFee = method.percentageFee || 0;
  const taxAmount = parseFloat(
    Math.max((parsedAmount * percentageFee) / 100 + fixedFee, 0).toFixed(2)
  );

  // Begin transaction for proper isolation
  const depositTransaction = await sequelize.transaction(async (t) => {
    // Find (and lock) the wallet row for this user/currency/type
    let wallet = await models.wallet.findOne({
      where: { userId: user.id, currency: currency, type: "FIAT" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    // If wallet doesn't exist, create and lock it
    if (!wallet) {
      wallet = await models.wallet.create(
        { userId: user.id, currency: currency, type: "FIAT" },
        { transaction: t }
      );
      wallet = await models.wallet.findOne({
        where: { id: wallet.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
    }

    // Record the deposit transaction
    const trx = await models.transaction.create(
      {
        userId: user.id,
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: parsedAmount,
        fee: taxAmount,
        status: "PENDING",
        metadata: JSON.stringify({
          method: method.title,
          ...customFields,
        }),
        description: `Deposit ${parsedAmount} ${wallet.currency} by ${method.title}`,
      },
      { transaction: t }
    );

    // Record admin profit if needed
    if (taxAmount > 0) {
      await models.adminProfit.create(
        {
          amount: taxAmount,
          currency: wallet.currency,
          type: "DEPOSIT",
          transactionId: trx.id,
          description: `Admin profit from deposit fee of ${taxAmount} ${wallet.currency} by ${method.title} for user (${user.id})`,
        },
        { transaction: t }
      );
    }

    // (Optional: If you want to update balance instantly for deposits, do it here)
    // wallet.balance += parsedAmount - taxAmount;
    // await wallet.save({ transaction: t });

    return trx;
  });

  return {
    transaction: depositTransaction,
    currency,
    method: method.title,
  };
};
