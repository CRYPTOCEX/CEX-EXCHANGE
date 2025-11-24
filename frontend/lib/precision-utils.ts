// Precision utilities for formatting numbers based on market metadata

export interface MarketMetadata {
  precision: {
    price: number;
    amount: number;
  };
  limits?: {
    amount?: {
      min: number;
      max: number;
    };
    price?: {
      min: number;
      max: number;
    };
    cost?: {
      min: number;
      max: number;
    };
    leverage?: string;
  };
  taker?: number;
  maker?: number;
}

/**
 * Format price with precision based on market metadata
 */
export function formatPriceWithPrecision(
  price: number,
  metadata?: MarketMetadata
): string {
  if (typeof price !== "number" || isNaN(price)) return "0";

  const precision = metadata?.precision?.price || 2;
  return price.toFixed(precision);
}

/**
 * Format amount with precision based on market metadata
 */
export function formatAmountWithPrecision(
  amount: number,
  metadata?: MarketMetadata
): string {
  if (typeof amount !== "number" || isNaN(amount)) return "0";

  const precision = metadata?.precision?.amount || 8;
  return amount.toFixed(precision);
}

/**
 * Format volume/total with appropriate precision
 */
export function formatVolumeWithPrecision(
  volume: number,
  metadata?: MarketMetadata
): string {
  if (typeof volume !== "number" || isNaN(volume)) return "0";

  // For volume, use amount precision as it represents the base currency
  const precision = metadata?.precision?.amount || 8;
  
  // For large volumes, use fewer decimals
  if (volume >= 1000) {
    return volume.toFixed(Math.max(0, precision - 4));
  } else if (volume >= 100) {
    return volume.toFixed(Math.max(0, precision - 2));
  } else if (volume >= 10) {
    return volume.toFixed(Math.max(0, precision - 1));
  }
  
  return volume.toFixed(precision);
}

/**
 * Format cost/total value with precision (price * amount)
 */
export function formatCostWithPrecision(
  cost: number,
  metadata?: MarketMetadata
): string {
  if (typeof cost !== "number" || isNaN(cost)) return "0";

  // For cost, use price precision as it represents the quote currency
  const precision = metadata?.precision?.price || 2;
  return cost.toFixed(precision);
}

/**
 * Format percentage with appropriate precision
 */
export function formatPercentageWithPrecision(
  percentage: number,
  decimals: number = 2
): string {
  if (typeof percentage !== "number" || isNaN(percentage)) return "0.00%";

  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K, M, B suffixes while respecting precision
 */
export function formatLargeNumberWithPrecision(
  num: number,
  metadata?: MarketMetadata,
  type: "price" | "amount" = "amount"
): string {
  if (typeof num !== "number" || isNaN(num)) return "0";

  const precision = type === "price" 
    ? (metadata?.precision?.price || 2)
    : (metadata?.precision?.amount || 8);

  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(Math.min(precision, 2)) + "B";
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(Math.min(precision, 2)) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(Math.min(precision, 2)) + "K";
  } else {
    return num.toFixed(Math.min(precision, 4));
  }
}

/**
 * Get TradingView pricescale based on market metadata
 */
export function getTradingViewPricescale(metadata?: MarketMetadata): number {
  const precision = metadata?.precision?.price || 2;
  return Math.pow(10, precision);
}

/**
 * Get step size for inputs based on market metadata
 */
export function getStepSize(metadata?: MarketMetadata, type: "price" | "amount" = "price"): number {
  const precision = type === "price" 
    ? (metadata?.precision?.price || 2)
    : (metadata?.precision?.amount || 8);
  
  return Math.pow(10, -precision);
}

/**
 * Count decimal places in a number
 */
export function countDecimals(value: number | string): number {
  const str = value.toString();
  if (Math.floor(Number(str)) === Number(str)) return 0;
  
  const scientificNotationMatch = /^(\d+\.?\d*|\.\d+)e([+-]\d+)$/.exec(str);
  
  if (scientificNotationMatch) {
    const decimalStr = scientificNotationMatch[1].split(".")[1] || "";
    let decimalCount = decimalStr.length + parseInt(scientificNotationMatch[2]);
    decimalCount = Math.abs(decimalCount);
    return Math.min(decimalCount, 8);
  } else {
    const decimalStr = str.split(".")[1] || "";
    return Math.min(decimalStr.length, 8);
  }
}

/**
 * Get precision for a specific currency and network
 * Note: This should be replaced by fetching from token configuration
 */
export function getCurrencyPrecision(currency: string, network?: string): number {
  // Default to 8 decimal places - should be fetched from token config in practice
  return 8;
}

/**
 * Validate if amount has acceptable decimal precision
 */
export function validateDecimalPrecision(
  amount: number | string, 
  precision: number
): { isValid: boolean; actualDecimals: number; maxDecimals: number } {
  const actualDecimals = countDecimals(amount);
  return {
    isValid: actualDecimals <= precision,
    actualDecimals,
    maxDecimals: precision
  };
}

/**
 * Round number to market precision
 */
export function roundToPrecision(
  value: number,
  metadata?: MarketMetadata,
  type: "price" | "amount" = "price"
): number {
  const precision = type === "price" 
    ? (metadata?.precision?.price || 2)
    : (metadata?.precision?.amount || 8);
  
  return Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision);
} 