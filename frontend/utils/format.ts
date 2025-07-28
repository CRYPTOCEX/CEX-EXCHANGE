/**
 * Format a number with proper thousand separators
 */
export function formatNumber(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) return "0";
  
  // Use Intl.NumberFormat for proper localization
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Format a currency value with symbol
 */
export function formatCurrency(
  value: number | string, 
  currency: string = "USD",
  locale: string = "en-US"
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) return "$0.00";
  
  // List of valid ISO 4217 currency codes that Intl.NumberFormat supports
  const validCurrencyCodes = [
    "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD",
    "MXN", "SGD", "HKD", "NOK", "TRY", "ZAR", "BRL", "INR", "KRW", "RUB"
  ];

  // Check if the currency is a valid ISO currency code
  const isValidCurrency = validCurrencyCodes.includes(currency.toUpperCase());

  if (isValidCurrency) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch (error) {
      // Fallback if there's still an error
      return `${currency} ${num.toFixed(2)}`;
    }
  } else {
    // For cryptocurrencies and other non-ISO currencies, format manually
    const formattedValue = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8, // Cryptocurrencies often have more decimal places
    }).format(num);
    
    return `${formattedValue} ${currency}`;
  }
}

/**
 * Format a percentage value
 */
export function formatPercentage(
  value: number | string,
  decimals: number = 1
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) return "0%";
  
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format a crypto currency value (like ETH, BTC)
 */
export function formatCrypto(
  value: number | string,
  symbol: string = "ETH",
  decimals: number = 4
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) return `0 ${symbol}`;
  
  // For very small numbers, show more decimals
  if (num < 0.001) {
    return `${num.toFixed(6)} ${symbol}`;
  }
  
  // For normal numbers, use specified decimals
  return `${num.toFixed(decimals)} ${symbol}`;
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatCompactNumber(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) return "0";
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  } else if (absNum >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (absNum >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  
  return formatNumber(num);
}

/**
 * Format a time duration in a human-readable format
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format a date in a relative format (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "Recently";
  
  const now = new Date();
  const targetDate = typeof date === "string" ? new Date(date) : date;
  
  // Check if the date is valid
  if (isNaN(targetDate.getTime())) return "Recently";
  
  const diffMs = now.getTime() - targetDate.getTime();
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffYears > 0) {
    return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
  } else if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  } else if (diffWeeks > 0) {
    return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

/**
 * Format a file size in bytes to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate text to a specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Format an address (like wallet address) with ellipsis in the middle
 */
export function formatAddress(
  address: string, 
  startChars: number = 6, 
  endChars: number = 4
): string {
  if (address.length <= startChars + endChars) return address;
  
  return `${address.substring(0, startChars)}...${address.substring(
    address.length - endChars
  )}`;
} 