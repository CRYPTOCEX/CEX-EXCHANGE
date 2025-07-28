import ExchangeManager from "@b/utils/exchange";
import {
  fetchFiatCurrencyPrices,
  processCurrenciesPrices,
} from "@b/utils/cron";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

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
  const { user, params, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const { amount, type, currency, chain } = body;
  if (!amount || amount <= 0)
    throw new Error("Amount is required and must be greater than zero");

  if (amount <= 0) throw new Error("Amount must be greater than zero");

  let updatedBalance;
  const transaction = await sequelize.transaction(async (t) => {
    const account = await models.forexAccount.findByPk(id, {
      transaction: t,
    });
    if (!account) throw new Error("Account not found");

    const wallet = await models.wallet.findOne({
      where: { userId: user.id, type, currency },
      transaction: t,
    });
    if (!wallet) throw new Error("Wallet not found");
    if (wallet.balance < amount) throw new Error("Insufficient balance");

    let currencyData;
    let taxAmount: number = 0;
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

          const exchange = await ExchangeManager.startExchange();
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
              fixedFee =
                exchangeCurrency.networks?.[chain]?.fee ||
                exchangeCurrency.networks?.[chain]?.fees?.withdraw ||
                0;
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

    updatedBalance = parseFloat(
      (wallet.balance - Total).toFixed(
        currencyData.precision || type === "FIAT" ? 2 : 8
      )
    );

    await wallet.update({ balance: updatedBalance }, { transaction: t });

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

    return transaction;
  });

  return {
    message: "Deposit successful",
    transaction: transaction,
    balance: updatedBalance,
    currency,
    chain,
    type,
  };
};
