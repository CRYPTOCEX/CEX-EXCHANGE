#!/usr/bin/env node
/**
 * Prove every component token is actually CONSUMED by something.
 * ============================================================================
 *
 *   node scripts/verify-component-tokens.js            report
 *   node scripts/verify-component-tokens.js --check    CI gate (exit 1 on a gap)
 *
 * WHY THIS EXISTS, AND WHY THE EXISTING RATCHETS DO NOT COVER IT
 *
 * `gen-design-defaults.js --check` proves a token is DECLARED and that the
 * editor's mirror of its default is current. `scan-design-debt.js` proves no
 * one hardcoded a palette colour. Neither can tell you whether a token is
 * READ by anything — and a component token that nothing reads is the exact
 * shape of this feature's worst bug: a slider that moves, saves, persists,
 * reloads, and changes nothing on screen. There is no error, no warning and
 * no failing test. The owner concludes the product is broken.
 *
 * Two ways that happens, both silent:
 *
 *   1. The retrofit was never done — the token was declared in globals.css and
 *      the component still says `h-12`.
 *   2. The retrofit was done with a class Tailwind cannot parse. An arbitrary
 *      value that fails to compile emits NOTHING; the class name sits in the
 *      HTML looking correct. `design:debt` catches dead COLOUR classes by
 *      pattern. It cannot catch a dead length.
 *
 * So this compiles the stylesheet for real, against the real source tree, and
 * asserts each token appears inside a `var()` in the OUTPUT. That is the only
 * evidence that survives both failure modes: if the class did not compile it is
 * not in the output, and if no component uses the token it is not either.
 *
 * NORMALISATION IS LOAD-BEARING. Tailwind rewrites `calc(a/2)` to `calc(a / 2)`
 * on the way out, so a verbatim substring match on the authored class reports
 * false failures — which is exactly what the first draft of this check did,
 * and it accused two perfectly good classes of being dead.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');

const ROOT = path.resolve(__dirname, '..');
const CSS = path.join(ROOT, 'app', 'globals.css');
const REGISTRY = path.join(ROOT, 'lib', 'design-theme.ts');

/** The groups introduced by plans/COMPONENT-SYSTEM.md. */
const COMPONENT_GROUPS = new Set(['table', 'control', 'card', 'form', 'dataviz']);

/**
 * Read the token names out of the registry by regex rather than by importing
 * it — the file is TypeScript and this script runs under plain node in CI,
 * where a transpiler is not guaranteed to be on the path.
 */
function componentTokens() {
  const src = fs.readFileSync(REGISTRY, 'utf8');
  const out = [];
  const re = /\{\s*name:\s*"(--[a-z0-9-]+)"[^}]*?group:\s*"([a-z]+)"[^}]*?\}/g;
  let m;
  while ((m = re.exec(src))) {
    if (COMPONENT_GROUPS.has(m[2])) out.push({ name: m[1], group: m[2] });
  }
  return out;
}

const norm = (s) => s.replace(/[\s_]/g, '');

async function main() {
  const tokens = componentTokens();
  if (!tokens.length) {
    console.error('FAIL: no component tokens found in lib/design-theme.ts — has the registry moved?');
    process.exit(1);
  }

  const css = fs.readFileSync(CSS, 'utf8');
  /* `base: ROOT` makes Tailwind scan the real app/ and components/ trees, so
     what compiles here is what ships. */
  const result = await postcss([tailwind({ base: ROOT })]).process(css, {
    from: CSS,
    to: 'out.css',
  });
  const out = norm(result.css);

  const dead = [];
  const live = [];
  for (const t of tokens) {
    (out.includes(`var(${t.name})`) ? live : dead).push(t);
  }

  const byGroup = {};
  for (const t of live) (byGroup[t.group] ??= []).push(t.name);

  console.log('');
  console.log('  COMPONENT TOKENS — consumed by at least one rule');
  console.log('  ----------------------------------------------------');
  for (const g of [...COMPONENT_GROUPS]) {
    const total = tokens.filter((t) => t.group === g).length;
    const n = (byGroup[g] || []).length;
    console.log(`  ${g.padEnd(10)} ${String(n).padStart(2)} / ${total}`);
  }
  console.log('  ----------------------------------------------------');
  console.log(`  total      ${String(live.length).padStart(2)} / ${tokens.length}`);

  if (dead.length) {
    console.log('');
    console.log('  NOT READ BY ANYTHING — a control for each of these would be dead:');
    for (const t of dead) console.log(`    ${t.name}   (${t.group})`);
    console.log('');
    console.log('  Either the component still hardcodes the value, or the class');
    console.log('  that was supposed to read it does not compile. See');
    console.log('  plans/COMPONENT-SYSTEM.md §7.');
  }
  console.log('');

  if (process.argv.includes('--check') && dead.length) process.exit(1);
}

main().catch((e) => {
  console.error('verify-component-tokens failed:', e.message);
  process.exit(2);
});
