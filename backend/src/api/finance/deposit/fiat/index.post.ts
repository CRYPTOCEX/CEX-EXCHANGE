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
  logModule: "FIAT_DEPOSIT",
  logTitle: "Create custom fiat deposit",
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
  const { user, body, ctx } = data;

  if (!user?.id) {
    ctx?.fail("User not authenticated");
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { methodId, amount, currency, customFields } = body;

  ctx?.step("Fetching user account");
  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    ctx?.fail("User not found");
    throw createError({ statusCode: 404, message: "User not found" });
  }

  ctx?.step("Validating deposit method");
  const method = await models.depositMethod.findByPk(methodId);
  if (!method) {
    ctx?.fail("Deposit method not found");
    throw createError({ statusCode: 404, message: "Deposit method not found" });
  }

  ctx?.step("Validating currency");
  const currencyData = await models.currency.findOne({
    where: { id: currency },
  });
  if (!currencyData) {
    ctx?.fail("Currency not found");
    throw createError({ statusCode: 404, message: "Currency not found" });
  }

  ctx?.step("Calculating deposit fees");
  const parsedAmount = parseFloat(amount);
  const fixedFee = method.fixedFee || 0;
  const percentageFee = method.percentageFee || 0;
  const taxAmount = parseFloat(
    Math.max((parsedAmount * percentageFee) / 100 + fixedFee, 0).toFixed(2)
  );

  ctx?.step("Processing deposit transaction");
  const depositTransaction = await sequelize.transaction(async (t) => {
    let wallet = await models.wallet.findOne({
      where: { userId: user.id, currency: currency, type: "FIAT" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

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

    return trx;
  });

  ctx?.success(`Fiat deposit created: ${parsedAmount} ${currency} via ${method.title}`);

  return {
    transaction: depositTransaction,
    currency,
    method: method.title,
  };
};
