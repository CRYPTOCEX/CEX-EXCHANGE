/**
 * i18n Middleware (Custom Implementation)
 *
 * Handles locale detection, validation, and routing without next-intl.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MiddlewareFactory } from "./stackHandler";
import { config } from "../i18n/config";

/**
 * Cookie configuration for locale persistence
 */
const LOCALE_COOKIE = {
  name: "NEXT_LOCALE",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Extract locale from pathname
 */
function getLocaleFromPathname(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && config.locales.includes(segments[0])) {
    return segments[0];
  }
  return null;
}

/**
 * Get preferred locale from request
 */
function getPreferredLocale(request: NextRequest): string {
  // Check cookie first
  const savedLocale = request.cookies.get(LOCALE_COOKIE.name)?.value;
  if (savedLocale && config.locales.includes(savedLocale)) {
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
      if (config.locales.includes(code)) {
        return code;
      }
    }
  }

  return config.defaultLocale;
}

/**
 * i18n Middleware Factory
 */
export const i18nMiddleware: MiddlewareFactory = (next) => {
  return async (request, event) => {
    const { pathname } = request.nextUrl;

    // Block common exploit/malicious paths early (before locale validation)
    // This prevents bot attacks targeting WordPress/PHP vulnerabilities from cluttering logs
    // by rejecting them at the middleware level before they reach the [locale] route handler
    const maliciousPatterns = [
      /\.php$/i,           // Any PHP file (wp-login.php, shell.php, etc.)
      /\.env$/i,           // Environment files
      /\.git/i,            // Git files
      /\.sql$/i,           // SQL files
      /xmlrpc/i,           // WordPress XML-RPC
      /wp-/i,              // WordPress files (wp-admin, wp-content, etc.)
      /admin\.php/i,       // Admin PHP files
      /shell/i,            // Shell scripts
      /\.bak$/i,           // Backup files
    ];

    const firstSegment = pathname.split('/')[1];
    if (firstSegment && maliciousPatterns.some(pattern => pattern.test(firstSegment))) {
      // Return 404 immediately without logging to avoid spam
      return new NextResponse(null, { status: 404 });
    }

    // Handle root path redirect explicitly with cookie support
    if (pathname === "/") {
      const preferredLocale = getPreferredLocale(request);

      const response = NextResponse.redirect(
        new URL(`/${preferredLocale}`, request.url)
      );

      // Set cookie
      response.cookies.set(LOCALE_COOKIE.name, preferredLocale, {
        maxAge: LOCALE_COOKIE.maxAge,
        sameSite: LOCALE_COOKIE.sameSite,
        path: LOCALE_COOKIE.path,
      });

      return response;
    }

    // Get locale from pathname
    const pathnameLocale = getLocaleFromPathname(pathname);

    // If pathname has a valid locale
    if (pathnameLocale) {
      // Update cookie if locale changed
      const savedLocale = request.cookies.get(LOCALE_COOKIE.name)?.value;

      if (savedLocale !== pathnameLocale) {
        // Create response and continue to next middleware
        const response = next(request, event);

        // If next middleware returns a response, add cookie to it
        if (response instanceof NextResponse) {
          response.cookies.set(LOCALE_COOKIE.name, pathnameLocale, {
            maxAge: LOCALE_COOKIE.maxAge,
            sameSite: LOCALE_COOKIE.sameSite,
            path: LOCALE_COOKIE.path,
          });
          return response;
        }

        // Otherwise, create a new response with the cookie
        const nextResponse = NextResponse.next();
        nextResponse.cookies.set(LOCALE_COOKIE.name, pathnameLocale, {
          maxAge: LOCALE_COOKIE.maxAge,
          sameSite: LOCALE_COOKIE.sameSite,
          path: LOCALE_COOKIE.path,
        });

        // Set header to signal we should continue to next middleware
        nextResponse.headers.set("x-middleware-next", "1");
        return nextResponse;
      }

      // Locale matches cookie, continue to next middleware
      return next(request, event);
    }

    // No locale in pathname - redirect to add locale prefix
    const preferredLocale = getPreferredLocale(request);
    const newPathname = `/${preferredLocale}${pathname}`;
    const redirectUrl = new URL(newPathname, request.url);
    redirectUrl.search = request.nextUrl.search; // Preserve query params

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(LOCALE_COOKIE.name, preferredLocale, {
      maxAge: LOCALE_COOKIE.maxAge,
      sameSite: LOCALE_COOKIE.sameSite,
      path: LOCALE_COOKIE.path,
    });

    return response;
  };
};
