// Copy Trading Currency Utilities
// Handles currency conversion, price lookups, and multi-currency support

import { logger } from "@b/utils/console";
import { RedisSingleton } from "@b/utils/redis";

const redis = RedisSingleton.getInstance();
const PRICE_CACHE_TTL = 60; // 60 seconds cache for prices
const PRICE_CACHE_PREFIX = "copy_trading:price:";

// ============================================================================
// MATCHING ENGINE IMPORT
// ============================================================================

async function getMatchingEngine() {
  try {
    const module = await import("@b/api/(ext)/ecosystem/utils/matchingEngine");
    return module.MatchingEngine.getInstance();
  } catch (error) {
    logger.error("COPY_TRADING", "Failed to load matching engine", error);
    return null;
  }
}

// ============================================================================
// PRICE LOOKUP FUNCTIONS
// ============================================================================

/**
 * Get the price of a currency in USDT
 * Uses ecosystem matching engine for price data
 */
export async function getPriceInUSDT(currency: string): Promise<number> {
  // USDT is always 1:1
  if (currency === "USDT" || currency === "USD") {
    return 1;
  }

  // Check cache first
  const cacheKey = `${PRICE_CACHE_PREFIX}${currency}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const price = parseFloat(cached);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  } catch (error) {
    logger.warn("COPY_TRADING", `Cache read failed for ${currency} price`, error);
  }

  // Fetch from matching engine
  const engine = await getMatchingEngine();
  if (!engine) {
    throw new Error(`Unable to get price for ${currency}: Matching engine unavailable`);
  }

  try {
    const symbol = `${currency}/USDT`;
    const ticker = await engine.getTicker(symbol);

    const price = ticker?.last;
    if (price === null || price === undefined || isNaN(price)) {
      throw new Error(`Invalid price data for ${symbol}`);
    }

    // Cache the price
    try {
      await redis.set(cacheKey, price.toString(), "EX", PRICE_CACHE_TTL);
    } catch (error) {
      logger.warn("COPY_TRADING", `Cache write failed for ${currency} price`, error);
    }

    return price;
  } catch (error: any) {
    logger.error("COPY_TRADING", `Error fetching price for ${currency}/USDT`, error);
    throw new Error(`Unable to get price for ${currency}: ${error.message}`);
  }
}

/**
 * Get the price for a trading pair (e.g., BTC/ETH)
 * Returns price of base in quote currency
 */
export async function getPairPrice(symbol: string): Promise<number> {
  const engine = await getMatchingEngine();
  if (!engine) {
    throw new Error(`Unable to get price for ${symbol}: Matching engine unavailable`);
  }

  try {
    const ticker = await engine.getTicker(symbol);
    const price = ticker?.last;

    if (price === null || price === undefined || isNaN(price)) {
      throw new Error(`Invalid price data for ${symbol}`);
    }

    return price;
  } catch (error: any) {
    logger.error("COPY_TRADING", `Error fetching price for ${symbol}`, error);
    throw new Error(`Unable to get price for ${symbol}: ${error.message}`);
  }
}

// ============================================================================
// CURRENCY CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert an amount from one currency to USDT equivalent
 */
export async function convertToUSDT(
  amount: number,
  fromCurrency: string
): Promise<number> {
  if (fromCurrency === "USDT" || fromCurrency === "USD") {
    return amount;
  }

  const priceInUSDT = await getPriceInUSDT(fromCurrency);
  return amount * priceInUSDT;
}

/**
 * Convert an amount from USDT to another currency
 */
export async function convertFromUSDT(
  amountUSDT: number,
  toCurrency: string
): Promise<number> {
  if (toCurrency === "USDT" || toCurrency === "USD") {
    return amountUSDT;
  }

  const priceInUSDT = await getPriceInUSDT(toCurrency);
  if (priceInUSDT === 0) {
    throw new Error(`Cannot convert to ${toCurrency}: price is 0`);
  }

  return amountUSDT / priceInUSDT;
}

/**
 * Convert an amount between any two currencies
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Convert to USDT first, then to target currency
  const amountInUSDT = await convertToUSDT(amount, fromCurrency);
  return await convertFromUSDT(amountInUSDT, toCurrency);
}

// ============================================================================
// MULTI-CURRENCY AGGREGATION
// ============================================================================

interface CurrencyAmount {
  amount: number;
  currency: string;
}

/**
 * Sum multiple currency amounts into a single USDT equivalent
 */
export async function sumToUSDT(amounts: CurrencyAmount[]): Promise<number> {
  let total = 0;

  for (const { amount, currency } of amounts) {
    const usdtAmount = await convertToUSDT(amount, currency);
    total += usdtAmount;
  }

  return total;
}

/**
 * Calculate profit/loss in USDT for a trade
 * Handles trades where profit is in the quote currency
 */
export async function calculateProfitInUSDT(
  profit: number,
  profitCurrency: string
): Promise<number> {
  return await convertToUSDT(profit, profitCurrency);
}

// ============================================================================
// SYMBOL/CURRENCY HELPERS
// ============================================================================

/**
 * Extract base and quote currencies from a symbol
 * e.g., "BTC/USDT" -> { base: "BTC", quote: "USDT" }
 */
export function parseSymbol(symbol: string): { base: string; quote: string } {
  const parts = symbol.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid symbol format: ${symbol}`);
  }
  return {
    base: parts[0],
    quote: parts[1],
  };
}

/**
 * Get the quote currency from a symbol
 */
export function getQuoteCurrency(symbol: string): string {
  return parseSymbol(symbol).quote;
}

/**
 * Get the base currency from a symbol
 */
export function getBaseCurrency(symbol: string): string {
  return parseSymbol(symbol).base;
}

/**
 * Determine which currency is used for a trade side
 * BUY: uses quote currency (e.g., BUY BTC/USDT uses USDT)
 * SELL: uses base currency (e.g., SELL BTC/USDT uses BTC)
 */
export function getTradeCurrency(
  symbol: string,
  side: "BUY" | "SELL"
): { spend: string; receive: string } {
  const { base, quote } = parseSymbol(symbol);

  if (side === "BUY") {
    return { spend: quote, receive: base };
  } else {
    return { spend: base, receive: quote };
  }
}

// ============================================================================
// CURRENCY SYMBOL MAPPING
// ============================================================================

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  USDT: "$",
  USDC: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  JPY: "\u00A5",
  BTC: "\u20BF",
  ETH: "\u039E",
  // Default to currency code for others
};

/**
 * Get the display symbol for a currency
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Format an amount with its currency
 */
export function formatCurrencyAmount(
  amount: number,
  currency: string,
  decimals: number = 2
): string {
  const symbol = getCurrencySymbol(currency);
  const formattedAmount = amount.toFixed(decimals);

  // For crypto, show symbol after (e.g., "0.001 BTC")
  // For fiat, show symbol before (e.g., "$100.00")
  if (["USD", "USDT", "USDC", "EUR", "GBP", "JPY"].includes(currency)) {
    return `${symbol}${formattedAmount}`;
  }

  return `${formattedAmount} ${currency}`;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate minimum amount against a threshold
 * Converts both to USDT for comparison
 */
export async function validateMinimumAmount(
  amount: number,
  amountCurrency: string,
  minimumUSDT: number
): Promise<{ valid: boolean; amountUSDT: number; message?: string }> {
  const amountInUSDT = await convertToUSDT(amount, amountCurrency);

  if (amountInUSDT < minimumUSDT) {
    return {
      valid: false,
      amountUSDT: amountInUSDT,
      message: `Amount ${formatCurrencyAmount(amount, amountCurrency)} (~${formatCurrencyAmount(amountInUSDT, "USDT")}) is below minimum ${formatCurrencyAmount(minimumUSDT, "USDT")}`,
    };
  }

  return { valid: true, amountUSDT: amountInUSDT };
}

/**
 * Get prices for multiple currencies at once
 * Returns a map of currency -> price in USDT
 */
export async function getPricesInUSDT(
  currencies: string[]
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  for (const currency of currencies) {
    try {
      prices[currency] = await getPriceInUSDT(currency);
    } catch (error) {
      logger.warn("COPY_TRADING", `Failed to get price for ${currency}`, error);
      prices[currency] = 0;
    }
  }

  return prices;
}
