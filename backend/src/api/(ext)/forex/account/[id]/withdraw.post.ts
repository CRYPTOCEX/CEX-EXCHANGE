import ExchangeManager from "@b/utils/exchange";
import {
  fetchFiatCurrencyPrices,
  processCurrenciesPrices,
} from "@b/utils/cron";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { logInfo, logError } from "@b/utils/logger";
import { ForexFraudDetector } from "@b/api/(ext)/forex/utils/forex-fraud-detector";

import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Withdraws money from the specified Forex account",
  description:
    "Allows a user to withdraw money from their Forex account into their wallet.",
  operationId: "withdrawForexAccount",
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
            amount: { type: "number", description: "Amount to withdraw" },
          },
          required: ["type", "currency", "amount"],
        },
      },
    },
  },
  responses: {
    201: {
      description: "Withdrawal successfully processed",
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
                  userId: { type: "string", description: "User ID" },
                  walletId: { type: "string", description: "Wallet ID" },
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
                    description: "Transaction creation date",
                  },
                  updatedAt: {
                    type: "string",
                    description: "Transaction update date",
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
              type: { type: "string", description: "Wallet type" },
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
  const { user, params, body, req } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  const { amount, type, currency, chain } = body;

  try {
    if (!amount || amount <= 0)
      throw new Error("Amount is required and must be greater than zero");

    if (amount <= 0) throw new Error("Amount must be greater than zero");

    let updatedBalance;
    const transaction = await sequelize.transaction(async (t) => {
    const account = await models.forexAccount.findByPk(id, {
      transaction: t,
    });
    if (!account) throw new Error("Account not found");
    
    // Validate user ownership
    if (account.userId !== user.id) {
      throw createError({ statusCode: 403, message: "Access denied: You can only withdraw from your own forex accounts" });
    }
    
    if (account.balance < amount) throw new Error("Insufficient balance");
    
    // Check withdrawal limits
    const now = new Date();
    const lastReset = account.lastWithdrawReset ? new Date(account.lastWithdrawReset) : new Date();
    const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
    
    // Reset daily counter if it's a new day
    if (daysSinceReset >= 1) {
      account.dailyWithdrawn = 0;
      // Reset monthly counter if it's been 30 days
      if (daysSinceReset >= 30) {
        account.monthlyWithdrawn = 0;
      }
      account.lastWithdrawReset = now;
    }
    
    // Check daily limit
    const dailyLimit = account.dailyWithdrawLimit || 5000;
    const dailyWithdrawn = account.dailyWithdrawn || 0;
    if (dailyWithdrawn + amount > dailyLimit) {
      throw new Error(`Daily withdrawal limit exceeded. You can withdraw up to ${dailyLimit - dailyWithdrawn} more today.`);
    }
    
    // Check monthly limit
    const monthlyLimit = account.monthlyWithdrawLimit || 50000;
    const monthlyWithdrawn = account.monthlyWithdrawn || 0;
    if (monthlyWithdrawn + amount > monthlyLimit) {
      throw new Error(`Monthly withdrawal limit exceeded. You can withdraw up to ${monthlyLimit - monthlyWithdrawn} more this month.`);
    }

    const wallet = await models.wallet.findOne({
      where: { userId: user.id, type, currency },
      transaction: t,
    });
    if (!wallet) throw new Error("Wallet not found");

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

        {
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

    if (account.balance < Total) {
      throw new Error("Insufficient funds");
    }
    
    // Fraud detection check
    const fraudCheck = await ForexFraudDetector.checkWithdrawal(
      user.id,
      amount,
      currency
    );
    
    if (!fraudCheck.isValid) {
      throw createError({ 
        statusCode: 400, 
        message: fraudCheck.reason || "Transaction flagged for security review" 
      });
    }
    
    // For high risk scores, require additional verification
    if (fraudCheck.riskScore >= 0.75) {
      throw createError({ 
        statusCode: 403, 
        message: "This withdrawal requires additional verification. Please contact support." 
      });
    }

    updatedBalance = parseFloat((account.balance - Total).toFixed(2));

    await account.update({ 
      balance: updatedBalance,
      dailyWithdrawn: (account.dailyWithdrawn || 0) + amount,
      monthlyWithdrawn: (account.monthlyWithdrawn || 0) + amount,
      lastWithdrawReset: account.lastWithdrawReset
    }, { transaction: t });

    const transaction = await models.transaction.create(
      {
        userId: user.id,
        walletId: wallet.id,
        type: "FOREX_WITHDRAW",
        status: "PENDING",
        amount,
        fee: taxAmount,
        description: `Withdraw from Forex account ${account.accountId}`,
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

    // Log the withdrawal operation
    logInfo(
      "forex-withdrawal",
      `User ${user.id} withdrew ${amount} ${currency} from forex account ${account.id}. Transaction ID: ${transaction.id}, Wallet Type: ${type}, Chain: ${chain || 'N/A'}`,
      __filename
    );

    return transaction;
  });

    return {
      message: "Withdraw successful",
      transaction: transaction,
      balance: updatedBalance,
      currency,
      chain,
      type,
    };
  } catch (error: any) {
    // Log the error
    logError(
      "forex-withdrawal-error",
      new Error(`Forex withdrawal failed for user ${user.id}, account ${id}: ${error.message}. Details: amount=${amount}, currency=${currency}, type=${type}, chain=${chain || 'N/A'}`),
      __filename
    );
    throw error;
  }
};
