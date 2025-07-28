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

  if (isValidCurrency) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits,
        maximumFractionDigits: Math.min(maximumFractionDigits, 2), // ISO currencies max 2 decimals
      }).format(amount);
    } catch (error) {
      // Fallback if there's still an error
      return `${currency} ${amount.toFixed(minimumFractionDigits)}`;
    }
  } else {
    // For cryptocurrencies and other non-ISO currencies, format manually
    const formattedValue = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits, // Cryptocurrencies can have more decimal places
    }).format(amount);
    
    return `${formattedValue} ${currency}`;
  }
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
  if (isValidCurrencyCode(currency)) {
    return formatFiat(amount, currency);
  } else {
    return formatCrypto(amount, currency);
  }
} 