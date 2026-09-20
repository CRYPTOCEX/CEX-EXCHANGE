/**
 * Next.js Configuration (Updated for Custom i18n)
 *
 * Changes from previous config:
 * - Removed withNextIntl wrapper
 * - Added I18nOptimizationPlugin for namespace extraction
 * - Added bundle analyzer (run with ANALYZE=true)
 */

const path = require("path");
const fs = require("fs");

// ============================================================================
// BUILD-TIME DISK INSPECTION
//
// Not every install ships every part of the product, and not every install is
// clean — an update is extracted over the previous one, so files a release
// removed are still there. Both facts break the build in ways whose error
// message points somewhere else entirely, so the three sections below look at
// what is actually on disk before Next.js starts resolving anything.
// ============================================================================

// File extensions a bare import specifier can resolve to, in resolution order.
const SOURCE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs"];

// Directories the source scans below never need to walk into.
const SCAN_SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".turbo",
  "coverage",
  "dist",
  "public",
  "messages",
]);

/** Does `absPathNoExt` resolve, as a file or as a directory with an index? */
const resolvesOnDisk = (absPathNoExt) => {
  for (const ext of SOURCE_EXTENSIONS) {
    if (fs.existsSync(absPathNoExt + ext)) return true;
    if (fs.existsSync(path.join(absPathNoExt, `index${ext}`))) return true;
  }
  return false;
};

// ---- Chart Engine (components) ----
const CHART_ENGINE_PATH = path.resolve(__dirname, "components/(ext)/chart-engine");
const CHART_ENGINE_SOURCE = path.join(CHART_ENGINE_PATH, "index.tsx");
const CHART_ENGINE_DIST = path.join(CHART_ENGINE_PATH, "dist/index.js");
const HAS_CHART_ENGINE_SOURCE = fs.existsSync(CHART_ENGINE_SOURCE);
const HAS_CHART_ENGINE_DIST = fs.existsSync(CHART_ENGINE_DIST);
const HAS_CHART_ENGINE = HAS_CHART_ENGINE_SOURCE || HAS_CHART_ENGINE_DIST;

// ---- Chart Engine: WHICH copy the alias points at ----
//
// The addon is a committed prebuilt: its package.json sends `main`, `module`
// and `types` to `dist/`, so aliasing the stub onto the package DIRECTORY - as
// this did unconditionally - loads `dist/index.js`. In production that is
// exactly right. In development it is the single most expensive thing about
// working on the chart: an edit to any of the 452 sources changes nothing you
// can see until `pnpm build:chart-engine` runs, the dev server recompiles
// happily, the type-check passes, and the behaviour is simply the old one. It
// is a full bundle round-trip per iteration, with no HMR and no error overlay
// pointing at your file.
//
// So dev resolves the SOURCE ENTRY instead. Turbopack then owns those 452 files
// like any other app source: hot module replacement, real stack frames, real
// line numbers. Production keeps loading the bundle, unchanged.
//
// `process.env.NODE_ENV` is set by the Next CLI in a commander `preAction`
// hook - `process.env.NODE_ENV = process.env.NODE_ENV || (cmd === 'dev' ?
// 'development' : 'production')` - which runs BEFORE the command action loads
// this file, so it is already correct here. Both overrides are honoured:
//   CHART_ENGINE_SOURCE=0  dev against the committed bundle (reproduce a
//                          release, or confirm a stale-dist bug)
//   CHART_ENGINE_SOURCE=1  build from source (an install whose dist/ is
//                          missing; see the production fallback below)
const CHART_ENGINE_SOURCE_ENV = process.env.CHART_ENGINE_SOURCE;
/* `NODE_ENV !== "production"` alone is not enough to mean "the dev server".
   `next build --debug-prerender` sets `process.env.NODE_ENV = "development"`
   inside the build command (next/dist/bin/next), so a debug-prerender build
   would have compiled the addon FROM SOURCE while calling itself a build —
   producing an artefact that does not match what `next build` normally emits,
   which is the opposite of what you want from a debugging flag. Requiring the
   command not to be `build` closes it without adopting the function-config
   form, which this file is far too large to convert safely for one flag. */
const IS_BUILD_COMMAND = process.argv.includes("build");
const IS_DEV_SERVER = process.env.NODE_ENV !== "production" && !IS_BUILD_COMMAND;

/* A production build with no dist/ used to die on "module not found" pointing
   at the stub, which names neither the addon nor the build step. Compiling the
   sources is a strictly better answer than failing, so take it - loudly. */
const CHART_ENGINE_DIST_MISSING =
  !IS_DEV_SERVER && HAS_CHART_ENGINE_SOURCE && !HAS_CHART_ENGINE_DIST;

/* `CHART_ENGINE_SOURCE=0` asks for the bundle. Honour that only when there IS
   a bundle: otherwise the alias lands on the package directory, `main` points
   at a `dist/index.js` that is not there, and the build dies on "module not
   found" naming the STUB — an error that mentions neither the addon nor the
   missing build. An explicit request we cannot satisfy is worth a sentence,
   not a wrong answer. */
const CHART_ENGINE_DIST_REQUESTED_BUT_ABSENT =
  CHART_ENGINE_SOURCE_ENV === "0" && HAS_CHART_ENGINE_SOURCE && !HAS_CHART_ENGINE_DIST;

const CHART_ENGINE_FROM_SOURCE =
  HAS_CHART_ENGINE_SOURCE &&
  (CHART_ENGINE_SOURCE_ENV === "1"
    ? true
    : CHART_ENGINE_SOURCE_ENV === "0"
      ? CHART_ENGINE_DIST_REQUESTED_BUT_ABSENT
      : IS_DEV_SERVER || CHART_ENGINE_DIST_MISSING);

if (CHART_ENGINE_DIST_REQUESTED_BUT_ABSENT) {
  console.warn(
    "Frontend: CHART_ENGINE_SOURCE=0 asks for the committed chart-engine bundle, but\n" +
      "  components/(ext)/chart-engine/dist/index.js does not exist. Compiling from\n" +
      "  source instead. Run `pnpm build:chart-engine` to produce the bundle."
  );
}

/* Turbopack resolves a relative alias target against the project root; webpack
   needs the absolute path. Keep the two spellings of one decision together. */
const CHART_ENGINE_ALIAS_REL = CHART_ENGINE_FROM_SOURCE
  ? "./components/(ext)/chart-engine/index.tsx"
  : "./components/(ext)/chart-engine";
const CHART_ENGINE_ALIAS_ABS = CHART_ENGINE_FROM_SOURCE
  ? CHART_ENGINE_SOURCE
  : CHART_ENGINE_PATH;

/* `npm install` inside the addon used to auto-install its own `peerDependencies`
   (all of them `"*"`), leaving a second react/react-dom/next/zustand under
   `chart-engine/node_modules` at versions that did NOT match the app. That is
   inert while the app loads `dist/` - tsup marks every peer external - and
   fatal the moment these sources are compiled directly, because resolution from
   `index.tsx` finds the local copy first and the chart mounts a second React:
   "Invalid hook call", on a page that worked a moment ago.
   `.npmrc` there now sets legacy-peer-deps=true and
   `scripts/prune-peer-installs.mjs` cleans up installs that predate it. Say so
   here rather than let the overlay blame React. */
const CHART_ENGINE_PEER_SHADOWS = !CHART_ENGINE_FROM_SOURCE
  ? []
  : ["react", "react-dom", "next", "zustand", "framer-motion", "next-themes"].filter((name) =>
      fs.existsSync(path.join(CHART_ENGINE_PATH, "node_modules", name))
    );

if (CHART_ENGINE_PEER_SHADOWS.length > 0) {
  console.error(
    "Frontend: chart-engine is compiling from SOURCE, but its own node_modules still\n" +
      `  shadows the app's copy of: ${CHART_ENGINE_PEER_SHADOWS.join(", ")}\n` +
      "  Two React instances will throw \"Invalid hook call\" as soon as the chart mounts.\n" +
      "  Fix: node \"components/(ext)/chart-engine/scripts/prune-peer-installs.mjs\""
  );
}

if (CHART_ENGINE_DIST_MISSING) {
  console.warn(
    "Frontend: chart-engine has sources but no dist/index.js, so this production\n" +
      "  build is compiling the addon from source. That works, but it is not what a\n" +
      "  release ships. Run `pnpm build:chart-engine` to restore the committed bundle."
  );
} else if (CHART_ENGINE_FROM_SOURCE) {
  console.log(
    "Frontend: chart-engine → SOURCE (hot reload on; no `pnpm build:chart-engine` needed).\n" +
      "  Set CHART_ENGINE_SOURCE=0 to develop against the committed dist/ bundle instead."
  );
}

// ============================================================================
// OPTIONAL EXTENSION ADDONS
//
// Everything under `app/[locale]/(ext)/` is optional: a licence may ship
// without `trading-bot` or `ai/binary-engine`, and on that install the folder
// is simply not there. Core files nonetheless import extension modules
// STATICALLY — the CRM user page pulls each addon's table columns, and the
// generated `lib/chrome/addon-menus.ts` pulls every addon's menu — so an
// absent extension is a hard "module not found" that kills the whole build.
// Neither import can be made dynamic: the CRM page needs the column defs at
// render time, and the menu editor is a client component that cannot read the
// filesystem (see the header of `tools/build-addon-menus.js`).
//
// This list used to be six addons written out by hand, and that is the failure
// we kept paying for: every new core->ext import had to be remembered here,
// forgetting one broke nothing locally (where every extension is present) and
// only surfaced as a dead production build on a customer's server. So it is
// discovered instead — scan the source for `@/app/[locale]/(ext)/...`
// specifiers, check each against disk, and alias the missing ones onto a stub
// that answers with nothing. Costs ~70ms and cannot go stale.
//
// Discovering the SPECIFIERS was only half of it, and the half that was left
// failed the same way. Which stub to alias onto was still a hand-written list
// of module shapes (`/menu`, `/columns`), so an import of any other shape had
// no stub, could not be aliased, and killed the build exactly as before — which
// is what a single `case-pane` import on one preview page did to every install
// without the AI Support addon. So the shapes are discovered too: the scan
// reads the binding NAMES each importer asks for and generates a stub that
// exports them. Nothing to remember, and no shape it has not met before.
// ============================================================================

const EXT_SPECIFIER_PREFIX = "@/app/[locale]/(ext)/";
const EXT_SPECIFIER_RE = /["'](@\/app\/\[locale\]\/\(ext\)\/[^"'\s]+)["']/g;
/* The binding list of an `import ... from "<ext>"` or `export ... from "<ext>"`.
   `[^;]` rather than `.` so a clause broken over several lines is still one
   match — the import that started all this spans four. */
const EXT_IMPORT_RE =
  /(?:import|export)\s+([^;]*?)\s+from\s+["'](@\/app\/\[locale\]\/\(ext\)\/[^"'\s]+)["']/g;

/** Names that can appear in a clause but are never an export identifier. */
const NOT_AN_EXPORT_NAME = new Set(["default", "type", "as", "from"]);

const bindingsFor = (out, specifier) => {
  let bindings = out.get(specifier);
  if (!bindings) {
    bindings = { values: new Set(), types: new Set(), hasDefault: false };
    out.set(specifier, bindings);
  }
  return bindings;
};

/**
 * Record what one import clause asks a module for.
 *
 * Deliberately not a parser: it splits on the braces and on commas, which is
 * enough for every form the source actually uses (`A`, `A, { B }`, `* as A`,
 * `{ A as B }`, `{ type A }`, `import type { A }`). A name it misreads is a
 * name the stub does not export, which fails the build loudly rather than
 * quietly — the safe direction.
 */
const readImportClause = (bindings, clause) => {
  const braced = clause.match(/\{([\s\S]*)\}/);
  const outside = (braced ? clause.slice(0, braced.index) : clause).replace(/,\s*$/, "").trim();
  const typeOnly = /^type\b/.test(outside);
  /* `* as ns` reads properties at runtime, so a missing one is undefined
     rather than a build error — only a real default binding needs an export. */
  if (outside && !typeOnly && !outside.startsWith("*")) bindings.hasDefault = true;
  for (const part of (braced ? braced[1] : "").split(",")) {
    const name = part.trim().match(/^(type\s+)?([A-Za-z_$][\w$]*)/);
    if (!name || NOT_AN_EXPORT_NAME.has(name[2])) continue;
    (name[1] || typeOnly ? bindings.types : bindings.values).add(name[2]);
  }
};

/**
 * Every extension module imported anywhere in the source tree, with the binding
 * names its importers ask it for.
 *
 * The names matter because a stub has to satisfy the exact named exports the
 * importer wrote — a stub missing one fails the build just as loudly as the
 * missing module did — and they cannot be guessed from the path.
 */
const collectExtImports = (absDir, out = new Map()) => {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      if (!SCAN_SKIP_DIRS.has(entry.name)) collectExtImports(full, out);
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      let source;
      try {
        source = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      /* Cheap reject first — the substring is absent from all but a handful of
         files, and the regex is the expensive part. */
      if (!source.includes("(ext)/")) continue;
      /* Two passes: the first finds every specifier however it is written
         (static import, `import()`, re-export, a bare string), the second finds
         the names of those that are static imports. */
      for (const match of source.matchAll(EXT_SPECIFIER_RE)) bindingsFor(out, match[1]);
      for (const match of source.matchAll(EXT_IMPORT_RE)) {
        readImportClause(bindingsFor(out, match[2]), match[1]);
      }
    }
  }
  return out;
};

/**
 * The hand-written stub that can stand in for a given extension module.
 *
 * Keyed on module SHAPE, not on addon. Each one is here because the answer has
 * to be MEANINGFUL rather than merely present: an empty `menu` tells the menu
 * editor the addon contributes no navigation, empty `useColumns` tells the CRM
 * page to hide the tab, and `case-pane` draws the operator column's frame with
 * a line saying which addon is missing instead of a pane-shaped hole. Anything
 * else falls through to the generated stub below — a shape list nobody
 * maintains is a shape list that is wrong, which is the failure this whole
 * section exists for.
 */
const stubForExtSpecifier = (specifier) => {
  if (specifier.endsWith("/menu")) return "lib/stubs/ext-menu-stub";
  if (specifier.endsWith("/columns")) return "lib/stubs/ext-columns-stub";
  if (specifier.endsWith("/case-pane")) return "lib/stubs/ext-case-pane-stub";
  return null;
};

// ---- the generated fallback ----
//
// A hand-written stub cannot cover a shape nobody has written yet, and the
// build does not degrade when it meets one — it DIES, on a customer's server,
// naming a module that is missing because their licence does not include it.
// That is how `admin/ai/support/inbox/case-pane` took down every build without
// the AI Support addon: one preview page imported one component, no shape rule
// matched, and the whole frontend stopped building.
//
// So the fallback is generated from what the importers actually ask for. The
// scan above already knows every binding name; this writes a module that
// exports exactly those, each an inert function that renders nothing and
// carries `__isStub` so a caller can tell. It cannot go stale and it cannot
// miss a shape, because it is derived from the imports rather than from a list.
const FALLBACK_STUB = "lib/stubs/ext-fallback-stub.generated";

/** Write the generated fallback for `entries`; false when it could not be written. */
const writeFallbackStub = (entries) => {
  const values = new Set();
  const types = new Set();
  let hasDefault = false;
  for (const { bindings } of entries) {
    for (const name of bindings.values) values.add(name);
    for (const name of bindings.types) types.add(name);
    hasDefault = hasDefault || bindings.hasDefault;
  }

  const sorted = (set) => [...set].sort();
  const source = [
    "/**",
    " * Extension Fallback Stub — GENERATED BY next.config.js. DO NOT EDIT, DO NOT COMMIT.",
    " *",
    " * Stands in for extension modules this install does not ship and which have",
    " * no purpose-built stub in `lib/stubs/`. Every export is inert: called as a",
    " * component it renders nothing, called as a function it answers null.",
    " *",
    " * The names below are whatever the importers on THIS install ask for, so the",
    " * file changes shape as the source does. Delete it freely — the next build",
    " * writes it again.",
    " *",
    " * Absent modules it is standing in for:",
    ...entries.map(({ specifier }) => ` *   ${specifier}`),
    " */",
    "",
    "const inert = (name: string) => {",
    "  const fn: any = () => null;",
    "  fn.displayName = name;",
    "  fn.__isStub = true;",
    "  return fn;",
    "};",
    "",
    ...sorted(types).map((name) => `export type ${name} = any;`),
    ...sorted(values).map((name) => `export const ${name} = inert(${JSON.stringify(name)});`),
    ...(hasDefault ? ['export default inert("default");'] : []),
    "",
  ].join("\n");

  const absolute = path.resolve(__dirname, `${FALLBACK_STUB}.ts`);
  try {
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    /* Compare before writing: an unchanged mtime is what keeps `next dev` from
       treating every config evaluation as a source change. */
    let existing = null;
    try {
      existing = fs.readFileSync(absolute, "utf8");
    } catch {
      /* Not there yet — the normal case on a fresh install. */
    }
    if (existing !== source) fs.writeFileSync(absolute, source);
    return true;
  } catch (error) {
    console.error(`Frontend: could not write ${FALLBACK_STUB}.ts: ${error.message}`);
    return false;
  }
};

const missingExtSpecifiers = [];
const fallbackExtSpecifiers = [];
for (const [specifier, bindings] of collectExtImports(__dirname)) {
  const relative = specifier.slice(EXT_SPECIFIER_PREFIX.length);
  if (resolvesOnDisk(path.resolve(__dirname, "app/[locale]/(ext)", relative))) continue;
  const stub = stubForExtSpecifier(specifier);
  if (stub) missingExtSpecifiers.push({ specifier, stub });
  else fallbackExtSpecifiers.push({ specifier, bindings });
}

const fallbackWritten = fallbackExtSpecifiers.length > 0 && writeFallbackStub(fallbackExtSpecifiers);
if (fallbackWritten) {
  for (const { specifier } of fallbackExtSpecifiers) {
    missingExtSpecifiers.push({ specifier, stub: FALLBACK_STUB });
  }
} else if (fallbackExtSpecifiers.length === 0) {
  /* Nothing to stand in for — on a full install, or once the operator installs
     the addon. Nothing imports the file any more, so leave no leftover behind:
     the whole reason this section exists is that leftovers are load-bearing. */
  try {
    fs.rmSync(path.resolve(__dirname, `${FALLBACK_STUB}.ts`), { force: true });
  } catch {
    /* Not there, or not ours to delete. Either way it is inert. */
  }
}

/**
 * Which ADDON a missing specifier belongs to, for the log line.
 *
 * Not just the first path segment: addons nest, so `admin/ai/binary-engine/menu`
 * belongs to `ai/binary-engine`, not to `ai` — and `ai` may well be installed.
 * The addon root is the shallowest segment path that is itself absent, which is
 * exactly the folder the operator would have to install.
 */
const addonNameFor = (specifier) => {
  const rest = specifier.slice(EXT_SPECIFIER_PREFIX.length);
  const segments = rest.split("/");
  const isAdmin = segments[0] === "admin";
  const owned = isAdmin ? segments.slice(1) : segments;
  for (let i = 1; i < owned.length; i++) {
    const candidate = owned.slice(0, i);
    const onDisk = path.resolve(
      __dirname,
      "app/[locale]/(ext)",
      ...(isAdmin ? ["admin"] : []),
      ...candidate
    );
    if (!fs.existsSync(onDisk)) return candidate.join("/");
  }
  return owned.slice(0, -1).join("/");
};

if (missingExtSpecifiers.length > 0) {
  const addons = new Set(missingExtSpecifiers.map(({ specifier }) => addonNameFor(specifier)));
  console.log(
    `Frontend: ${missingExtSpecifiers.length} import(s) stubbed for addons not installed here: ${[...addons].sort().join(", ")}`
  );
}

/* The generated stub keeps the build alive, but it is not free: whatever the
   importing surface rendered with that module renders nothing now. Name them,
   because "the page is blank" is otherwise unattributable. */
if (fallbackWritten) {
  console.log(
    "Frontend: no purpose-built stub for these, so they resolve to an inert one and\n" +
      "  whatever they rendered is absent on this install:\n" +
      fallbackExtSpecifiers.map(({ specifier }) => `    ${specifier}`).join("\n") +
      `\n  A better answer than nothing goes in lib/stubs/ + stubForExtSpecifier().`
  );
}

/* Reached only when the fallback could not be WRITTEN — a read-only frontend/
   directory. The build will now die on "module not found"; say why first. */
if (fallbackExtSpecifiers.length > 0 && !fallbackWritten) {
  console.error(
    "Frontend: these extension imports have no stub and their addon is not installed:\n" +
      fallbackExtSpecifiers.map(({ specifier }) => `  ${specifier}`).join("\n") +
      `\n  ${FALLBACK_STUB}.ts could not be written, so they cannot be aliased.` +
      "\n  Make frontend/lib/stubs writable, or add a stub and map it in stubForExtSpecifier()."
  );
}

// ============================================================================
// BARREL SHADOWING GUARD
//
// An update is extracted OVER an existing install; nothing deletes the files a
// release removed. That is harmless until a removed FILE sits next to a
// directory of the same name — `components/ui/chart.tsx` beside the newer
// `components/ui/chart/` — because resolution prefers the file. Every
// `@/components/ui/chart` import then silently binds to the previous version's
// module, and the build fails with "export seriesColor was not found" against
// a file that is not in the repository at all. Nothing in that error points at
// the stale copy, which is what makes it expensive.
//
// THIS DETECTS; IT CANNOT FIX. `resolveAlias` below is not a way out, and it
// was tried: Turbopack applies tsconfig `paths` FIRST and only falls back to
// the alias map when nothing else resolved the specifier. A shadowed barrel
// always resolves — to the stale file — so an alias for it never fires. (That
// same ordering is exactly why the extension stubs above DO work: their target
// is absent, so resolution falls through to the alias.)
//
// What actually fixes it, in order:
//   1. `pnpm clean:stale` deletes the file. The build and dev scripts run it,
//      so an updated install heals itself on the next build.
//   2. tsconfig `paths` carries an exact entry for `@/components/ui/chart`.
//      Non-wildcard patterns beat `@/*`, and Turbopack, tsc and the editor all
//      honour it — so even a build that skips step 1 resolves the kit.
// So this block exists to NAME the file when neither has run yet, because the
// raw error names only the module that "lacks" the export.
//
// Not every same-named sibling is stale: a file that re-exports the directory
// it sits beside is a deliberate facade that usually adds exports of its own
// (`binary-engine/utils.ts`). Such a file always names `./<dir>`; a leftover
// from a previous version never does.
//
// On a clean checkout this finds nothing and says nothing.
// ============================================================================

/** True when `absFile` re-exports the directory it shadows — deliberate, not stale. */
const isFacadeOver = (absFile, dirName) => {
  let source;
  try {
    source = fs.readFileSync(absFile, "utf8");
  } catch {
    /* Unreadable: leave resolution exactly as it is rather than guess. */
    return true;
  }
  return new RegExp(`["'\`]\\./${dirName}(/|["'\`])`).test(source);
};

const findShadowedBarrels = (absDir, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  const fileNames = new Set(entries.filter((e) => e.isFile()).map((e) => e.name));
  for (const entry of entries) {
    if (!entry.isDirectory() || SCAN_SKIP_DIRS.has(entry.name)) continue;
    const child = path.join(absDir, entry.name);
    const shadow = SOURCE_EXTENSIONS.map((ext) => entry.name + ext).find((n) => fileNames.has(n));
    /* Only a directory that can answer a bare import can be shadowed at all. */
    if (shadow && SOURCE_EXTENSIONS.some((ext) => fs.existsSync(path.join(child, `index${ext}`)))) {
      const absShadow = path.join(absDir, shadow);
      if (!isFacadeOver(absShadow, entry.name)) out.push({ dir: child, shadowedBy: absShadow });
    }
    findShadowedBarrels(child, out);
  }
  return out;
};

const shadowedBarrels = findShadowedBarrels(__dirname);

if (shadowedBarrels.length > 0) {
  console.warn(
    "Frontend: leftover file(s) from a previous version are shadowing a module directory.\n" +
      "  Any import of the bare path binds to the OLD module, and the error will\n" +
      "  blame a missing export rather than these files:\n" +
      shadowedBarrels
        .map(({ shadowedBy }) => `    ${path.relative(__dirname, shadowedBy).split(path.sep).join("/")}`)
        .join("\n") +
      "\n  Fix: pnpm clean:stale"
  );
}

/** Turbopack takes relative values; webpack needs them absolute. */
const buildExtStubAliases = (absolute) => {
  const aliases = {};
  for (const { specifier, stub } of missingExtSpecifiers) {
    aliases[specifier] = absolute ? path.resolve(__dirname, stub) : `./${stub}`;
  }
  return aliases;
};

// Bundle analyzer - run with: ANALYZE=true pnpm build
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// Multi-path environment loading with fallbacks (same approach as backend)
const envPaths = [
  path.resolve(process.cwd(), "../.env"),     // Root .env (priority)
  path.resolve(__dirname, "../.env"),        // Development relative
  path.resolve(__dirname, ".env"),           // Frontend .env fallback
  path.resolve(process.cwd(), ".env")        // Current working directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath, quiet: true });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn("Frontend: No .env file found in any of the expected locations");
  console.warn("Frontend: Checked paths:", envPaths);
}

/*
  Said HERE, at build time, because nothing else can say it early enough.

  `config/wallet.tsx` inlines this value, and that module is only ever loaded
  through next/dynamic({ ssr: false }) — so a missing id is invisible to
  `next build` and used to surface as a whole-page 500 in the VISITOR'S browser,
  on the profile wallet tab, the Swap terminal, the NFT flows and wallet sign-in.
  Those screens render an explanatory notice now; this line is the operator's
  first warning that they will. A warning and not a failure: an install that
  sells no wallet feature is entitled to leave it empty.
*/
if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
  console.warn(
    "Frontend: NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID is not set. Wallet sign-in, " +
      "Profile → Wallet linking, the NFT wallet actions and the Swap terminal will show " +
      "\"Wallet connection is not set up yet\" until it is set in .env and the frontend " +
      "is rebuilt (a restart is not enough). Free project id: https://cloud.reown.com"
  );
}

const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

// Import i18n optimization plugins
const I18nOptimizationPlugin = require("./i18n/webpack-plugin-i18n");
const I18nKeyOptimizationPlugin = require("./i18n/webpack-plugin-i18n-keys");

// Extract hostname from NEXT_PUBLIC_SITE_URL for image optimization
const getSiteHostname = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;
  try {
    const url = new URL(siteUrl);
    return url.hostname;
  } catch {
    return null;
  }
};
const siteHostname = getSiteHostname();

/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  // Expose addon availability as environment variables
  // These are determined at build time based on folder existence
  env: {
    NEXT_PUBLIC_HAS_CHART_ENGINE: HAS_CHART_ENGINE ? "true" : "false",
  },

  typescript: {
    ignoreBuildErrors: true
  },

  poweredByHeader: false,
  trailingSlash: false,
  transpilePackages: ["lucide-react", "framer-motion"],
  // Mark packages that use worker_threads as server external
  /* `isomorphic-dompurify` is here because `lib/sanitize.ts` needs a real DOM
     on the SERVER.

     Every caller of sanitizeHTML feeds `dangerouslySetInnerHTML`, and every one
     is a "use client" component — which still server-renders on the first
     request. The sanitiser used to return its input unchanged on the server, so
     unsanitised operator HTML went straight into the document the browser
     parses, and React never re-hydrates dangerouslySetInnerHTML content to fix
     it afterwards.

     External rather than bundled: it pulls in jsdom, which is large, resolves
     optional native dependencies, and only ever runs in Node. Bundling it is
     slow and breaks at build time. */
  serverExternalPackages: [
    'ioredis',
    'sharp',
    'pino',
    'pino-pretty',
    'isomorphic-dompurify',
    'jsdom',
  ],

  // Bundle optimization - tree-shake these packages more aggressively
  experimental: {
    // Turbopack's on-disk dev cache (.next/dev/cache/turbopack) grows without
    // bound on this codebase — ~250 MB per .sst file, and it never compacts
    // back down. It reached 248 GB on 2026-07-28 and filled the disk, which
    // wedges turbo-persistence's single write lock and makes every later
    // persist log "Another write batch or compaction is already active"
    // forever. The dev server's own RSS tracks the store: 43 GB after ~1 hour.
    // Disabling costs cold-start speed only; in-memory dev caching is
    // unaffected. Default is true in Next 16.2.x.
    //
    // DO NOT REMOVE. This line was deleted once already (ce72f8237,
    // 2026-07-31) and the cache was back to 194 GB within two days.
    turbopackFileSystemCacheForDev: false,
    // The same store, for `next build`. Next 16.3 flipped this default from
    // false to true, so upgrading silently added 1.9 GB under
    // `.next/cache/turbopack/` to every build of this frontend — measured, not
    // estimated. What it buys is 28s instead of 43s on a rebuild.
    //
    // The reason 1.9 GB is not simply the price of a faster build is that it is
    // 1.9 GB PER NEXT VERSION, kept forever. The cache is namespaced
    // `v<next-version>-<format-hash>`, and nothing prunes the namespaces a
    // previous version left behind: a directory planted as `v16.2.12-deadbeef`
    // survived a full clean build untouched. So every release that moves
    // Next.js adds another ~2 GB and frees none — on a customer's VPS, because
    // `pnpm updator` runs `build:frontend` there, and an update is extracted
    // OVER the previous install so `.next/cache` persists across it.
    //
    // 15 seconds is not worth an unbounded, invisible disk cost on hardware we
    // do not own. The Next docs name this exact opt-out for build environments
    // that do not preserve `.next/cache`; ours preserves it far too well.
    turbopackFileSystemCacheForBuild: false,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'recharts',
      'date-fns',
      'framer-motion',
    ],
    useTypeScriptCli: true,
  },

  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      '@': path.resolve(__dirname, '.'),
      '~': path.resolve(__dirname, '.'),
      // Chart Engine alias - redirect stub to real module when installed.
      // Relative path for Turbopack (avoids Windows path issues); the target is
      // the SOURCE entry in dev and the committed bundle in production - see
      // CHART_ENGINE_FROM_SOURCE above.
      ...(HAS_CHART_ENGINE ? {
        '@/lib/stubs/chart-engine-stub': CHART_ENGINE_ALIAS_REL,
      } : {}),
      // Extension aliases - redirect addons that are not installed to a stub
      ...buildExtStubAliases(false),
    },
    // Exclude worker_threads from bundling
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  // Removed explicit env object to allow Next.js automatic NEXT_PUBLIC_ variable exposure
  // This allows all NEXT_PUBLIC_* environment variables to be available in the client
  webpack: (config, { dev, isServer }) => {
    // =========================================================================
    // CHART ENGINE ALIAS
    // When installed: redirect stub imports to real chart-engine module
    // When not installed: stub imports work as-is (stub always exists)
    // =========================================================================
    if (HAS_CHART_ENGINE) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@/lib/stubs/chart-engine-stub": CHART_ENGINE_ALIAS_ABS,
      };
    }

    // =========================================================================
    // EXTENSION ALIASES
    // Redirect imports of addons that are not installed to a stub that answers
    // with nothing (empty columns, empty menu).
    // =========================================================================
    config.resolve.alias = {
      ...config.resolve.alias,
      ...buildExtStubAliases(true),
    };

    // Add i18n optimization plugins (only in production build)
    if (!dev && !isServer) {
      // Namespace-level extraction (generates manifest of namespaces per route)
      config.plugins.push(
        new I18nOptimizationPlugin({
          debug: false,
          messagesDir: "messages",
        })
      );

      // Key-level extraction (generates optimized chunks with only needed keys)
      config.plugins.push(
        new I18nKeyOptimizationPlugin({
          debug: process.env.I18N_DEBUG === "true",
          messagesDir: "messages",
          defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "en",
        })
      );
    }

    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url: require.resolve('url'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert'),
        os: require.resolve('os-browserify/browser'),
        path: require.resolve('path-browserify'),
        encoding: require.resolve('encoding'),
      };
    }

    // Minimal webpack configuration for @reown packages
    // Disable strict ES module resolution for problematic packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }

    // Ignore module resolution errors for lit submodules
    config.ignoreWarnings = [
      /Module not found: Package path \.\/decorators is not exported/,
      /Module not found: Package path \.\/directive is not exported/,
      /Module not found: Package path \.\/directive-helpers is not exported/,
      /Module not found: Package path \.\/static-html is not exported/,
      /Module not found: Package path \.\/html is not exported/,
    ];

    return config;
  },
  async headers() {
    return [
      {
        // Service Worker headers - critical for push notifications
        source: '/sw-push.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      /* ------------------------------------------------------------------
         i18n CHUNKS — IMMUTABLE ONLY WHEN THE REQUEST CARRIES `?v=`.
         ------------------------------------------------------------------
         `public/i18n/*.json` is served by the static handler, which sends
         `Cache-Control: public, max-age=0`. That makes the browser revalidate
         EVERY chunk on EVERY page load — so the per-route top-up (the menu
         chunk alone is ~69 KB on a user route) is a round trip the visitor
         pays again and again, and any cache eviction is a full re-download.

         These files are content-addressed already: `browserChunkReader` in
         `i18n/loader.ts` appends `?v=<build stamp>`, and `pnpm build:i18n`
         mints a new stamp on every run, so a versioned URL can never refer to
         two different payloads. That is exactly the precondition `immutable`
         asks for.

         THE `has` CLAUSE IS THE WHOLE POINT, NOT A REFINEMENT. That same
         reader falls back to a BARE `/i18n/<name>` when it has no version yet
         — which is how the version-discovery reads happen, `routes.json` and
         `core.<locale>.json` among them. Pinning those for a year is precisely
         the failure this platform has already shipped twice from the other
         direction: a release goes out, the browser keeps answering from a
         chunk minted before it, and every key the release added reads as a
         miss. See the two reverted fetch-cache attempts written up in
         `lib/fetchers/chrome.ts` and `settings.ts`.

         So: versioned requests are immutable, and everything else under
         `/i18n/` keeps revalidating, which is what it does today. */
      {
        source: '/i18n/:path*',
        has: [{ type: 'query', key: 'v' }],
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      /*
       * `/support/ticket` was the conversation list; it merged into `/support`.
       *
       * WHY THIS IS HERE AND NOT A `redirect()` IN A PAGE. It was a page first,
       * and a live end-to-end assertion caught the problem: the response was
       * `200` at the ORIGINAL url. `app/[locale]/support/loading.tsx` puts a
       * Suspense boundary above that segment, so Next flushes the shell — and
       * the 200 with it — before the page body runs. `redirect()` thrown after
       * the headers are gone cannot be an HTTP redirect, so it degrades to a
       * client-side navigation: the customer watches a list skeleton draw and
       * then jump, crawlers and bookmarks see a 200 on a dead url, and the
       * `Location` header never exists.
       *
       * A config redirect runs before any rendering, so it is a real 308.
       *
       * `:locale` is a single segment and the pattern is exact, so
       * `/en/support/ticket/<id>` — one conversation, which still lives there —
       * does not match. `permanent: true` because the route genuinely moved.
       */
      {
        source: "/:locale/support/ticket",
        destination: "/:locale/support",
        permanent: true,
      },
      // The unprefixed form, for links written before the locale segment
      // existed. The locale middleware would otherwise prefix it and then hit
      // the rule above, which works but costs a second round trip.
      {
        source: "/support/ticket",
        destination: "/support",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const isDev = process.env.NODE_ENV === "development";

    // Crypto icons whose symbol collides with a Windows DOS device name. `con`,
    // `aux` and friends name a device rather than a file on Windows regardless
    // of extension or directory, and Git for Windows refuses to open such a
    // path at all (core.protectNTFS, on by default), so `con.webp` can never be
    // committed. The icon set therefore stores them underscore-prefixed
    // (`_con.webp`, `_aux.webp`) and this rewrite maps the canonical URL onto
    // them, so the ~37 call sites that build `/img/crypto/${symbol}.webp` stay
    // untouched. Kept in step with WIN_RESERVED in
    // backend/scripts/sync-crypto-icons.mjs. These apply in production too,
    // which is why they are built before the dev-only early return.
    const winReservedIcons = [
      "con",
      "prn",
      "aux",
      "nul",
      ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
      ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
    ].map((name) => ({
      source: `/img/crypto/${name}.webp`,
      destination: `/img/crypto/_${name}.webp`,
    }));

    // Use 127.0.0.1 for rewrites - Next.js server-side proxy always runs locally
    const backendUrl = `http://127.0.0.1:${backendPort}`;

    /**
     * Uploads are proxied in PRODUCTION TOO, unlike `/api`.
     *
     * `/api` genuinely does not need it: the front web server sends those to
     * the backend. `/uploads` looked like it did not need it either, because
     * the files are written into `frontend/public/uploads/` and `public/` is
     * served statically — but Next builds its public-folder index with a
     * single directory read at boot when not in dev, and the live
     * `fileExists` fallback is gated on dev. A file that appeared after the
     * process started is not in that index, so it 404s until the frontend is
     * restarted. Every image an operator uploaded rendered as a broken
     * placeholder while older ones were fine.
     *
     * The documented install adds an nginx `location /uploads/` block that
     * covers this, and any install missing it hit the bug silently. The
     * backend already serves `/uploads/` from disk on every request
     * (`backend/src/server.ts`), so routing there makes correctness a property
     * of the app rather than of somebody's nginx file. Where the nginx block
     * IS present it wins first and this never runs.
     */
    const uploadsProxy = [
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];

    /**
     * KYC DOCUMENTS ARE TAKEN OFF THE STATIC PATH BEFORE THE FILESYSTEM IS
     * CONSULTED — which is the only place this can be done.
     *
     * Identity documents used to be written into `frontend/public/uploads/`
     * and are now written to a backend-private store served by
     * `/api/user/kyc/document/...`, which checks owner-or-reviewer. But
     * `public/` is served by NEXT, not by the backend, so the backend's own
     * refusal (PRIVATE_UPLOAD_PREFIXES in backend/src/utils/index.ts) cannot
     * reach a file sitting in that directory. Only a rewrite can, and only a
     * `beforeFiles` one: the returned-array form is `afterFiles`, which runs
     * AFTER the public-folder lookup and would therefore never see a request
     * for a file that exists.
     *
     * Routed to the backend rather than answered here, so there is exactly one
     * place that decides — the backend replies 404 for this prefix. A passport
     * restored from a backup into the old directory, or left behind by a
     * half-run migration, stays unreadable either way.
     */
    const kycStaticGuard = [
      {
        source: "/uploads/kyc/:path*",
        destination: `${backendUrl}/uploads/kyc/:path*`,
      },
    ];

    // In production the front web server sends /api to the backend directly,
    // so only the two rewrites that must hold everywhere are kept.
    if (!isDev) {
      return {
        beforeFiles: kycStaticGuard,
        afterFiles: [...winReservedIcons, ...uploadsProxy],
      };
    }

    return {
      beforeFiles: kycStaticGuard,
      afterFiles: [
        ...winReservedIcons,
        {
          source: "/api/:path*",
          destination: `${backendUrl}/api/:path*`, // Proxy to Backend (dev only)
        },
        ...uploadsProxy,
        {
          source: "/img/logo/:path*",
          destination: `${backendUrl}/img/logo/:path*`, // Proxy to Backend (dev only)
        },
      ],
    };
  },
  images: {
    // Enable image optimization for better caching and performance
    unoptimized: false,
    // Cache optimized images for 60 days
    minimumCacheTTL: 5184000,
    // Image formats to support
    formats: ['image/webp', 'image/avif'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different use cases
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // The optimizer refuses SVG by default and answers 400 with
    // "image type is not allowed". Our universal empty-state fallback is
    // `/placeholder.svg` (~290 call sites), so with SVG disallowed EVERY
    // product, category, post or avatar that has no image rendered as a
    // broken image rather than as the placeholder.
    //
    // Enabling it is only safe alongside the two hardening options below,
    // because `remotePatterns` includes IPFS gateways and an SVG served
    // inline can carry script. `sandbox` + `script-src 'none'` neuter that,
    // and `attachment` stops a direct hit on /_next/image from rendering
    // as a document.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; style-src 'unsafe-inline'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.lorem.space",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "a0.muscache.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      // IPFS Gateway - Pinata (Primary)
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
      },
      {
        protocol: "https",
        hostname: "*.mypinata.cloud",
      },
      // IPFS Gateways (Fallback)
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
      {
        protocol: "https",
        hostname: "cloudflare-ipfs.com",
      },
      {
        protocol: "https",
        hostname: "dweb.link",
      },
      // Local uploads
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
      // Dynamic site hostname from NEXT_PUBLIC_SITE_URL
      ...(siteHostname && siteHostname !== "localhost"
        ? [
            {
              protocol: "https",
              hostname: siteHostname,
            },
          ]
        : []),
    ],
  },
  // Add error handling configuration
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Development-specific optimizations
  ...(process.env.NODE_ENV === 'development' && {
    productionBrowserSourceMaps: false,
  }),
  // Allow cross-origin requests from local network IPs in dev mode
  // Format: just hostnames, no protocol or port
  // Additional IPs can be added via NEXT_PUBLIC_ALLOWED_DEV_IPS env variable (comma-separated)
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    // ngrok tunnels
    '*.ngrok-free.dev',
    '*.ngrok.io',
    // Add custom IPs from environment variable
    ...(process.env.NEXT_PUBLIC_ALLOWED_DEV_IPS
      ? process.env.NEXT_PUBLIC_ALLOWED_DEV_IPS.split(',').map(ip => ip.trim()).filter(Boolean)
      : []),
  ],
};

module.exports = withBundleAnalyzer(nextConfig);
