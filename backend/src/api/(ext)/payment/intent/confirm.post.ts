import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import crypto from "crypto";
import {
  getEcoPriceInUSD,
  getFiatPriceInUSD,
  getSpotPriceInUSD,
} from "@b/api/finance/currency/utils";

export const metadata: OperationObject = {
  summary: "Confirms a payment intent",
  operationId: "confirmPaymentIntent",
  tags: ["Payments"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            paymentIntentId: {
              type: "string",
              description: "Payment Intent ID",
            },
            walletId: {
              type: "string",
              description: "Wallet ID to process the payment",
            },
          },
          required: ["paymentIntentId", "walletId"],
        },
      },
    },
  },
  responses: {
    200: { description: "Payment confirmed successfully with redirect URL" },
    400: { description: "Invalid request or insufficient balance" },
    401: { description: "Unauthorized" },
    404: { description: "Payment intent or wallet not found" },
  },
};

export default async (data: Handler) => {
  const { user, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { paymentIntentId, walletId } = body;

  if (!paymentIntentId || !walletId) {
    throw createError({
      statusCode: 400,
      message: "Invalid request parameters",
    });
  }

  // Fetch the payment intent
  const paymentIntent = await models.paymentIntent.findByPk(paymentIntentId);
  if (!paymentIntent || paymentIntent.status !== "PENDING") {
    throw createError({
      statusCode: 404,
      message: "Payment intent not found or already processed",
    });
  }

  // Retrieve the user to get the apiKey
  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    throw createError({ statusCode: 404, message: "User not found" });
  }

  // Fetch the wallet
  const wallet = await models.wallet.findOne({
    where: { id: walletId, userId: user.id },
  });

  if (!wallet) {
    throw createError({ statusCode: 404, message: "Wallet not found" });
  }

  // Calculate the final amount including tax and discount in the payment currency (FIAT)
  const totalAmount =
    paymentIntent.amount +
    (paymentIntent.tax || 0) -
    (paymentIntent.discount || 0);

  // Get exchange rate between wallet currency and payment intent currency
  // From currency: wallet.currency, wallet.type
  // To currency: paymentIntent.currency, "FIAT"

  const fromCurrency = wallet.currency;
  const fromType = wallet.type;
  const toCurrency = paymentIntent.currency;
  const toType = "FIAT"; // Payment currency is always FIAT

  // Get price in USD for fromCurrency (wallet currency)
  let fromPriceUSD;
  switch (fromType) {
    case "FIAT":
      fromPriceUSD = await getFiatPriceInUSD(fromCurrency);
      break;
    case "SPOT":
      fromPriceUSD = await getSpotPriceInUSD(fromCurrency);
      break;
    case "ECO":
      fromPriceUSD = await getEcoPriceInUSD(fromCurrency);
      break;
    default:
      throw createError(400, `Invalid wallet type: ${fromType}`);
  }
  if (!fromPriceUSD) {
    throw createError(400, `Invalid fromPriceUSD: ${fromPriceUSD}`);
  }

  // Get price in USD for toCurrency (payment currency)
  let toPriceUSD;
  switch (toType) {
    case "FIAT":
      toPriceUSD = await getFiatPriceInUSD(toCurrency);
      break;
    default:
      throw createError(400, `Invalid payment currency type: ${toType}`);
  }
  if (!toPriceUSD) {
    throw createError(400, `Invalid toPriceUSD: ${toPriceUSD}`);
  }

  // Calculate exchange rate: rate = toPriceUSD / fromPriceUSD
  const exchangeRate = toPriceUSD / fromPriceUSD;

  // Calculate amount to deduct from wallet in wallet's currency
  const amountToDeduct = totalAmount * exchangeRate;

  // Check if the wallet has sufficient balance
  if (wallet.balance < amountToDeduct) {
    throw createError({
      statusCode: 400,
      message: "Insufficient balance",
    });
  }

  // Begin transaction
  await sequelize.transaction(async (t) => {
    // Deduct wallet balance
    wallet.balance -= amountToDeduct;
    await wallet.save({ transaction: t });

    // Create a transaction record
    const transaction = await models.transaction.create(
      {
        userId: user.id,
        walletId: wallet.id,
        type: "PAYMENT",
        status: "COMPLETED",
        amount: amountToDeduct,
        currency: wallet.currency, // Currency of the wallet
        description: paymentIntent.description || null,
        metadata: JSON.stringify({
          exchangeRate: exchangeRate,
          originalAmount: totalAmount,
          originalCurrency: paymentIntent.currency,
        }),
      },
      { transaction: t }
    );

    // Update the payment intent
    paymentIntent.status = "COMPLETED";
    paymentIntent.userId = user.id;
    paymentIntent.walletId = wallet.id;
    paymentIntent.transactionId = transaction.id;
    await paymentIntent.save({ transaction: t });
  });

  // Trigger the IPN (Instant Payment Notification) URL
  try {
    const ipnPayload = {
      paymentIntentId: paymentIntent.id,
      status: "COMPLETED",
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      userId: paymentIntent.userId,
      transactionId: paymentIntent.transactionId,
    };

    const ipnBody = JSON.stringify(ipnPayload);
    const signature = crypto
      .createHmac("sha256", paymentIntent.apiKey)
      .update(ipnBody)
      .digest("hex");

    const response = await fetch(paymentIntent.ipnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": signature,
      },
      body: ipnBody,
    });

    if (!response.ok) {
      console.error(
        `Error triggering IPN. Status: ${response.status}, Message: ${await response.text()}`
      );
    } else {
      console.log("IPN triggered successfully.");
    }
  } catch (error) {
    console.error("Error triggering IPN:", error.message);
  }

  // Return the redirect URL
  return {
    redirectUrl: paymentIntent.successUrl,
    message: "Payment confirmed successfully",
    status: "COMPLETED",
  };
};
