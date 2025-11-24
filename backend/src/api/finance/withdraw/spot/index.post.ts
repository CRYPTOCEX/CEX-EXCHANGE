import ExchangeManager from "@b/utils/exchange";
// /server/api/finance/withdraw/spot/index.post.ts

import { models, sequelize } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { createError } from "@b/utils/error";
import { sendTransactionStatusUpdateEmail } from "@b/utils/emails";
import { handleNetworkMappingReverse } from "../../currency/[type]/[code]/[method]/index.get";
import { CacheManager } from "@b/utils/cache";

// Util to count decimals
function countDecimals(value: number) {
  if (Number.isInteger(value)) return 0;
  const s = value.toString();
  if (s.includes("e-")) {
    // scientific notation
    const [_, decimals] = s.split("e-");
    return parseInt(decimals, 10);
  }
  const parts = s.split(".");
  return parts[1]?.length || 0;
}

export const metadata: OperationObject = {
  summary: "Performs a withdraw transaction",
  description:
    "Initiates a withdraw transaction for the currently authenticated user",
  operationId: "createWithdraw",
  tags: ["Wallets"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              description: "Currency to withdraw",
            },
            chain: {
              type: "string",
              description: "Withdraw method ID",
            },
            amount: {
              type: "number",
              description: "Amount to withdraw",
            },
            toAddress: {
              type: "string",
              description: "Withdraw toAddress",
            },
          },
          required: ["currency", "chain", "amount", "toAddress"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Withdraw transaction initiated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Success message",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Withdraw"),
    500: serverErrorResponse,
  },
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { currency, chain, amount, toAddress, memo } = body;

  // Validate required fields
  if (!amount || !toAddress || !currency) {
    throw createError({ statusCode: 400, message: "Invalid input" });
  }

  const userPk = await models.user.findByPk(user.id);
  if (!userPk)
    throw createError({ statusCode: 404, message: "User not found" });

  const currencyData = await models.exchangeCurrency.findOne({
    where: { currency },
  });
  if (!currencyData) {
    throw createError({ statusCode: 404, message: "Currency not found" });
  }

  // Fetch exchange data
  const exchange = await ExchangeManager.startExchange();
  const provider = await ExchangeManager.getProvider();
  if (!exchange) throw createError(500, "Exchange not found");

  const isXt = provider === "xt";
  const currencies: Record<string, exchangeCurrencyAttributes> =
    await exchange.fetchCurrencies();

  const exchangeCurrency = Object.values(currencies).find((c) =>
    isXt ? (c as any).code === currency : c.id === currency
  ) as exchangeCurrencyAttributes & {
    networks: Record<
      string,
      {
        fee: number;
        fees: { withdraw: number };
        min_withdraw?: number;
        max_withdraw?: number;
        precision?: number;
      }
    >;
    min_withdraw?: number;
    max_withdraw?: number;
    precision?: number;
  };
  if (!exchangeCurrency) {
    // More helpful error message
    throw createError(404, `Currency ${currency} is not available for withdrawal on the exchange. Please contact support if you believe this is an error.`);
  }

  // -------------------------------
  // 🟢 Validation: Amount, Precision, Min/Max
  // -------------------------------
  // Get precision from exchange currency configuration
  const precision =
    (exchangeCurrency.networks &&
      exchangeCurrency.networks[chain]?.precision) ??
    exchangeCurrency.precision ??
    currencyData.precision ??
    8; // Default to 8 decimals if no precision is configured

  const actualDecimals = countDecimals(amount);
  if (actualDecimals > precision) {
    throw createError({
      statusCode: 400,
      message: `Amount has too many decimal places for ${currency} on ${chain}. Max allowed is ${precision} decimal places. Your amount has ${actualDecimals} decimal places.`,
    });
  }
  const netConf = exchangeCurrency.networks?.[chain] ?? {};
  const minWithdraw =
    netConf.min_withdraw ?? exchangeCurrency.min_withdraw ?? 0;
  const maxWithdraw =
    netConf.max_withdraw ?? exchangeCurrency.max_withdraw ?? 0;
  if (minWithdraw && amount < minWithdraw) {
    throw createError({
      statusCode: 400,
      message: `Minimum withdrawal for ${currency} on ${chain} is ${minWithdraw}`,
    });
  }
  if (maxWithdraw && amount > maxWithdraw) {
    throw createError({
      statusCode: 400,
      message: `Maximum withdrawal for ${currency} on ${chain} is ${maxWithdraw}`,
    });
  }

  // 3. Must be positive and numeric
  const totalWithdrawAmount = Math.abs(parseFloat(amount));
  if (totalWithdrawAmount <= 0 || isNaN(totalWithdrawAmount)) {
    throw createError({
      statusCode: 400,
      message: "Amount must be a positive number",
    });
  }

  // Prepare values required for fee calculation (but not using wallet data yet)
  let fixedFee = 0;
  if (exchangeCurrency.networks && exchangeCurrency.networks[chain]) {
    fixedFee =
      exchangeCurrency.networks[chain].fee ||
      exchangeCurrency.networks[chain].fees?.withdraw ||
      0;
  }
  const percentageFee = currencyData.fee || 0;
  const cacheManager = CacheManager.getInstance();
  const settings = await cacheManager.getSettings();
  const withdrawChainFeeEnabled =
    settings.has("withdrawChainFee") &&
    settings.get("withdrawChainFee") === "true";
  const spotWithdrawFee = parseFloat(settings.get("spotWithdrawFee") || "0");
  const combinedPercentageFee = percentageFee + spotWithdrawFee;
  
  // Calculate fees
  const percentageFeeAmount = parseFloat(
    Math.max((totalWithdrawAmount * combinedPercentageFee) / 100, 0).toFixed(precision)
  );
  
  // For internal fee calculation - this fee stays with the platform
  const internalFeeAmount = percentageFeeAmount;
  
  // For external fee calculation - this fee goes to the blockchain network
  const externalFeeAmount = withdrawChainFeeEnabled ? 0 : fixedFee;
  
  // Total amount to deduct from user's balance (only internal fees)
  const totalDeductionAmount = parseFloat((totalWithdrawAmount + internalFeeAmount).toFixed(precision));
  
  // Net amount that will actually be withdrawn to user's external address
  const netWithdrawAmount = parseFloat((totalWithdrawAmount - externalFeeAmount).toFixed(precision));

  // -------- MAIN WITHDRAW TRANSACTION, RACE-CONDITION SAFE --------
  // Only fetch wallet, check balance, and deduct inside the transaction!
  const result = await sequelize.transaction(async (t) => {
    // Lock the wallet row FOR UPDATE
    const wallet = await models.wallet.findOne({
      where: { userId: user.id, currency: currency, type: "SPOT" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!wallet) {
      throw createError({ statusCode: 404, message: `${currency} wallet not found in your spot wallets. Please ensure you have a ${currency} spot wallet before attempting withdrawal.` });
    }

    // Check if wallet has sufficient balance for the total deduction amount (withdrawal + internal fees)
    if (wallet.balance < totalDeductionAmount) {
      throw createError({ statusCode: 400, message: "Insufficient funds" });
    }
    
    const newBalance = parseFloat((wallet.balance - totalDeductionAmount).toFixed(precision));
    if (newBalance < 0) {
      throw createError({ statusCode: 400, message: "Insufficient funds" });
    }

    wallet.balance = newBalance;
    await wallet.save({ transaction: t });

    const dbTransaction = await models.transaction.create(
      {
        userId: user.id,
        walletId: wallet.id,
        type: "WITHDRAW",
        amount: netWithdrawAmount, // Net amount user receives
        fee: internalFeeAmount,
        status: "PENDING",
        metadata: JSON.stringify({
          chain: chain,
          currency,
          toAddress,
          memo,
          totalAmount: totalWithdrawAmount, // Store total for reference
        }),
        description: `Withdrawal of ${totalWithdrawAmount} ${wallet.currency} (${netWithdrawAmount} net) to ${toAddress} via ${chain}`,
      },
      { transaction: t }
    );

    // **Admin Profit Recording:**
    const adminProfit = await models.adminProfit.create(
      {
        amount: internalFeeAmount,
        currency: wallet.currency,
        type: "WITHDRAW",
        transactionId: dbTransaction.id,
        chain: chain,
        description: `Admin profit from user (${user.id}) withdrawal fee of ${internalFeeAmount} ${wallet.currency} on ${chain}`,
      },
      { transaction: t }
    );

    return { dbTransaction, adminProfit, wallet };
  });

  // Check the withdrawApproval setting
  const withdrawApprovalEnabled =
    settings.has("withdrawApproval") &&
    settings.get("withdrawApproval") === "true";

  if (withdrawApprovalEnabled) {
    // Proceed to perform the withdrawal with the exchange
    let withdrawResponse;
    let withdrawStatus:
      | "PENDING"
      | "COMPLETED"
      | "FAILED"
      | "CANCELLED"
      | "EXPIRED"
      | "REJECTED"
      | "REFUNDED"
      | "FROZEN"
      | "PROCESSING"
      | "TIMEOUT"
      | undefined = "PENDING";

    // Calculate the amount to send to the external exchange/address (net amount after internal fees)
    const providerWithdrawAmount = withdrawChainFeeEnabled
      ? netWithdrawAmount
      : netWithdrawAmount;

    try {
      // Pre-validate exchange balance before attempting withdrawal
      let exchangeBalance;
      try {
        const balance = await exchange.fetchBalance();
        exchangeBalance = balance.free[currency] || 0;
        
        if (exchangeBalance < providerWithdrawAmount) {
          throw createError({
            statusCode: 400,
            message: `Insufficient exchange balance. Available: ${exchangeBalance} ${currency}, Required: ${providerWithdrawAmount} ${currency}. Please contact support to refill the exchange account.`
          });
        }
      } catch (balanceError) {
        console.warn(`Could not fetch exchange balance for ${currency}:`, balanceError.message);
        // Continue with withdrawal attempt, let exchange handle balance validation
      }

      switch (provider) {
        case "kucoin":
          try {
            const transferResult = await exchange.transfer(
              currency,
              providerWithdrawAmount,
              "main",
              "trade"
            );
            if (transferResult && transferResult.id) {
              withdrawResponse = await exchange.withdraw(
                currency,
                providerWithdrawAmount,
                toAddress,
                memo,
                { network: chain }
              );
              if (withdrawResponse && withdrawResponse.id) {
                const withdrawals = await exchange.fetchWithdrawals(currency);
                const withdrawData = withdrawals.find(
                  (w) => w.id === withdrawResponse.id
                );
                if (withdrawData) {
                  withdrawResponse.fee = withdrawChainFeeEnabled
                    ? withdrawData.fee?.cost || fixedFee
                    : 0;
                  withdrawStatus =
                    withdrawData.status === "ok"
                      ? "COMPLETED"
                      : withdrawData.status.toUpperCase();
                } else {
                  withdrawResponse.fee = withdrawChainFeeEnabled ? fixedFee : 0;
                  withdrawStatus = "COMPLETED";
                }
              } else {
                throw new Error("Withdrawal response invalid");
              }
            } else {
              throw new Error("Transfer to trade account failed");
            }
          } catch (error) {
            throw new Error("Withdrawal request failed. Please try again or contact support.");
          }
          break;
        case "binance":
        case "kraken":
        case "okx":
          try {
            withdrawResponse = await exchange.withdraw(
              currency,
              providerWithdrawAmount,
              toAddress,
              memo,
              { network: chain }
            );
            if (withdrawResponse && withdrawResponse.id) {
              const withdrawals = await exchange.fetchWithdrawals(currency);
              const withdrawData = withdrawals.find(
                (w) => w.id === withdrawResponse.id
              );
              if (withdrawData) {
                withdrawResponse.fee = withdrawChainFeeEnabled
                  ? withdrawData.fee?.cost || fixedFee
                  : 0;
                withdrawStatus =
                  withdrawData.status === "ok"
                    ? "COMPLETED"
                    : withdrawData.status.toUpperCase();
              } else {
                withdrawResponse.fee = withdrawChainFeeEnabled ? fixedFee : 0;
                withdrawStatus = "COMPLETED";
              }
            } else {
              throw new Error("Withdrawal response invalid");
            }
          } catch (error) {
            // Enhanced error handling for exchange-specific errors
            if (error.message && error.message.includes('-4026')) {
              throw createError({
                statusCode: 400,
                message: `Insufficient funds available for withdrawal. Please try a smaller amount or contact support for assistance.`
              });
            } else if (error.message && error.message.includes('insufficient')) {
              throw createError({
                statusCode: 400,
                message: `Insufficient funds available for withdrawal. Please contact support for assistance.`
              });
            } else {
              throw new Error(`Withdrawal request failed. Please try again or contact support.`);
            }
          }
          break;
        case "xt":
          try {
            withdrawResponse = await exchange.withdraw(
              currency,
              providerWithdrawAmount,
              toAddress,
              memo,
              { network: chain }
            );
            if (withdrawResponse && withdrawResponse.id) {
              const withdrawals = await exchange.fetchWithdrawals(currency);
              const withdrawData = withdrawals.find(
                (w) => w.id === withdrawResponse.id
              );
              if (withdrawData) {
                withdrawResponse.fee = withdrawChainFeeEnabled
                  ? withdrawData.fee?.cost || fixedFee
                  : 0;
                const statusMapping = {
                  SUCCESS: "COMPLETED",
                  SUBMIT: "PENDING",
                  REVIEW: "PENDING",
                  AUDITED: "PROCESSING",
                  AUDITED_AGAIN: "PROCESSING",
                  PENDING: "PENDING",
                  FAIL: "FAILED",
                  CANCEL: "CANCELLED",
                };
                withdrawStatus =
                  statusMapping[withdrawData.status] ||
                  withdrawData.status.toUpperCase();
              } else {
                withdrawResponse.fee = withdrawChainFeeEnabled ? fixedFee : 0;
                withdrawStatus = "COMPLETED";
              }
            } else {
              throw new Error("Withdrawal response invalid");
            }
          } catch (error) {
            throw new Error("Withdrawal request failed. Please try again or contact support.");
          }
          break;
        default:
          throw new Error("Withdrawal method not currently available. Please contact support.");
      }

      if (
        !withdrawResponse ||
        !withdrawResponse.id ||
        withdrawStatus === "FAILED" ||
        withdrawStatus === "CANCELLED"
      ) {
        throw new Error("Withdrawal failed");
      }

      await models.transaction.update(
        {
          status: withdrawStatus,
          referenceId: withdrawResponse.id,
          metadata: JSON.stringify({
            ...JSON.parse(result.dbTransaction.metadata),
            withdrawResponse,
          }),
        },
        { where: { id: result.dbTransaction.id } }
      );

      const userRecord = await models.user.findOne({
        where: { id: user.id },
      });
      if (userRecord) {
        await sendTransactionStatusUpdateEmail(
          userRecord,
          result.dbTransaction,
          result.wallet,
          result.wallet.balance,
          null
        );
      }

      return {
        message: "Withdrawal completed successfully",
        transaction: result.dbTransaction,
        currency: result.wallet.currency,
        method: chain,
        balance: result.wallet.balance,
      };
    } catch (error) {
      await sequelize.transaction(async (t) => {
        await models.transaction.update(
          {
            status: "CANCELLED",
            metadata: JSON.stringify({
              ...JSON.parse(result.dbTransaction.metadata),
              error: error.message,
            }),
          },
          { where: { id: result.dbTransaction.id }, transaction: t }
        );
        // Return funds
        const wallet = await models.wallet.findOne({
          where: { id: result.wallet.id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        wallet.balance += totalDeductionAmount; // Refund the total amount that was deducted
        await wallet.save({ transaction: t });
        await models.adminProfit.destroy({
          where: { id: result.adminProfit.id },
          transaction: t,
        });
      });

      throw createError(500, "Withdrawal failed: " + error.message);
    }
  } else {
    // Withdrawal approval is required; keep the transaction in 'PENDING' status
    return {
      message: "Withdrawal request submitted and pending approval",
      transaction: result.dbTransaction,
      currency: result.wallet.currency,
      method: chain,
      balance: result.wallet.balance,
    };
  }
};
