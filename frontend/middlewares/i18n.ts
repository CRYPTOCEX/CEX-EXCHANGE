import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { MiddlewareFactory } from "./stackHandler";

import { routing } from "../i18n/routing";

// The `intlMiddleware` returned by `createMiddleware` always returns a NextResponse.
// We need to differentiate between a redirect/early return and a `NextResponse.next()` signal.
export const i18nMiddleware: MiddlewareFactory = (next) => {
  const intlMiddleware = createMiddleware({
    ...routing,
    localeDetection: true, // Enable locale detection
    localePrefix: "always", // Always use locale prefix
    localeCookie: {
      name: "NEXT_LOCALE", // Cookie name for persisting locale
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    },
  });

  return async (request, event) => {
    const { pathname } = request.nextUrl;
    
    // Handle root path redirect explicitly with cookie support
    if (pathname === "/") {
      // Check for saved locale in cookie first
      const savedLocale = request.cookies.get("NEXT_LOCALE")?.value;
      
      let preferredLocale = routing.defaultLocale;
      
      if (savedLocale && routing.locales.includes(savedLocale as any)) {
        // Use saved locale from cookie if valid
        preferredLocale = savedLocale;
      } else {
        // Fall back to browser language detection
        const acceptLanguage = request.headers.get("accept-language");
        if (acceptLanguage) {
          const browserLang = acceptLanguage.split(",")[0]?.split("-")[0];
          if (browserLang && routing.locales.includes(browserLang as any)) {
            preferredLocale = browserLang;
          }
        }
      }
      
      const response = NextResponse.redirect(new URL(`/${preferredLocale}`, request.url));
      
      // Set cookie if it's different from current saved locale
      if (savedLocale !== preferredLocale) {
        response.cookies.set("NEXT_LOCALE", preferredLocale, {
          maxAge: 60 * 60 * 24 * 365, // 1 year
          sameSite: "lax",
          path: "/",
        });
      }
      
      return response;
    }
    
    const response = await intlMiddleware(request);

    // Check if we're meant to continue to the next middleware.
    // `NextResponse.next()` sets the `x-middleware-next` header.
    if (response.headers.get("x-middleware-next")) {
      return next(request, event);
    }

    // If there's no `x-middleware-next`, then this is a redirect or rewrite from i18n middleware.
    return response;
  };
};
