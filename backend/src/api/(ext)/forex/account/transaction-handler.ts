import ExchangeManager from "@b/utils/exchange";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  fetchFiatCurrencyPrices,
  processCurrenciesPrices,
} from "@b/utils/cron";

export interface TransactionFeeResult {
  currencyData: any;
  taxAmount: number;
  total: number;
  precision: number;
}

/**
 * Calculate transaction fees for forex operations
 * Shared logic between deposit and withdrawal
 */
export async function calculateTransactionFees(
  type: string,
  currency: string,
  chain: string | undefined,
  amount: number,
  transaction?: any
): Promise<TransactionFeeResult> {
  let currencyData;
  let taxAmount: number = 0;
  let precision: number = 8;

  switch (type) {
    case "FIAT":
      currencyData = await models.currency.findOne({
        where: { id: currency },
        transaction,
      });
      
      if (!currencyData || !currencyData.price) {
        await fetchFiatCurrencyPrices();
        currencyData = await models.currency.findOne({
          where: { id: currency },
          transaction,
        });
        if (!currencyData || !currencyData.price)
          throw new Error("Currency processing failed");
      }
      precision = 2;
      break;
      
    case "SPOT":
      currencyData = await models.exchangeCurrency.findOne({
        where: { currency: currency },
        transaction,
      });
      
      if (!currencyData || !currencyData.price) {
        await processCurrenciesPrices();
        currencyData = await models.exchangeCurrency.findOne({
          where: { currency: currency },
          transaction,
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

      const parsedAmount = parseFloat(amount.toString());
      const percentageFee = currencyData.fee || 0;
      taxAmount = parseFloat(
        Math.max(
          (parsedAmount * percentageFee) / 100 + fixedFee,
          0
        ).toFixed(2)
      );
      
      precision = currencyData.precision || 8;
      break;
      
    default:
      throw new Error("Invalid wallet type");
  }

  const total = amount + taxAmount;

  return {
    currencyData,
    taxAmount,
    total,
    precision,
  };
}

/**
 * Validate forex account ownership
 */
export async function validateAccountOwnership(
  accountId: string,
  userId: string,
  transaction?: any
): Promise<forexAccountAttributes> {
  const account = await models.forexAccount.findByPk(accountId, {
    transaction,
  });
  
  if (!account) {
    throw new Error("Account not found");
  }
  
  if (account.userId !== userId) {
    throw createError({ 
      statusCode: 403, 
      message: "Access denied: You can only access your own forex accounts" 
    });
  }
  
  return account;
}

/**
 * Get or create user wallet
 */
export async function getUserWallet(
  userId: string,
  type: string,
  currency: string,
  transaction?: any
): Promise<walletAttributes> {
  const wallet = await models.wallet.findOne({
    where: { userId, type, currency },
    transaction,
  });
  
  if (!wallet) {
    throw new Error("Wallet not found");
  }
  
  return wallet;
}

/**
 * Create forex transaction record
 */
export async function createForexTransaction(
  userId: string,
  walletId: string,
  type: "FOREX_DEPOSIT" | "FOREX_WITHDRAW",
  amount: number,
  fee: number,
  accountId: string,
  metadata: any,
  transaction?: any
): Promise<transactionAttributes> {
  const description = type === "FOREX_DEPOSIT" 
    ? `Deposit to Forex account ${accountId}`
    : `Withdraw from Forex account ${accountId}`;
    
  return await models.transaction.create(
    {
      userId,
      walletId,
      type,
      status: "PENDING",
      amount,
      fee,
      description,
      metadata: JSON.stringify(metadata),
    },
    { transaction }
  );
}