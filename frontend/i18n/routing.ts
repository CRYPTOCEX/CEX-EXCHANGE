import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

// Get default locale from environment variable or fallback to "en"
const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en";

// Handle multi-line environment variable with proper parsing
const languagesString = process.env.NEXT_PUBLIC_LANGUAGES || "";
const locales = languagesString
  .split(/[,\n\r]+/) // Split by comma, newline, or carriage return
  .map((code) => code.trim()) // Remove whitespace
  .filter((code) => code.length > 0) || [defaultLocale, "ar"]; // Use default locale in fallback

export const routing = defineRouting({
  locales: locales,
  defaultLocale: defaultLocale,
  localePrefix: "always", // Always use locale prefix for consistency
  localeDetection: true, // Enable automatic locale detection
});

export const { Link, usePathname, useRouter, redirect } = createNavigation(routing);
