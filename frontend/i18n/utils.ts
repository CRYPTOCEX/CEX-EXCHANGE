/**
 * Shared i18n Utilities
 *
 * Common functions used across client and server translation systems.
 * Optimized with caching for better performance.
 */

import type { TranslationMessages } from "./types";

// ============================================================================
// KEY PATH CACHING
// ============================================================================

/**
 * Cache for parsed key paths
 * Key: "some.nested.key" -> Value: ["some", "nested", "key"]
 */
const keyPathCache = new Map<string, string[]>();

/**
 * Parse a dot-notation key path with caching
 * @example parseKeyPath("common.buttons.submit") => ["common", "buttons", "submit"]
 */
export function parseKeyPath(keyPath: string): string[] {
  if (keyPathCache.has(keyPath)) {
    return keyPathCache.get(keyPath)!;
  }

  const parts = keyPath.split(".");
  keyPathCache.set(keyPath, parts);
  return parts;
}

/**
 * Get nested value from object using dot notation (optimized with caching)
 * @example getNestedValue({ a: { b: "hello" } }, "a.b") => "hello"
 */
export function getNestedValue(
  obj: TranslationMessages | undefined,
  keyPath: string
): string | undefined {
  if (!obj) return undefined;

  const keys = parseKeyPath(keyPath);
  let current: TranslationMessages | string | undefined = obj;

  for (const key of keys) {
    if (current === undefined || typeof current === "string") {
      return undefined;
    }
    current = current[key];
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Check if a nested key exists in the translation object
 */
export function hasNestedKey(
  obj: TranslationMessages | undefined,
  keyPath: string
): boolean {
  return getNestedValue(obj, keyPath) !== undefined;
}

// ============================================================================
// DEEP MERGE WITH MEMOIZATION
// ============================================================================

/**
 * Cache for merged translation objects
 * Uses a composite key based on object references
 */
const mergeCache = new WeakMap<object, WeakMap<object, object>>();

/**
 * Deep merge two objects with memoization
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: T
): T {
  // Check cache first
  let targetCache = mergeCache.get(target);
  if (targetCache) {
    const cached = targetCache.get(source);
    if (cached) {
      return cached as T;
    }
  }

  const result = { ...target } as T;

  for (const [key, value] of Object.entries(source)) {
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  // Store in cache
  if (!targetCache) {
    targetCache = new WeakMap();
    mergeCache.set(target, targetCache);
  }
  targetCache.set(source, result);

  return result;
}

// ============================================================================
// INTL FORMATTERS
// ============================================================================

/**
 * Cache for Intl.DateTimeFormat instances
 */
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Cache for Intl.NumberFormat instances
 */
const numberFormatCache = new Map<string, Intl.NumberFormat>();

/**
 * Cache for Intl.RelativeTimeFormat instances
 */
const relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>();

/**
 * Date format presets
 */
export type DateFormatStyle = "short" | "medium" | "long" | "full";

/**
 * Format a date according to locale
 */
export function formatDate(
  date: Date | number | string,
  locale: string,
  style: DateFormatStyle = "medium"
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return String(date);
  }

  const cacheKey = `${locale}:date:${style}`;

  if (!dateFormatCache.has(cacheKey)) {
    const optionsMap: Record<DateFormatStyle, Intl.DateTimeFormatOptions> = {
      short: { month: "numeric", day: "numeric", year: "2-digit" },
      medium: { month: "short", day: "numeric", year: "numeric" },
      long: { month: "long", day: "numeric", year: "numeric" },
      full: { weekday: "long", month: "long", day: "numeric", year: "numeric" },
    };

    dateFormatCache.set(cacheKey, new Intl.DateTimeFormat(locale, optionsMap[style]));
  }

  return dateFormatCache.get(cacheKey)!.format(dateObj);
}

/**
 * Format a time according to locale
 */
export function formatTime(
  date: Date | number | string,
  locale: string,
  style: "short" | "medium" | "long" = "short"
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return String(date);
  }

  const cacheKey = `${locale}:time:${style}`;

  if (!dateFormatCache.has(cacheKey)) {
    const optionsMap: Record<"short" | "medium" | "long", Intl.DateTimeFormatOptions> = {
      short: { hour: "numeric", minute: "numeric" },
      medium: { hour: "numeric", minute: "numeric", second: "numeric" },
      long: { hour: "numeric", minute: "numeric", second: "numeric", timeZoneName: "short" },
    };

    dateFormatCache.set(cacheKey, new Intl.DateTimeFormat(locale, optionsMap[style]));
  }

  return dateFormatCache.get(cacheKey)!.format(dateObj);
}

/**
 * Format date and time together
 */
export function formatDateTime(
  date: Date | number | string,
  locale: string,
  dateStyle: DateFormatStyle = "medium",
  timeStyle: "short" | "medium" | "long" = "short"
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return String(date);
  }

  const cacheKey = `${locale}:datetime:${dateStyle}:${timeStyle}`;

  if (!dateFormatCache.has(cacheKey)) {
    dateFormatCache.set(
      cacheKey,
      new Intl.DateTimeFormat(locale, {
        dateStyle,
        timeStyle,
      })
    );
  }

  return dateFormatCache.get(cacheKey)!.format(dateObj);
}

/**
 * Format a number according to locale
 */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  const cacheKey = `${locale}:number:${JSON.stringify(options || {})}`;

  if (!numberFormatCache.has(cacheKey)) {
    numberFormatCache.set(cacheKey, new Intl.NumberFormat(locale, options));
  }

  return numberFormatCache.get(cacheKey)!.format(value);
}

/**
 * Format currency according to locale
 */
export function formatCurrency(
  value: number,
  locale: string,
  currency: string = "USD"
): string {
  const cacheKey = `${locale}:currency:${currency}`;

  if (!numberFormatCache.has(cacheKey)) {
    numberFormatCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      })
    );
  }

  return numberFormatCache.get(cacheKey)!.format(value);
}

/**
 * Format a percentage according to locale
 */
export function formatPercent(
  value: number,
  locale: string,
  decimals: number = 0
): string {
  const cacheKey = `${locale}:percent:${decimals}`;

  if (!numberFormatCache.has(cacheKey)) {
    numberFormatCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    );
  }

  return numberFormatCache.get(cacheKey)!.format(value);
}

/**
 * Format compact numbers (1K, 1M, 1B)
 */
export function formatCompact(
  value: number,
  locale: string,
  notation: "compact" | "scientific" | "engineering" = "compact"
): string {
  const cacheKey = `${locale}:compact:${notation}`;

  if (!numberFormatCache.has(cacheKey)) {
    numberFormatCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        notation,
        compactDisplay: "short",
      })
    );
  }

  return numberFormatCache.get(cacheKey)!.format(value);
}

/**
 * Relative time units
 */
type RelativeTimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date | number | string,
  locale: string,
  now: Date = new Date()
): string {
  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return String(date);
  }

  const diffMs = dateObj.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  let value: number;
  let unit: RelativeTimeUnit;

  if (Math.abs(diffSec) < 60) {
    value = diffSec;
    unit = "second";
  } else if (Math.abs(diffMin) < 60) {
    value = diffMin;
    unit = "minute";
  } else if (Math.abs(diffHour) < 24) {
    value = diffHour;
    unit = "hour";
  } else if (Math.abs(diffDay) < 7) {
    value = diffDay;
    unit = "day";
  } else if (Math.abs(diffWeek) < 4) {
    value = diffWeek;
    unit = "week";
  } else if (Math.abs(diffMonth) < 12) {
    value = diffMonth;
    unit = "month";
  } else {
    value = diffYear;
    unit = "year";
  }

  const cacheKey = `${locale}:relative`;

  if (!relativeTimeFormatCache.has(cacheKey)) {
    relativeTimeFormatCache.set(
      cacheKey,
      new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
    );
  }

  return relativeTimeFormatCache.get(cacheKey)!.format(value, unit);
}

/**
 * Format a list (e.g., "A, B, and C")
 */
export function formatList(
  items: string[],
  locale: string,
  type: "conjunction" | "disjunction" | "unit" = "conjunction"
): string {
  const formatter = new Intl.ListFormat(locale, { type, style: "long" });
  return formatter.format(items);
}

// ============================================================================
// RTL DETECTION
// ============================================================================

/**
 * List of RTL (right-to-left) locale codes
 */
const RTL_LOCALES = new Set([
  "ar",    // Arabic
  "arc",   // Aramaic
  "az",    // Azerbaijani (can be RTL in some contexts)
  "dv",    // Divehi (Maldivian)
  "fa",    // Persian (Farsi)
  "he",    // Hebrew
  "ku",    // Kurdish
  "nqo",   // N'Ko
  "ps",    // Pashto
  "sd",    // Sindhi
  "ug",    // Uyghur
  "ur",    // Urdu
  "yi",    // Yiddish
]);

/**
 * Check if a locale uses RTL (right-to-left) text direction
 */
export function isRTL(locale: string): boolean {
  // Get base language code (e.g., "ar-SA" -> "ar")
  const baseLocale = locale.split("-")[0].toLowerCase();
  return RTL_LOCALES.has(baseLocale);
}

/**
 * Get text direction for a locale
 */
export function getDirection(locale: string): "ltr" | "rtl" {
  return isRTL(locale) ? "rtl" : "ltr";
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Clear all caches (useful for testing or hot reload)
 */
export function clearUtilsCaches(): void {
  keyPathCache.clear();
  dateFormatCache.clear();
  numberFormatCache.clear();
  relativeTimeFormatCache.clear();
}
