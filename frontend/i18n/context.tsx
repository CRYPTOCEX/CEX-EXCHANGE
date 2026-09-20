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
  useEffect,
  useMemo,
  useRef,
  useState,
  type Context,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type {
  Namespace,
  PartialNamespaceMessages,
  MessagesWithMeta,
  TranslationMessages,
  TranslationFunction,
  TranslationContextValue,
} from "./types";
import { META_KEY } from "./types";
import { interpolate, handlePlural } from "./interpolate";
import { getNestedValue, humanizeKey, deepMerge } from "./utils";
import {
  loadNamespace,
  loadRouteTranslations,
  matchRoutePattern,
} from "./loader";
import { config } from "./config";

/* ---------------------------------------------------------------------------
   ONE context object per runtime, even when this module is instantiated twice.
   ---------------------------------------------------------------------------
   `createContext()` mints a NEW object on every evaluation, and two evaluations
   of this file therefore produce two contexts that cannot see each other's
   Provider — `useContext` on instance B returns `undefined` even though the
   root layout rendered instance A's Provider one level up.

   That is not hypothetical here. Turbopack compiles a `"use client"` module
   into every chunk group that reaches it, so `i18n/context.tsx` is emitted into
   several SSR chunks (the `[locale]` layout's group, and one per page group).
   They share a module id, so the dev runtime normally instantiates it once —
   but while chunk groups are being (re)built, an HMR invalidation can drop the
   cached instance for one group while another still holds the old one. The
   window is real and was reproduced: recompiling the layout with requests in
   flight 500s pages with
   "useTranslationContext must be used within a TranslationProvider" while the
   Provider is demonstrably in the tree (its `messages` prop is in the payload).
   It is worst on a cold dev server, when every route compiles at once — which
   is exactly when it was reported.

   Parking the context on `globalThis` collapses every instance onto the first
   one, so a duplicated module is harmless. Safe on the server: a context OBJECT
   carries no request state — only a `<Provider value>` does, and that stays
   per-render. This is the same lifetime module scope already has.
   --------------------------------------------------------------------------- */
const CONTEXT_KEY = Symbol.for("bicrypto.i18n.translation-context");

type ContextCarrier = {
  [key: symbol]: Context<TranslationContextValue | undefined> | undefined;
};

const contextCarrier = globalThis as unknown as ContextCarrier;

const TranslationContext: Context<TranslationContextValue | undefined> =
  contextCarrier[CONTEXT_KEY] ??
  (contextCarrier[CONTEXT_KEY] = createContext<
    TranslationContextValue | undefined
  >(undefined));

TranslationContext.displayName = "TranslationContext";

/* ---------------------------------------------------------------------------
   MISSING-KEY RESCUE
   ---------------------------------------------------------------------------
   A miss no longer renders the key (see `humanizeKey` in utils.ts for why). It
   renders readable text AND asks for the real string, so the humanized version
   is a flicker rather than the final answer.

   The rescue resolves through `loadNamespace()` -> `loadFromLocaleFile()` ->
   `import("@/messages/<locale>.json")`. That path needs NO generated artifact,
   which is the entire point: it cannot itself be the thing that is missing. A
   rescue that depended on `public/i18n` would fail in exactly the situations
   that produce misses — a stale chunk, an interrupted `build:i18n`, a route the
   extractor did not see.

   IT IS NOT CHEAP, and that is deliberate. The first rescue pulls the whole
   locale file — 1.45 MB for `en` — into the browser. So:

     - It fires only on an actual miss, never speculatively.
     - Each `locale:namespace` is attempted AT MOST ONCE per session, whether it
       succeeds or not. A key that is genuinely absent from the locale file does
       not re-request it on every render.
     - `loadFromLocaleFile` caches the parsed file, so the first rescue pays for
       every later one — after it, the whole catalogue is resident and further
       misses resolve for free.
     - It is a no-op on the SERVER. The server cannot re-render what it has
       already streamed, so the work would be pure cost, and a module-level
       queue there would be shared between concurrent requests.

   The queue is flushed in a microtask, never during render: `t()` is called
   from inside a component body, and doing the loading there would be a side
   effect in render.
   --------------------------------------------------------------------------- */

type RescueListener = (
  locale: string,
  namespace: Namespace,
  messages: TranslationMessages
) => void;

const rescueListeners = new Set<RescueListener>();
const attemptedRescues = new Set<string>();
const pendingRescues = new Set<string>();
let rescueFlushScheduled = false;

async function flushNamespaceRescues(): Promise<void> {
  rescueFlushScheduled = false;

  const batch = Array.from(pendingRescues);
  pendingRescues.clear();

  for (const id of batch) {
    const separator = id.indexOf(":");
    const locale = id.slice(0, separator);
    const namespace = id.slice(separator + 1) as Namespace;

    try {
      const messages = await loadNamespace(locale, namespace);
      if (!messages || Object.keys(messages).length === 0) continue;
      for (const listener of rescueListeners) {
        listener(locale, namespace, messages);
      }
    } catch {
      // Best effort. The humanized text stays on screen, which is a readable
      // answer; throwing here would take the page with it.
    }
  }
}

/**
 * Ask for a namespace's real strings after a key in it came back missing.
 *
 * Exported for `use-translations.tsx`, which has its own miss path in
 * `translator.rich`. Anything that renders a humanized fallback should call
 * this in the same breath, or the fallback becomes permanent.
 */
export function requestNamespaceRescue(locale: string, namespace: Namespace): void {
  if (typeof window === "undefined") return;
  if (!locale || !namespace) return;

  const id = `${locale}:${namespace}`;
  if (attemptedRescues.has(id)) return;
  attemptedRescues.add(id);
  pendingRescues.add(id);

  if (rescueFlushScheduled) return;
  rescueFlushScheduled = true;
  queueMicrotask(() => {
    void flushNamespaceRescues();
  });
}

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
      // Readable text now, the real string a moment later. Never the raw key.
      requestNamespaceRescue(locale, namespace);
      return humanizeKey(key);
    }

    // Handle plural forms first, then interpolate. The locale picks the CLDR
    // plural category — without it `few`/`many` are unreachable.
    let result = handlePlural(value, params, locale);
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
  /**
   * The layout's message set. Normally the CORE set from
   * `loadLayoutMessages(locale)`; its `__meta` tells this provider whether a
   * per-route top-up is still outstanding.
   */
  messages: MessagesWithMeta;
}

const EMPTY_EXTRA: PartialNamespaceMessages = {};

/**
 * Translation Provider
 *
 * Provides translation context to client components, and TOPS ITSELF UP.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS STATEFUL
 * ---------------------------------------------------------------------------
 * The `[locale]` root layout ships the CORE set — everything the layout chain
 * itself renders, plus the strings a quarter or more of routes share. It does
 * not ship the current route's remainder, because that is dominated by the
 * ~69 KB menu chunk and would then ride in every document uncacheably; see
 * `loadLayoutMessages` for the full trade. And even if it did, it could not
 * correct that later: a root layout does not re-render on a soft navigation, so
 * on every client-side route change it would still be holding the messages it
 * computed for the first page of the session.
 *
 * The layout does `preload()` the chunks this provider is about to ask for
 * (`routeChunkUrls`), so the fetch below is usually already in flight or served
 * from cache by the time the effect runs.
 *
 * So the provider does it. It reads `usePathname()` — which a layout cannot,
 * and which a client component can, on the server render as well as in the
 * browser — and loads the current route's chunk on mount and on every
 * navigation. Routes already covered are skipped via the `__meta.routes` stamp
 * carried on the message set, so navigating back to a page costs nothing.
 *
 * The window between first paint and the top-up landing is the one visible cost
 * of core-only SSR: keys outside core render humanized text for that moment
 * rather than their translation. `humanizeKey` is pure precisely so that this
 * first render agrees between server and browser and React does not discard the
 * server's HTML over it.
 */
export function TranslationProvider({
  children,
  locale,
  messages,
}: TranslationProviderProps) {
  const pathname = usePathname();

  // Everything that has arrived since the layout's payload: route chunks, menu
  // chunks, rescued namespaces.
  const [extra, setExtra] = useState<PartialNamespaceMessages>(EMPTY_EXTRA);

  /*
   * Which route patterns this provider already holds. Seeded from the layout's
   * stamp and never reset, so a back-navigation to a route whose chunk is
   * already merged does not re-fetch it. A ref, not state: changing it must not
   * itself cause a render.
   */
  const coveredRoutes = useRef<Set<string> | null>(null);
  if (coveredRoutes.current === null) {
    coveredRoutes.current = new Set(messages[META_KEY]?.routes ?? []);
  }

  // ---- per-route top-up -----------------------------------------------------
  useEffect(() => {
    if (!pathname) return;

    /*
     * `core !== true` means the layout shipped the whole catalogue — dev, or a
     * deployment where `pnpm build:i18n` has not run. There is nothing to add,
     * and asking would cost a request that can only 404.
     */
    const meta = messages[META_KEY];
    if (!meta || meta.core !== true) return;

    let cancelled = false;

    void (async () => {
      const match = await matchRoutePattern(pathname);
      if (cancelled || !match) return;
      if (coveredRoutes.current?.has(match.pattern)) return;

      const loaded = await loadRouteTranslations(locale, pathname);
      if (cancelled) return;

      coveredRoutes.current?.add(match.pattern);

      const { [META_KEY]: _meta, ...payload } = loaded;
      setExtra((previous) =>
        deepMerge(
          previous as Record<string, unknown>,
          payload as Record<string, unknown>
        ) as PartialNamespaceMessages
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [locale, pathname, messages]);

  // ---- missing-key rescue ---------------------------------------------------
  useEffect(() => {
    const listener: RescueListener = (
      rescuedLocale,
      namespace,
      namespaceMessages
    ) => {
      if (rescuedLocale !== locale) return;
      setExtra((previous) => {
        if (previous[namespace] === namespaceMessages) return previous;
        return { ...previous, [namespace]: namespaceMessages };
      });
    };

    rescueListeners.add(listener);
    return () => {
      rescueListeners.delete(listener);
    };
  }, [locale]);

  const mergedMessages = useMemo<PartialNamespaceMessages>(() => {
    if (extra === EMPTY_EXTRA) return messages;
    return deepMerge(
      messages as Record<string, unknown>,
      extra as Record<string, unknown>
    ) as PartialNamespaceMessages;
  }, [messages, extra]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo<TranslationContextValue>(() => {
    // Create a function that returns translation functions for namespaces
    const t = (namespace: Namespace): TranslationFunction => {
      const namespaceMessages = mergedMessages[namespace];
      return createTranslationFunction(namespaceMessages, namespace, locale);
    };

    return {
      locale,
      messages: mergedMessages,
      t,
    };
  }, [locale, mergedMessages]);

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

/**
 * What a consumer gets when no Provider is above it.
 *
 * Humanized, for the same reason `createTranslationFunction` humanizes: this
 * path exists to DEGRADE, and a page covered in raw key paths is not a degraded
 * page, it is a broken one. No rescue is requested — with no Provider there is
 * nothing subscribed to receive the result, and the per-key `console.warn` is
 * skipped here too because it would be one line per string on the page.
 */
const fallbackTranslator: TranslationFunction = (key: string): string =>
  humanizeKey(key);

const FALLBACK_CONTEXT: TranslationContextValue = {
  locale: config.defaultLocale,
  messages: {},
  t: () => fallbackTranslator,
};

let warnedAboutMissingProvider = false;

/**
 * Hook to access translation context
 * @internal Use useTranslations instead for translations
 *
 * A missing Provider DEGRADES rather than throws. It used to throw, and that
 * turned a recoverable condition into a 500 on the whole route: the throw
 * happens in the first client component that asks for a string, so the entire
 * page — not the labels — is what the visitor loses.
 *
 * Nothing in this app can legitimately render outside the Provider (the
 * `[locale]` root layout wraps every route), so in practice the only way to get
 * here is the duplicated-module window described at the top of this file, where
 * the Provider IS mounted and failing is pure loss. The `console.error` keeps a
 * genuine authoring mistake — a new tree that forgets the Provider — visible
 * while the page still renders; `useHasTranslations()` reports the same fact
 * without a side effect.
 */
export function useTranslationContext(): TranslationContextValue {
  const context = useContext(TranslationContext);

  if (context === undefined) {
    if (process.env.NODE_ENV === "development" && !warnedAboutMissingProvider) {
      warnedAboutMissingProvider = true;
      console.error(
        "[i18n] No TranslationProvider above this component — rendering " +
          "translation keys instead of text. Every route should inherit the " +
          "provider from app/[locale]/layout.tsx; if this fires on a page that " +
          "does, it is the stale-chunk window after a dev recompile and a " +
          "reload clears it."
      );
    }
    return FALLBACK_CONTEXT;
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
