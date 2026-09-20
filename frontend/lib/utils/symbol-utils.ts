/**
 * Symbol Utility Functions
 *
 * Centralized utilities for handling symbol format conversions across the application.
 *
 * Supported formats:
 * - Slash format (canonical): BTC/USDT
 * - Concatenated: BTCUSDT
 * - Dash format: BTC-USDT
 * - Underscore format: BTC_USDT
 */

// Known quote currencies in order of precedence (longer first for accurate matching)
const KNOWN_QUOTE_CURRENCIES = [
  "USDT",
  "USDC",
  "BUSD",
  "TUSD",
  "USDP",
  "USD",
  "BTC",
  "ETH",
  "BNB",
  "EUR",
  "GBP",
  "AUD",
  "JPY",
  "TRY",
] as const;

export type QuoteCurrency = (typeof KNOWN_QUOTE_CURRENCIES)[number];

export interface ParsedSymbol {
  base: string;
  quote: string;
  isValid: boolean;
}

/**
 * Normalize a symbol to the canonical slash format (e.g., "BTC/USDT")
 * This is the primary function for standardizing symbol formats.
 *
 * @param symbol - The symbol in any supported format
 * @returns The symbol in canonical slash format
 *
 * @example
 * normalizeSymbol("BTCUSDT") // "BTC/USDT"
 * normalizeSymbol("BTC-USDT") // "BTC/USDT"
 * normalizeSymbol("BTC_USDT") // "BTC/USDT"
 * normalizeSymbol("BTC/USDT") // "BTC/USDT"
 */
export function normalizeSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== "string") {
    return "";
  }

  const trimmed = symbol.trim().toUpperCase();

  // Already in slash format
  if (trimmed.includes("/")) {
    return trimmed;
  }

  // Dash format
  if (trimmed.includes("-")) {
    return trimmed.replace("-", "/");
  }

  // Underscore format
  if (trimmed.includes("_")) {
    return trimmed.replace("_", "/");
  }

  // Concatenated format - need to find the boundary
  for (const quote of KNOWN_QUOTE_CURRENCIES) {
    if (trimmed.endsWith(quote)) {
      const base = trimmed.slice(0, -quote.length);
      if (base.length > 0) {
        return `${base}/${quote}`;
      }
    }
  }

  // Fallback: try to split at reasonable positions
  // Look for 3-4 character quote currency at the end
  const len = trimmed.length;
  if (len >= 5) {
    // Try 4-char quote first, then 3-char
    for (const quoteLen of [4, 3]) {
      if (len > quoteLen) {
        const potentialBase = trimmed.slice(0, -quoteLen);
        const potentialQuote = trimmed.slice(-quoteLen);
        // Basic validation: quote should look like a currency
        if (/^[A-Z]{3,4}$/.test(potentialQuote) && potentialBase.length >= 2) {
          return `${potentialBase}/${potentialQuote}`;
        }
      }
    }
  }

  // Unable to parse - return as-is
  return trimmed;
}

/**
 * Parse a symbol into its base and quote components
 *
 * @param symbol - The symbol in any supported format
 * @returns ParsedSymbol object with base, quote, and validity flag
 *
 * @example
 * parseSymbol("BTC/USDT") // { base: "BTC", quote: "USDT", isValid: true }
 * parseSymbol("BTCUSDT") // { base: "BTC", quote: "USDT", isValid: true }
 */
export function parseSymbol(symbol: string): ParsedSymbol {
  const normalized = normalizeSymbol(symbol);

  if (!normalized || !normalized.includes("/")) {
    return { base: "", quote: "", isValid: false };
  }

  const [base, quote] = normalized.split("/");

  return {
    base: base || "",
    quote: quote || "",
    isValid: Boolean(base && quote),
  };
}

/**
 * Format symbol for display (with slash separator)
 *
 * @param symbol - The symbol in any format
 * @returns Display-friendly format (e.g., "BTC/USDT")
 */
export function formatSymbolForDisplay(symbol: string): string {
  return normalizeSymbol(symbol);
}

/**
 * Format symbol for API requests
 * Uses the slash format which is standard for most APIs
 *
 * @param symbol - The symbol in any format
 * @returns API-compatible format (e.g., "BTC/USDT")
 */
export function formatSymbolForApi(symbol: string): string {
  return normalizeSymbol(symbol);
}

/**
 * Format symbol for WebSocket subscriptions
 * Uses the slash format which is standard for WebSocket services
 *
 * @param symbol - The symbol in any format
 * @returns WebSocket-compatible format (e.g., "BTC/USDT")
 */
export function formatSymbolForWebSocket(symbol: string): string {
  return normalizeSymbol(symbol);
}

/**
 * Format symbol in concatenated format (no separator)
 * Useful for certain APIs or storage keys
 *
 * @param symbol - The symbol in any format
 * @returns Concatenated format (e.g., "BTCUSDT")
 */
export function formatSymbolConcatenated(symbol: string): string {
  const { base, quote } = parseSymbol(symbol);
  return `${base}${quote}`;
}

/**
 * Format symbol with dash separator
 *
 * @param symbol - The symbol in any format
 * @returns Dash format (e.g., "BTC-USDT")
 */
export function formatSymbolWithDash(symbol: string): string {
  const { base, quote } = parseSymbol(symbol);
  return `${base}-${quote}`;
}

/**
 * Format symbol with underscore separator
 *
 * @param symbol - The symbol in any format
 * @returns Underscore format (e.g., "BTC_USDT")
 */
export function formatSymbolWithUnderscore(symbol: string): string {
  const { base, quote } = parseSymbol(symbol);
  return `${base}_${quote}`;
}

/**
 * Compare two symbols for equality, regardless of format
 *
 * @param symbolA - First symbol
 * @param symbolB - Second symbol
 * @returns true if symbols represent the same trading pair
 *
 * @example
 * compareSymbols("BTC/USDT", "BTCUSDT") // true
 * compareSymbols("BTC-USDT", "BTC/USDT") // true
 */
export function compareSymbols(symbolA: string, symbolB: string): boolean {
  return normalizeSymbol(symbolA) === normalizeSymbol(symbolB);
}

/**
 * Check if a string is a valid symbol format
 *
 * @param symbol - The string to check
 * @returns true if the string can be parsed as a valid symbol
 */
export function isValidSymbol(symbol: string): boolean {
  const { isValid } = parseSymbol(symbol);
  return isValid;
}

/**
 * Extract the base currency from a symbol
 *
 * @param symbol - The symbol in any format
 * @returns The base currency (e.g., "BTC" from "BTC/USDT")
 */
export function getBaseCurrency(symbol: string): string {
  const { base } = parseSymbol(symbol);
  return base;
}

/**
 * Extract the quote currency from a symbol
 *
 * @param symbol - The symbol in any format
 * @returns The quote currency (e.g., "USDT" from "BTC/USDT")
 */
export function getQuoteCurrency(symbol: string): string {
  const { quote } = parseSymbol(symbol);
  return quote;
}

/**
 * Create a symbol from base and quote currencies
 *
 * @param base - Base currency (e.g., "BTC")
 * @param quote - Quote currency (e.g., "USDT")
 * @returns Normalized symbol (e.g., "BTC/USDT")
 */
export function createSymbol(base: string, quote: string): string {
  if (!base || !quote) {
    return "";
  }
  return `${base.toUpperCase()}/${quote.toUpperCase()}`;
}

/**
 * Get all format variations of a symbol
 * Useful for lookups where the format may vary
 *
 * @param symbol - The symbol in any format
 * @returns Array of all format variations
 *
 * @example
 * getAllSymbolFormats("BTC/USDT")
 * // ["BTC/USDT", "BTCUSDT", "BTC-USDT", "BTC_USDT", "btc/usdt", "btcusdt", "btc-usdt", "btc_usdt"]
 */
export function getAllSymbolFormats(symbol: string): string[] {
  const { base, quote, isValid } = parseSymbol(symbol);

  if (!isValid) {
    return [symbol];
  }

  const upperBase = base.toUpperCase();
  const upperQuote = quote.toUpperCase();
  const lowerBase = base.toLowerCase();
  const lowerQuote = quote.toLowerCase();

  return [
    `${upperBase}/${upperQuote}`,
    `${upperBase}${upperQuote}`,
    `${upperBase}-${upperQuote}`,
    `${upperBase}_${upperQuote}`,
    `${lowerBase}/${lowerQuote}`,
    `${lowerBase}${lowerQuote}`,
    `${lowerBase}-${lowerQuote}`,
    `${lowerBase}_${lowerQuote}`,
  ];
}

/**
 * Find a symbol in a record/object by trying all format variations
 *
 * @param record - The object to search in
 * @param symbol - The symbol to find
 * @returns The value if found, undefined otherwise
 */
export function findSymbolInRecord<T>(
  record: Record<string, T>,
  symbol: string
): T | undefined {
  // Try direct match first
  if (record[symbol] !== undefined) {
    return record[symbol];
  }

  // Try all format variations
  const formats = getAllSymbolFormats(symbol);
  for (const format of formats) {
    if (record[format] !== undefined) {
      return record[format];
    }
  }

  return undefined;
}

/**
 * Symbol format type for type-safe operations
 */
export type SymbolFormat = "slash" | "concatenated" | "dash" | "underscore";

/**
 * Format a symbol to a specific format
 *
 * @param symbol - The symbol in any format
 * @param format - The target format
 * @returns The symbol in the specified format
 */
export function formatSymbol(symbol: string, format: SymbolFormat): string {
  switch (format) {
    case "slash":
      return normalizeSymbol(symbol);
    case "concatenated":
      return formatSymbolConcatenated(symbol);
    case "dash":
      return formatSymbolWithDash(symbol);
    case "underscore":
      return formatSymbolWithUnderscore(symbol);
    default:
      return normalizeSymbol(symbol);
  }
}
