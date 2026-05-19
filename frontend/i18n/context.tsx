"use client";

/**
 * Translation Context
 *
 * React context for providing translations to client components.
 * Designed for optimal performance with namespace-based loading.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type {
  Namespace,
  PartialNamespaceMessages,
  TranslationMessages,
  TranslationFunction,
  TranslationContextValue,
} from "./types";
import { interpolate, handlePlural } from "./interpolate";
import { getNestedValue } from "./utils";
import { config } from "./config";

// Context with undefined default (must be used within provider)
const TranslationContext = createContext<TranslationContextValue | undefined>(
  undefined
);

/**
 * Create a translation function for a specific namespace
 */
function createTranslationFunction(
  messages: TranslationMessages | undefined,
  namespace: Namespace,
  locale: string
): TranslationFunction {
  return (key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(messages, key);

    if (value === undefined) {
      // Development warning for missing keys
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[i18n] Missing translation: "${namespace}.${key}" for locale "${locale}"`
        );
      }
      // Return key as fallback
      return key;
    }

    // Handle plural forms first, then interpolate
    let result = handlePlural(value, params);
    result = interpolate(result, params);

    return result;
  };
}

/**
 * Translation Provider Props
 */
export interface TranslationProviderProps {
  children: ReactNode;
  locale: string;
  messages: PartialNamespaceMessages;
}

/**
 * Translation Provider
 *
 * Provides translation context to client components.
 * Should be used in layout files to wrap pages that need translations.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * import { TranslationProvider } from "@/i18n";
 * import { loadNamespaces } from "@/i18n/loader";
 *
 * export default async function Layout({ children, params }) {
 *   const { locale } = await params;
 *   const messages = await loadNamespaces(locale, ["common", "dashboard"]);
 *
 *   return (
 *     <TranslationProvider locale={locale} messages={messages}>
 *       {children}
 *     </TranslationProvider>
 *   );
 * }
 * ```
 */
export function TranslationProvider({
  children,
  locale,
  messages,
}: TranslationProviderProps) {
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<TranslationContextValue>(() => {
    // Create a function that returns translation functions for namespaces
    const t = (namespace: Namespace): TranslationFunction => {
      const namespaceMessages = messages[namespace];
      return createTranslationFunction(namespaceMessages, namespace, locale);
    };

    return {
      locale,
      messages,
      t,
    };
  }, [locale, messages]);

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * Hook to access translation context
 * @internal Use useTranslations instead for translations
 */
export function useTranslationContext(): TranslationContextValue {
  const context = useContext(TranslationContext);

  if (context === undefined) {
    throw new Error(
      "useTranslationContext must be used within a TranslationProvider. " +
        "Make sure your component is wrapped in a TranslationProvider in a parent layout."
    );
  }

  return context;
}

/**
 * Hook to get current locale
 */
export function useLocale(): string {
  const context = useContext(TranslationContext);
  return context?.locale ?? config.defaultLocale;
}

/**
 * Hook to check if translations are available
 */
export function useHasTranslations(): boolean {
  const context = useContext(TranslationContext);
  return context !== undefined;
}
