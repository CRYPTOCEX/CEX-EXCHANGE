import { isValidCurrencyCode } from "./currency";
import { toNumber } from "./numeric";

/**
 * Formats a number as currency
 * @param value The number or string to format
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number | string, currency = "USD"): string => {
  const num = toNumber(value);
  if (isNaN(num)) return `${currency} 0.00`;

  // Fiat or ticker? The 20-code list that used to sit inline here was one of
  // SEVEN identical copies across the frontend, and being a copy is what made
  // it wrong: a real THB or PLN amount fell through to the crypto branch and
  // printed "1,234.56 THB". One list, one place.
  const isValidCurrency = isValidCurrencyCode(currency);

  if (isValidCurrency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch (error) {
      // Fallback if there's still an error
      return `${currency} ${num.toFixed(2)}`;
    }
  } else {
    // For cryptocurrencies and other non-ISO currencies, format manually
    const formattedValue = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8, // Cryptocurrencies often have more decimal places
    }).format(num);

    return `${formattedValue} ${currency}`;
  }
};

/**
 * Formats a percentage value
 * @param value The number or string to format as percentage
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number | string, decimals = 2): string => {
  const num = toNumber(value);
  if (isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
};

/**
 * Formats a date string to a readable format
 * @param dateString ISO date string
 * @param format Format style (default: 'medium')
 * @returns Formatted date string
 */
export const formatDate = (
  dateInput: string | Date | undefined,
  format: "short" | "medium" | "long" = "medium"
): string => {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: format === "short" ? "short" : "long",
    day: "numeric",
    hour: format === "long" ? "2-digit" : undefined,
    minute: format === "long" ? "2-digit" : undefined,
  };

  return new Intl.DateTimeFormat("en-US", options).format(date);
};

/**
 * Formats a duration based on timeframe
 * @param duration Duration value
 * @param timeframe Timeframe (HOUR, DAY, WEEK, MONTH)
 * @returns Formatted duration string
 */
export const formatDuration = (
  duration: number,
  timeframe: "HOUR" | "DAY" | "WEEK" | "MONTH"
): string => {
  if (duration === 1) {
    return `1 ${timeframe.toLowerCase()}`;
  }

  switch (timeframe) {
    case "HOUR":
      return `${duration} hours`;
    case "DAY":
      return `${duration} days`;
    case "WEEK":
      return `${duration} weeks`;
    case "MONTH":
      return `${duration} months`;
    default:
      return `${duration} ${(timeframe as string).toLowerCase()}s`;
  }
};

export const getBooleanSetting = (value) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return Boolean(value);
};

export function formatCrypto(value, currency) {
  // You can add more locale formatting here if you want.
  if (value === undefined || value === null)
    return `0 ${currency || ""}`.trim();
  /* `Number(value).toLocaleString()` printed the literal string "NaN" beside a
     currency code for any value that was present but not a number — the absent
     case above was guarded and the malformed one was not. */
  const num = toNumber(value);
  if (!Number.isFinite(num)) return `0 ${currency || ""}`.trim();
  return `${num.toLocaleString()} ${currency || ""}`.trim();
}
