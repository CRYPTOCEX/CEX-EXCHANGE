/**
 * next-intl/server Compatibility Layer
 *
 * This module provides drop-in replacements for next-intl/server imports.
 */

// Re-export server functions
//
// `loadLayoutMessages` rides here so `app/[locale]/layout.tsx` can reach it
// without changing the shape of its existing `from "next-intl/server"` import.
// Everything in this file resolves through `../server`, which is what installs
// the disk-backed chunk reader — see the side-effect import at the top of it.
export {
  getTranslations,
  loadAllNamespaces,
  loadLayoutMessages,
  loadCoreTranslations,
  loadRouteTranslations,
  routeChunkUrls,
  getLocaleFromParams,
} from "../server";

export type {
  GetTranslationsOptions,
  ServerTranslationFunction,
  MessagesWithMeta,
  I18nMessagesMeta,
} from "../server";

// For getRequestConfig compatibility - this is a no-op now
// since we don't need request config with our custom system
export function getRequestConfig(callback: () => Promise<any>) {
  // This is kept for compatibility but not used
  return callback;
}
