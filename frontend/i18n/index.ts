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
 * import { TranslationProvider, loadAllNamespaces } from "@/i18n";
 *
 * export default async function Layout({ children, params }) {
 *   const { locale } = await params;
 *   const messages = await loadAllNamespaces(locale);
 *
 *   return (
 *     <TranslationProvider locale={locale} messages={messages}>
 *       {children}
 *     </TranslationProvider>
 *   );
 * }
 * ```
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
  TranslationFunction,
  TranslationContextValue,
  TranslationConfig,
} from "./types";

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

// Loader (can be used on both client and server)
export {
  loadNamespace,
  loadNamespaces,
  loadAllNamespaces,
  // Route-level optimized loading (production)
  loadRouteTranslations,
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
  // Utility types
  type DateFormatStyle,
} from "./utils";
