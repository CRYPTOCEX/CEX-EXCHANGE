import ExchangeManager from "@b/utils/exchange";
import {
  fetchFiatCurrencyPrices,
  processCurrenciesPrices,
} from "@b/cron";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { logger } from "@b/utils/console";
import { ForexFraudDetector } from "@b/api/(ext)/forex/utils/forex-fraud-detector";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Deposits money into a specified Forex account",
  description:
    "Allows a user to deposit money from their wallet into a Forex account.",
  operationId: "depositForexAccount",
  tags: ["Forex", "Accounts"],
  rateLimit: {
    windowMs: 60000, // 1 minute
    max: 5 // 5 financial operations per minute
  },
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Forex account ID" },
    },
  ],
  requiresAuth: true,
  logModule: "FOREX",
  logTitle: "Deposit to forex account",
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            type: { type: "string", description: "Wallet type" },
            currency: { type: "string", description: "Currency code" },
            chain: {
              type: "string",
              description: "Blockchain network",
              nullable: true,
            },
            amount: { type: "number", description: "Amount to deposit" },
          },
          required: ["type", "currency", "amount"],
        },
      },
    },
  },
  responses: {
    201: {
      description: "Deposit successfully processed",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string", description: "Success message" },
              transaction: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Transaction ID" },
                  type: { type: "string", description: "Transaction type" },
                  status: { type: "string", description: "Transaction status" },
                  amount: { type: "number", description: "Transaction amount" },
                  fee: { type: "number", description: "Transaction fee" },
                  description: {
                    type: "string",
                    description: "Transaction description",
                  },
                  metadata: {
                    type: "object",
                    description: "Transaction metadata",
                  },
                  createdAt: {
                    type: "string",
                    format: "date-time",
                    description: "Transaction creation date",
                  },
                },
              },
              balance: { type: "number", description: "Wallet balance" },
              currency: { type: "string", description: "Currency code" },
              chain: {
                type: "string",
                description: "Blockchain network",
                nullable: true,
              },
              type: { type: "string", description: "Deposit method type" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Forex Account"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, params, body, req, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const { amount, type, currency, chain } = body;

  try {
    ctx?.step("Validating deposit amount");
    if (!amount || amount <= 0)
      throw new Error("Amount is required and must be greater than zero");

    if (amount <= 0) throw new Error("Amount must be greater than zero");

    let updatedBalance;
    let taxAmount: number = 0;
    const transaction = await sequelize.transaction(async (t) => {
    ctx?.step("Verifying forex account");
    const account = await models.forexAccount.findByPk(id, {
      transaction: t,
    });
    if (!account) throw new Error("Account not found");

    ctx?.step("Running fraud detection checks");
    // Fraud detection check inside transaction
    const fraudCheck = await ForexFraudDetector.checkDeposit(
      user.id,
      amount,
      currency,
      ctx
    );

    if (!fraudCheck.isValid) {
      throw createError({
        statusCode: 400,
        message: fraudCheck.reason || "Deposit flagged for security review"
      });
    }

    // Validate user ownership
    if (account.userId !== user.id) {
      throw createError({ statusCode: 403, message: "Access denied: You can only deposit to your own forex accounts" });
    }

    ctx?.step(`Fetching ${type} wallet for ${currency}`);

    const wallet = await models.wallet.findOne({
      where: { userId: user.id, type, currency },
      transaction: t,
    });
    if (!wallet) throw new Error("Wallet not found");

    ctx?.step("Checking wallet balance");
    if (wallet.balance < amount) throw new Error("Insufficient balance");

    ctx?.step("Calculating transaction fees");
    let currencyData;
    switch (type) {
      case "FIAT":
        currencyData = await models.currency.findOne({
          where: { id: wallet.currency },
          transaction: t,
        });
        if (!currencyData || !currencyData.price) {
          await fetchFiatCurrencyPrices();
          currencyData = await models.currency.findOne({
            where: { id: wallet.currency },
            transaction: t,
          });
          if (!currencyData || !currencyData.price)
            throw new Error("Currency processing failed");
        }
        break;
      case "SPOT":
        {
          currencyData = await models.exchangeCurrency.findOne({
            where: { currency: wallet.currency },
            transaction: t,
          });
          if (!currencyData || !currencyData.price) {
            await processCurrenciesPrices();
            currencyData = await models.exchangeCurrency.findOne({
              where: { currency: wallet.currency },
              transaction: t,
            });
            if (!currencyData || !currencyData.price)
              throw new Error("Currency processing failed");
          }

          const exchange = await ExchangeManager.startExchange(ctx);
          const provider = await ExchangeManager.getProvider();
          if (!exchange) throw createError(500, "Exchange not found");

          const currencies: Record<string, exchangeCurrencyAttributes> =
            await exchange.fetchCurrencies();

          const isXt = provider === "xt";
          const exchangeCurrency = Object.values(currencies).find((c) =>
            isXt ? (c as any).code === currency : c.id === currency
          ) as exchangeCurrencyAttributes & {
            networks?: Record<
              string,
              { fee?: number; fees?: { withdraw?: number } }
            >;
          };
          if (!exchangeCurrency) throw createError(404, "Currency not found");

          let fixedFee = 0;
          switch (provider) {
            case "binance":
            case "kucoin":
              if (chain && exchangeCurrency.networks) {
                fixedFee =
                  exchangeCurrency.networks[chain]?.fee ||
                  exchangeCurrency.networks[chain]?.fees?.withdraw ||
                  0;
              }
              break;
            default:
              break;
          }

          const parsedAmount = parseFloat(amount);
          const percentageFee = currencyData.fee || 0;
          taxAmount = parseFloat(
            Math.max(
              (parsedAmount * percentageFee) / 100 + fixedFee,
              0
            ).toFixed(2)
          );
        }
        break;
      default:
        throw new Error("Invalid wallet type");
    }

    const Total = amount + taxAmount;

    if (wallet.balance < Total) {
      throw new Error("Insufficient funds");
    }

    // Transaction will be created below

    ctx?.step(`Deducting ${Total} ${currency} from wallet`);
    updatedBalance = parseFloat(
      (wallet.balance - Total).toFixed(
        currencyData.precision || type === "FIAT" ? 2 : 8
      )
    );

    await wallet.update({ balance: updatedBalance }, { transaction: t });

    ctx?.step("Creating deposit transaction record");
    const transaction = await models.transaction.create(
      {
        userId: user.id,
        walletId: wallet.id,
        type: "FOREX_DEPOSIT",
        status: "PENDING",
        amount,
        fee: taxAmount,
        description: `Deposit to Forex account ${account.accountId}`,
        metadata: JSON.stringify({
          id: id,
          accountId: account.accountId,
          type: type,
          currency: currency,
          chain: chain,
          price: currencyData.price,
        }),
      },
      { transaction: t }
    );

    // Log the deposit operation
    logger.info(
      "FOREX_DEPOSIT",
      `User ${user.id} deposited ${amount} ${currency} to forex account ${account.id}. Transaction ID: ${transaction.id}, Wallet Type: ${type}, Chain: ${chain || 'N/A'}`
    );

    return transaction;
  });

    ctx?.success(`Deposited ${amount} ${currency} to forex account ${id}${taxAmount > 0 ? ` (fee: ${taxAmount})` : ''}`);

    return {
      message: "Deposit successful",
      transaction: transaction,
      balance: updatedBalance,
      currency,
      chain,
      type,
    };
  } catch (error: any) {
    ctx?.fail(error.message || "Failed to deposit to forex account");

    // Log the error
    logger.error(
      "FOREX_DEPOSIT_ERROR",
      `Forex deposit failed for user ${user.id}, account ${id}: ${error.message}. Details: amount=${amount}, currency=${currency}, type=${type}, chain=${chain || 'N/A'}`,
      error
    );
    throw error;
  }
};
