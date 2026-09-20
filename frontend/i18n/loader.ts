/**
 * Translation Loader
 *
 * Handles dynamic loading of translation namespaces with optimized per-route loading.
 *
 * Features:
 * 1. Full namespace loading for development (HMR compatible)
 * 2. Per-route chunk loading for production (optimized bundle size)
 * 3. Separate menu translation loading (avoids duplication)
 * 4. Automatic fallback to default locale
 */

import type {
  Namespace,
  TranslationMessages,
  PartialNamespaceMessages,
  MessagesWithMeta,
} from "./types";
import { META_KEY } from "./types";
import { config } from "./config";
import { deepMerge } from "./utils";

// ============================================================================
// NAMESPACE CACHE & IMPORTS
// ============================================================================

// Cache for loaded namespaces
const namespaceCache = new Map<string, TranslationMessages>();

// Cache for full locale files (single-file format)
const localeFileCache = new Map<string, Record<string, TranslationMessages>>();

// Import all locale files statically for reliable loading
const localeImports: Record<string, () => Promise<{ default: Record<string, TranslationMessages> }>> = {
  af: () => import("@/messages/af.json"),
  am: () => import("@/messages/am.json"),
  ar: () => import("@/messages/ar.json"),
  as: () => import("@/messages/as.json"),
  az: () => import("@/messages/az.json"),
  bg: () => import("@/messages/bg.json"),
  bn: () => import("@/messages/bn.json"),
  bs: () => import("@/messages/bs.json"),
  ca: () => import("@/messages/ca.json"),
  cs: () => import("@/messages/cs.json"),
  cy: () => import("@/messages/cy.json"),
  da: () => import("@/messages/da.json"),
  de: () => import("@/messages/de.json"),
  dv: () => import("@/messages/dv.json"),
  el: () => import("@/messages/el.json"),
  en: () => import("@/messages/en.json"),
  eo: () => import("@/messages/eo.json"),
  es: () => import("@/messages/es.json"),
  et: () => import("@/messages/et.json"),
  eu: () => import("@/messages/eu.json"),
  fa: () => import("@/messages/fa.json"),
  fi: () => import("@/messages/fi.json"),
  fil: () => import("@/messages/fil.json"),
  fj: () => import("@/messages/fj.json"),
  fr: () => import("@/messages/fr.json"),
  ga: () => import("@/messages/ga.json"),
  gl: () => import("@/messages/gl.json"),
  gu: () => import("@/messages/gu.json"),
  haw: () => import("@/messages/haw.json"),
  he: () => import("@/messages/he.json"),
  hi: () => import("@/messages/hi.json"),
  hr: () => import("@/messages/hr.json"),
  ht: () => import("@/messages/ht.json"),
  hu: () => import("@/messages/hu.json"),
  hy: () => import("@/messages/hy.json"),
  id: () => import("@/messages/id.json"),
  is: () => import("@/messages/is.json"),
  it: () => import("@/messages/it.json"),
  ja: () => import("@/messages/ja.json"),
  jv: () => import("@/messages/jv.json"),
  ka: () => import("@/messages/ka.json"),
  kk: () => import("@/messages/kk.json"),
  km: () => import("@/messages/km.json"),
  kn: () => import("@/messages/kn.json"),
  ko: () => import("@/messages/ko.json"),
  la: () => import("@/messages/la.json"),
  lo: () => import("@/messages/lo.json"),
  lt: () => import("@/messages/lt.json"),
  lv: () => import("@/messages/lv.json"),
  mg: () => import("@/messages/mg.json"),
  mi: () => import("@/messages/mi.json"),
  mk: () => import("@/messages/mk.json"),
  ml: () => import("@/messages/ml.json"),
  mr: () => import("@/messages/mr.json"),
  ms: () => import("@/messages/ms.json"),
  mt: () => import("@/messages/mt.json"),
  my: () => import("@/messages/my.json"),
  nb: () => import("@/messages/nb.json"),
  ne: () => import("@/messages/ne.json"),
  nl: () => import("@/messages/nl.json"),
  ny: () => import("@/messages/ny.json"),
  pa: () => import("@/messages/pa.json"),
  pl: () => import("@/messages/pl.json"),
  pt: () => import("@/messages/pt.json"),
  ro: () => import("@/messages/ro.json"),
  ru: () => import("@/messages/ru.json"),
  rw: () => import("@/messages/rw.json"),
  si: () => import("@/messages/si.json"),
  sk: () => import("@/messages/sk.json"),
  sl: () => import("@/messages/sl.json"),
  sm: () => import("@/messages/sm.json"),
  sn: () => import("@/messages/sn.json"),
  sq: () => import("@/messages/sq.json"),
  su: () => import("@/messages/su.json"),
  sv: () => import("@/messages/sv.json"),
  sw: () => import("@/messages/sw.json"),
  ta: () => import("@/messages/ta.json"),
  te: () => import("@/messages/te.json"),
  th: () => import("@/messages/th.json"),
  tl: () => import("@/messages/tl.json"),
  to: () => import("@/messages/to.json"),
  tr: () => import("@/messages/tr.json"),
  ty: () => import("@/messages/ty.json"),
  uk: () => import("@/messages/uk.json"),
  ur: () => import("@/messages/ur.json"),
  vi: () => import("@/messages/vi.json"),
  xh: () => import("@/messages/xh.json"),
  yue: () => import("@/messages/yue.json"),
  zh: () => import("@/messages/zh.json"),
  zu: () => import("@/messages/zu.json"),
};

// ============================================================================
// NAMESPACE LOADING (Development & Fallback)
// ============================================================================

/**
 * Try to load namespace from single locale file
 */
async function loadFromLocaleFile(
  locale: string,
  namespace: Namespace
): Promise<TranslationMessages | null> {
  // Safeguard against undefined/null locale
  const safeLocale = locale && config.locales.includes(locale) ? locale : config.defaultLocale;

  if (!localeFileCache.has(safeLocale)) {
    try {
      const importFn = localeImports[safeLocale];
      if (!importFn) {
        // Only warn in development and for non-default locales
        if (process.env.NODE_ENV === "development" && safeLocale !== config.defaultLocale) {
          console.warn(`[i18n] No import function for locale: ${safeLocale}`);
        }
        return null;
      }
      const module = await importFn();
      localeFileCache.set(safeLocale, module.default as Record<string, TranslationMessages>);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[i18n] Failed to load locale file: ${safeLocale}`, error);
      }
      return null;
    }
  }

  const localeData = localeFileCache.get(safeLocale);
  if (localeData && namespace in localeData) {
    return localeData[namespace];
  }
  return null;
}

/**
 * Load a single namespace for a locale
 */
export async function loadNamespace(
  locale: string,
  namespace: Namespace
): Promise<TranslationMessages> {
  // Safeguard against undefined/null locale or namespace
  const safeLocale = locale && config.locales.includes(locale) ? locale : config.defaultLocale;
  const safeNamespace = namespace || "common";

  const cacheKey = `${safeLocale}:${safeNamespace}`;

  if (namespaceCache.has(cacheKey)) {
    return namespaceCache.get(cacheKey)!;
  }

  // Try namespace-based file first
  try {
    const module = await import(`@/messages/${safeLocale}/${safeNamespace}.json`);
    const messages = module.default as TranslationMessages;
    namespaceCache.set(cacheKey, messages);
    return messages;
  } catch {
    // Namespace file doesn't exist, try single-file format
  }

  // Try single-file format
  const singleFileMessages = await loadFromLocaleFile(safeLocale, safeNamespace);
  if (singleFileMessages) {
    namespaceCache.set(cacheKey, singleFileMessages);
    return singleFileMessages;
  }

  // Fallback to default locale
  if (safeLocale !== config.defaultLocale) {
    try {
      const fallbackModule = await import(
        `@/messages/${config.defaultLocale}/${safeNamespace}.json`
      );
      const messages = fallbackModule.default as TranslationMessages;
      namespaceCache.set(cacheKey, messages);
      return messages;
    } catch {
      // Try single-file for default locale
    }

    const defaultSingleFile = await loadFromLocaleFile(config.defaultLocale, safeNamespace);
    if (defaultSingleFile) {
      namespaceCache.set(cacheKey, defaultSingleFile);
      return defaultSingleFile;
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(`[i18n] Missing namespace: ${safeNamespace} for locale: ${safeLocale}`);
  }
  return {};
}

/**
 * Load multiple namespaces for a locale
 */
export async function loadNamespaces(
  locale: string,
  namespaces: Namespace[]
): Promise<PartialNamespaceMessages> {
  const results = await Promise.all(
    namespaces.map(async (ns) => {
      const messages = await loadNamespace(locale, ns);
      return [ns, messages] as const;
    })
  );

  return Object.fromEntries(results) as PartialNamespaceMessages;
}

/**
 * Load ALL namespaces for a locale
 */
export async function loadAllNamespaces(
  locale: string
): Promise<PartialNamespaceMessages> {
  // Safeguard against undefined/null locale
  const safeLocale = locale && config.locales.includes(locale) ? locale : config.defaultLocale;

  const importFn = localeImports[safeLocale];
  if (!importFn) {
    console.warn(`[i18n] No import function for locale: ${safeLocale}`);
    return {};
  }

  try {
    const module = await importFn();
    const allMessages = module.default as Record<string, TranslationMessages>;

    localeFileCache.set(safeLocale, allMessages);
    for (const [ns, messages] of Object.entries(allMessages)) {
      namespaceCache.set(`${safeLocale}:${ns}`, messages);
    }

    return allMessages as PartialNamespaceMessages;
  } catch (error) {
    console.error(`[i18n] Failed to load all namespaces for locale: ${safeLocale}`, error);
    return {};
  }
}

// ============================================================================
// CHUNK ACCESS — THE SERVER / BROWSER SPLIT
// ============================================================================

/* ---------------------------------------------------------------------------
   A CHUNK IS READ THROUGH A PLUGGABLE READER, NOT THROUGH `fetch`.
   ---------------------------------------------------------------------------
   Every chunk lookup in this file used to be a bare `fetch("/i18n/…")`. That
   works in a browser, where a path-only URL is resolved against the document's
   origin. On the server there IS no document and no origin: Node's `fetch`
   requires an absolute URL and throws `TypeError: Failed to parse URL from
   /i18n/manifest.json` on a relative one. Every one of those calls sat inside a
   `try { … } catch { return null }`, so the throw was swallowed and the caller
   read the `null` as "there are no pre-generated chunks" — which sent it
   straight to `loadAllNamespaces()`, the whole 1.45 MB catalogue, on the server,
   for every request. The optimization could not fire in the one place it
   mattered most, and nothing in the logs said so.

   Guessing an absolute origin would not fix it either: the server would be
   making an HTTP round-trip to itself for a file that is sitting on its own
   disk, and it would have to know its own public URL to do it (behind a proxy,
   in a container, on a customer's self-hosted box, it does not).

   So the two runtimes get two readers:

     browser — `fetch("/i18n/<name>")`, relative, as before.
     server  — `readFile()` over `public/i18n`, installed by
               `i18n/loader-fs.server.ts`, which is imported for that side
               effect by `i18n/server.ts`.

   The server reader is REGISTERED rather than imported here, and that is
   load-bearing: an `import "node:fs/promises"` in this module would be pulled
   into the client bundle by every `"use client"` file that reaches the loader,
   and the client build would fail to resolve it.

   The registration is parked on `globalThis` for the same reason the
   translation context is (see the long note at the top of `context.tsx`):
   Turbopack can instantiate a module more than once across chunk groups, and a
   reader stored in module scope would then be visible to only one of them.
   --------------------------------------------------------------------------- */

export type ChunkReader = (
  name: string,
  version?: string | null
) => Promise<unknown | null>;

const CHUNK_READER_KEY = Symbol.for("bicrypto.i18n.chunk-reader");

type ReaderCarrier = { [key: symbol]: ChunkReader | undefined };
const readerCarrier = globalThis as unknown as ReaderCarrier;

/**
 * Install the reader that resolves `public/i18n/<name>` on this runtime.
 *
 * Called once, at import time, by `i18n/loader-fs.server.ts`. Nothing else
 * should call it; a second call replaces the first.
 */
export function registerChunkReader(reader: ChunkReader): void {
  readerCarrier[CHUNK_READER_KEY] = reader;
}

/**
 * The browser's reader. `?v=` is the deploy stamp — `public/i18n/*.json` is
 * served with no cache headers of its own, so without it a chunk cached before
 * a release keeps shadowing the one the release shipped, and every key the
 * release added reads as a miss.
 */
const browserChunkReader: ChunkReader = async (name, version) => {
  try {
    const url = version
      ? `/i18n/${name}?v=${encodeURIComponent(version)}`
      : `/i18n/${name}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
};

function getChunkReader(): ChunkReader | null {
  const registered = readerCarrier[CHUNK_READER_KEY];
  if (registered) return registered;
  if (typeof window !== "undefined") return browserChunkReader;
  // Server with no reader installed: the caller degrades, it does not fetch.
  return null;
}

/**
 * True when chunked loading should be attempted at all.
 *
 * Dev keeps the whole catalogue so HMR on `messages/<locale>.json` shows up
 * without a regeneration (config.ts:29). `NEXT_PUBLIC_I18N_CHUNKS=1` forces the
 * production path on in dev, which is the only way to exercise it locally —
 * without it a chunking bug is not reproducible until a release build.
 */
function chunksEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_I18N_CHUNKS === "1") return true;
  return config.useOptimizedLoading;
}

// ============================================================================
// CHUNK VALIDATION
// ============================================================================

/**
 * Count the leaf strings in a chunk, ignoring its `__meta` block.
 */
function countLeaves(value: unknown): number {
  if (value === null || typeof value !== "object") return 1;
  let total = 0;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === META_KEY) continue;
    total += countLeaves(child);
  }
  return total;
}

/**
 * Is this chunk worth trusting?
 *
 * A chunk that EXISTS is not the same as a chunk that is CORRECT. Two ways it
 * can be wrong were both live before this check:
 *
 *   - It predates `__meta` entirely. `public/i18n` is 47,000 files and is not
 *     cleaned between builds, so a chunk for a route that has since been
 *     renamed, or a whole tree generated by an older version of the generator,
 *     sits there indefinitely and answers 200.
 *   - It was truncated. The generator writes with `fs.writeFileSync`; a run
 *     killed part-way (Ctrl-C on an eleven-minute job is not exotic) leaves
 *     short files behind.
 *
 * Either way the page renders raw keys for whatever the chunk is missing. So
 * the generator stamps the leaf count it wrote, and a chunk that cannot show at
 * least that many leaves is discarded rather than half-used.
 */
function isChunkUsable(chunk: unknown): chunk is MessagesWithMeta {
  if (!chunk || typeof chunk !== "object") return false;
  const meta = (chunk as MessagesWithMeta)[META_KEY];
  if (!meta || typeof meta.keys !== "number") return false;
  return countLeaves(chunk) >= meta.keys;
}

/**
 * A chunk's payload without its `__meta` block, ready to merge.
 *
 * `__meta` is deliberately not a `Namespace`, so it can never collide with a
 * real namespace — but it must not survive into the merged messages either, or
 * `messages.__meta` from a route chunk would overwrite the stamp the layout put
 * there and the provider would lose track of what it already has.
 */
function stripMeta(chunk: MessagesWithMeta): PartialNamespaceMessages {
  const { [META_KEY]: _meta, ...rest } = chunk;
  return rest as PartialNamespaceMessages;
}

function mergeMessages(
  target: PartialNamespaceMessages,
  source: PartialNamespaceMessages
): PartialNamespaceMessages {
  return deepMerge(
    target as Record<string, unknown>,
    source as Record<string, unknown>
  ) as PartialNamespaceMessages;
}

// ============================================================================
// ROUTE INDEX
// ============================================================================

interface RouteIndex {
  v: string;
  routes: Array<[string, string | null]>;
}

let routeIndexPromise: Promise<RouteIndex | null> | null = null;

/**
 * `routes.json` — pattern -> menu id, already ordered most-specific-first by
 * the generator.
 *
 * This replaces `manifest.json` as the runtime index. `manifest.json` carries
 * every key of every route and is measured in megabytes; nothing at runtime
 * needs any of it, and a browser was downloading all of it just to learn which
 * menu a route uses.
 */
async function loadRouteIndex(): Promise<RouteIndex | null> {
  if (routeIndexPromise) return routeIndexPromise;

  routeIndexPromise = (async () => {
    const reader = getChunkReader();
    if (!reader) return null;
    const raw = await reader("routes.json", null);
    if (!raw || typeof raw !== "object") return null;
    const index = raw as RouteIndex;
    return Array.isArray(index.routes) ? index : null;
  })();

  return routeIndexPromise;
}

/**
 * Strip the locale prefix and any trailing slash from a live pathname.
 */
function normalizePathname(pathname: string): string {
  const parts = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (parts.length > 0 && config.locales.includes(parts[0])) parts.shift();
  return "/" + parts.join("/");
}

const patternRegexCache = new Map<string, RegExp>();

function patternToRegex(pattern: string): RegExp {
  const cached = patternRegexCache.get(pattern);
  if (cached) return cached;
  // `[id]`, `[...slug]` and `[[...slug]]` all reduce to "one or more segments
  // that are not empty"; the catch-all forms are rare here and matching them as
  // a single segment is what the generated chunk name assumes anyway.
  const source =
    "^" +
    pattern.replace(/[.*+?^${}()|\\]/g, "\\$&").replace(/\[[^\]]+\]/g, "[^/]+") +
    "$";
  const regex = new RegExp(source);
  patternRegexCache.set(pattern, regex);
  return regex;
}

/**
 * Which generated route does this live pathname belong to?
 *
 * The old implementation walked PARENT paths — `/user/kyc/application/abc123`,
 * then `/user/kyc/application`, then `/user/kyc` — looking for a literal key in
 * the manifest. A `[param]` pattern is not a literal, so it could never match
 * one, and all 103 dynamic routes fell through to the full-catalogue fallback.
 * Patterns are matched properly here, in the order the generator sorted them,
 * so `/admin/crm/kyc/level/create` still beats `/admin/crm/kyc/level/[id]`.
 */
export async function matchRoutePattern(
  pathname: string
): Promise<{ pattern: string; menuId: string | null } | null> {
  const index = await loadRouteIndex();
  if (!index) return null;

  const route = normalizePathname(pathname);
  for (const [pattern, menuId] of index.routes) {
    if (patternToRegex(pattern).test(route)) {
      return { pattern, menuId: menuId ?? null };
    }
  }
  return null;
}

// ============================================================================
// CHUNK LOADING
// ============================================================================

/**
 * Chunk filename for a route pattern. MUST stay in step with `getChunkName()`
 * in `i18n/scripts/generate-i18n-manifest.js` — the two halves of one contract.
 */
function routeToChunkName(pattern: string, locale: string): string {
  let name =
    pattern === "/" ? "index" : pattern.replace(/^\//, "").replace(/\//g, "-");
  name = name.replace(/\[([^\]]+)\]/g, "$1");
  return `${name}.${locale}.json`;
}

const chunkPromises = new Map<string, Promise<MessagesWithMeta | null>>();

function readChunk(
  cacheKey: string,
  name: string,
  version: string | null
): Promise<MessagesWithMeta | null> {
  const existing = chunkPromises.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    const reader = getChunkReader();
    if (!reader) return null;
    const raw = await reader(name, version);
    if (!isChunkUsable(raw)) {
      if (raw && process.env.NODE_ENV !== "production") {
        console.warn(
          `[i18n] Discarding chunk "${name}": it exists but does not carry the ` +
            `leaf count its __meta claims. Re-run "pnpm build:i18n".`
        );
      }
      return null;
    }
    return raw;
  })();

  chunkPromises.set(cacheKey, promise);
  return promise;
}

// ============================================================================
// PUBLIC LOADERS
// ============================================================================

const corePromises = new Map<string, Promise<MessagesWithMeta>>();

/**
 * The CORE translation set for a locale.
 *
 * Core is what every page needs regardless of which page it is: every key
 * reachable from the `app/[locale]` layout chain (the header, the sidebar, the
 * error and not-found boundaries) plus the shared tail — button labels,
 * DataTable chrome, form and toast strings — that at least a quarter of routes
 * ask for. Roughly 570 keys, about 25 KB of `en`, against the 1.45 MB that
 * `loadAllNamespaces` returns.
 *
 * Memoized per locale, so the root layout calling it on every request costs one
 * disk read per locale per process.
 *
 * Falls back to the FULL catalogue when there is no usable core chunk — in dev,
 * where chunking is off, and in a deployment where `pnpm build:i18n` has not
 * been run. Slower and heavier, never wrong.
 */
export async function loadCoreTranslations(
  locale: string
): Promise<MessagesWithMeta> {
  const safeLocale =
    locale && config.locales.includes(locale) ? locale : config.defaultLocale;

  const cached = corePromises.get(safeLocale);
  if (cached) return cached;

  const promise = (async (): Promise<MessagesWithMeta> => {
    if (chunksEnabled()) {
      const chunk = await readChunk(
        `core:${safeLocale}`,
        `core.${safeLocale}.json`,
        null
      );
      if (chunk) {
        const meta = chunk[META_KEY];
        return {
          ...stripMeta(chunk),
          [META_KEY]: { v: meta?.v ?? "0", core: true, routes: [] },
        };
      }
    }

    const all = await loadAllNamespaces(safeLocale);
    // `core: false` tells the client provider that everything is already here
    // and there is nothing to top up.
    return { ...all, [META_KEY]: { v: "0", core: false, routes: [] } };
  })();

  corePromises.set(safeLocale, promise);
  return promise;
}

/**
 * The messages the `app/[locale]` root layout should put in the RSC payload.
 *
 * ---------------------------------------------------------------------------
 * HOW THE LAYOUT CALLS THIS
 * ---------------------------------------------------------------------------
 * ```tsx
 * // app/[locale]/layout.tsx
 * import { loadLayoutMessages } from "next-intl/server";
 *
 * export default async function LocaleLayout({ children, params }) {
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
 * It is a drop-in replacement for the `loadAllNamespaces(locale)` the layout
 * calls today: same shape, same provider, one import changed.
 *
 * ---------------------------------------------------------------------------
 * WHY IT DOES NOT TAKE A PATHNAME
 * ---------------------------------------------------------------------------
 * It would return more if it could. `loadRouteTranslations(locale, pathname)`
 * exists and returns core PLUS the current route's remainder, which would make
 * SSR complete. The layout CAN now reach it — `middlewares/stackHandler.ts`
 * stamps `x-pathname` on every request that renders — so this is a deliberate
 * choice rather than a limitation.
 *
 * WHY THE LAYOUT STILL SHIPS CORE ONLY. The remainder is dominated by the menu
 * chunk, which is ~69 KB on a user route. Putting that in the payload would put
 * it in EVERY document, uncacheable, on every navigation — whereas fetched as a
 * file it is served `immutable` (see the `/i18n/:path*` rule in
 * `next.config.js`) and costs one request per visitor per release. Paying
 * per-document for bytes that can be cached once is the exact thing shipping
 * core rather than the whole catalogue was meant to stop.
 *
 * So the layout ships core, and `TranslationProvider` tops up the rest for the
 * route it is standing on (it reads `usePathname()`, which a layout cannot).
 * The gap is the route's own remainder — a mean of 3.3 KB of `en`, worst case
 * 56 KB — which arrives a moment after first paint. Keys inside that gap render
 * humanized text for that moment rather than a raw key; see `humanizeKey()`.
 *
 * What the layout DOES do with the path is `routeChunkUrls()` + `preload()`, so
 * the browser opens those requests during HTML parse instead of after
 * hydration. Same bytes, started much earlier, for the cost of a link tag.
 */
export async function loadLayoutMessages(
  locale: string
): Promise<MessagesWithMeta> {
  return loadCoreTranslations(locale);
}

/**
 * Core PLUS everything a specific route needs.
 *
 * With no `pathname` this is exactly `loadCoreTranslations`. With one, it
 * resolves the route through `routes.json`, adds that route's delta chunk and
 * its menu chunk, and stamps which routes the result covers so a caller that
 * merges several of these can tell what it already has.
 *
 * Route chunks are DELTAS: they hold only what core does not. Merging one
 * without core underneath it produces a page missing its shared strings.
 */
export async function loadRouteTranslations(
  locale: string,
  pathname?: string
): Promise<MessagesWithMeta> {
  const safeLocale =
    locale && config.locales.includes(locale) ? locale : config.defaultLocale;

  const core = await loadCoreTranslations(safeLocale);
  const coreMeta = core[META_KEY];

  // No pathname, chunking off, or no usable core: core already IS everything
  // available (in the fallback case that is the full catalogue).
  if (!pathname || !chunksEnabled() || !coreMeta || coreMeta.core !== true) {
    return core;
  }

  const match = await matchRoutePattern(pathname);
  if (!match) {
    return core;
  }

  const version = coreMeta.v;
  const routeChunk = await readChunk(
    `route:${safeLocale}:${match.pattern}`,
    routeToChunkName(match.pattern, safeLocale),
    version
  );

  const menuChunk = match.menuId
    ? await readChunk(
        `menu:${safeLocale}:${match.menuId}`,
        `${match.menuId}.${safeLocale}.json`,
        version
      )
    : null;

  /* A route chunk that should exist and does not is the one case where the
     answer differs by runtime.

     On the SERVER, falling back to the whole catalogue is free — the locale
     file is a `require`d module already resident in the process — so take it
     and render a complete page.

     In the BROWSER it is not free: it is a 1.45 MB download to recover, at
     most, a few kilobytes of one route. So the browser keeps core and lets the
     missing-key rescue in `context.tsx` cover whatever is actually asked for,
     which is bounded by what the page renders rather than by the catalogue. */
  if (!routeChunk && typeof window === "undefined") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[i18n] No usable chunk for route "${match.pattern}" (${safeLocale}); ` +
          `falling back to the full catalogue. Re-run "pnpm build:i18n".`
      );
    }
    const all = await loadAllNamespaces(safeLocale);
    return { ...all, [META_KEY]: { v: version, core: false, routes: [match.pattern] } };
  }

  let messages = stripMeta(core);
  if (routeChunk) messages = mergeMessages(messages, stripMeta(routeChunk));
  if (menuChunk) messages = mergeMessages(messages, stripMeta(menuChunk));

  return {
    ...messages,
    [META_KEY]: {
      v: version,
      core: true,
      routes: [...(coreMeta.routes ?? []), match.pattern],
    },
  };
}

/**
 * The exact URLs `TranslationProvider` will fetch for this route, so the layout
 * can hint them to the browser before the client bundle exists.
 *
 * ---------------------------------------------------------------------------
 * WHY THE LAYOUT WANTS THIS
 * ---------------------------------------------------------------------------
 * The layout ships CORE only. The route's remainder — its delta, and the menu
 * chunk that carries every nav label — is fetched by the provider in an effect,
 * which cannot run until hydration. On a non-English install that window is
 * visible: `menu-translator.tsx` falls back to each item's hardcoded English
 * title, so the nav reads English for a beat and then settles.
 *
 * Handing these URLs to `preload()` in the layout moves the fetch to HTML-parse
 * time, in parallel with the JS, instead of after it. It adds a link tag rather
 * than 69 KB of JSON to the document — see `app/[locale]/layout.tsx`.
 *
 * ---------------------------------------------------------------------------
 * THE URLS MUST MATCH `browserChunkReader` EXACTLY, INCLUDING `?v=`
 * ---------------------------------------------------------------------------
 * A preload the later `fetch()` does not match is not neutral — it is a second
 * download of the same file plus a console warning about an unused preload. The
 * version stamp matters twice over: it is part of the URL the reader builds,
 * AND `next.config.js` only marks a request immutable when `?v=` is present.
 * Preloading the unversioned form would warm an entry the reader never asks for
 * and pin nothing.
 *
 * Returns `[]` whenever the provider will not be fetching anything — chunking
 * off (dev), no usable core, or a path with no route pattern — because a hint
 * for a file nobody will request is strictly worse than no hint.
 */
export async function routeChunkUrls(
  locale: string,
  pathname: string | null | undefined
): Promise<string[]> {
  if (!pathname || !chunksEnabled()) return [];

  const safeLocale =
    locale && config.locales.includes(locale) ? locale : config.defaultLocale;

  const core = await loadCoreTranslations(safeLocale);
  const coreMeta = core[META_KEY];
  // `core !== true` means the layout is shipping the whole catalogue; there is
  // no top-up coming, so there is nothing to warm.
  if (!coreMeta || coreMeta.core !== true) return [];

  const match = await matchRoutePattern(pathname);
  if (!match) return [];

  const version = coreMeta.v;
  const stamp = version ? `?v=${encodeURIComponent(version)}` : "";

  const urls = [`/i18n/${routeToChunkName(match.pattern, safeLocale)}${stamp}`];
  if (match.menuId) {
    urls.push(`/i18n/${match.menuId}.${safeLocale}.json${stamp}`);
  }
  return urls;
}
