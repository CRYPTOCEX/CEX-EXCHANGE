/**
 * Translation System Configuration
 */

import type { Namespace, TranslationConfig } from "./types";

// Get default locale from environment variable or fallback to "en"
const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en";

// Handle multi-line environment variable with proper parsing
const languagesString = process.env.NEXT_PUBLIC_LANGUAGES || "";
const locales = languagesString
  .split(/[,\n\r]+/)
  .map((code) => code.trim())
  .filter((code) => code.length > 0);

// If no locales configured, use defaults
const configuredLocales = locales.length > 0 ? locales : [defaultLocale, "ar"];

// Base namespaces loaded on every page (keep minimal for performance)
const defaultNamespaces: Namespace[] = ["common", "menu"];

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === "development";

// Check if optimized loading should be used
// In development: always load full namespaces for HMR
// In production: use pre-generated key-level chunks if available
const useOptimizedLoading = !isDevelopment;

export const config: TranslationConfig & {
  isDevelopment: boolean;
  useOptimizedLoading: boolean;
} = {
  defaultLocale,
  locales: configuredLocales,
  defaultNamespaces,
  isDevelopment,
  useOptimizedLoading,
};

export const isValidLocale = (locale: string): boolean => {
  return config.locales.includes(locale);
};

export const getDefaultLocale = (): string => {
  return config.defaultLocale;
};

export const shouldUseOptimizedLoading = (): boolean => {
  return config.useOptimizedLoading;
};
