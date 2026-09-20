#!/usr/bin/env node
/**
 * Generate `lib/design-theme-defaults.ts` from `app/globals.css`.
 *
 * The admin panel needs to know what every token's shipped value is — to seed
 * its inputs, to show "same as default", and to decide what counts as an
 * override worth storing. Hand-copying those 41 values would guarantee drift:
 * the light-mode contrast pass of Phase 13 moved eleven of them, and a stale
 * mirror would have shown the owner the old palette.
 *
 * So the stylesheet stays the single source of truth and this script mirrors it.
 *
 *   node scripts/gen-design-defaults.js           # write
 *   node scripts/gen-design-defaults.js --check    # fail if out of date (CI)
 *
 * The `--check` mode is the point. It is wired into `design:check` so a token
 * value can never move in globals.css without the panel finding out.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CSS = path.join(ROOT, "app", "globals.css");
const OUT = path.join(ROOT, "lib", "design-theme-defaults.ts");

/**
 * Pull the declarations out of a top-level `:root {` or `.dark {` block.
 *
 * Line-based with brace counting rather than a regex over the whole file: an
 * earlier version of this extraction matched a `@layer base` mention inside a
 * COMMENT and returned zero tokens, which is exactly the kind of silent-empty
 * failure `--check` exists to catch.
 */
function extractBlock(lines, selectorRe) {
  const out = {};
  let depth = 0;
  let inside = false;
  for (const line of lines) {
    if (!inside) {
      if (selectorRe.test(line)) {
        inside = true;
        depth = 1;
      }
      continue;
    }
    depth += (line.match(/\{/g) || []).length;
    depth -= (line.match(/\}/g) || []).length;
    if (depth <= 0) {
      inside = false;
      continue;
    }
    const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const css = fs.readFileSync(CSS, "utf8");
const lines = css.split("\n");

const light = extractBlock(lines, /^\s*:root\s*\{/);
const dark = extractBlock(lines, /^\s*\.dark\s*\{/);

if (Object.keys(light).length < 20) {
  console.error(
    `FATAL: only ${Object.keys(light).length} tokens found in :root — extraction is broken, refusing to write a near-empty mirror.`
  );
  process.exit(2);
}

/* A token that appears in :root but not in .dark is theme-independent. The one
   exception we care about is --motion-scale, which :root declares once and the
   reduced-motion media query declares again; extractBlock sees only the first
   because the media query is not a bare `:root {` at column 0... but it IS, so
   guard explicitly rather than relying on that. */
const MOTION_SCALE_DEFAULT = "1";
if (light["--motion-scale"] !== MOTION_SCALE_DEFAULT) {
  light["--motion-scale"] = MOTION_SCALE_DEFAULT;
}

const themed = {};
const base = {};
for (const [k, v] of Object.entries(light)) {
  if (Object.prototype.hasOwnProperty.call(dark, k)) themed[k] = { light: v, dark: dark[k] };
  else base[k] = v;
}

const banner = `/**
 * GENERATED — do not edit.
 *
 * Mirrors the \`:root\` and \`.dark\` token blocks of app/globals.css so the admin
 * design manager can seed its inputs and detect overrides without reading CSS at
 * runtime. Regenerate with:
 *
 *     node scripts/gen-design-defaults.js
 *
 * \`node scripts/gen-design-defaults.js --check\` fails when this file has
 * drifted from the stylesheet, and runs as part of \`design:check\`.
 */
`;

const body =
  banner +
  `\nexport const DEFAULT_THEMED: Record<string, { light: string; dark: string }> = ${JSON.stringify(themed, null, 2)};\n` +
  `\nexport const DEFAULT_BASE: Record<string, string> = ${JSON.stringify(base, null, 2)};\n` +
  `\n/** Every token name the stylesheet actually declares. */\nexport const DECLARED_TOKENS: string[] = ${JSON.stringify(
    [...Object.keys(themed), ...Object.keys(base)].sort(),
    null,
    2
  )};\n`;

/* ---------------------------------------------------------------------------
   Cross-check the hand-written token DESCRIPTIONS against the stylesheet.

   `lib/design-theme.ts` says what each token is called, which group it belongs
   to and — critically — whether it is `themed`. If that disagrees with the CSS,
   the panel silently misbehaves: a token marked themed but declared only in
   `:root` gets a dark-mode input that writes a value nothing reads, and a token
   marked base but declared in both gets edited in one scheme only.

   Neither failure is visible until someone changes a colour and half the site
   ignores it, so it is checked here rather than trusted.
   --------------------------------------------------------------------------- */
function crossCheckTokenDefs() {
  const defsPath = path.join(ROOT, "lib", "design-theme.ts");
  if (!fs.existsSync(defsPath)) return [];
  const src = fs.readFileSync(defsPath, "utf8");
  const problems = [];
  const seen = new Set();

  const re = /\{\s*name:\s*"(--[a-z0-9-]+)"[^}]*?themed:\s*(true|false)/gi;
  let m;
  while ((m = re.exec(src))) {
    const [, name, themedStr] = m;
    const declaredThemed = themedStr === "true";
    seen.add(name);
    const inThemed = Object.prototype.hasOwnProperty.call(themed, name);
    const inBase = Object.prototype.hasOwnProperty.call(base, name);
    if (!inThemed && !inBase) {
      problems.push(`${name}: described in design-theme.ts but NOT declared in globals.css`);
      continue;
    }
    if (declaredThemed && !inThemed) {
      problems.push(`${name}: marked themed:true but globals.css declares it only in :root`);
    }
    if (!declaredThemed && inThemed) {
      problems.push(`${name}: marked themed:false but globals.css declares it in BOTH :root and .dark`);
    }
  }
  for (const name of [...Object.keys(themed), ...Object.keys(base)]) {
    if (!seen.has(name)) {
      problems.push(`${name}: declared in globals.css but the panel has no description for it (unreachable by the admin)`);
    }
  }
  return problems;
}

const problems = crossCheckTokenDefs();
if (problems.length) {
  console.error("token description / stylesheet mismatch:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== body) {
    console.error(
      "design defaults are stale — app/globals.css has token values that lib/design-theme-defaults.ts does not.\n" +
        "  run: node scripts/gen-design-defaults.js"
    );
    process.exit(1);
  }
  console.log(
    `design defaults up to date (${Object.keys(themed).length} themed, ${Object.keys(base).length} base)`
  );
  process.exit(0);
}

fs.writeFileSync(OUT, body);
console.log(
  `wrote lib/design-theme-defaults.ts — ${Object.keys(themed).length} themed tokens, ${Object.keys(base).length} theme-independent`
);
