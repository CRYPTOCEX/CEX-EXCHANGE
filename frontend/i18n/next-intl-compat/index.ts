/**
 * next-intl Compatibility Layer
 *
 * This module provides drop-in replacements for next-intl imports.
 * It allows existing code using `import { ... } from "next-intl"` to work
 * without any changes.
 */

// Re-export everything from our custom i18n system
export { useTranslations } from "../use-translations";
export { useLocale, useHasTranslations, TranslationProvider } from "../context";
export { TranslationProvider as NextIntlClientProvider } from "../context";
export type { TranslationProviderProps, TranslationProviderProps as NextIntlClientProviderProps } from "../context";

// Re-export config utilities
export { config } from "../config";

// For hasLocale compatibility
export { isValidLocale as hasLocale } from "../server-routing";

// Re-export types
export type {
  Namespace,
  TranslationMessages,
  TranslationFunction,
} from "../types";
