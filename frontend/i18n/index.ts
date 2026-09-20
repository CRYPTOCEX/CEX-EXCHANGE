/**
 * Custom Translation System
 *
 * A lightweight, performant translation system for Next.js.
 * Designed for namespace-based code splitting and per-route loading.
 *
 * @example Client Component
 * ```tsx
 * "use client";
 * import { useTranslations } from "@/i18n";
 *
 * export function MyComponent() {
 *   const t = useTranslations("common");
 *   return <h1>{t("title")}</h1>;
 * }
 * ```
 *
 * @example Server Component
 * ```tsx
 * import { getTranslations } from "@/i18n/server";
 *
 * export default async function Page({ params }) {
 *   const { locale } = await params;
 *   const t = await getTranslations({ locale, namespace: "dashboard" });
 *   return <h1>{t("title")}</h1>;
 * }
 * ```
 *
 * @example Layout with Provider
 * ```tsx
 * import { TranslationProvider } from "@/i18n";
 * import { loadLayoutMessages } from "@/i18n/server";
 *
 * export default async function Layout({ children, params }) {
 *   const { locale } = await params;
 *   const messages = await loadLayoutMessages(locale);
 *
 *   return (
 *     <TranslationProvider locale={locale} messages={messages}>
 *       {children}
 *     </TranslationProvider>
 *   );
 * }
 * ```
 *
 * `loadLayoutMessages` ships the CORE set — the layout chain's own strings plus
 * the shared tail — instead of the whole 1.45 MB catalogue, and the provider
 * loads the current route's remainder itself. Reach it through `@/i18n/server`
 * or `next-intl/server`, never through `@/i18n/loader` directly: the server's
 * disk-backed chunk reader is installed as a side effect of importing that
 * module, and without it the loaders silently fall back to the full catalogue.
 *
 * @example Using Formatters
 * ```tsx
 * "use client";
 * import { useTranslations } from "@/i18n";
 *
 * export function MyComponent() {
 *   const t = useTranslations("common");
 *
 *   return (
 *     <div>
 *       <p>{t.formatDate(new Date())}</p>
 *       <p>{t.formatCurrency(1234.56, "USD")}</p>
 *       <p>{t.formatRelativeTime(new Date(Date.now() - 3600000))}</p>
 *       <p>{t.formatList(["Apple", "Banana", "Orange"])}</p>
 *     </div>
 *   );
 * }
 * ```
 */

// Types
export type {
  Namespace,
  TranslationMessages,
  NamespaceMessages,
  PartialNamespaceMessages,
  MessagesWithMeta,
  I18nMessagesMeta,
  TranslationFunction,
  TranslationContextValue,
  TranslationConfig,
} from "./types";

export { META_KEY } from "./types";

// Config
export { config } from "./config";

// Client-side exports
export {
  TranslationProvider,
  useTranslationContext,
  useLocale,
  useHasTranslations,
  type TranslationProviderProps,
} from "./context";

export { useTranslations, type ExtendedTranslationFunction } from "./use-translations";

// Interpolation utilities
export { interpolate, handlePlural } from "./interpolate";

/*
 * Loader — usable on both client and server.
 *
 * NOTHING HERE MAY TOUCH `fs`. This module is imported by client components, so
 * a re-export of `./server` or `./loader-fs.server` would drag `node:fs/promises`
 * into the client bundle and fail the build at resolution. Server callers use
 * `@/i18n/server` (or the `next-intl/server` alias), which is also what installs
 * the disk-backed chunk reader.
 */
export {
  loadNamespace,
  loadNamespaces,
  loadAllNamespaces,
  // Route-level optimized loading (production)
  loadCoreTranslations,
  loadRouteTranslations,
  routeChunkUrls,
  matchRoutePattern,
  registerChunkReader,
  type ChunkReader,
} from "./loader";

// Formatting utilities (can be used standalone)
export {
  // Date/Time formatters
  formatDate,
  formatTime,
  formatDateTime,
  // Number formatters
  formatNumber,
  formatCurrency,
  formatPercent,
  formatCompact,
  // Relative time
  formatRelativeTime,
  // List formatting
  formatList,
  // RTL detection
  isRTL,
  getDirection,
  // Missing-key fallback — readable text instead of a raw key path
  humanizeKey,
  // Utility types
  type DateFormatStyle,
} from "./utils";
