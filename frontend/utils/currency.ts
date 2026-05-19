/**
 * Safe currency formatting utility that handles both ISO and non-ISO currencies
 */

// List of valid ISO 4217 currency codes that Intl.NumberFormat supports
const VALID_CURRENCY_CODES = [
  "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD",
  "MXN", "SGD", "HKD", "NOK", "TRY", "ZAR", "BRL", "INR", "KRW", "RUB",
  "PLN", "DKK", "CZK", "HUF", "RON", "BGN", "HRK", "ISK", "THB", "MYR",
  "PHP", "IDR", "VND", "KRW", "TWD", "ILS", "EGP", "MAD", "TND", "GHS",
  "KES", "UGX", "TZS", "ZMW", "BWP", "NAD", "SZL", "LSL", "MZN", "AOA"
];

/**
 * Checks if a currency code is a valid ISO 4217 currency code
 */
export function isValidCurrencyCode(currency: string): boolean {
  if (!currency) return false;
  return VALID_CURRENCY_CODES.includes(currency.toUpperCase());
}


/**
 * General purpose amount formatting function
 * @param amount - The amount to format
 * @param currency - The currency code (optional)
 * @param decimals - Number of decimal places (optional)
 * @returns Formatted amount string
 */
export function formatAmount(
  amount: number,
  currency?: string,
  decimals?: number
): string {
  if (currency) {
    return formatCurrencyAuto(amount, currency);
  }
  
  // Format as number without currency
  const defaultDecimals = decimals ?? 2;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: defaultDecimals,
    maximumFractionDigits: defaultDecimals,
  }).format(amount);
}

/**
 * Safely formats a currency value, handling both ISO and non-ISO currencies
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., "USD", "USDT", "BTC")
 * @param options - Additional formatting options
 * @returns Formatted currency string
 */
export function formatCurrencySafe(
  amount: number,
  currency: string = "USD",
  options: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    locale = "en-US",
    minimumFractionDigits = 2,
    maximumFractionDigits = 8,
  } = options;

  // Handle null/undefined amounts
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `0.00 ${currency}`;
  }

  // Check if the currency is a valid ISO currency code
  const isValidCurrency = isValidCurrencyCode(currency);

  // Format the number without currency symbol, then append currency code
  const formattedValue = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits: isValidCurrency
      ? Math.min(maximumFractionDigits, 2) // ISO currencies max 2 decimals
      : maximumFractionDigits, // Cryptocurrencies can have more decimal places
  }).format(amount);

  return `${formattedValue} ${currency}`;
}

/**
 * Formats a cryptocurrency amount with appropriate decimal places
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., "BTC", "ETH", "USDT")
 * @param decimals - Number of decimal places (default: 8 for crypto)
 * @returns Formatted cryptocurrency string
 */
export function formatCrypto(
  amount: number,
  currency: string,
  decimals: number = 8
): string {
  return formatCurrencySafe(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats a fiat currency amount
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., "USD", "EUR")
 * @param decimals - Number of decimal places (default: 2 for fiat)
 * @returns Formatted fiat currency string
 */
export function formatFiat(
  amount: number,
  currency: string = "USD",
  decimals: number = 2
): string {
  return formatCurrencySafe(amount, currency, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Auto-detects currency type and formats accordingly
 * @param amount - The amount to format
 * @param currency - The currency code
 * @returns Formatted currency string
 */
export function formatCurrencyAuto(amount: number, currency: string): string {
  // Handle undefined/null currency
  if (!currency) {
    return formatFiat(amount, "USD");
  }
  if (isValidCurrencyCode(currency)) {
    return formatFiat(amount, currency);
  } else {
    return formatCrypto(amount, currency);
  }
}

/**
 * Gets the currency symbol for a given currency code
 * @param currency - The currency code (e.g., "USD", "GBP", "EUR")
 * @returns Currency symbol (e.g., "$", "£", "€")
 */
export function getCurrencySymbol(currency: string = "USD"): string {
  if (!isValidCurrencyCode(currency)) {
    return currency; // Return the code itself for cryptocurrencies
  }

  try {
    // Use Intl.NumberFormat to get the currency symbol
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);

    // Extract just the symbol (remove the "0")
    return formatted.replace(/\d/g, "").replace(/\s/g, "").trim();
  } catch (error) {
    // Fallback to currency code if formatting fails
    return currency;
  }
}

// ============================================================================
// COPY TRADING SPECIFIC FORMATTERS
// ============================================================================

/**
 * Formats a profit/loss amount with appropriate sign and color class
 * @param amount - The P&L amount
 * @param currency - The currency code
 * @returns Object with formatted value and CSS class
 */
export function formatPnL(
  amount: number,
  currency: string = "USDT"
): { formatted: string; colorClass: string; isProfit: boolean } {
  const isProfit = amount > 0;
  const sign = isProfit ? "+" : "";
  const formatted = `${sign}${formatCurrencyAuto(Math.abs(amount), currency)}`;
  const colorClass = amount > 0 ? "text-green-500" : amount < 0 ? "text-red-500" : "text-zinc-500";

  return { formatted, colorClass, isProfit };
}

/**
 * Formats a percentage change with sign
 * @param percent - The percentage value
 * @returns Object with formatted value and CSS class
 */
export function formatPercentChange(
  percent: number
): { formatted: string; colorClass: string; isPositive: boolean } {
  const isPositive = percent > 0;
  const sign = isPositive ? "+" : "";
  const formatted = `${sign}${percent.toFixed(2)}%`;
  const colorClass = percent > 0 ? "text-green-500" : percent < 0 ? "text-red-500" : "text-zinc-500";

  return { formatted, colorClass, isPositive };
}

/**
 * Formats allocation/investment amount for display
 * @param amount - The amount
 * @param currency - The currency (defaults to USDT for copy trading)
 * @returns Formatted string like "$1,000 USDT"
 */
export function formatAllocation(amount: number, currency: string = "USDT"): string {
  if (isValidCurrencyCode(currency)) {
    // For USD/EUR etc, use $ prefix
    return formatFiat(amount, currency);
  }
  // For crypto, show amount with currency suffix
  return formatCrypto(amount, currency, 2);
}

/**
 * Get appropriate precision for a currency
 * @param currency - The currency code
 * @returns Number of decimal places
 */
export function getCurrencyPrecision(currency: string): number {
  // Fiat currencies typically use 2 decimals
  if (isValidCurrencyCode(currency)) {
    return 2;
  }

  // Stablecoins use 2-4 decimals
  const stablecoins = ["USDT", "USDC", "BUSD", "DAI", "UST"];
  if (stablecoins.includes(currency.toUpperCase())) {
    return 2;
  }

  // Major cryptos use more decimals
  const majorCrypto = ["BTC", "ETH"];
  if (majorCrypto.includes(currency.toUpperCase())) {
    return 8;
  }

  // Default for other tokens
  return 6;
}

/**
 * Parse a symbol string to get base and quote currencies
 * @param symbol - The trading pair symbol (e.g., "BTC/USDT")
 * @returns Object with base and quote currencies
 */
export function parseSymbol(symbol: string): { base: string; quote: string } {
  const [base, quote] = symbol.split("/");
  return {
    base: base || symbol,
    quote: quote || "USDT",
  };
}

/**
 * Format a trade description with proper currency
 * @param side - "BUY" or "SELL"
 * @param amount - Amount of base currency
 * @param price - Price in quote currency
 * @param symbol - Trading pair symbol
 * @returns Formatted description
 */
export function formatTradeDescription(
  side: "BUY" | "SELL",
  amount: number,
  price: number,
  symbol: string
): string {
  const { base, quote } = parseSymbol(symbol);
  const amountStr = formatCrypto(amount, base, 6);
  const priceStr = formatCrypto(price, quote, getCurrencyPrecision(quote));
  return `${side} ${amountStr} @ ${priceStr}`;
} 