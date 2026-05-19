/**
 * Server-side Translation Utilities
 *
 * For use in Server Components, Server Actions, and Route Handlers.
 * These functions work without React context.
 */

import type {
  Namespace,
  TranslationMessages,
  TranslationFunction,
} from "./types";
import { loadNamespace } from "./loader";
import { interpolate, handlePlural } from "./interpolate";
import { getNestedValue, hasNestedKey } from "./utils";
import { config } from "./config";

// ============================================================================
// TRANSLATION FUNCTION TYPES
// ============================================================================

/**
 * Extended translation function with additional utilities
 */
export interface ServerTranslationFunction extends TranslationFunction {
  has: (key: string) => boolean;
  raw: (key: string) => string;
}

/**
 * Create a translation function for server-side use
 */
function createServerTranslationFunction(
  messages: TranslationMessages,
  namespace: Namespace,
  locale: string
): ServerTranslationFunction {
  const translator = ((
    key: string,
    params?: Record<string, string | number>
  ): string => {
    const value = getNestedValue(messages, key);

    if (value === undefined) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[i18n] Missing translation: "${namespace}.${key}" for locale "${locale}"`
        );
      }
      return key;
    }

    let result = handlePlural(value, params);
    result = interpolate(result, params);

    return result;
  }) as ServerTranslationFunction;

  translator.has = (key: string): boolean => {
    return hasNestedKey(messages, key);
  };

  translator.raw = (key: string): string => {
    return getNestedValue(messages, key) ?? key;
  };

  return translator;
}

// ============================================================================
// STANDARD TRANSLATION FUNCTIONS
// ============================================================================

/**
 * Options for getTranslations
 */
export interface GetTranslationsOptions {
  locale?: string;
  namespace?: Namespace;
}

/**
 * Get locale from Next.js request context (server-side only)
 * Falls back to default locale if not available
 */
async function getLocaleFromRequest(): Promise<string> {
  try {
    // Dynamic import to avoid issues in non-server contexts
    const { headers } = await import("next/headers");
    const headersList = await headers();

    // Try x-next-url header (contains the full URL path)
    const nextUrl = headersList.get("x-next-url");
    if (nextUrl) {
      try {
        const url = new URL(nextUrl, "http://localhost");
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length > 0 && config.locales.includes(pathParts[0])) {
          return pathParts[0];
        }
      } catch {
        // Invalid URL, continue to other methods
      }
    }

    // Try x-invoke-path header (Next.js internal)
    const invokePath = headersList.get("x-invoke-path");
    if (invokePath) {
      const pathParts = invokePath.split("/").filter(Boolean);
      if (pathParts.length > 0 && config.locales.includes(pathParts[0])) {
        return pathParts[0];
      }
    }

    // Try to get locale from NEXT_LOCALE cookie
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get("NEXT_LOCALE");
    if (localeCookie?.value && config.locales.includes(localeCookie.value)) {
      return localeCookie.value;
    }

    // Try to extract from the URL path via referer header
    const referer = headersList.get("referer");
    if (referer) {
      try {
        const url = new URL(referer);
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length > 0 && config.locales.includes(pathParts[0])) {
          return pathParts[0];
        }
      } catch {
        // Invalid URL, continue
      }
    }
  } catch {
    // Headers not available (e.g., during static generation)
  }

  return config.defaultLocale;
}

/**
 * Get translations for a namespace (Server Components)
 *
 * Supports two calling conventions for next-intl compatibility:
 * 1. getTranslations("namespace") - uses locale from request context
 * 2. getTranslations({ locale, namespace }) - explicit locale
 */
export async function getTranslations(
  optionsOrNamespace: GetTranslationsOptions | Namespace
): Promise<ServerTranslationFunction> {
  let locale: string;
  let namespace: Namespace;

  if (typeof optionsOrNamespace === "string") {
    // next-intl style: getTranslations("namespace")
    namespace = optionsOrNamespace;
    locale = await getLocaleFromRequest();
  } else {
    // Custom style: getTranslations({ locale, namespace })
    namespace = optionsOrNamespace.namespace ?? "common";
    locale = optionsOrNamespace.locale ?? await getLocaleFromRequest();
  }

  const messages = await loadNamespace(locale, namespace);
  return createServerTranslationFunction(messages, namespace, locale);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get locale from params with fallback
 */
export function getLocaleFromParams(
  params: { locale?: string } | undefined
): string {
  return params?.locale ?? config.defaultLocale;
}

// Re-export loadAllNamespaces for convenience
export { loadAllNamespaces } from "./loader";
