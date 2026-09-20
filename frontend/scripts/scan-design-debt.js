#!/usr/bin/env node
/**
 * Design-system debt scanner.
 *
 * Read-only apart from the two generated files it is explicitly asked to write.
 * The detectors themselves live in `design-dimensions.js`, one entry per
 * dimension, each carrying the fixture that proves it still fires.
 *
 * Usage:
 *   node scripts/scan-design-debt.js                 report
 *   node scripts/scan-design-debt.js --top 20        also list the worst files
 *   node scripts/scan-design-debt.js --list z-scale  every site of one dimension
 *   node scripts/scan-design-debt.js --json          machine-readable, for tooling
 *   node scripts/scan-design-debt.js --self-test     prove every rule still fires
 *   node scripts/scan-design-debt.js --check         CI gate (exit 1 on new debt)
 *   node scripts/scan-design-debt.js --baseline      (re)write the ESLint baseline
 *   node scripts/scan-design-debt.js --budget        lower the budget high-water marks
 *
 * --check is the ratchet CI runs. It takes ~5s versus ~5min for a full
 * `eslint .`, and it fails ONLY on design-system debt — the repo carries ~940
 * unrelated pre-existing ESLint errors (react-hooks/*), so gating on eslint's
 * exit code would block on work that has nothing to do with this. ESLint still
 * gives developers the same errors inline in their editor.
 *
 * ----------------------------------------------------------------------------
 * WHY --self-test EXISTS, AND WHY IT IS THE MOST IMPORTANT FLAG HERE
 *
 * Every rule in this file can fail in two directions, and they are not
 * symmetric. A rule that over-reports gets noticed within a day, because it
 * fails somebody's push. A rule that UNDER-reports reads as success: the number
 * is zero, the gate is green, and nobody looks again.
 *
 * This has happened twice:
 *   - `[...TOKEN_NAMES]` spread a pipe-joined STRING into single characters, so
 *     the dead-paint rule's alternation was `c|a|r|d|-|…`. It matched none of
 *     the compound token names it existed for, and reported 0 for months.
 *   - `CORNER_BLOB` spelled only the Tailwind v3 alias `bg-gradient-to-*`. When
 *     the tree moved to `bg-linear-to-*` the rule went quietly blind — still 0,
 *     for the opposite of the reason anyone assumed.
 *
 * Both were found by a human eventually re-reading the regex. `--self-test`
 * makes that unnecessary: each dimension declares `bad` samples it MUST flag and
 * `good` samples it MUST NOT, and this runs them through the real detector. A
 * rule can still be wrong; it can no longer be silently wrong.
 *
 * ----------------------------------------------------------------------------
 * THE TWO GATES, AND WHY THE SECOND IS A NUMBER RATHER THAN A FILE LIST
 *
 * RATCHET dimensions must be zero. They are the ones already cleared, so a hit
 * means somebody wrote one today. These use `eslint.designsystem.baseline.js`,
 * which is empty and documented to stay empty.
 *
 * BUDGET dimensions have a real backlog — 279 hand-rolled cards do not get
 * fixed in one pass. Their gate is a HIGH-WATER MARK in `design-budget.json`:
 * the count may go down and never up. A per-file baseline was the obvious
 * alternative and is the wrong tool, because a file list rots. When a file is
 * migrated its baseline line stays behind, silently exempting that file from the
 * rule forever — the scanner already has to report "stale baseline entries" to
 * cope with exactly that. A number cannot go stale, cannot be gamed by adding a
 * path, and says the true thing out loud: there are N of these left.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const {
  DIMENSIONS,
  stripComments,
  stripCssComments,
  lineIndex,
} = require('./design-dimensions');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const argOf = (f, dflt) => (has(f) ? args[args.indexOf(f) + 1] ?? dflt : dflt);

const writeBaseline = has('--baseline');
const writeBudget = has('--budget');
const checkMode = has('--check');
const selfTest = has('--self-test');
const jsonMode = has('--json');
const listDim = argOf('--list', null);
const topN = has('--top') ? Number(argOf('--top', 20)) || 20 : 0;

const BUDGET_PATH = path.join(root, 'design-budget.json');
const BASELINE_PATH = path.join(root, 'eslint.designsystem.baseline.js');

/* ==========================================================================
   SELF-TEST — run first, and refuse to report numbers from broken rules.
   ========================================================================== */

function runSelfTest() {
  const failures = [];
  let checks = 0;
  for (const dim of DIMENSIONS) {
    if (!dim.fixture) { failures.push(`${dim.id}: no fixture — every dimension must declare one`); continue; }
    const { bad = [], good = [] } = dim.fixture;
    if (!bad.length) failures.push(`${dim.id}: fixture has no \`bad\` samples, so nothing proves the rule fires`);
    const stripper = dim.scope === 'css' ? stripCssComments : stripComments;
    for (const sample of bad) {
      checks++;
      const code = stripper(sample);
      const hits = dim.detect({ code, rel: `fixture/${dim.id}.tsx`, nl: lineIndex(code) });
      if (!hits.length) failures.push(`${dim.id}: MISSED a known defect — ${JSON.stringify(sample.slice(0, 90))}`);
    }
    for (const sample of good) {
      checks++;
      const code = stripper(sample);
      const hits = dim.detect({ code, rel: `fixture/${dim.id}.tsx`, nl: lineIndex(code) });
      if (hits.length) failures.push(`${dim.id}: CRIED WOLF on legitimate code — ${JSON.stringify(sample.slice(0, 90))}  (${hits[0].detail})`);
    }
  }
  return { failures, checks };
}

if (selfTest) {
  const { failures, checks } = runSelfTest();
  console.log(`\n  Design-dimension self-test — ${DIMENSIONS.length} dimensions, ${checks} assertions`);
  console.log('  ' + '-'.repeat(64));
  if (failures.length) {
    for (const f of failures) console.error('  FAIL  ' + f);
    console.error(`\n  ${failures.length} broken rule(s). A rule that cannot see its own fixture reports`);
    console.error('  ZERO on the real tree, and zero is what success looks like.\n');
    process.exit(1);
  }
  console.log('  PASS: every dimension flags its known-bad corpus and spares its known-good one.\n');
  process.exit(0);
}

/* ==========================================================================
   FILE WALK
   ========================================================================== */

/**
 * Scan everything ESLint lints, not just app/ + components/. lib/ and utils/
 * carry palette classes too (lib/nav-color-schema.ts alone had 121), and a
 * scanner narrower than the rule produces a baseline that leaves CI red.
 */
/**
 * ARTEFACT directories — always machine-generated or tooling, at ANY depth.
 * `components/(ext)/chart-engine/dist/` is a 1.16MB minified bundle and
 * `chart-engine/scripts/` is its build tooling; both are correctly skipped
 * wherever they appear.
 */
const SKIP_DIR_ANYWHERE = new Set(['node_modules', '.next', '.turbo', 'coverage', 'dist', 'scripts']);

/**
 * ROOT-LEVEL ONLY. These four names are ordinary English words that a feature
 * directory may legitimately use, and matching them by bare name at any depth is
 * a silent scope hole: a first-party `app/…/public/` or `…/generated/` would be
 * dropped by a scanner everyone believes covers the tree, and it would report a
 * confident zero over code it never opened. Nothing in the tree currently hides
 * behind this — it is closed as a matter of construction, not because it had
 * already cost something.
 *
 * `styles/` used to be in the skip list at all, and THAT one had already cost
 * something: twelve first-party stylesheets, including `app/globals.css` itself,
 * outside every design gate. See the `css-colour` dimension.
 */
const SKIP_DIR_AT_ROOT = new Set(['public', 'messages', 'generated', 'build']);

/* Files that legitimately contain palette class names as data. The lint rule is
   switched off for these in eslint.config.js, so they must not be baselined. */
const SKIP_FILES = new Set(['eslint.config.js', 'eslint.designsystem.baseline.js']);

/* Path fragments ESLint ignores outright, plus the paths where the design rule
   is deliberately switched off. Kept in sync deliberately: if this scanner
   flagged a file ESLint never reports, `design:check` would fail on debt no
   developer can see in their editor.
   The gateway checkout skins are a permanent exemption, not a to-do: their
   palettes are the product (an admin picks between five named looks), so
   tokenising them would delete the feature. */
const SKIP_PATHS = [
  // `components/(ext)/chart-engine/` used to be here, and it was a real blind
  // spot: 448 source files and ~800 palette classes that neither this scanner
  // nor the ESLint rule ever looked at, including a `COLORS.DARK`/`COLORS.LIGHT`
  // pair of ~60 hex literals each that was what actually painted the chart.
  // It is clean now, so it stays in scope — an exclusion is how debt becomes
  // invisible rather than how it gets fixed.
  'i18n/generated/',
  'app/[locale]/(ext)/gateway/checkout/[paymentIntentId]/designs/',
  'app/[locale]/(ext)/admin/gateway/settings/design/',
];

function collect(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIR_ANYWHERE.has(e.name)) continue;
      if (SKIP_DIR_AT_ROOT.has(e.name) && path.dirname(p) === root) continue;
      collect(p, out);
    } else if (/\.(tsx?|jsx?|css)$/.test(e.name) && !SKIP_FILES.has(e.name)) {
      out.push(p);
    }
  }
  return out;
}

const allFiles = collect(root, []).filter((f) => {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  return !SKIP_PATHS.some((s) => rel.startsWith(s));
});

const codeFiles = allFiles.filter((f) => /\.(tsx?|jsx?)$/.test(f));
const cssFiles = allFiles.filter((f) => /\.css$/.test(f));

/* ==========================================================================
   SCAN
   ========================================================================== */

/** dimension id -> [{ file, line, detail }] */
const hitsByDim = new Map(DIMENSIONS.map((d) => [d.id, []]));
/** file -> total hits across ratchet + budget, for the "worst files" table */
const hitsByFile = new Map();
/** file -> RATCHET hits only. This is what the gate acts on. */
const ratchetByFile = new Map();

for (const scope of ['code', 'css']) {
  const dims = DIMENSIONS.filter((d) => d.scope === scope);
  if (!dims.length) continue;
  const files = scope === 'css' ? cssFiles : codeFiles;
  const stripper = scope === 'css' ? stripCssComments : stripComments;

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    /*
      Comments are stripped before EVERY rule.
      ---------------------------------------------------------------------
      The dead-class rules match on class-name SHAPE, and prose documenting the
      bug looks exactly like the bug — the comment explaining why `` `gap-${n}` ``
      was wrong tripped the rule that exists to find `` `gap-${n}` ``.

      The colour rules need it too, and that was learned the expensive way: they
      used to read raw source, so writing "was `from-slate-900 to-slate-800`" in
      a comment explaining a migration re-flagged the file as dirty. It punished
      the one habit this codebase most depends on — saying WHY a value changed —
      and produced phantom debt nobody could clear without deleting the
      explanation.

      The counter-argument, for whoever is tempted to revert this: Tailwind's
      scanner does read raw file text, so a palette class named in a comment
      really does emit a rule. True, and irrelevant here — a class that never
      reaches a `className` paints nothing, which is precisely what this metric
      measures. The cost is a few bytes of unused CSS; the benefit is that a
      migration can be documented at the site it happened.
    */
    const code = stripper(fs.readFileSync(file, 'utf8'));
    const ctx = { code, rel, nl: lineIndex(code) };

    for (const dim of dims) {
      let found;
      try {
        found = dim.detect(ctx) || [];
      } catch (e) {
        console.error(`  ABORT: dimension \`${dim.id}\` threw on ${rel}: ${e.message}`);
        process.exit(2);
      }
      if (!found.length) continue;
      const list = hitsByDim.get(dim.id);
      for (const h of found) list.push({ file: rel, line: h.line, detail: h.detail });
      if (dim.tier !== 'report') {
        hitsByFile.set(rel, (hitsByFile.get(rel) || 0) + found.length);
      }
      if (dim.tier === 'ratchet') {
        ratchetByFile.set(rel, (ratchetByFile.get(rel) || 0) + found.length);
      }
    }
  }
}

const countOf = (id) => hitsByDim.get(id).length;
const byTier = (t) => DIMENSIONS.filter((d) => d.tier === t);
const ratchetTotal = byTier('ratchet').reduce((a, d) => a + countOf(d.id), 0);

/* Only RATCHET dimensions mark a file dirty for the ESLint baseline, and the
   count reported beside a dirty file is its RATCHET count — not the sum across
   every tier. Those are different numbers and conflating them is actively
   misleading: `CTASection.tsx` failed the gate for ONE class conflict while the
   report said "10 hits", the other nine being backlog-tier card shells that are
   within budget and not what failed. An operator chasing ten problems in a file
   that has one loses trust in the tool, which is how a gate gets switched off.
   A budget dimension is a backlog, not a regression, and putting 477 hand-rolled
   primitives into the baseline would re-fill a file whose whole point is being
   empty. */
const dirty = [...ratchetByFile.entries()].map(([file, hits]) => ({ file, hits }));

/* ==========================================================================
   BUDGET
   ========================================================================== */

function readBudget() {
  if (!fs.existsSync(BUDGET_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8')); } catch { return null; }
}

const BUDGET_BANNER = {
  '//': [
    'GENERATED by scripts/scan-design-debt.js --budget.',
    'A HIGH-WATER MARK per budget-tier dimension: the count may go DOWN and never up.',
    'This is a NUMBER and not a file list on purpose. A file list rots — when a file',
    'is migrated its line stays behind and silently exempts that file from the rule',
    'forever. A number cannot go stale and cannot be gamed by adding a path.',
    'Lower these by fixing sites, then run --budget to record the new mark.',
  ],
};

function writeBudgetFile() {
  const out = { ...BUDGET_BANNER, limits: {} };
  for (const d of byTier('budget')) out.limits[d.id] = countOf(d.id);
  fs.writeFileSync(BUDGET_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  return out;
}

/* ==========================================================================
   REPORT
   ========================================================================== */

if (jsonMode) {
  const budget = readBudget();
  console.log(JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    filesScanned: { code: codeFiles.length, css: cssFiles.length },
    dimensions: DIMENSIONS.map((d) => ({
      id: d.id, label: d.label, tier: d.tier, scope: d.scope,
      count: countOf(d.id),
      limit: d.tier === 'budget' ? budget?.limits?.[d.id] ?? null : d.tier === 'ratchet' ? 0 : null,
      hits: hitsByDim.get(d.id),
    })),
  }, null, 2));
  process.exit(0);
}

if (listDim) {
  const dim = DIMENSIONS.find((d) => d.id === listDim);
  if (!dim) {
    console.error(`\n  Unknown dimension \`${listDim}\`. Known: ${DIMENSIONS.map((d) => d.id).join(', ')}\n`);
    process.exit(2);
  }
  const hits = hitsByDim.get(dim.id);
  console.log(`\n  ${dim.label} — ${hits.length} site(s)   [${dim.tier}]`);
  console.log('  ' + '-'.repeat(72));
  for (const h of hits) console.log(`  ${h.file}:${h.line}\n      ${h.detail}`);
  console.log('');
  process.exit(0);
}

const pct = (n, of) => `${((n / of) * 100).toFixed(1)}%`;
const num = (n) => n.toLocaleString('en-US');

console.log('\n  Design-system debt — ' + new Date().toISOString().slice(0, 10));
console.log('  ' + '-'.repeat(72));
console.log(`  files scanned        ${codeFiles.length} code + ${cssFiles.length} css`);
console.log(`  files with ratchet debt  ${dirty.length}  (${pct(dirty.length, codeFiles.length + cssFiles.length)})`);

const budget = readBudget();
let budgetBreaches = [];

function section(title, tier, note) {
  const dims = byTier(tier);
  if (!dims.length) return;
  console.log('  ' + '-'.repeat(72));
  console.log(`  ${title}`);
  if (note) console.log(`  ${note}`);
  for (const d of dims) {
    const n = countOf(d.id);
    let suffix = '';
    if (tier === 'budget') {
      const limit = budget?.limits?.[d.id];
      if (limit == null) suffix = '   (no budget recorded — run --budget)';
      else if (n > limit) { suffix = `   OVER BUDGET (was ${limit})`; budgetBreaches.push({ id: d.id, n, limit }); }
      else if (n < limit) suffix = `   under budget by ${limit - n} — run --budget to bank it`;
      else suffix = `   at budget (${limit})`;
    }
    console.log(`  ${d.label.padEnd(26)} ${String(num(n)).padStart(6)}${suffix}`);
    console.log(`  ${' '.repeat(26)}        ${d.hint}`);
  }
}

section('MUST BE ZERO', 'ratchet');
section('BACKLOG — the count may go down, never up', 'budget');
section('REPORTED ONLY', 'report');
console.log('  ' + '-'.repeat(72));
console.log('');

if (topN) {
  console.log(`  Worst ${topN} files (ratchet + budget):`);
  [...hitsByFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN)
    .forEach(([f, n], i) => console.log(`  ${String(i + 1).padStart(3)}. ${String(n).padStart(5)}  ${f}`));
  console.log('');
}

/* Ratchet hits are always listed. There should never be any, so when there are,
   the operator needs the site — not a number to go hunting with. */
if (ratchetTotal) {
  console.log('  RATCHET HITS — these must be fixed, not baselined:');
  for (const d of byTier('ratchet')) {
    const hits = hitsByDim.get(d.id);
    if (!hits.length) continue;
    console.log(`\n  ${d.label}:`);
    for (const h of hits.slice(0, 40)) console.log(`    ${h.file}:${h.line}\n        ${h.detail}`);
    if (hits.length > 40) console.log(`    … and ${hits.length - 40} more (--list ${d.id})`);
  }
  console.log('');
}

/* ==========================================================================
   GATES
   ========================================================================== */

/**
 * ESLint flat-config `files` patterns are globs (minimatch), and this repo's
 * paths are full of `[locale]`, `[id]`, `(ext)` … `[locale]` is a CHARACTER
 * CLASS, so a raw path silently matches nothing and the baseline entry does
 * nothing — the file keeps erroring.
 *
 * Verified against ESLint 9.39.5:
 *   app/\[locale\]/x.ts    -> does NOT suppress  (backslash escaping is not honoured)
 *   app/[[]locale[]]/x.ts  -> suppresses         (minimatch bracket-literal)
 *   app/(ext)/x.ts         -> suppresses         (parens are literal, no escaping)
 */
function globEscape(p) {
  // Single pass. Chaining .replace(/\[/g,'[[]').replace(/\]/g,'[]]') is wrong:
  // the first pass introduces a ']' that the second then re-escapes.
  return p.replace(/[[\]]/g, (c) => (c === '[' ? '[[]' : '[]]'));
}
function globUnescape(p) {
  return p.replace(/\[\[\]/g, '[').replace(/\[\]\]/g, ']');
}

if (checkMode) {
  /* The self-test runs INSIDE --check. A gate whose rules have gone blind is
     worse than no gate: it reports zero and everybody believes it. */
  const { failures } = runSelfTest();
  if (failures.length) {
    console.error('  ABORT: the rules themselves are broken, so the numbers above mean nothing.\n');
    for (const f of failures) console.error('    ' + f);
    console.error('\n  Run: node scripts/scan-design-debt.js --self-test\n');
    process.exit(2);
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error('  ABORT: eslint.designsystem.baseline.js missing. Run --baseline first.\n');
    process.exit(2);
  }
  /* A FULLY MIGRATED baseline is an empty array, not an array holding an entry
     with an empty `files` list — so `[0].files` throws at exactly the moment the
     migration succeeds. Treat "no entries" as "nothing is exempt". */
  const baselineEntries = require(BASELINE_PATH);
  const baselined = new Set(
    (Array.isArray(baselineEntries) ? baselineEntries : [])
      .flatMap((entry) => entry?.files ?? [])
      .map(globUnescape)
  );

  const dirtySet = new Set(dirty.map((d) => d.file));
  const newDebt = dirty.filter((d) => !baselined.has(d.file));
  const stale = [...baselined].filter((f) => !dirtySet.has(f));

  if (stale.length) {
    console.log(`  ${stale.length} stale baseline entr${stale.length === 1 ? 'y' : 'ies'} (file is clean now — delete the line):`);
    stale.slice(0, 15).forEach((f) => console.log('    ' + f));
    console.log('');
  }

  let failed = false;

  if (newDebt.length) {
    console.error(`  FAIL: ${newDebt.length} file(s) introduced design-system debt:\n`);
    newDebt.slice(0, 25).forEach((d) => console.error(`    ${String(d.hits).padStart(4)} hits  ${d.file}`));
    console.error('\n  Use design tokens — mapping table in plans/DESIGN-SYSTEM.md §4.');
    console.error('  Never fix this by adding the file to the baseline.');
    failed = true;
  }

  if (!budget) {
    console.error('\n  FAIL: design-budget.json is missing. Run --budget to record the current');
    console.error('  backlog, then commit it — without it the backlog dimensions cannot ratchet.');
    failed = true;
  } else if (budgetBreaches.length) {
    console.error('\n  FAIL: backlog grew — these may only go DOWN:\n');
    for (const b of budgetBreaches) {
      const d = DIMENSIONS.find((x) => x.id === b.id);
      console.error(`    ${d.label}: ${b.n} (budget ${b.limit}, +${b.n - b.limit})`);
      console.error(`        see them with:  node scripts/scan-design-debt.js --list ${b.id}`);
    }
    failed = true;
  }

  if (failed) { console.error(''); process.exit(1); }

  const banked = byTier('budget').filter((d) => (budget.limits?.[d.id] ?? Infinity) > countOf(d.id));
  console.log(`  PASS: ratchet clean, backlog within budget.`);
  if (banked.length) {
    console.log(`  ${banked.length} backlog dimension(s) improved — run --budget to lock the gain in.`);
  }
  console.log('');
  process.exit(0);
}

if (writeBudget) {
  const out = writeBudgetFile();
  console.log(`  budget written: ${path.relative(root, BUDGET_PATH)}`);
  for (const [k, v] of Object.entries(out.limits)) console.log(`    ${k.padEnd(24)} ${v}`);
  console.log('');
}

if (writeBaseline) {
  const list = dirty.map((d) => d.file).sort();

  // If a path ever contains a metacharacter globEscape does not handle, the
  // baseline would silently under-suppress. Fail loudly instead.
  const UNHANDLED = /[*?{}!+@]/;
  const bad = list.filter((f) => UNHANDLED.test(f));
  if (bad.length) {
    console.error('\n  ABORT: paths contain unhandled glob metacharacters:');
    bad.slice(0, 10).forEach((f) => console.error('    ' + f));
    console.error('  Extend globEscape() in this script before regenerating.\n');
    process.exit(2);
  }

  const out = `/**
 * GENERATED by scripts/scan-design-debt.js --baseline — do not hand-edit
 * except to DELETE lines.
 *
 * Every file here still contains hardcoded palette colours or dark: colour
 * forks. Migrating a file means removing its line; CI then holds it clean.
 * When this list is empty, delete this file and its spread in
 * eslint.config.js — that is the Phase 8 gate.
 *
 * Paths are glob-escaped for minimatch: "[" -> "[[]" and "]" -> "[]]", because
 * ESLint treats [locale] as a character class and backslash escaping does NOT
 * work. Parentheses are literal and left alone. Regenerate rather than edit by
 * hand: node scripts/scan-design-debt.js --baseline
 *
 * Generated: ${new Date().toISOString().slice(0, 10)}  ·  ${list.length} files
 */
module.exports = [
${list.length ? `  {
    files: [
${list.map((f) => `      '${globEscape(f)}',`).join('\n')}
    ],
    rules: { 'no-restricted-syntax': 'off' },
  },
` : ''}];
`;
  fs.writeFileSync(BASELINE_PATH, out, 'utf8');
  console.log(`  baseline written: ${path.relative(root, BASELINE_PATH)} (${list.length} files)\n`);
}
