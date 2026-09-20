#!/usr/bin/env node
/**
 * Generate i18n Manifest
 *
 * This script analyzes all pages in the app directory and generates, per locale:
 *
 *   core.<locale>.json    The keys EVERY page needs — the root layout chain
 *                         plus the shared tail (see CORE_KEY_ROUTE_SHARE). This
 *                         is what the `[locale]` root layout puts in the RSC
 *                         payload, so it is the one file whose size is paid on
 *                         every request.
 *   <route>.<locale>.json One per route, DELTA-ENCODED against core: the keys
 *                         that route needs and core does not already carry.
 *   <menuId>.<locale>.json  Menu labels, shared by every route under that menu.
 *   routes.json           The runtime index: pattern -> menuId, ordered so the
 *                         first match is the most specific one. This is what a
 *                         live pathname is matched against, including dynamic
 *                         `[param]` routes.
 *   manifest.json         The full key inventory. FOR TOOLING ONLY — it is
 *                         about a megabyte and nothing at runtime reads it.
 *
 * Every generated chunk carries `__meta: { v, keys, ... }`. `v` is the build
 * stamp (cache busting), `keys` is the leaf count the runtime checks a chunk
 * against before trusting it.
 *
 * Run with: node frontend/i18n/scripts/generate-i18n-manifest.js
 *
 * Verification-only flags (never for a release build):
 *   --locales=en,de   write only these locales
 *   --out=<dir>       write somewhere other than public/i18n
 */

const fs = require("fs");
const path = require("path");
const { extractChainKeys, validateFile, clearIssues, getIssues, formatIssues } = require("../key-extractor");
const {
  SUPPORT_ASSISTANT_NAMESPACE,
  supportAssistantKeys,
} = require("../support-catalogue");

const projectRoot = path.resolve(__dirname, "../..");
const appDir = path.join(projectRoot, "app", "[locale]");
const messagesDir = path.join(projectRoot, "messages");
// `--out=<dir>` overrides this; see the note on outDirArg below.
const outDirOverride = process.argv.find((a) => a.startsWith("--out="));
const outputDir = outDirOverride
  ? path.resolve(process.cwd(), outDirOverride.slice("--out=".length))
  : path.join(projectRoot, "public", "i18n");

// Paths that don't need header/sidebar/menu (from dashboard.provider.tsx)
const EXCLUDED_PATHS = [
  "/admin/crm/kyc/level/create",
  "/admin/crm/kyc/level/[id]",
  "/admin/crm/kyc/application/[id]",
  "/admin/crm/support/[id]",
  "/admin/finance/deposit/log/[id]",
  "/admin/finance/withdraw/log/[id]",
  "/admin/finance/transfer/[id]",
  "/admin/default-editor",
  "/admin/default-editor/[pageId]/edit",
  "/admin/content/media",
  "/admin/system/notification/template/[id]",
  "/admin/system/settings",
  "/admin/system/license",
  "/admin/system/extension",
  "/admin/system/extension/[id]",
  "/admin/system/update",
  "/admin/builder",
];

// Extension directories that have their own menus
//
// THIS LIST IS THE GATE ON A MENU CHUNK EXISTING AT ALL. `getPageType()` tests
// each route against `^/(ext)/admin/<entry>(/|$)`; a route whose extension is
// missing here falls through to the generic `/admin` branch and is filed under
// `menuId: "menu-admin"`, `namespace: "menu"`. The consequence is silent and
// only visible in production: no `ext_admin_<name>.<locale>.json` chunk is
// emitted, so the extension's nav carries no `nav` subtree in any locale and
// every label falls back to the hardcoded English `title` in its `menu.ts`.
//
// The invariant is simply "every `(ext)/admin/<dir>/menu.ts` has an entry
// here". `ai/binary-engine`, `trading-bot` and `hb` all ship a `menu.ts` and a
// `translationNamespace` on their layout, and all three were missing — so all
// three had untranslatable navigation.
const EXTENSION_DIRS = [
  "affiliate",
  "ai/binary-engine",
  "ai/investment",
  "ai/market-maker",
  "ai/support",
  "copy-trading",
  "dex",
  "ecommerce",
  "ecosystem",
  "faq",
  "forex",
  "forex-trading",
  "futures",
  "gateway",
  "ico",
  "mailwizard",
  "nft",
  "p2p",
  "staking",
];

// Menu types and their identifiers
const MENU_TYPES = {
  admin: "menu-admin",
  user: "menu-user",
};

/*
 * How widely a key must be used before it is promoted out of the per-route
 * chunks and into the shared CORE chunk.
 *
 * A key held by >= 25% of routes is the "shared tail" — button labels,
 * DataTable chrome, form and toast strings. Duplicating those into 503 route
 * chunks costs far more than shipping them once, and shipping them once is what
 * makes the core chunk small enough to sit in the RSC payload of every
 * document.
 *
 * Measured on this tree (503 routes, `en`, after the extractor fixes):
 *
 *   share  core size   route delta mean   route delta max   all deltas
 *   1.00   11.0 KB     9.2 KB             67.8 KB           4.5 MB
 *   0.50   14.4 KB     5.9 KB             64.5 KB           2.9 MB
 *   0.35   15.2 KB     5.6 KB             63.8 KB           2.8 MB
 *   0.25   23.5 KB     3.3 KB             55.5 KB           1.6 MB
 *
 * 0.25 buys a 64% cut in total delta bytes for 12 KB more in the payload that
 * every page pays. Below 0.25 the curve turns: core grows faster than the
 * deltas shrink, and core is the one number that is on the critical path of
 * every single request.
 *
 * `share = 1.00` is not "no core" — the root layout chain is always in core,
 * whatever this number says. It is what the layout renders.
 */
const CORE_KEY_ROUTE_SHARE = 0.25;

/*
 * App Router boundary files, in the order React composes them within one
 * directory. Every one of these can put text on the screen for a route in that
 * directory, and none of them is reachable from the route's own `page.tsx`.
 */
const BOUNDARY_FILES = [
  "layout.tsx",
  "layout.ts",
  "template.tsx",
  "template.ts",
  "error.tsx",
  "not-found.tsx",
  "loading.tsx",
];

/*
 * A build stamp shared by every artifact this run writes.
 *
 * It is what the runtime hangs `?v=` off when it fetches a chunk. `public/i18n`
 * is served with no cache headers of its own (nothing in next.config.js touches
 * it), so without a per-deploy stamp a browser that cached
 * `admin-finance-log.en.json` before a release keeps serving the OLD file to
 * the NEW build — and the keys the release added render as misses. The stamp
 * arrives fresh in the RSC payload on every document, so it cannot itself go
 * stale.
 */
const BUILD_STAMP = Date.now().toString(36);

/*
 * `--locales=en,de` restricts the write pass to a few locales.
 *
 * A full run writes ~45,000 files across 90 locales. This exists so a change to
 * the generator can be VERIFIED in seconds instead of minutes; it must never be
 * used for a release build, and the summary says so loudly when it is set.
 */
const localeFilterArg = process.argv.find((a) => a.startsWith("--locales="));
const LOCALE_FILTER = localeFilterArg
  ? new Set(localeFilterArg.slice("--locales=".length).split(",").map((s) => s.trim()).filter(Boolean))
  : null;

/*
 * `--out=<dir>` writes somewhere other than `public/i18n`.
 *
 * Paired with `--locales=`, this is how a change to this script gets checked
 * without leaving `public/i18n` half in the old format and half in the new one
 * — a state in which the app would load a stamped delta chunk for one locale
 * and an unstamped full chunk for the next, and the runtime's usability check
 * would reject the second.
 *
 * Read at the top of this file, where `outputDir` is resolved.
 */

/*
 * Namespace and key are joined into one string so a Set can hold them. NUL is
 * the separator because a translation key here can legitimately contain a dot,
 * a space or a colon, and any of those as a separator would split a key in half
 * when it was read back.
 */
const KEY_SEP = String.fromCharCode(0);
const idOf = (namespace, key) => `${namespace}${KEY_SEP}${key}`;

/**
 * Turn a set of "namespace\0key" ids back into the { namespace: [keys] } shape
 * that extractKeysFromLocale() consumes.
 */
function idsToNamespaceKeys(ids) {
  const out = {};
  for (const id of ids) {
    const sep = id.indexOf(KEY_SEP);
    const namespace = id.slice(0, sep);
    const key = id.slice(sep + 1);
    (out[namespace] = out[namespace] || []).push(key);
  }
  for (const keys of Object.values(out)) keys.sort();
  return out;
}

/**
 * The ordered list of files that compose a route: every boundary file in every
 * ancestor directory from `app/[locale]` down to the page's own directory,
 * outermost first, with the page itself last.
 *
 * Extraction used to start at `page.tsx`, which is not where the page starts.
 * `site-header.tsx` hangs off `app/[locale]/layout.tsx`, so `open_menu`,
 * `dashboard`, `user` and `admin` reached NO route chunk in any locale — the
 * header rendered its raw keys the moment the app stopped loading the whole
 * `messages/<locale>.json`.
 */
function chainFor(pageFile) {
  const relative = path.relative(appDir, path.dirname(pageFile));
  const segments = relative === "" ? [] : relative.split(path.sep);
  const files = [];

  let current = appDir;
  for (let i = 0; i <= segments.length; i++) {
    if (i > 0) current = path.join(current, segments[i - 1]);
    for (const name of BOUNDARY_FILES) {
      const candidate = path.join(current, name);
      if (fs.existsSync(candidate)) files.push(candidate);
    }
  }

  return files;
}

/**
 * The boundary files of `app/[locale]` itself — what the ROOT layout renders on
 * every route, and therefore what has to be in core no matter how rare a key is.
 */
function rootChainFiles() {
  const files = [];
  for (const name of BOUNDARY_FILES) {
    const candidate = path.join(appDir, name);
    if (fs.existsSync(candidate)) files.push(candidate);
  }
  return files;
}

/**
 * Sort route patterns so that the FIRST pattern matching a live pathname is the
 * right one.
 *
 * Only patterns with the same segment count can both match a given path (the
 * runtime matches whole paths, not prefixes), so the tiebreak that matters is
 * dynamic-segment count: `/admin/crm/kyc/level/create` must win over
 * `/admin/crm/kyc/level/[id]`, which is a real pair in this app and a real
 * difference in which chunk gets loaded.
 */
function compareRoutePatterns(a, b) {
  const segsA = a.split("/").filter(Boolean);
  const segsB = b.split("/").filter(Boolean);
  if (segsA.length !== segsB.length) return segsB.length - segsA.length;
  const dynA = segsA.filter((s) => s.startsWith("[")).length;
  const dynB = segsB.filter((s) => s.startsWith("[")).length;
  if (dynA !== dynB) return dynA - dynB;
  return a < b ? -1 : a > b ? 1 : 0;
}

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
} else {
  /* CLEAN FIRST — this generator's output is a SNAPSHOT, not an accumulation.
     -------------------------------------------------------------------------
     Chunk names are derived from route paths, so renaming or deleting a route
     does not overwrite its old chunk, it ORPHANS it. Nothing ever removed those
     again: one migration left 47,431 files here, ~46,000 of which no route
     could name, all of them inside `public/` and therefore publicly served and
     copied into every release archive. `.gitignore` covers this directory, so
     the rot was invisible to review as well.

     It is not a correctness bug — `isChunkUsable` rejects an unstamped or
     short-count chunk rather than half-using it, and `matchRoutePattern` only
     ever names patterns from the freshly written `routes.json`, so an orphan is
     unreachable at runtime. It is purely weight, and weight on a product that
     customers download and self-host is worth removing at the source rather
     than in a runbook step someone has to remember.

     Scoped deliberately: `.json` files at the top level of `outputDir` only —
     that is exactly the set this script writes (core, route chunks, menu
     chunks, `routes.json`, `manifest.json`). No recursion, no other extension,
     so pointing `--out=` at a populated directory cannot cost anything the
     generator would not have overwritten anyway. */
  let removed = 0;
  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      fs.unlinkSync(path.join(outputDir, entry.name));
      removed++;
    }
  }
  if (removed) {
    console.log(`🧹 Cleared ${removed.toLocaleString()} stale artifact(s) from ${outputDir}\n`);
  }
}

/**
 * Find all page.tsx files recursively
 */
function findPageFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findPageFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name === "page.tsx" || entry.name === "page.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract route from file path
 */
function fileToRoute(filePath) {
  let route = filePath
    .replace(appDir, "")
    .replace(/\\/g, "/")
    .replace(/\/(page)\.(tsx?|js)$/, "");

  // Handle route groups
  route = route.replace(/\/\([^)]+\)/g, "");

  return route || "/";
}

/**
 * Check if a route matches a pattern (supports [param] wildcards)
 */
function matchPath(pattern, pathname) {
  const regexPattern = "^" + pattern.replace(/\[(\w+)\]/g, "[^/]+") + "(/.*)?$";
  const regex = new RegExp(regexPattern);
  return regex.test(pathname);
}

/**
 * Determine the page type and which menu it needs
 */
function getPageType(route, filePath) {
  // Check if excluded (no menu needed)
  for (const pattern of EXCLUDED_PATHS) {
    if (matchPath(pattern, route)) {
      return { type: "excluded", menuFile: null, menuId: null };
    }
  }

  // Check if it's an extension page
  const relativePath = filePath.replace(appDir, "").replace(/\\/g, "/");

  // Extension admin pages
  for (const extName of EXTENSION_DIRS) {
    const extPattern = new RegExp(`^\\/\\(ext\\)\\/admin\\/${extName.replace(/\//g, "\\/")}(\\/|$)`);
    if (extPattern.test(relativePath)) {
      const menuFile = path.join(appDir, "(ext)", "admin", extName, "menu.ts");
      if (fs.existsSync(menuFile)) {
        const menuId = `ext_admin_${extName.replace(/\//g, "_")}`;
        return { type: "extension-admin", menuFile, extension: extName, menuId };
      }
    }
  }

  // Extension user pages
  if (!relativePath.includes("/admin/")) {
    for (const extName of EXTENSION_DIRS) {
      const extPattern = new RegExp(`^\\/\\(ext\\)\\/${extName.replace(/\//g, "\\/")}(\\/|$)`);
      if (extPattern.test(relativePath)) {
        const menuFile = path.join(appDir, "(ext)", extName, "menu.ts");
        if (fs.existsSync(menuFile)) {
          const menuId = `ext_${extName.replace(/\//g, "_")}`;
          return { type: "extension-user", menuFile, extension: extName, menuId };
        }
      }
    }
  }

  // Admin pages (use global adminMenu)
  if (route.startsWith("/admin")) {
    return {
      type: "admin",
      menuFile: path.join(projectRoot, "config", "menu.ts"),
      menuId: MENU_TYPES.admin,
    };
  }

  // User pages (use global userMenu)
  return {
    type: "user",
    menuFile: path.join(projectRoot, "config", "menu.ts"),
    menuId: MENU_TYPES.user,
  };
}

/**
 * Get the translation namespace for a menu type
 */
function getMenuNamespace(pageInfo) {
  if (pageInfo.type === "extension-admin") {
    return `ext_admin_${pageInfo.extension.replace(/\//g, "_")}`;
  }
  if (pageInfo.type === "extension-user") {
    return `ext_${pageInfo.extension.replace(/\//g, "_")}`;
  }
  return "menu";
}

/**
 * Menu keys belonging to the flat "menu" namespace that are declared at a
 * <SiteHeader> call site rather than in config/menu.ts.
 *
 * getPageType() hands every non-extension route config/menu.ts as its menuFile,
 * so a menu built inline in a layout - finance, support, user/kyc, investment,
 * the blog nav - contributes NO keys to the generated chunk. In dev that is
 * invisible, because dev loads the whole messages/<locale>.json; in production
 * the chunk IS the catalogue, so those labels silently fell back to the
 * hardcoded English `title` no matter what the locale file said.
 *
 * These keys are flat and few (a few dozen across the whole app), and the
 * "menu" namespace is shared by exactly two chunks - menu-user and menu-admin -
 * so they are added to both rather than tracked per route. Computed once.
 */
let callSiteMenuKeysCache = null;
function getCallSiteMenuKeysByNamespace() {
  if (callSiteMenuKeysCache) return callSiteMenuKeysCache;

  const byNamespace = new Map(); // namespace -> Set of keys relative to it

  const walk = (dir) => {
    let dirents;
    try {
      dirents = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const dirent of dirents) {
      const full = path.join(dir, dirent.name);
      if (dirent.isDirectory()) {
        if (dirent.name === "node_modules" || dirent.name === ".next") continue;
        walk(full);
        continue;
      }
      if (!/\.(tsx|ts)$/.test(dirent.name)) continue;

      let content;
      try {
        content = fs.readFileSync(full, "utf-8");
      } catch {
        continue;
      }
      if (!content.includes("SiteHeader") || !content.includes("menu=")) continue;

      // Namespace and prefix come off the JSX, defaulting to SiteHeader's own
      // ("menu", no prefix). An extension layout that declares a namespace
      // contributes to that extension's chunk, not to the flat one.
      const nsMatch = content.match(/translationNamespace\s*=\s*["']([^"']+)["']/);
      const prefixMatch = content.match(/translationNavPrefix\s*=\s*["']([^"']*)["']/);
      const namespace = nsMatch ? nsMatch[1] : "menu";
      const prefix = prefixMatch && prefixMatch[1] ? `${prefixMatch[1]}.` : "";

      if (!byNamespace.has(namespace)) byNamespace.set(namespace, new Set());
      const bucket = byNamespace.get(namespace);

      for (const match of content.matchAll(/key:\s*["']([^"']+)["']/g)) {
        const translationKey = match[1].replace(/-/g, ".");
        bucket.add(`${prefix}${translationKey}.title`);
        bucket.add(`${prefix}${translationKey}.description`);
      }
    }
  };

  walk(appDir);
  callSiteMenuKeysCache = byNamespace;
  return callSiteMenuKeysCache;
}

/**
 * The AI assistant's catalogue keys, harvested off the BACKEND.
 *
 * ---------------------------------------------------------------------------
 * WHY EXTRACTION CANNOT SEE THESE
 * ---------------------------------------------------------------------------
 * `guides.ts`, `workflows.ts` and `operations.ts` hold every walkthrough stop,
 * process step and offered action, and the three components that draw them look
 * each one up BY CATALOGUE KEY — `t(\`guides.${key}.title\`)`. `key-extractor.js`
 * accepts backticks but captures the raw template source, so that call yields the
 * literal key "guides.${key}.title" and not one real id ever reaches a chunk. In
 * dev nothing shows, because dev loads the whole of `messages/<locale>.json`; in
 * production the chunk IS the catalogue, so every guide would silently fall back
 * to the English constant on the wire.
 *
 * So the keys are read off the catalogue files themselves — the same thing
 * `extractMenuKeys` does for `menu.ts` below, and the same thing
 * `tools/check-guide-anchors.mjs` does for the anchors in `guides.ts`.
 * `tools/check-support-assistant-keys.mjs` asserts the other half: that every
 * key harvested here has an English message to be harvested INTO.
 *
 * ---------------------------------------------------------------------------
 * WHY THEY RIDE IN THE MENU CHUNK, AND ONLY THE CUSTOMER MENUS
 * ---------------------------------------------------------------------------
 * A page loads exactly two chunks: its route's, and its menu's. The three
 * surfaces here are not on one route — `GuidanceHost` is mounted in the locale
 * layout, so a walkthrough or a running process can be drawn on ANY page the
 * customer is standing on. The menu chunk is the only one that reaches all of
 * them, and it is already fetched, so this costs no extra request.
 *
 * `user` and `extension-user` only. The admin console renders these same
 * constants — see `(ext)/admin/ai/support/workflows/client.tsx` — and it must
 * KEEP showing the source English, because that screen is where the operator
 * vets the exact words a customer will see. Nothing behind `/admin` is a
 * customer surface, so paying ~34KB per admin menu chunk per locale would buy a
 * translation that must not be used.
 */
let assistantKeysCache = null;
function getSupportAssistantKeys() {
  if (assistantKeysCache) return assistantKeysCache;
  try {
    assistantKeysCache = supportAssistantKeys();
  } catch (error) {
    console.warn(`  Warning: could not harvest assistant catalogue keys: ${error.message}`);
    assistantKeysCache = [];
  }
  /*
   * A parse that finds nothing passes silently and ships an untranslated
   * assistant. The floor is asserted here as well as in the gate, because this
   * script runs on every build and the gate does not.
   */
  if (!assistantKeysCache.length) {
    console.warn(
      "  Warning: the AI assistant catalogue yielded ZERO keys. Guides, processes " +
        "and actions will render the backend's English on every locale."
    );
  }
  return assistantKeysCache;
}

/**
 * Extract menu keys from a menu file
 */
function extractMenuKeys(menuFile, pageInfo) {
  // Customer surfaces only — see the note above `getSupportAssistantKeys`.
  const assistantKeys =
    pageInfo.type === "user" || pageInfo.type === "extension-user"
      ? getSupportAssistantKeys()
      : [];

  if (!menuFile || !fs.existsSync(menuFile)) {
    return { namespace: "menu", keys: [], assistantKeys };
  }

  const namespace = getMenuNamespace(pageInfo);
  const isExtension = pageInfo.type === "extension-admin" || pageInfo.type === "extension-user";

  try {
    const content = fs.readFileSync(menuFile, "utf-8");
    const keys = new Set();

    const keyMatches = content.matchAll(/key:\s*["']([^"']+)["']/g);
    for (const match of keyMatches) {
      const menuKey = match[1];
      const translationKey = menuKey.replace(/-/g, ".");
      const prefix = isExtension ? "nav." : "";
      keys.add(`${prefix}${translationKey}.title`);
      keys.add(`${prefix}${translationKey}.description`);
    }

    // Absent keys are dropped later by extractKeysFromLocale(), so adding the
    // call-site keys here can only ever ADD labels that would otherwise render
    // in English. Extension layouts contribute too - the ecommerce category
    // dropdown builds "all-categories" in its layout, not in its menu.ts.
    const callSite = getCallSiteMenuKeysByNamespace().get(namespace);
    if (callSite) {
      for (const key of callSite) keys.add(key);
    }

    return { namespace, keys: Array.from(keys), assistantKeys };
  } catch (error) {
    console.warn(`  Warning: Could not extract menu keys from ${menuFile}: ${error.message}`);
    return { namespace, keys: [], assistantKeys };
  }
}

/**
 * Load all locale files
 */
function loadLocales() {
  const locales = new Map();
  const files = fs.readdirSync(messagesDir);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const locale = file.replace(".json", "");
    const filePath = path.join(messagesDir, file);

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      locales.set(locale, JSON.parse(content));
    } catch (error) {
      console.warn(`Failed to load ${file}:`, error.message);
    }
  }

  return locales;
}

/**
 * Extract only the needed keys from locale data
 */
function extractKeysFromLocale(namespaceKeys, localeData) {
  const result = {};

  for (const [namespace, keys] of Object.entries(namespaceKeys)) {
    if (!localeData[namespace]) continue;

    result[namespace] = {};

    for (const key of keys) {
      const value = getNestedValue(localeData[namespace], key);
      if (value !== undefined) {
        setNestedValue(result[namespace], key, value);
        continue;
      }

      // A dotted key may be stored FLAT rather than nested (see getNestedValue
      // in i18n/utils.ts). Walking alone missed those, so the key never reached
      // the pre-generated chunk and the page rendered the key path. Copy it
      // across in the shape it was authored in - re-nesting it here would
      // collide wherever a flat key is also a prefix of another
      // (`dex.venue.directPool` is both a string and a parent path).
      const flat = localeData[namespace][key];
      if (flat !== undefined) {
        result[namespace][key] = flat;
      }
    }
  }

  return result;
}

function getNestedValue(obj, keyPath) {
  const keys = keyPath.split(".");
  let current = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }

  return current;
}

function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Generate route chunk filename
 */
function getChunkName(route, locale) {
  let name = route === "/" ? "index" : route.replace(/^\//, "").replace(/\//g, "-");
  name = name.replace(/\[([^\]]+)\]/g, "$1");
  return `${name}.${locale}.json`;
}

/**
 * Generate menu chunk filename
 */
function getMenuChunkName(menuId, locale) {
  return `${menuId}.${locale}.json`;
}

/**
 * Count keys in an object recursively
 */
function countKeys(obj) {
  let count = 0;

  function countRecursive(o) {
    for (const value of Object.values(o)) {
      if (typeof value === "object" && value !== null) {
        countRecursive(value);
      } else {
        count++;
      }
    }
  }

  countRecursive(obj);
  return count;
}

/**
 * Find all source files recursively (for validation)
 */
function findAllSourceFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules
      if (entry.name !== "node_modules") {
        findAllSourceFiles(fullPath, files);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Main execution
async function main() {
  console.log("🌐 Generating i18n manifest...\n");

  // Clear any previous issues
  clearIssues();

  // Find all pages
  const pageFiles = findPageFiles(appDir);
  console.log(`Found ${pageFiles.length} pages\n`);

  // Validate all source files for i18n issues
  console.log("🔍 Validating i18n usage...\n");
  const allSourceFiles = findAllSourceFiles(appDir);
  let validationIssues = [];

  for (const sourceFile of allSourceFiles) {
    const fileIssues = validateFile(sourceFile);
    validationIssues.push(...fileIssues);
  }

  // Report validation issues
  if (validationIssues.length > 0) {
    console.log(formatIssues(validationIssues));
  } else {
    console.log("✓ No i18n validation issues found.\n");
  }

  // Load all locales
  const locales = loadLocales();
  console.log(`Loaded ${locales.size} locales\n`);

  // Track unique menus to generate
  const menusToGenerate = new Map(); // menuId -> { namespace, keys, menuFile, pageInfo }

  // Process each page
  const manifest = {
    routes: {},
    menus: {}, // menuId -> { namespace, file pattern }
    stats: {
      totalRoutes: 0,
      totalKeys: 0,
      totalMenus: 0,
      coreKeys: 0,
      zeroKeyRoutes: [],
      keysPerRoute: {},
      pageTypes: {
        admin: 0,
        user: 0,
        "extension-admin": 0,
        "extension-user": 0,
        excluded: 0,
      },
    },
    version: BUILD_STAMP,
    generated: new Date().toISOString(),
  };

  // ==========================================================================
  // PASS 1 - KEY ACCOUNTING
  //
  // Every route's key set is collected before a single byte of locale data is
  // read, because CORE cannot be decided until every route has been counted:
  // core is "the root layout chain, plus whatever at least a quarter of routes
  // ask for", and the second half of that is a global fact.
  // ==========================================================================
  console.log("Pass 1 - extracting keys per route...\n");

  const routeRecords = []; // { route, pageInfo, keys, ids }
  const idFrequency = new Map(); // "<ns>NUL<key>" -> how many routes use it

  for (const pageFile of pageFiles) {
    const route = fileToRoute(pageFile);
    const pageInfo = getPageType(route, pageFile);
    manifest.stats.pageTypes[pageInfo.type]++;

    let keys = {};
    try {
      // The whole composed route, not just its page.tsx - see chainFor().
      keys = extractChainKeys([...chainFor(pageFile), pageFile], projectRoot);
    } catch (error) {
      console.error(`  x ${route}: ${error.message}`);
    }

    const ids = new Set();
    for (const [namespace, keyList] of Object.entries(keys)) {
      for (const key of keyList) ids.add(idOf(namespace, key));
    }

    /*
     * A route that extracts NOTHING is a defect, not a quiet special case.
     *
     * The chunk IS the catalogue in production, so a route with an empty key
     * set renders every string on it as a raw key - the failure that shipped
     * with the deposit gateways. Before the extractor's `@/` resolution was
     * fixed this set held 49 routes and nobody knew, because the only symptom
     * was a chunk that was never written and a `console.log` line that said
     * "No translations found" as though that were normal.
     */
    if (ids.size === 0) {
      manifest.stats.zeroKeyRoutes.push(route);
      console.warn(`  !! ${route} [${pageInfo.type}] extracted ZERO keys - every string on it will render as a raw key`);
    }

    for (const id of ids) idFrequency.set(id, (idFrequency.get(id) || 0) + 1);

    // Track which menu this page uses (menu keys never go in the page chunk)
    if (pageInfo.type !== "excluded" && pageInfo.menuFile && pageInfo.menuId) {
      if (!menusToGenerate.has(pageInfo.menuId)) {
        const menuData = extractMenuKeys(pageInfo.menuFile, pageInfo);
        menusToGenerate.set(pageInfo.menuId, {
          namespace: menuData.namespace,
          keys: menuData.keys,
          assistantKeys: menuData.assistantKeys,
          menuFile: pageInfo.menuFile,
          pageInfo: pageInfo,
        });
      }
    }

    routeRecords.push({ route, pageInfo, keys, ids });

    manifest.routes[route] = {
      namespaces: Object.keys(keys),
      keys: keys,
      pageType: pageInfo.type,
      extension: pageInfo.extension || null,
      menuId: pageInfo.menuId || null,
    };
    manifest.stats.totalRoutes++;
    manifest.stats.totalKeys += ids.size;
    manifest.stats.keysPerRoute[route] = ids.size;
  }

  console.log(`\n  ${routeRecords.length} routes, ${idFrequency.size} distinct keys`);
  if (manifest.stats.zeroKeyRoutes.length > 0) {
    console.warn(
      `\n  !! ${manifest.stats.zeroKeyRoutes.length} route(s) extracted zero keys. ` +
        `Those pages will render raw keys in production.\n`
    );
  }

  // ==========================================================================
  // CORE - the set every page carries
  // ==========================================================================
  const coreThreshold = Math.ceil(routeRecords.length * CORE_KEY_ROUTE_SHARE);
  const coreIds = new Set();

  const rootChain = extractChainKeys(rootChainFiles(), projectRoot);
  for (const [namespace, keyList] of Object.entries(rootChain)) {
    for (const key of keyList) coreIds.add(idOf(namespace, key));
  }
  const rootChainCount = coreIds.size;

  for (const [id, count] of idFrequency) {
    if (count >= coreThreshold) coreIds.add(id);
  }
  manifest.stats.coreKeys = coreIds.size;

  console.log(
    `\nCore: ${coreIds.size} keys ` +
      `(${rootChainCount} from the root layout chain, ` +
      `the rest used by >= ${coreThreshold} of ${routeRecords.length} routes)\n`
  );

  // ==========================================================================
  // ROUTE INDEX - what the runtime matches a live pathname against
  //
  // manifest.json is a megabyte and carries every key of every route; nothing
  // at runtime needs that, and no browser should download it. routes.json is
  // the same index stripped to what a lookup actually needs: the pattern and
  // the menu id. It is also the only thing that lets a DYNAMIC route be
  // matched at all - the loader used to walk parent paths, which can never
  // reach a `[param]` segment, so all 102 dynamic routes fell through to the
  // full-catalogue fallback.
  // ==========================================================================
  const routeIndex = routeRecords
    .map((record) => [record.route, record.pageInfo.menuId || null])
    .sort((a, b) => compareRoutePatterns(a[0], b[0]));

  fs.writeFileSync(
    path.join(outputDir, "routes.json"),
    JSON.stringify({ v: BUILD_STAMP, routes: routeIndex })
  );

  // ==========================================================================
  // PASS 2 - write the per-locale artifacts
  // ==========================================================================
  const writeLocales = [...locales].filter(
    ([locale]) => !LOCALE_FILTER || LOCALE_FILTER.has(locale)
  );
  if (LOCALE_FILTER) {
    console.warn(
      `!! --locales is set: writing ONLY ${writeLocales.map(([l]) => l).join(", ")}. ` +
        `This is a verification shortcut - a release build must run without it.\n`
    );
  }

  console.log(`Pass 2 - writing chunks for ${writeLocales.length} locale(s)...\n`);

  const coreNamespaceKeys = idsToNamespaceKeys(coreIds);

  for (const [locale, localeData] of writeLocales) {
    const corePayload = extractKeysFromLocale(coreNamespaceKeys, localeData);
    corePayload.__meta = { v: BUILD_STAMP, keys: countKeys(corePayload), core: true };
    fs.writeFileSync(
      path.join(outputDir, `core.${locale}.json`),
      JSON.stringify(corePayload)
    );
  }

  for (const record of routeRecords) {
    /*
     * Route chunks are DELTAS against core. A key that core already carries is
     * not repeated here - repeating it 503 times per locale is most of what
     * `public/i18n` used to weigh.
     */
    const deltaIds = new Set();
    for (const id of record.ids) if (!coreIds.has(id)) deltaIds.add(id);
    const deltaNamespaceKeys = idsToNamespaceKeys(deltaIds);

    for (const [locale, localeData] of writeLocales) {
      const payload = extractKeysFromLocale(deltaNamespaceKeys, localeData);
      /*
       * Written even when the delta is empty, and always stamped.
       *
       * The old script skipped the write when a route resolved no keys, so a
       * missing file meant two different things - "this route needs nothing
       * beyond core" and "generation failed for this route" - and the runtime
       * could not tell them apart, so it treated both as a miss and fell back
       * to the whole 1.45 MB catalogue. A stamped empty chunk says the first
       * thing unambiguously.
       */
      payload.__meta = {
        v: BUILD_STAMP,
        keys: countKeys(payload),
        menu: record.pageInfo.menuId || null,
      };
      fs.writeFileSync(
        path.join(outputDir, getChunkName(record.route, locale)),
        JSON.stringify(payload)
      );
    }
  }

  // ==========================================================================
  // PASS 3 - menu chunks
  // ==========================================================================
  console.log(`Pass 3 - generating ${menusToGenerate.size} menu files...\n`);

  for (const [menuId, menuData] of menusToGenerate) {
    const assistantKeys = menuData.assistantKeys || [];
    console.log(
      `  Menu: ${menuId} (${menuData.keys.length} keys` +
        (assistantKeys.length ? `, +${assistantKeys.length} assistant` : "") +
        ")"
    );

    manifest.menus[menuId] = {
      namespace: menuData.namespace,
      keyCount: menuData.keys.length,
      assistantKeyCount: assistantKeys.length,
    };
    manifest.stats.totalMenus++;

    for (const [locale, localeData] of writeLocales) {
      /*
       * Two namespaces in one chunk. The menu's own, and — on customer menus —
       * the assistant catalogue, which has no route of its own to ride on.
       * `extractKeysFromLocale` drops anything a locale has not translated, so a
       * locale with no `support_assistant` block simply carries nothing extra
       * and the surfaces fall back to the English on the wire.
       */
      const menuKeys = { [menuData.namespace]: menuData.keys };
      if (assistantKeys.length) {
        menuKeys[SUPPORT_ASSISTANT_NAMESPACE] = assistantKeys;
      }
      const menuTranslations = extractKeysFromLocale(menuKeys, localeData);
      menuTranslations.__meta = { v: BUILD_STAMP, keys: countKeys(menuTranslations) };

      fs.writeFileSync(
        path.join(outputDir, getMenuChunkName(menuId, locale)),
        JSON.stringify(menuTranslations)
      );
    }
  }

  // Write manifest
  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log("\n✅ i18n manifest generated successfully!");
  console.log(`   Routes: ${manifest.stats.totalRoutes}`);
  console.log(`   Menus: ${manifest.stats.totalMenus}`);
  console.log(`   Total page keys: ${manifest.stats.totalKeys}`);
  console.log(`   Page types:`);
  console.log(`     - Admin: ${manifest.stats.pageTypes.admin}`);
  console.log(`     - User: ${manifest.stats.pageTypes.user}`);
  console.log(`     - Extension Admin: ${manifest.stats.pageTypes["extension-admin"]}`);
  console.log(`     - Extension User: ${manifest.stats.pageTypes["extension-user"]}`);
  console.log(`     - Excluded: ${manifest.stats.pageTypes.excluded}`);
  console.log(`   Core keys: ${manifest.stats.coreKeys}`);
  console.log(`   Build stamp: ${BUILD_STAMP}`);
  console.log(`   Output: ${outputDir}`);

  /*
   * A zero-key route is a production defect, and it is reported LAST so it is
   * the thing still on screen when the run ends. It is deliberately not a
   * non-zero exit: this script is the first half of `pnpm build:frontend`, and
   * failing the release build over a page that genuinely has no strings would
   * be worse than the warning. The count is also in manifest.stats so a checker
   * can gate on it.
   */
  if (manifest.stats.zeroKeyRoutes.length > 0) {
    console.warn(
      `\n!! ${manifest.stats.zeroKeyRoutes.length} route(s) extracted ZERO translation keys.`
    );
    console.warn(`   Every string on these pages renders as a raw key in production:`);
    for (const route of manifest.stats.zeroKeyRoutes) console.warn(`     ${route}`);
    console.warn("");
  }

  // Final validation summary
  if (validationIssues.length > 0) {
    const errors = validationIssues.filter(i => i.severity === "error").length;
    const warnings = validationIssues.filter(i => i.severity === "warning").length;
    console.log(`\n⚠️  i18n Validation: ${errors} error(s), ${warnings} warning(s)`);
    console.log(`   Run 'pnpm build:i18n' to see detailed issues.\n`);

    // Exit with error code if there are errors
    if (errors > 0) {
      process.exit(1);
    }
  }
}

main().catch(console.error);