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

import type { Namespace, TranslationMessages, PartialNamespaceMessages } from "./types";
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
// ROUTE CHUNK CACHE (Production Optimization)
// ============================================================================

// Cache for loaded route chunks (page translations only)
const routeChunkCache = new Map<string, PartialNamespaceMessages>();

// Cache for loaded menu chunks
const menuChunkCache = new Map<string, PartialNamespaceMessages>();

// Flag to check if we're in production with pre-generated chunks
let hasPreGeneratedChunks: boolean | null = null;

// Cached manifest
let cachedManifest: ManifestType | null = null;

// Type for manifest structure
interface ManifestType {
  routes: Record<string, {
    namespaces: string[];
    keys: Record<string, string[]>;
    menuId?: string | null;
    pageType?: string;
  }>;
  menus: Record<string, {
    namespace: string;
    keyCount: number;
  }>;
}

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
// ROUTE-LEVEL OPTIMIZED LOADING (Production)
// ============================================================================

/**
 * Check if pre-generated i18n chunks exist
 */
async function checkForPreGeneratedChunks(): Promise<boolean> {
  if (hasPreGeneratedChunks !== null) {
    return hasPreGeneratedChunks;
  }

  if (process.env.NODE_ENV === "development") {
    hasPreGeneratedChunks = false;
    return false;
  }

  try {
    const response = await fetch("/i18n/manifest.json");
    hasPreGeneratedChunks = response.ok;
  } catch {
    hasPreGeneratedChunks = false;
  }

  return hasPreGeneratedChunks;
}

/**
 * Load the i18n manifest (cached)
 */
async function loadManifest(): Promise<ManifestType | null> {
  if (cachedManifest) {
    return cachedManifest;
  }

  try {
    const response = await fetch("/i18n/manifest.json");
    if (!response.ok) return null;
    cachedManifest = await response.json();
    return cachedManifest;
  } catch {
    return null;
  }
}

/**
 * Convert route path to chunk filename
 */
function routeToChunkName(route: string, locale: string): string {
  let name = route === "/" ? "index" : route.replace(/^\//, "").replace(/\//g, "-");
  name = name.replace(/\[([^\]]+)\]/g, "$1");
  return `${name}.${locale}.json`;
}

/**
 * Load pre-generated translation chunk for a route
 */
async function loadRouteChunk(route: string, locale: string): Promise<PartialNamespaceMessages | null> {
  const cacheKey = `${locale}:${route}`;

  if (routeChunkCache.has(cacheKey)) {
    return routeChunkCache.get(cacheKey)!;
  }

  const chunkName = routeToChunkName(route, locale);

  try {
    const response = await fetch(`/i18n/${chunkName}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    routeChunkCache.set(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Load pre-generated menu translation chunk
 */
async function loadMenuChunk(menuId: string, locale: string): Promise<PartialNamespaceMessages | null> {
  const cacheKey = `${locale}:menu:${menuId}`;

  if (menuChunkCache.has(cacheKey)) {
    return menuChunkCache.get(cacheKey)!;
  }

  const chunkName = `${menuId}.${locale}.json`;

  try {
    const response = await fetch(`/i18n/${chunkName}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    menuChunkCache.set(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Deep merge two translation objects
 */
function mergeTranslations(
  target: PartialNamespaceMessages,
  source: PartialNamespaceMessages
): PartialNamespaceMessages {
  return deepMerge(target, source) as PartialNamespaceMessages;
}

/**
 * Get the current route from pathname
 */
function getCurrentRoute(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length > 0 && config.locales.includes(parts[0])) {
    parts.shift();
  }

  return "/" + parts.join("/") || "/";
}

/**
 * Load optimized translations for a specific route
 *
 * In production: Loads pre-generated page + menu chunks
 * In development: Falls back to full namespace loading
 */
export async function loadRouteTranslations(
  locale: string,
  pathname: string
): Promise<PartialNamespaceMessages> {
  const hasChunks = await checkForPreGeneratedChunks();

  if (!hasChunks) {
    return loadAllNamespaces(locale);
  }

  const route = getCurrentRoute(pathname);
  const manifest = await loadManifest();

  let routeTranslations = await loadRouteChunk(route, locale);
  let menuId: string | null = null;

  if (!routeTranslations && manifest) {
    const routeParts = route.split("/").filter(Boolean);
    while (routeParts.length > 0) {
      const parentRoute = "/" + routeParts.join("/");
      if (manifest.routes[parentRoute]) {
        routeTranslations = await loadRouteChunk(parentRoute, locale);
        menuId = manifest.routes[parentRoute].menuId || null;
        if (routeTranslations) break;
      }
      routeParts.pop();
    }

    if (!routeTranslations) {
      routeTranslations = await loadRouteChunk("/", locale);
      if (manifest.routes["/"]) {
        menuId = manifest.routes["/"].menuId || null;
      }
    }
  } else if (manifest && manifest.routes[route]) {
    menuId = manifest.routes[route].menuId || null;
  }

  if (!routeTranslations) {
    return loadAllNamespaces(locale);
  }

  if (menuId) {
    const menuTranslations = await loadMenuChunk(menuId, locale);
    if (menuTranslations) {
      return mergeTranslations(routeTranslations, menuTranslations);
    }
  }

  return routeTranslations;
}

