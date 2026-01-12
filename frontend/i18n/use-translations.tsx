"use client";

/**
 * useTranslations Hook
 *
 * Drop-in replacement for next-intl's useTranslations.
 * Returns a translation function for the specified namespace.
 */

import { useMemo } from "react";
import type { Namespace, TranslationFunction } from "./types";
import { useTranslationContext } from "./context";
import {
  getNestedValue,
  hasNestedKey,
  formatDate,
  formatTime,
  formatDateTime,
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact,
  formatRelativeTime,
  formatList,
  isRTL,
  getDirection,
  type DateFormatStyle,
} from "./utils";

/**
 * Extended translation function with additional utilities
 */
export interface ExtendedTranslationFunction extends TranslationFunction {
  /**
   * Check if a translation key exists
   */
  has: (key: string) => boolean;
  /**
   * Get raw translation value without interpolation
   */
  raw: (key: string) => string;
  /**
   * Get rich text with component interpolation (simplified version)
   * For complex rich text, consider using a dedicated component
   */
  rich: (
    key: string,
    components: Record<string, (chunks: string) => React.ReactNode>
  ) => React.ReactNode;
  /**
   * Format a date according to locale
   */
  formatDate: (date: Date | number | string, style?: DateFormatStyle) => string;
  /**
   * Format a time according to locale
   */
  formatTime: (date: Date | number | string, style?: "short" | "medium" | "long") => string;
  /**
   * Format date and time together
   */
  formatDateTime: (date: Date | number | string, dateStyle?: DateFormatStyle, timeStyle?: "short" | "medium" | "long") => string;
  /**
   * Format a number according to locale
   */
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  /**
   * Format currency according to locale
   */
  formatCurrency: (value: number, currency?: string) => string;
  /**
   * Format a percentage according to locale
   */
  formatPercent: (value: number, decimals?: number) => string;
  /**
   * Format compact numbers (1K, 1M, 1B)
   */
  formatCompact: (value: number) => string;
  /**
   * Format relative time (e.g., "2 hours ago", "in 3 days")
   */
  formatRelativeTime: (date: Date | number | string, now?: Date) => string;
  /**
   * Format a list (e.g., "A, B, and C")
   */
  formatList: (items: string[], type?: "conjunction" | "disjunction" | "unit") => string;
  /**
   * Check if current locale is RTL
   */
  isRTL: () => boolean;
  /**
   * Get text direction for current locale
   */
  getDirection: () => "ltr" | "rtl";
}

/**
 * useTranslations Hook
 *
 * Get a translation function for the specified namespace.
 * The namespace must be loaded in a parent TranslationProvider.
 *
 * @param namespace - The translation namespace to use
 * @returns Translation function for the namespace
 *
 * @example
 * ```tsx
 * "use client";
 * import { useTranslations } from "@/i18n";
 *
 * export function MyComponent() {
 *   const t = useTranslations("common");
 *
 *   return (
 *     <div>
 *       <h1>{t("title")}</h1>
 *       <p>{t("greeting", { name: "World" })}</p>
 *       <p>{t.formatDate(new Date())}</p>
 *       <p>{t.formatCurrency(1234.56, "USD")}</p>
 *       <p>{t.formatRelativeTime(new Date(Date.now() - 3600000))}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslations(
  namespace: Namespace
): ExtendedTranslationFunction {
  const { t: getTranslator, messages, locale } = useTranslationContext();

  return useMemo(() => {
    const baseTranslator = getTranslator(namespace);
    const namespaceMessages = messages[namespace];

    // Create extended translator with additional methods
    const translator = ((
      key: string,
      params?: Record<string, string | number>
    ): string => {
      return baseTranslator(key, params);
    }) as ExtendedTranslationFunction;

    // Add has method to check if key exists
    translator.has = (key: string): boolean => {
      return hasNestedKey(namespaceMessages, key);
    };

    // Add raw method to get value without interpolation
    translator.raw = (key: string): string => {
      return getNestedValue(namespaceMessages, key) ?? key;
    };

    // Add rich method for component interpolation
    translator.rich = (
      key: string,
      components: Record<string, (chunks: string) => React.ReactNode>
    ): React.ReactNode => {
      const template = translator.raw(key);
      if (template === key) return key;

      // Parse rich text format: <tag>content</tag>
      const parts: React.ReactNode[] = [];
      let partIndex = 0;

      // Match patterns like <tag>content</tag>
      const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
      let lastIndex = 0;
      let match;

      while ((match = tagRegex.exec(template)) !== null) {
        // Add text before the tag
        if (match.index > lastIndex) {
          parts.push(template.slice(lastIndex, match.index));
        }

        const [, tagName, content] = match;
        const component = components[tagName];

        if (component) {
          parts.push(
            <span key={`rich-${partIndex++}`}>{component(content)}</span>
          );
        } else {
          // If no component provided, just render the content
          parts.push(content);
        }

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < template.length) {
        parts.push(template.slice(lastIndex));
      }

      return parts.length === 1 ? parts[0] : parts;
    };

    // Add Intl formatters
    translator.formatDate = (date, style = "medium") => formatDate(date, locale, style);
    translator.formatTime = (date, style = "short") => formatTime(date, locale, style);
    translator.formatDateTime = (date, dateStyle = "medium", timeStyle = "short") =>
      formatDateTime(date, locale, dateStyle, timeStyle);
    translator.formatNumber = (value, options) => formatNumber(value, locale, options);
    translator.formatCurrency = (value, currency = "USD") => formatCurrency(value, locale, currency);
    translator.formatPercent = (value, decimals = 0) => formatPercent(value, locale, decimals);
    translator.formatCompact = (value) => formatCompact(value, locale);
    translator.formatRelativeTime = (date, now) => formatRelativeTime(date, locale, now);
    translator.formatList = (items, type = "conjunction") => formatList(items, locale, type);

    // Add RTL helpers
    translator.isRTL = () => isRTL(locale);
    translator.getDirection = () => getDirection(locale);

    return translator;
  }, [getTranslator, messages, namespace, locale]);
}

export default useTranslations;
