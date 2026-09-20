/**
 * Server-side Routing Utilities
 *
 * For use in Server Components, Server Actions, and middleware.
 */

import { redirect as nextRedirect } from "next/navigation";
import { config } from "./config";

/**
 * Add locale prefix to path
 */
function addLocalePrefix(path: string, locale: string): string {
  if (!path.startsWith("/")) {
    return path;
  }

  // Check if path already has a locale prefix
  const segments = path.split("/").filter(Boolean);
  if (segments.length > 0 && config.locales.includes(segments[0])) {
    // Replace existing locale
    return path.replace(`/${segments[0]}`, `/${locale}`);
  }

  return `/${locale}${path}`;
}

/**
 * Server-side redirect with locale support
 *
 * @param path - Path to redirect to
 * @param locale - Target locale (required for server-side)
 *
 * @example
 * ```tsx
 * // In a Server Component or Server Action
 * import { redirect } from "@/i18n/server-routing";
 *
 * export default async function Page({ params }) {
 *   const { locale } = await params;
 *
 *   if (!isAuthenticated) {
 *     redirect("/login", locale);
 *   }
 *
 *   return <div>Protected content</div>;
 * }
 * ```
 */
export function redirect(path: string, locale: string): never {
  const localizedPath = addLocalePrefix(path, locale);
  nextRedirect(localizedPath);
}

/**
 * Generate a localized URL for use in Server Components
 *
 * @example
 * ```tsx
 * import { getLocalizedUrl } from "@/i18n/server-routing";
 *
 * export default async function Page({ params }) {
 *   const { locale } = await params;
 *   const dashboardUrl = getLocalizedUrl("/dashboard", locale);
 *   // Returns "/en/dashboard" if locale is "en"
 * }
 * ```
 */
export function getLocalizedUrl(path: string, locale: string): string {
  return addLocalePrefix(path, locale);
}

/**
 * Get all supported locales
 */
export function getLocales(): readonly string[] {
  return config.locales;
}

/**
 * Get the default locale
 */
export function getDefaultLocale(): string {
  return config.defaultLocale;
}

/**
 * Check if a locale is supported
 */
export function isValidLocale(locale: string): boolean {
  return config.locales.includes(locale);
}

/**
 * Validate and return locale, falling back to default if invalid
 */
export function validateLocale(locale: string | undefined): string {
  if (locale && isValidLocale(locale)) {
    return locale;
  }
  return config.defaultLocale;
}
