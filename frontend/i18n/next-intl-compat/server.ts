/**
 * next-intl/server Compatibility Layer
 *
 * This module provides drop-in replacements for next-intl/server imports.
 */

// Re-export server functions
export {
  getTranslations,
  loadAllNamespaces,
  getLocaleFromParams,
} from "../server";

export type {
  GetTranslationsOptions,
  ServerTranslationFunction,
} from "../server";

// For getRequestConfig compatibility - this is a no-op now
// since we don't need request config with our custom system
export function getRequestConfig(callback: () => Promise<any>) {
  // This is kept for compatibility but not used
  return callback;
}
