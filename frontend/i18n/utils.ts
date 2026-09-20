/**
 * Shared i18n Utilities
 *
 * Common functions used across client and server translation systems.
 * Optimized with caching for better performance.
 */

import type { TranslationMessages } from "./types";
import { isIntlCurrencyCode } from "@/utils/currency";

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
 *
 * A namespace may store a dotted key in EITHER shape, and both are in use:
 *   nested — `ext_admin_ai_support.nav` is an object, reached by walking
 *   flat   — `ext_dex["terminal.summary.rate"]` is a single literal key
 *
 * Walking alone resolved only the first, so every flat dotted key returned
 * undefined and the caller rendered the key path itself — the swap terminal
 * showed a literal "terminal.summary.rate" where a label belonged (64 such
 * keys across `ext_dex` and `ext_trading-bot`). Fall back to the literal key
 * when the walk finds nothing.
 *
 * The two shapes are not interchangeable, so neither can simply be converted
 * into the other: `ext_dex` holds BOTH `dex.venue.directPool` (a string) and
 * `dex.venue.directPool.operatorProvided`, which no nested object can express.
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
      current = undefined;
      break;
    }
    current = current[key];
  }

  if (typeof current === "string") return current;

  // Nested walk found nothing (or landed on an object) - try the literal key.
  const flat = obj[keyPath];
  return typeof flat === "string" ? flat : undefined;
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
// MISSING-KEY FALLBACK
// ============================================================================

/**
 * Structural tail segments. `nav.dashboard.title` is a label about the
 * dashboard, not about a title, so the last segment is noise once it is on
 * screen. Only dropped when something precedes it — `title` alone is all the
 * key has to say.
 */
const STRUCTURAL_TAIL = new Set([
  "title",
  "description",
  "label",
  "name",
  "text",
  "heading",
  "placeholder",
]);

const humanizeCache = new Map<string, string>();

/**
 * Turn a translation key into something readable, for the moment a key has no
 * translation to show.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * The miss path used to `return key`, so a key that was absent from the loaded
 * messages was PAINTED, verbatim, where a label belonged. That is not a
 * theoretical failure: the deposit gateway buttons shipped to production
 * reading `pay_with_stripe`, and the swap terminal showed a literal
 * `terminal.summary.rate`. Once the app stops shipping the whole catalogue to
 * every page, a miss becomes ordinary — a route's remainder is in flight for a
 * moment on every hard navigation — and "ordinary" and "renders a raw key" must
 * not be true at the same time.
 *
 * This app's keys are sentence-derived snake_case, which is the reason a
 * mechanical transform reads as text rather than as debug output:
 *
 *   open_menu                                     -> "Open menu"
 *   nav.dashboard.title                           -> "Dashboard"
 *   an_unexpected_error_occurred_please_try_again -> "An unexpected error occurred please try again"
 *
 * ---------------------------------------------------------------------------
 * WHY IT MUST BE PURE
 * ---------------------------------------------------------------------------
 * The server renders a miss and the browser re-renders the same miss before its
 * top-up lands. If the two disagreed React would report a hydration mismatch
 * and throw away the server's HTML for that subtree. So: no clock, no locale,
 * no state — same key in, same string out, on both runtimes, forever. The cache
 * is memoization only and cannot change an answer.
 */
export function humanizeKey(key: string): string {
  if (!key) return "";

  const cached = humanizeCache.get(key);
  if (cached !== undefined) return cached;

  const segments = key.split(".").filter(Boolean);
  if (segments.length > 1 && STRUCTURAL_TAIL.has(segments[segments.length - 1])) {
    segments.pop();
  }

  // Only the last meaningful segment carries the label; the ones before it are
  // the path to it ("nav", "errors", "form") and repeating them reads as debug
  // output, which is the thing this is here to avoid.
  const leaf = segments.length > 0 ? segments[segments.length - 1] : key;

  const words = leaf
    .replace(/[_-]+/g, " ")
    // camelCase and PascalCase both occur in this codebase's keys.
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  const humanized = words
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : key;

  humanizeCache.set(key, humanized);
  return humanized;
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
 *
 * `style: "currency"` throws a RangeError on any code that is not three ASCII
 * letters, so a wallet or order denominated in USDT crashed the render that
 * called this. `isIntlCurrencyCode` is the exact test Intl applies; when it
 * fails we cache a plain number formatter under a DIFFERENT key and print the
 * ticker ourselves, which is what Intl does anyway for the three-letter codes
 * it does not recognise (`ETH 3.00`).
 */
export function formatCurrency(
  value: number,
  locale: string,
  currency: string = "USD"
): string {
  const code = String(currency ?? "").trim().toUpperCase();

  if (!isIntlCurrencyCode(code)) {
    const plainKey = `${locale}:number:currency-fallback`;
    if (!numberFormatCache.has(plainKey)) {
      numberFormatCache.set(
        plainKey,
        new Intl.NumberFormat(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    }
    const figure = numberFormatCache.get(plainKey)!.format(value);
    return code ? `${code} ${figure}` : figure;
  }

  const cacheKey = `${locale}:currency:${code}`;

  if (!numberFormatCache.has(cacheKey)) {
    numberFormatCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
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
  humanizeCache.clear();
  dateFormatCache.clear();
  numberFormatCache.clear();
  relativeTimeFormatCache.clear();
}
