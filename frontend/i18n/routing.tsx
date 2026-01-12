"use client";

/**
 * Internationalized Routing Utilities
 *
 * Drop-in replacement for next-intl/navigation.
 * Provides locale-aware Link, useRouter, usePathname, and redirect.
 */

import NextLink from "next/link";
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useParams,
} from "next/navigation";
import { redirect as nextRedirect } from "next/navigation";
import {
  forwardRef,
  useMemo,
  type ComponentProps,
  type ForwardedRef,
} from "react";
import { config } from "./config";

/**
 * Get locale from pathname
 */
function extractLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && config.locales.includes(segments[0])) {
    return segments[0];
  }
  return null;
}

/**
 * Add locale prefix to path if not present
 */
function addLocalePrefix(path: string, locale: string): string {
  // Handle relative paths
  if (!path.startsWith("/")) {
    return path;
  }

  // Check if path already has a locale prefix
  const existingLocale = extractLocaleFromPath(path);
  if (existingLocale) {
    // Replace existing locale with new one
    return path.replace(`/${existingLocale}`, `/${locale}`);
  }

  // Add locale prefix
  return `/${locale}${path}`;
}

/**
 * Remove locale prefix from path
 */
function removeLocalePrefix(path: string): string {
  const locale = extractLocaleFromPath(path);
  if (locale) {
    const result = path.replace(`/${locale}`, "") || "/";
    return result;
  }
  return path;
}

/**
 * Hook to get current locale from URL params
 */
export function useLocale(): string {
  const params = useParams();
  const locale = params?.locale as string | undefined;
  return locale ?? config.defaultLocale;
}

/**
 * Hook to get pathname without locale prefix
 */
export function usePathname(): string {
  const fullPathname = useNextPathname();
  return removeLocalePrefix(fullPathname);
}

/**
 * Hook to get locale-aware router
 */
export function useRouter() {
  const nextRouter = useNextRouter();
  const locale = useLocale();

  return useMemo(
    () => ({
      /**
       * Navigate to a path (adds locale prefix automatically)
       */
      push: (path: string, options?: { locale?: string }) => {
        const targetLocale = options?.locale ?? locale;
        nextRouter.push(addLocalePrefix(path, targetLocale));
      },

      /**
       * Replace current path (adds locale prefix automatically)
       */
      replace: (path: string, options?: { locale?: string }) => {
        const targetLocale = options?.locale ?? locale;
        nextRouter.replace(addLocalePrefix(path, targetLocale));
      },

      /**
       * Prefetch a path (adds locale prefix automatically)
       */
      prefetch: (path: string, options?: { locale?: string }) => {
        const targetLocale = options?.locale ?? locale;
        nextRouter.prefetch(addLocalePrefix(path, targetLocale));
      },

      /**
       * Go back in history
       */
      back: () => nextRouter.back(),

      /**
       * Go forward in history
       */
      forward: () => nextRouter.forward(),

      /**
       * Refresh the current page
       */
      refresh: () => nextRouter.refresh(),
    }),
    [nextRouter, locale]
  );
}

/**
 * Props for locale-aware Link component
 */
export interface LinkProps extends Omit<ComponentProps<typeof NextLink>, "href"> {
  href: string;
  locale?: string;
}

/**
 * Locale-aware Link component
 *
 * Automatically adds locale prefix to hrefs.
 *
 * @example
 * ```tsx
 * import { Link } from "@/i18n/routing";
 *
 * // Will render as /en/dashboard (if current locale is en)
 * <Link href="/dashboard">Dashboard</Link>
 *
 * // Force a specific locale
 * <Link href="/dashboard" locale="fr">Dashboard (French)</Link>
 * ```
 */
export const Link = forwardRef(function Link(
  { href, locale, ...props }: LinkProps,
  ref: ForwardedRef<HTMLAnchorElement>
) {
  const currentLocale = useLocale();
  const targetLocale = locale ?? currentLocale;

  // Handle external links
  if (
    typeof href === "string" &&
    (href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:"))
  ) {
    return <NextLink ref={ref} href={href} {...props} />;
  }

  // Handle hash-only links
  if (typeof href === "string" && href.startsWith("#")) {
    return <NextLink ref={ref} href={href} {...props} />;
  }

  const localizedHref = addLocalePrefix(href, targetLocale);

  return <NextLink ref={ref} href={localizedHref} {...props} />;
});

/**
 * Get all supported locales
 */
export function getLocales(): string[] {
  return config.locales;
}

/**
 * Check if a locale is supported
 */
export function isValidLocale(locale: string): boolean {
  return config.locales.includes(locale);
}

/**
 * Get the default locale
 */
export function getDefaultLocale(): string {
  return config.defaultLocale;
}

/**
 * Routing configuration object
 * Mimics next-intl's defineRouting return value for compatibility
 */
export const routing = {
  locales: config.locales,
  defaultLocale: config.defaultLocale,
} as const;

/**
 * Client-side redirect with locale support
 *
 * Note: This is for client-side use. For server components,
 * use the redirect from ./server-routing.ts
 */
export function redirect(path: string, locale?: string): never {
  const targetLocale = locale ?? config.defaultLocale;
  const localizedPath = addLocalePrefix(path, targetLocale);
  nextRedirect(localizedPath);
}
