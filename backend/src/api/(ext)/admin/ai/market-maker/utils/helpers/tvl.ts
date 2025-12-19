/**
 * Centralized TVL (Total Value Locked) calculation helper
 *
 * This module provides consistent TVL calculation across the AI Market Maker codebase.
 * TVL is calculated as: (baseBalance * currentPrice) + quoteBalance
 *
 * This assumes quote currency is the reference currency (e.g., USDT)
 */

import { logger } from "@b/utils/console";

export interface TVLInput {
  baseBalance: number | string;
  quoteBalance: number | string;
  currentPrice: number | string;
}

export interface TVLBreakdown {
  tvl: number;
  baseValue: number;
  quoteValue: number;
  baseBalance: number;
  quoteBalance: number;
}

/**
 * Calculate TVL (Total Value Locked)
 *
 * @param input - Object containing baseBalance, quoteBalance, and currentPrice
 * @returns The calculated TVL as a number
 *
 * @example
 * // 1 BTC at $50,000 + 50,000 USDT = $100,000 TVL
 * calculateTVL({ baseBalance: 1, quoteBalance: 50000, currentPrice: 50000 })
 * // Returns: 100000
 */
export function calculateTVL(input: TVLInput): number {
  const base = parseFloat(String(input.baseBalance)) || 0;
  const quote = parseFloat(String(input.quoteBalance)) || 0;
  const price = parseFloat(String(input.currentPrice)) || 0;

  // Validate inputs
  if (base < 0 || quote < 0) {
    logger.warn("AI_MM", "Negative balance detected, using absolute values");
  }

  const absBase = Math.abs(base);
  const absQuote = Math.abs(quote);

  if (price <= 0) {
    // If no valid price, return sum of balances as fallback
    // This prevents division by zero and provides a reasonable estimate
    logger.warn("AI_MM", "Invalid or zero price, returning sum of balances");
    return absBase + absQuote;
  }

  // TVL = (base * price) + quote
  // This assumes quote is the reference currency (e.g., USDT, USD)
  return absBase * price + absQuote;
}

/**
 * Calculate TVL with detailed breakdown
 *
 * @param input - Object containing baseBalance, quoteBalance, and currentPrice
 * @returns Object with TVL and breakdown of values
 *
 * @example
 * calculateTVLWithBreakdown({ baseBalance: 1, quoteBalance: 50000, currentPrice: 50000 })
 * // Returns: { tvl: 100000, baseValue: 50000, quoteValue: 50000, baseBalance: 1, quoteBalance: 50000 }
 */
export function calculateTVLWithBreakdown(input: TVLInput): TVLBreakdown {
  const base = parseFloat(String(input.baseBalance)) || 0;
  const quote = parseFloat(String(input.quoteBalance)) || 0;
  const price = parseFloat(String(input.currentPrice)) || 0;

  const absBase = Math.abs(base);
  const absQuote = Math.abs(quote);
  const baseValue = price > 0 ? absBase * price : absBase;
  const quoteValue = absQuote;

  return {
    tvl: baseValue + quoteValue,
    baseValue,
    quoteValue,
    baseBalance: absBase,
    quoteBalance: absQuote,
  };
}

/**
 * Calculate P&L based on initial and current TVL
 *
 * @param initialBase - Initial base currency balance
 * @param initialQuote - Initial quote currency balance
 * @param currentBase - Current base currency balance
 * @param currentQuote - Current quote currency balance
 * @param initialPrice - Price when positions were opened
 * @param currentPrice - Current market price
 * @returns P&L metrics including absolute and percentage returns
 */
export function calculatePnLFromTVL(
  initialBase: number,
  initialQuote: number,
  currentBase: number,
  currentQuote: number,
  initialPrice: number,
  currentPrice: number
): {
  initialTVL: number;
  currentTVL: number;
  absolutePnL: number;
  percentageReturn: number;
} {
  const initialTVL = calculateTVL({
    baseBalance: initialBase,
    quoteBalance: initialQuote,
    currentPrice: initialPrice,
  });

  const currentTVL = calculateTVL({
    baseBalance: currentBase,
    quoteBalance: currentQuote,
    currentPrice: currentPrice,
  });

  const absolutePnL = currentTVL - initialTVL;
  const percentageReturn = initialTVL > 0 ? (absolutePnL / initialTVL) * 100 : 0;

  return {
    initialTVL,
    currentTVL,
    absolutePnL,
    percentageReturn,
  };
}

export default {
  calculateTVL,
  calculateTVLWithBreakdown,
  calculatePnLFromTVL,
};
