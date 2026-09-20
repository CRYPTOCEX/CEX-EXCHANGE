#!/usr/bin/env node
/**
 * VENDOR THE GOOGLE FONTS — `pnpm --filter frontend fonts:vendor`
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * `next/font/google` downloads every woff2 from `fonts.gstatic.com` at COMPILE
 * time — on every cold `next dev` and on every `next build`. Two consequences,
 * both of which bit us:
 *
 *  1. Turbopack's fetcher has no retry, and it memoizes the failure. On
 *     2026-08-06 exactly ONE of 51 downloads lost a connection (Inter's
 *     Cyrillic subset) and every route in the app 500'd for the rest of the
 *     dev session with `Can't resolve
 *     '@vercel/turbopack-next/internal/font/google/font'` — an error that names
 *     a virtual module and says nothing about the network.
 *  2. A customer whose build server cannot reach Google — a firewalled VPS, or
 *     any host in a region that blocks it — cannot run `pnpm build:frontend`
 *     AT ALL. Same error, and nothing in it suggests "your server has no route
 *     to fonts.gstatic.com".
 *
 * Vendoring removes the dependency: the woff2 files live in `public/fonts/`
 * and `app/fonts.css` declares them. Dev and build are then offline-safe.
 *
 * WHY IT READS BUILD OUTPUT INSTEAD OF CALLING GOOGLE
 * ---------------------------------------------------
 * Because next/font does more than download files. It also emits, per family,
 * a metric-matched fallback face:
 *
 *     @font-face { font-family: Outfit Fallback; src: local(Arial);
 *                  ascent-override: 100.18%; ... size-adjust: 99.82%; }
 *
 * That face is what keeps `display: optional` from shifting layout, and it is
 * computed from capsize metrics, not from anything Google serves. Re-deriving
 * it here would be a second implementation to keep in step with Next's.
 * Reading next/font's OWN generated CSS copies it exactly — subsets, unicode
 * ranges, font-display and fallback metrics all preserved byte for byte.
 *
 * HOW TO RE-RUN IT (after a Next upgrade, or when adding a family)
 * ---------------------------------------------------------------
 *   1. Temporarily restore the `next/font/google` declarations in
 *      `app/[locale]/layout.tsx` (see git history for the last version that
 *      had them) and add the new family.
 *   2. `pnpm --filter frontend dev`, then load any page so the root layout
 *      compiles and Turbopack writes the per-family CSS.
 *   3. `node scripts/vendor-fonts.mjs`
 *   4. Put the layout back to importing `../fonts.css`.
 *
 * Step 1/4 is the honest cost of vendoring: adding a family is no longer a
 * one-line change. Everything else this script does is automatic.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHUNKS = path.join(FRONTEND, ".next/dev/static/chunks");
const MEDIA = path.join(FRONTEND, ".next/dev/static/media");
const OUT_FONTS = path.join(FRONTEND, "public/fonts");
const OUT_CSS = path.join(FRONTEND, "app/fonts.css");
const OUT_PRELOAD = path.join(FRONTEND, "lib/fonts-preload.ts");

/* next/font names its generated stylesheet after the family and an options
   hash, so two call sites with identical options produce two identical files
   under different hashes. Matching on the prefix rather than a fixed list is
   what lets a newly added family be picked up without editing this script. */
const FAMILY_CSS_RE = /^\[next\]_internal_font_google_.+_module_css_.+\.single\.css$/;

const die = (msg) => {
  console.error(`vendor-fonts: ${msg}`);
  process.exit(1);
};

if (!fs.existsSync(CHUNKS)) {
  die(
    `no Turbopack output at ${path.relative(FRONTEND, CHUNKS)}.\n` +
      `  Start the dev server and load a page first — this script copies what\n` +
      `  next/font generated, so it needs the root layout to have compiled.`
  );
}

const cssFiles = fs.readdirSync(CHUNKS).filter((f) => FAMILY_CSS_RE.test(f));
if (cssFiles.length === 0) {
  die(
    "no per-family font CSS found. Either the layout no longer calls\n" +
      "  next/font/google (it has already been vendored — restore the calls to\n" +
      "  re-run, see the header), or no page has been loaded yet."
  );
}

/** Every `@font-face { ... }` block in a stylesheet, as raw text. */
const faceBlocks = (css) => css.match(/@font-face\s*\{[^}]*\}/g) ?? [];

/** `url("../media/<file>")` -> `<file>`, for every src in a block. */
const mediaRefs = (block) =>
  [...block.matchAll(/url\("\.\.\/media\/([^"]+)"\)/g)].map((m) => m[1]);

const families = [];
const seen = new Map(); // normalised face text -> family already taken

for (const file of cssFiles.sort()) {
  const css = fs.readFileSync(path.join(CHUNKS, file), "utf8");
  const faces = faceBlocks(css);
  if (faces.length === 0) continue;

  /* The `.variable` class is the whole point of the family — it is what puts
     `--font-inter` in scope. A family without one is a `className`-only call
     that nothing in this codebase makes, so treat it as a signal that the
     assumptions here have drifted rather than emitting something half-right. */
  const varDecl = css.match(/(--font-[a-z0-9-]+):\s*([^;]+);/i);
  if (!varDecl) {
    console.warn(`  ! ${file} has @font-face but no --font-* variable; skipped`);
    continue;
  }

  /* Identical options at two call sites (Geist was declared in BOTH
     layout.tsx and providers.tsx) produce byte-identical CSS under different
     hashes, and emitting both would duplicate every @font-face. Key on the
     face text with the hash stripped so the duplicate collapses. */
  const key = faces.join("").replace(/[0-9a-f]{8,}/g, "#");
  if (seen.has(key)) {
    console.log(`  = ${varDecl[1]} duplicate of ${seen.get(key)}, collapsed`);
    continue;
  }
  seen.set(key, varDecl[1]);

  families.push({
    file,
    variable: varDecl[1],
    value: varDecl[2].trim(),
    faces,
  });
}

if (families.length === 0) die("parsed no families out of the generated CSS.");

/* ---------------------------------------------------------------------------
   COPY THE FONT FILES
   --------------------------------------------------------------------------- */

fs.mkdirSync(OUT_FONTS, { recursive: true });

/* A re-run after a Next upgrade produces new content hashes. Without this the
   old files would linger in public/fonts forever, shipping in every zip. */
for (const stale of fs.readdirSync(OUT_FONTS).filter((f) => f.endsWith(".woff2"))) {
  fs.unlinkSync(path.join(OUT_FONTS, stale));
}

let copied = 0;
let bytes = 0;
for (const family of families) {
  for (const block of family.faces) {
    for (const ref of mediaRefs(block)) {
      const from = path.join(MEDIA, ref);
      if (!fs.existsSync(from)) die(`referenced font file is missing: ${from}`);
      const to = path.join(OUT_FONTS, ref);
      if (!fs.existsSync(to)) {
        fs.copyFileSync(from, to);
        copied++;
        bytes += fs.statSync(to).size;
      }
    }
  }
}

/* ---------------------------------------------------------------------------
   EMIT THE STYLESHEET
   --------------------------------------------------------------------------- */

/** Rewrite the build-relative url to the public path the browser will request. */
const rewrite = (block) =>
  block.replace(/url\("\.\.\/media\/([^"]+)"\)/g, 'url("/fonts/$1")');

const header = `/*
 * VENDORED WEB FONTS — GENERATED, DO NOT EDIT BY HAND.
 *
 * Written by \`frontend/scripts/vendor-fonts.mjs\` from next/font/google's own
 * output, so the subsets, unicode ranges, font-display values and the
 * metric-matched "<Family> Fallback" faces are exactly what next/font produced.
 * The files live in \`public/fonts/\`.
 *
 * Edit the generator, not this file. See the generator's header for why the
 * fonts are vendored at all (short version: an unreachable fonts.gstatic.com
 * used to take down dev AND any customer's production build).
 *
 * ${families.length} families · ${fs.readdirSync(OUT_FONTS).filter((f) => f.endsWith(".woff2")).length} files
 */
`;

const faceCss = families
  .map(
    (f) =>
      `/* ${f.variable} */\n` + f.faces.map((b) => rewrite(b)).join("\n\n")
  )
  .join("\n\n");

/* `:root` rather than the hashed `.variable` class next/font emits. The class
   had to be applied to <html> by hand (and a comment in layout.tsx records the
   bug from when it was on <body> instead: the variables were out of scope at
   :root, so globals.css's `@theme` could not see them and the app rendered in
   Tailwind's default stack). Declaring on :root directly removes that
   footgun — the variables cannot be misplaced because there is nothing to
   place. */
const rootCss =
  `:root {\n` +
  families.map((f) => `  ${f.variable}: ${f.value};`).join("\n") +
  `\n}\n`;

fs.writeFileSync(OUT_CSS, `${header}\n${faceCss}\n\n${rootCss}`, "utf8");

/* ---------------------------------------------------------------------------
   PRELOAD LIST
   ---------------------------------------------------------------------------
   next/font emitted `<link rel="preload">` for families declared with
   `preload: true`; a plain stylesheet emits none, and the font would not be
   discovered until the CSS had been parsed. Only the ALWAYS-PAINTED families
   deserve it — the design manager's selectable families are `preload: false`
   precisely so that eight unused woff2 files are not fetched on every page.
   `font-display` is the discriminator already present in the CSS: the defaults
   use `swap`, every optional family uses `optional`.

   Within a preloaded family, only the latin subset is listed. `U+??` is
   lightningcss's minification of `U+0000-00FF` — the latin block — so a face
   carrying it is the one that paints for the overwhelming majority of visitors.
   --------------------------------------------------------------------------- */

/* A Set, not an array: a VARIABLE font declared with several weights emits one
   @font-face per weight, all pointing at the SAME file (JetBrains Mono asks for
   400/500/600/700 and gets four blocks and one woff2). Pushing per block would
   preload that file four times, and a duplicated preload is a warning in every
   browser console plus wasted head bytes. */
const preload = new Set();
for (const family of families) {
  for (const block of family.faces) {
    if (!/font-display:\s*swap/.test(block)) continue;
    if (!/unicode-range:[^;]*U\+\?\?/.test(block)) continue;
    for (const ref of mediaRefs(block)) preload.add(ref);
  }
}

fs.writeFileSync(
  OUT_PRELOAD,
  `/**
 * GENERATED by \`frontend/scripts/vendor-fonts.mjs\` — do not edit.
 *
 * The latin-subset file of each ALWAYS-PAINTED family. The root layout emits a
 * <link rel="preload"> for each, which is what next/font used to do for
 * families declared \`preload: true\`. The design manager's selectable families
 * are deliberately absent: they were \`preload: false\`, so only the one the
 * owner actually chose is ever fetched, and it is fetched when text renders.
 */
export const PRELOAD_FONTS = [
${[...preload].map((f) => `  "/fonts/${f}",`).join("\n")}
] as const;
`,
  "utf8"
);

const totalBytes = fs
  .readdirSync(OUT_FONTS)
  .filter((f) => f.endsWith(".woff2"))
  .reduce((sum, f) => sum + fs.statSync(path.join(OUT_FONTS, f)).size, 0);

console.log(
  `vendor-fonts: ${families.length} families, ` +
    `${fs.readdirSync(OUT_FONTS).filter((f) => f.endsWith(".woff2")).length} files ` +
    `(${(totalBytes / 1024).toFixed(0)} KB, ${copied} newly copied, ${(bytes / 1024).toFixed(0)} KB written)\n` +
    `  -> ${path.relative(FRONTEND, OUT_CSS)}\n` +
    `  -> ${path.relative(FRONTEND, OUT_PRELOAD)} (${preload.size} preloaded)\n` +
    `  -> ${path.relative(FRONTEND, OUT_FONTS)}/`
);
