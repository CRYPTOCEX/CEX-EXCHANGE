/**
 * i18n Middleware
 *
 * Handles locale detection, validation, and routing.
 * Drop-in replacement for next-intl/middleware.
 */

import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { config } from "./config";

/**
 * Cookie configuration for locale persistence
 */
export interface LocaleCookieConfig {
  name: string;
  maxAge: number;
  sameSite: "lax" | "strict" | "none";
  path?: string;
}

/**
 * Middleware configuration
 */
export interface I18nMiddlewareConfig {
  locales: string[];
  defaultLocale: string;
  localeDetection?: boolean;
  localePrefix?: "always" | "as-needed" | "never";
  localeCookie?: LocaleCookieConfig;
}

/**
 * Default cookie configuration
 */
const defaultCookieConfig: LocaleCookieConfig = {
  name: "NEXT_LOCALE",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: "lax",
  path: "/",
};

/**
 * Extract locale from pathname
 */
function getLocaleFromPathname(pathname: string, locales: string[]): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0])) {
    return segments[0];
  }
  return null;
}

/**
 * Get preferred locale from request
 */
function getPreferredLocale(
  request: NextRequest,
  locales: string[],
  defaultLocale: string,
  cookieName: string
): string {
  // Check cookie first
  const savedLocale = request.cookies.get(cookieName)?.value;
  if (savedLocale && locales.includes(savedLocale)) {
    return savedLocale;
  }

  // Fall back to Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(",")
      .map((lang) => {
        const [code, priority] = lang.trim().split(";q=");
        return {
          code: code.split("-")[0], // Get base language code
          priority: priority ? parseFloat(priority) : 1,
        };
      })
      .sort((a, b) => b.priority - a.priority);

    for (const { code } of languages) {
      if (locales.includes(code)) {
        return code;
      }
    }
  }

  return defaultLocale;
}

/**
 * Create i18n middleware
 *
 * @example
 * ```ts
 * import { createI18nMiddleware } from "@/i18n/middleware";
 * import { config as i18nConfig } from "@/i18n/config";
 *
 * export const i18nMiddleware = createI18nMiddleware({
 *   locales: i18nConfig.locales,
 *   defaultLocale: i18nConfig.defaultLocale,
 *   localeDetection: true,
 *   localePrefix: "always",
 * });
 * ```
 */
export function createI18nMiddleware(middlewareConfig: I18nMiddlewareConfig) {
  const {
    locales,
    defaultLocale,
    localeDetection = true,
    localePrefix = "always",
    localeCookie = defaultCookieConfig,
  } = middlewareConfig;

  return async function i18nMiddleware(
    request: NextRequest
  ): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Get locale from pathname
    const pathnameLocale = getLocaleFromPathname(pathname, locales);

    // Handle root path
    if (pathname === "/") {
      if (localePrefix === "always") {
        const preferredLocale = localeDetection
          ? getPreferredLocale(request, locales, defaultLocale, localeCookie.name)
          : defaultLocale;

        const redirectUrl = new URL(`/${preferredLocale}`, request.url);
        const response = NextResponse.redirect(redirectUrl);

        // Set locale cookie
        response.cookies.set(localeCookie.name, preferredLocale, {
          maxAge: localeCookie.maxAge,
          sameSite: localeCookie.sameSite,
          path: localeCookie.path ?? "/",
        });

        return response;
      }
    }

    // If pathname has a valid locale
    if (pathnameLocale) {
      // Update cookie if locale changed
      const savedLocale = request.cookies.get(localeCookie.name)?.value;
      if (savedLocale !== pathnameLocale) {
        const response = NextResponse.next();
        response.cookies.set(localeCookie.name, pathnameLocale, {
          maxAge: localeCookie.maxAge,
          sameSite: localeCookie.sameSite,
          path: localeCookie.path ?? "/",
        });
        return response;
      }

      return NextResponse.next();
    }

    // No locale in pathname - redirect to add locale prefix
    if (localePrefix === "always") {
      const preferredLocale = localeDetection
        ? getPreferredLocale(request, locales, defaultLocale, localeCookie.name)
        : defaultLocale;

      const newPathname = `/${preferredLocale}${pathname}`;
      const redirectUrl = new URL(newPathname, request.url);
      redirectUrl.search = request.nextUrl.search; // Preserve query params

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set(localeCookie.name, preferredLocale, {
        maxAge: localeCookie.maxAge,
        sameSite: localeCookie.sameSite,
        path: localeCookie.path ?? "/",
      });

      return response;
    }

    return NextResponse.next();
  };
}

/**
 * Pre-configured i18n middleware using config from config.ts
 */
export function createDefaultI18nMiddleware() {
  return createI18nMiddleware({
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    localeDetection: true,
    localePrefix: "always",
    localeCookie: defaultCookieConfig,
  });
}
