#!/usr/bin/env node
/**
 * EVERY design-system dimension, as data — with the fixture that proves it fires.
 * ============================================================================
 *
 * `scan-design-debt.js` used to hold the detectors inline as `countX()`
 * functions returning integers. That shape had two costs which this file exists
 * to remove, and both had already been paid in real defects:
 *
 *  1. A COUNTER CANNOT POINT AT ANYTHING. The report said "372 class conflicts"
 *     and the operator's next question — *where* — needed a second tool. Every
 *     detector here returns LOCATIONS (`{ line, detail }`), so the report can
 *     name the file and the line, and `--json` can hand the list to an editor.
 *
 *  2. A RULE THAT GOES BLIND REPORTS ZERO, AND ZERO IS WHAT SUCCESS LOOKS LIKE.
 *     This has happened twice in this repo and neither was caught by the gate:
 *       - `[...TOKEN_NAMES]` spread a PIPE-JOINED STRING into 375 single
 *         characters, so `BARE_VAR_COLOUR`'s alternation was `c|a|r|d|-|…` and
 *         it matched none of the compound token names it was written for.
 *       - `CORNER_BLOB` spelled only the v3 alias `bg-gradient-to-*`. When the
 *         tree moved to the v4 name `bg-linear-to-*` the rule kept reporting a
 *         comfortable zero — not because the blobs were gone, but because it had
 *         stopped being able to see them.
 *     Both were found by a human reading the regex, months later. So every
 *     dimension below now carries a `fixture`: `bad` samples it MUST flag and
 *     `good` samples it MUST NOT. `scan-design-debt.js --self-test` runs them
 *     and fails loudly. A rule can still be wrong, but it can no longer be
 *     SILENTLY wrong, which is the failure mode that costs months.
 *
 * ----------------------------------------------------------------------------
 * TIERS — what a dimension's number means, and what CI does about it.
 *
 *   'ratchet'  Must be ZERO. Any hit fails `--check`. Use for defects that are
 *              unambiguous and already cleared, so the only way to see one is
 *              for someone to have just written it.
 *
 *   'budget'   A real backlog too large to clear in one pass. The count is
 *              recorded in `design-budget.json` and may only ever go DOWN.
 *              This is deliberately NOT a per-file baseline: a file list rots
 *              (a migrated file leaves a stale line that silently exempts the
 *              file forever), while a number cannot. It also cannot be gamed by
 *              adding a path.
 *
 *   'report'   Counted and printed, never gates. For axes where the honest
 *              answer is "here is the spread, a human decides" — and for the
 *              handful of documented, deliberate exemptions.
 *
 * ----------------------------------------------------------------------------
 * SCOPES — which files a dimension reads.
 *
 *   'code'  .ts/.tsx/.js/.jsx, comment-stripped.
 *   'css'   .css outside public/ (the TradingView bundles under public/lib are
 *           vendor and carry ~224 hexes that are not ours to fix).
 */
'use strict';

const {
  BANNED_PALETTE,
  BANNED_DARK,
  BANNED_FAKE_TOKEN,
  BANNED_RUNTIME_CLASS,
  TOKEN: TOKEN_NAMES,
  TOKEN_BASE: TOKEN_BASE_NAMES,
} = require('./design-system-patterns');

/* ==========================================================================
   SHARED HELPERS
   ========================================================================== */

/**
 * Strip comments, PRESERVING LINE NUMBERS AND TOKEN BOUNDARIES.
 *
 * Two changes from the original, both load-bearing now that detectors report
 * lines rather than counts:
 *
 *  - Comments are replaced with SPACES, not deleted. Deleting a block comment
 *    removed its newlines, so every line number after the first multi-line
 *    comment in a file was wrong. Padding keeps offsets exact.
 *  - Padding with spaces also removes a latent false positive the old form had:
 *    deleting the comment in `bg-/*x*​/blue-500` glued the halves into a real
 *    `bg-blue-500` that no author ever wrote.
 *
 * Why comments are stripped at all: the dead-class rules match on class-name
 * SHAPE, and prose that documents the bug looks exactly like the bug — the
 * comment explaining why `` `gap-${n}` `` was wrong tripped the rule that exists
 * to find `` `gap-${n}` ``. The colour rules need it for the same reason: a
 * migration note reading "was `from-slate-900`" re-flagged two clean files.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

/** CSS has only block comments. Same line-preserving treatment. */
function stripCssComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** Byte offsets of every newline, for O(log n) line lookup. */
function lineIndex(code) {
  const nl = [];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') nl.push(i);
  return nl;
}

function lineOf(idx, nl) {
  let lo = 0, hi = nl.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nl[mid] < idx) lo = mid + 1; else hi = mid;
  }
  return lo + 1;
}

/**
 * The last segment of a Tailwind token, after its variant chain.
 *
 * A variant chain is arbitrary (`md:`, `dark:hover:`, `data-[state=active]:`,
 * `has-[>svg]:`) and may contain a `:` inside brackets, so this counts bracket
 * depth rather than splitting on the first colon. An earlier migration script
 * matched `\bshadow-[a-z]+\b` as a substring instead, and on
 * `data-[state=active]:shadow-md` it rewrote only the tail, leaving
 * `data-[state=active]:` behind as a dangling, meaningless class.
 */
function tokenBase(token) {
  let depth = 0, lastColon = -1;
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    else if (c === ':' && depth === 0) lastColon = i;
  }
  return token.slice(lastColon + 1);
}

/**
 * Every string literal that plausibly holds a class list.
 *
 * THE WINDOW IS WIDER THAN IT WAS, AND THAT CLOSED A REAL BLIND SPOT.
 * The shipped form was `/["'`]([^"'`\n]{8,400})["'`]/` — no newlines, 400-char
 * cap. Measured against this tree that excluded 579 class-like literals (1.0%):
 * 561 because a long className was wrapped across lines by the formatter, 18
 * for length. Four detectors — conflicts, duplicate-alpha, dead gradients and
 * self-ink — never looked at any of them.
 *
 * It was not academic. `components/sections/cta/CTASection.tsx:601` carries
 * `border border-border border-border-strong` across a line break: two border
 * colours in one literal, twMerge not involved because it is a plain string, so
 * one of them has always been dead. Nothing could see it.
 *
 * Whitespace is collapsed so a wrapped literal tokenises the same as a flat one.
 */
function* classLiterals(code) {
  const re = /(["'`])((?:[^"'`\\]|\\.)*?)\1/g;
  let m;
  while ((m = re.exec(code))) {
    const raw = m[2];
    if (raw.length < 8 || raw.length > 4000) continue;
    // Cheap pre-filter: does this look like a class list at all?
    if (!/(?:^|\s)(?:flex|grid|absolute|relative|fixed|sticky|block|inline|hidden|p-|px-|py-|pt-|pb-|m-|mx-|my-|w-|h-|size-|text-|bg-|border|rounded|gap-|shadow|space-|z-|ring|from-|to-|via-|font-|items-|justify-|opacity-|leading-|tracking-|transition|animate-|duration-|cursor-|overflow-|min-|max-|truncate)/.test(' ' + raw)) continue;
    yield { text: raw.replace(/\s+/g, ' ').trim(), index: m.index };
  }
}

/** Split a class literal into `{ tokens, bare, bases }`. */
function classify(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  return {
    tokens,
    /** Tokens with NO variant prefix — `hover:bg-x` is a different state. */
    bare: tokens.filter((t) => !/^[a-z0-9-]+(?:\[[^\]]*\])?:/.test(t)),
    /** Every token reduced to its final segment, variants discarded. */
    bases: tokens.map(tokenBase),
  };
}

/* ==========================================================================
   COLOUR — the original ratchet. These are all at ZERO and must stay there.
   ========================================================================== */

const RE_PALETTE = new RegExp(BANNED_PALETTE, 'g');
const RE_DARK = new RegExp(BANNED_DARK, 'g');
const RE_FAKE_TOKEN = new RegExp(BANNED_FAKE_TOKEN, 'g');
const RE_RUNTIME_CLASS = new RegExp(BANNED_RUNTIME_CLASS, 'g');
const RE_ARBITRARY_HEX = /\[#[0-9a-fA-F]{3,8}\]/g;

/** Every regex-match dimension shares this shape. */
function matcher(re) {
  return (ctx) => {
    const out = [];
    re.lastIndex = 0;
    for (const m of ctx.code.matchAll(re)) {
      out.push({ line: lineOf(m.index, ctx.nl), detail: m[0] });
    }
    return out;
  };
}

/**
 * Paths where a runtime-assembled class is the DESIGN, not a defect.
 *
 * The page builder stores class-name fragments as page CONTENT (an admin picks
 * a background, it is persisted as `[hsl(var(--card))]`) and the renderers
 * assemble `bg-${value}`. Tailwind cannot see that, which is exactly why
 * `templates/utils.ts` exports `tailwindSafelist` — an array whose only job is
 * to be scanned. Those classes DO compile.
 *
 * Scoped to the renderers and the canvas rather than the whole builder, so a
 * genuinely interpolated `gap-${n}` elsewhere in the builder is still caught.
 */
const RUNTIME_CLASS_EXEMPT = [
  'app/[locale]/(dashboard)/admin/builder/components/renderers/',
  'app/[locale]/(dashboard)/admin/builder/components/canvas/structure/',
  'app/[locale]/(dashboard)/admin/builder/templates/utils.ts',
];

/**
 * Several utility prefixes are also ordinary English words, so a React key or an
 * id built the same way reads as a class: `` key={`left-${i}`} ``,
 * `` key={`text-${n}`} ``, `` orderId: `order-${Date.now()}` ``. None is a class
 * and none is a bug. Rather than drop `text-` and `order-` from the rule —
 * `text-${size}` is a real defect it exists to catch — discard a match whose
 * immediate left context shows it is a key or an identifier.
 */
const NOT_A_CLASS_CONTEXT = /(?:key\s*=\s*\{?|(?:^|[^\w])[A-Za-z]*[Ii]d\s*[:=]\s*\{?)\s*[`'"]?$/;

function detectRuntimeClass(ctx) {
  if (RUNTIME_CLASS_EXEMPT.some((p) => ctx.rel.startsWith(p))) return [];
  const out = [];
  RE_RUNTIME_CLASS.lastIndex = 0;
  for (const m of ctx.code.matchAll(RE_RUNTIME_CLASS)) {
    const before = ctx.code.slice(Math.max(0, m.index - 40), m.index);
    if (NOT_A_CLASS_CONTEXT.test(before)) continue;
    out.push({ line: lineOf(m.index, ctx.nl), detail: m[0] });
  }
  return out;
}

/* --------------------------------------------------------------------------
   SELF-CONFLICTING class literal: one string setting the same CSS property
   twice with different token values, e.g. `"bg-card bg-muted"`.

   `cn()` runs twMerge and would resolve it, but a raw template literal handed
   straight to `className` never goes through it — BOTH classes are emitted and
   the winner is whichever Tailwind writes later in the stylesheet. The rendered
   colour is then decided by compiler ordering rather than by the author, which
   is precisely what an admin colour panel cannot work with.

   `white` and `black` are in every group deliberately. `border-2 border-white
   border-border` is a real conflict, but neither name is a "palette utility" so
   no other dimension saw it, and both compile, so nothing failed. Seven files
   carried that exact avatar ring and the measurement says `border-white` WINS,
   so the `border-border` beside it was dead in all of them.

   `transparent` is deliberately NOT listed: cva bases legitimately set
   `border-transparent` as a reserved slot for a variant to override.
   -------------------------------------------------------------------------- */
const CONFLICT_GROUPS = [
  ['bg', ['background', 'card', 'popover', 'muted', 'accent', 'surface-2', 'surface-3', 'primary', 'secondary', 'white', 'black']],
  ['text', ['foreground', 'muted-foreground', 'subtle-foreground', 'card-foreground', 'popover-foreground', 'white', 'black']],
  ['border', ['border', 'border-strong', 'input', 'white', 'black']],
  /* `ring` earns a group for the same reason `border` did. Tailwind implements
     rings as a BOX-SHADOW, so `ring-white` is invisible to any check comparing
     colour properties — it only surfaced once the readiness probe started
     comparing `box-shadow` too. Nine avatar/badge cutout rings were hardcoded
     white, i.e. a bright halo in dark mode. */
  ['ring', ['ring', 'border', 'card', 'background', 'primary', 'white', 'black']],
];

function detectClassConflict(ctx) {
  const out = [];
  for (const lit of classLiterals(ctx.code)) {
    const { bare } = classify(lit.text);
    for (const [prefix, values] of CONFLICT_GROUPS) {
      const seen = new Set();
      for (const t of bare) for (const v of values) if (t === `${prefix}-${v}`) seen.add(v);
      if (seen.size > 1) {
        out.push({ line: lineOf(lit.index, ctx.nl), detail: `${prefix}: ${[...seen].map((v) => `${prefix}-${v}`).join(' + ')}` });
      }
    }
    /* The SAME colour utility twice at DIFFERENT alphas, both unprefixed —
       `shadow-shadow/10 … shadow-shadow/20`. CONFLICT_GROUPS cannot see this:
       it compares exact token names, so those are two different strings to it.
       Four data-table surfaces carried the shape and it is not harmless —
       twMerge keeps the LAST, so light mode was getting the heavier alpha
       plainly written for dark. Only flagged when BOTH are unprefixed:
       `shadow-shadow/10 dark:shadow-shadow/20` is the correct form and the
       whole point (R5's per-theme alpha exemption). */
    const byUtil = new Map();
    for (const t of bare) {
      const hit = t.match(/^((?:bg|text|border|ring|shadow|fill|stroke)-[a-z0-9-]+)\/(\d{1,3})$/);
      if (!hit) continue;
      if (!byUtil.has(hit[1])) byUtil.set(hit[1], new Set());
      byUtil.get(hit[1]).add(hit[2]);
    }
    for (const [util, alphas] of byUtil) {
      if (alphas.size > 1) out.push({ line: lineOf(lit.index, ctx.nl), detail: `${util}/{${[...alphas].join(',')}}` });
    }
  }
  return out;
}

/* ==========================================================================
   DEAD PAINT — styles that compile but cannot paint anything.
   ==========================================================================
   A whole-platform sweep found ~60 of these and NOT ONE was visible to any
   check that existed: not the palette rule (the values are tokens), not the hex
   rule (there is no hex), not the dead-class rules (the class names are real),
   not the readiness probe (an element painting nothing is skipped as "not
   painting"). They are the most expensive defect this repo produces, because
   the code reads as correct and the only symptom is that something is missing.
   ========================================================================== */

/**
 * A bare `var(--token)` where a COLOUR is expected.
 *
 * ONLY the core design tokens are matched, and that precision is the point.
 * Those tokens hold a BARE HSL TRIPLE (`--primary: 217 91% 60%`), so
 * `stroke="var(--border)"` is an invalid colour and the declaration is dropped.
 * Plenty of other custom properties legitimately hold a COMPLETE colour and
 * must not be flagged: `--color-*` (which `@theme` emits as `hsl(var(--muted))`),
 * `--tp-*` (the trade-pro layer), `--news-*`.
 *
 * NOTE the `.split('|')` on both imports. They are PIPE-JOINED STRINGS, not
 * arrays. Spreading them directly produced an alternation of 375 SINGLE
 * CHARACTERS and this rule matched nothing it was written to catch, reporting a
 * comfortable zero for months. That is the exact failure `--self-test` exists
 * to make impossible.
 */
const TRIPLE_TOKEN_ALT = [
  ...String(TOKEN_NAMES).split('|'),
  ...String(TOKEN_BASE_NAMES).split('|'),
  'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6',
  'surface-2', 'surface-3', 'border-strong', 'overlay-foreground', 'shadow',
].filter(Boolean).sort((a, b) => b.length - a.length).join('|');

const RE_BARE_VAR_COLOUR = new RegExp(
  '\\b(?:fill|stroke|stopColor|stop-color|color|backgroundColor|background-color|' +
    'borderColor|border-color|shadowColor|fillColor|strokeColor|strokeStyle|fillStyle)' +
    '\\s*[:=]\\s*(?:\\{\\s*)?["\'`]\\s*var\\(--(?:' + TRIPLE_TOKEN_ALT + ')\\s*[),]',
  'g'
);

/** A token immediately followed by a 2-digit hex alpha — "half a colour". */
const RE_TOKEN_HEX_ALPHA = /\$\{[^}\n]{1,80}\}[0-9a-fA-F]{2}(?=["'`])/g;

/**
 * The same token as both fill and ink in one literal.
 *
 * `bg-success text-success-foreground` is the correct pairing; `bg-success
 * text-success` paints the label in its own background.
 *
 * The alpha'd form (`bg-success/10 text-success`) is NOT handled here — it is
 * its own dimension, `soft-chip-ink`, because deciding it needs the type size.
 */
const SELF_INK_TONES = [
  'primary', 'secondary', 'success', 'warning', 'destructive', 'info',
  'muted', 'accent', 'card', 'popover', 'background', 'foreground', 'up', 'down',
];

/** Gradient direction with no stops, and stops with no gradient. */
function detectDeadPaint(ctx) {
  const out = [];
  RE_BARE_VAR_COLOUR.lastIndex = 0;
  for (const m of ctx.code.matchAll(RE_BARE_VAR_COLOUR)) {
    out.push({ line: lineOf(m.index, ctx.nl), detail: `bare var() colour: ${m[0].slice(0, 60)}` });
  }
  RE_TOKEN_HEX_ALPHA.lastIndex = 0;
  for (const m of ctx.code.matchAll(RE_TOKEN_HEX_ALPHA)) {
    out.push({ line: lineOf(m.index, ctx.nl), detail: `token + hex alpha: ${m[0]}` });
  }
  for (const lit of classLiterals(ctx.code)) {
    const text = lit.text;
    const { tokens } = classify(text);
    /* Skip anything interpolated. `bg-gradient-to-br ${color}` gets its stops
       from the variable, and judging the literal alone called 92 correct call
       sites dead — which is exactly how a ratchet earns being switched off. The
       cost is that a genuinely stopless interpolated gradient is missed; that is
       the right side to err on. */
    if (!text.includes('${')) {
      const hasDirection = /\bbg-(?:gradient|linear)-to-[a-z]{1,2}\b/.test(text);
      const hasStop = /(?:^|\s|:)(?:from|via|to)-\S/.test(text);
      if (/(?:^|\s)(?:flex|grid|absolute|relative|block|inline|p-|px-|py-|m-|w-|h-|text-|bg-|border|rounded|gap-)/.test(text)) {
        if (hasDirection && !hasStop) out.push({ line: lineOf(lit.index, ctx.nl), detail: 'gradient direction with no from-/to- stop' });
        if (!hasDirection && /(?:^|\s)[a-z-]+:(?:from|via|to)-\S/.test(text)) out.push({ line: lineOf(lit.index, ctx.nl), detail: 'gradient stop behind a variant with no gradient utility' });
      }
    }
    for (const tone of SELF_INK_TONES) {
      if (tokens.includes(`bg-${tone}`) && tokens.includes(`text-${tone}`)) {
        out.push({ line: lineOf(lit.index, ctx.nl), detail: `bg-${tone} text-${tone} — label painted in its own ground` });
      }
    }
  }
  return out;
}

/* ==========================================================================
   THE LEDGER CARD CONTRACT
   ========================================================================== */

const SHELL_RADIUS = /^rounded(-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?-(xs|sm|md|xl|2xl|3xl|none)$/;
const SHELL_FLOATING = /^(fixed|absolute|sticky|backdrop-blur.*|z-\[?\d.*)$/;

/**
 * CARD-SHELL DRIFT. A shell is one shape: `rounded-lg`, a hairline border, no
 * elevation. This codebase reached 1,534 `<Card>` call sites, 878 hand-rolled
 * card surfaces, NINE radii and TWELVE shadow levels for one object.
 *
 * THE ANCHOR WAS THE BUG. This rule used to start from `className=\{?\s*(?:cn\()?`
 * and demand a string literal IMMEDIATELY after it. That recognises exactly two
 * spellings — `className="…"` and `className={cn("…"` — out of the seven this
 * tree actually uses. It could not see a class list inside a `cva()` base, a
 * `cn(base, "…")` whose first argument is a variable, a ternary arm, or a
 * `clsx()`/`twMerge()` call. Measured: the anchored form reports 0 and the
 * literal walk reports 24, so SIXTEEN card surfaces carrying `shadow-sm` through
 * `shadow-2xl` were invisible — including four landing-page components and the
 * admin settings panel. A rule reporting zero because it is looking in the wrong
 * place is the failure mode `--self-test` exists for, and a fixture cannot catch
 * this one: the rule fired correctly on its own sample, it just never reached
 * most of the tree.
 *
 * Exemptions, all deliberate:
 *   - FLOATING surfaces (fixed/absolute/sticky/z/backdrop-blur). A popover, a
 *     toast and a dropdown sit ABOVE the page rather than in it, and a border
 *     alone cannot say that. Elevation there is meaningful.
 *   - `rounded-full` — a circle is an avatar, a status dot or a pill, not a card.
 *   - a small fixed square is a TILE, an avatar or a swatch. The icon tile in the
 *     card anatomy is `h-7 w-7 rounded-sm`; without this the rule flags the very
 *     thing it exists to encourage.
 *   - `components/ui/card.tsx` itself. Its `elevated` variant is the DOCUMENTED
 *     opt-out from Ledger — "the only variant with elevation, so it is the only
 *     one the strength token can reach" — and its whole job is to declare the
 *     shapes this rule measures everything else against. The rule is
 *     definitionally inapplicable to the definition.
 */
/**
 * Files that DEFINE card shapes rather than consume them.
 *
 * `components/ui/card.tsx` is the obvious one: its `elevated` variant is the
 * documented Ledger opt-out and its whole job is to declare the shapes this rule
 * measures everything else against.
 *
 * The four landing-section cards are here for the same reason the gateway
 * checkout skins are permanently exempt elsewhere in this scanner: THE VARIETY IS
 * THE PRODUCT. Each exposes a `cardStyle` prop — `default | bordered | elevated |
 * glass | gradient` — that an operator picks per section, and `elevated` is one
 * of the five. Flattening them would not fix drift, it would delete a shipped,
 * configurable feature, which is exactly the "cries wolf" outcome that gets a
 * rule switched off.
 *
 * What WAS a real defect in all four, and is fixed: the shadow was a bare
 * `shadow-2xl dark:shadow-surface-2/50`, so it did not read
 * `--card-shadow-strength`. An owner setting Elevation to 0 in the design manager
 * — the documented flat look — still got a shadow on every landing card. They now
 * carry `shadow-shadow/[calc(N*var(--card-shadow-strength))]` on both themes, so
 * the control reaches them and 0 really is flat.
 */
const CARD_SHAPE_DEFINITIONS = new Set([
  'components/ui/card.tsx',
  'components/sections/pricing/PricingCard.tsx',
  'components/sections/features/FeatureCard.tsx',
  'components/sections/testimonials/TestimonialCard.tsx',
  'components/sections/cta/CTASection.tsx',
]);

/**
 * The OTHER half of shell drift: a `<Card>` CALL SITE overriding the shell.
 *
 * The literal walk below cannot see these, and the reason is structural rather
 * than a bug: it keys on `bg-card`, and a `<Card>` supplies its own ground, so
 * the call site's className carries only the override — `<Card
 * className="border-border/40 shadow-sm">`. The Ledger census counted 293 of
 * these in 110 files and they are the same defect as a hand-rolled shell,
 * arriving through the primitive instead of around it.
 *
 * A call site that names a VARIANT is opting out on purpose and is left alone:
 * `variant="elevated"` is the documented Ledger exemption, `glass` is for
 * translucency over an image, `ghost`/`outline`/`dashed`/`muted` each redefine
 * the shell deliberately. Only an override applied on top of the DEFAULT shell
 * is drift.
 */
function detectCardCallSiteOverride(ctx) {
  if (CARD_SHAPE_DEFINITIONS.has(ctx.rel)) return [];
  if (!/from ["'][^"']*components\/ui\/card["']/.test(ctx.code)) return [];
  const out = [];
  for (const m of ctx.code.matchAll(/<Card(?![A-Za-z0-9_])/g)) {
    const seg = jsxOpenTag(ctx.code, m.index);
    if (!seg) continue;
    const variant = /variant=\{?["'](\w+)["']/.exec(seg);
    if (variant && ['elevated', 'glass', 'ghost', 'outline', 'dashed', 'muted'].includes(variant[1])) continue;
    const cls = [...seg.matchAll(/["'`]([^"'`\n]{2,400})["'`]/g)].map((x) => x[1]).join(' ');
    if (!cls) continue;
    for (const t of cls.split(/\s+/).filter(Boolean)) {
      const b = tokenBase(t);
      if (SHELL_RADIUS.test(b)) out.push({ line: lineOf(m.index, ctx.nl), detail: `<Card className="… ${b} …"> — the Ledger shell is rounded-lg` });
      else if (/^shadow-(2?xs|sm|md|lg|xl|2xl)$/.test(b)) out.push({ line: lineOf(m.index, ctx.nl), detail: `<Card className="… ${b} …"> — the Ledger shell has no elevation; variant="elevated" is the opt-out` });
    }
  }
  return out;
}

function detectCardShell(ctx) {
  if (CARD_SHAPE_DEFINITIONS.has(ctx.rel)) return [];
  const out = detectCardCallSiteOverride(ctx);
  for (const lit of classLiterals(ctx.code)) {
    const { bases } = classify(lit.text);
    if (!bases.includes('bg-card')) continue;
    if (!bases.some((b) => /^(rounded|border|shadow)/.test(b))) continue;
    if (bases.some((b) => SHELL_FLOATING.test(b) || b === 'rounded-full')) continue;
    const h = bases.find((b) => /^h-\d+(\.5)?$/.test(b));
    const w = bases.find((b) => /^w-\d+(\.5)?$/.test(b));
    if (h && w && parseFloat(h.slice(2)) <= 12 && parseFloat(w.slice(2)) <= 12) continue;

    for (const b of bases) {
      if (SHELL_RADIUS.test(b)) out.push({ line: lineOf(lit.index, ctx.nl), detail: `${b} — the Ledger shell is rounded-lg` });
      else if (/^shadow-/.test(b) && b !== 'shadow-none' && !/^shadow-(shadow|surface|border|card|primary)/.test(b)) {
        /* `shadow-{token}` sets the shadow COLOUR, not its size — `shadow-lg
           dark:shadow-surface-2/50` is one elevation with a per-theme tint (R5).
           Only the SIZE utility is the drift. */
        out.push({ line: lineOf(lit.index, ctx.nl), detail: `${b} — the Ledger shell has no elevation` });
      }
    }
  }
  return out;
}

/* The decorative corner blob: an absolutely-positioned gradient puck bled off a
   card corner with negative margins. No information, and it fakes depth with a
   gradient where R3 reserves depth for the surface ramp.

   The quote class is ["'`], not just ". The first version required a double
   quote and reported a comfortable ZERO while two live blobs sat in template
   literals. The utility alternation is `(?:gradient|linear)` for the same
   reason: when the tree unified onto the v4 name `bg-linear-to-*`, a rule
   spelling only the v3 alias went quietly blind. */
const RE_CORNER_BLOB =
  /className=\{?["'`][^"'`]*\babsolute\b[^"'`]*bg-(?:gradient|linear)-to-[a-z]+[^"'`]*\bto-transparent\b[^"'`]*\brounded-full\b/g;

/* A bare glyph where the anatomy calls for a tile. `<Icon className="h-4 w-4
   text-muted-foreground" />` as the last child of a CardHeader is the shadcn
   dashboard-card default, and the single most common interior tell. */
const RE_BARE_HEADER_ICON =
  /<[A-Z]\w*\s+className=\{?["'`]h-4 w-4 text-muted-foreground["'`]\}?\s*\/>\s*<\/CardHeader>/g;

function detectCardInterior(ctx) {
  const out = [];
  for (const [re, label] of [[RE_CORNER_BLOB, 'decorative corner blob'], [RE_BARE_HEADER_ICON, 'bare header icon where a tile belongs']]) {
    re.lastIndex = 0;
    for (const m of ctx.code.matchAll(re)) out.push({ line: lineOf(m.index, ctx.nl), detail: label });
  }
  return out;
}

/* ==========================================================================
   CHARTS — the design system's biggest blind spot, by construction.
   ==========================================================================
   Every class-based rule reads class names. Recharts takes its colours, type
   sizes and number formats as ordinary JS STRINGS handed to props, so a chart
   could sit years out of palette and no class rule would ever see it. That is
   what happened: fifteen files drew their own pie, and the six-colour default
   Recharts falls back to when a `fill` is unusable reached the admin dashboard
   as an unbranded lilac.
   ========================================================================== */

const RE_RECHARTS_IMPORT = /from ["']recharts["']/;
const CHART_RULES = [
  [/contentStyle=\{\{/g, 'inline tooltip style object — use content={<ChartTooltipContent/>}'],
  /* `labelLine` is a Recharts-only prop, so it needs no `<Pie` anchor — and must
     not have one: a single `<Pie>`'s props routinely span 15 lines with arrow
     functions in them, and any `[^>]*` window breaks on the `>` of a `=>`. */
  [/\blabelLine=|\blabel=\{\(\{/g, 'pie outside-label — collides past 4 segments, shrinks the ring'],
  [/<Legend[\s/>]/g, 'Recharts <Legend> steals plot height and is unstyleable — use ChartLegend'],
  [/\b(?:fill|stroke|stopColor)=\{?["']#[0-9a-fA-F]{3,8}["']/g, 'raw hex on a chart prop — cannot follow the theme'],
];

function detectChart(ctx) {
  if (!RE_RECHARTS_IMPORT.test(ctx.code)) return [];
  const out = [];
  for (const [re, label] of CHART_RULES) {
    re.lastIndex = 0;
    for (const m of ctx.code.matchAll(re)) out.push({ line: lineOf(m.index, ctx.nl), detail: label });
  }
  return out;
}

/* ==========================================================================
   NEW DIMENSIONS
   ========================================================================== */

/**
 * SOFT-CHIP INK — a tinted ground with same-tone ink, at a small type size.
 *
 * globals.css states the recipe outright: "`bg-{tone}/10` + `text-{tone}-ink`
 * is THE recipe". `bg-success/10 text-success` was measured at 3.94-4.48:1 and
 * FAILS AA — the tint pulls the ground toward the ink.
 *
 * `scan-design-debt.js` declined to gate this, and its reasoning was sound as
 * far as it went: "is there small text on this element is not decidable from a
 * class literal alone — the same pairing is CORRECT on an icon-only tile, which
 * is 341 of the sites in the tree."
 *
 * True — but INCOMPLETE. When the literal ALSO carries the type size, it IS
 * decidable, and no judgement is required. That subset is 17 sites against 419
 * left correctly alone. All five tones involved (primary, success, warning,
 * destructive, info) have had an `-ink` derivative since Phase 11b, so every one
 * of the 17 is a one-token fix.
 *
 * `muted`/`accent`/`secondary` are deliberately excluded: they have no `-ink`
 * counterpart, so there would be nothing to migrate to.
 */
const INK_TONES = ['primary', 'success', 'warning', 'destructive', 'info', 'up', 'down'];
/* Anything at or below `text-base`. AA's large-text allowance starts at 18.66px
   bold / 24px regular, so `text-lg` and up are not judged here. */
const SMALL_TYPE = /^text-(xs|sm|base|\[(?:[0-9]|1[0-6])(?:\.\d+)?px\])$/;

function detectSoftChipInk(ctx) {
  const out = [];
  for (const lit of classLiterals(ctx.code)) {
    const { bases } = classify(lit.text);
    const size = bases.find((t) => /^text-(xs|sm|base|lg|\d?xl|\[[^\]]+\])$/.test(t));
    if (!size || !SMALL_TYPE.test(size)) continue;
    for (const tone of INK_TONES) {
      const tinted = bases.some((t) => new RegExp(`^bg-${tone}/\\d{1,3}$`).test(t));
      const sameInk = bases.includes(`text-${tone}`);
      if (tinted && sameInk) {
        out.push({ line: lineOf(lit.index, ctx.nl), detail: `bg-${tone}/N + text-${tone} at ${size} — use text-${tone}-ink` });
      }
    }
  }
  return out;
}

/**
 * HARDCODED COLOUR IN A STYLESHEET.
 *
 * The scanner has only ever read .ts/.tsx/.js/.jsx, and `styles/` is in
 * SKIP_DIRS on top of that. Twelve first-party stylesheets in `app/` were
 * therefore outside every gate the design system has.
 *
 * What that cost, both found the first time this rule ran:
 *   - `app/globals.css:1658` — `.hover-elevate:hover` sets a box-shadow of
 *     `rgb(0 0 0 / 0.1)`. `--shadow` is an admin control ("The shadow's COLOUR
 *     is --shadow, under Elevation"), and this one ignores it. The comment four
 *     lines above it announces that the last off-token paint in `styles/` had
 *     been migrated — while this one sat directly underneath.
 *   - `builder/components/settings-panel/styles.css` — five palette hexes
 *     (#7c3aed violet, plus three greys) on tab rules. Light-mode values in a
 *     themed app.
 *
 * `hsl(var(--x))` and `color-mix(in oklab, hsl(var(--y)) …)` are correct and
 * must not be flagged, so a colour function is only a hit when its argument list
 * contains no `var(`. `public/` is excluded: the TradingView bundles there carry
 * ~224 hexes and are vendor code.
 */
const RE_CSS_HEX = /#[0-9a-fA-F]{3,8}\b/g;
const RE_CSS_COLOUR_FN = /\b(?:rgba?|hsla?)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;

function detectCssHardcodedColour(ctx) {
  const out = [];
  RE_CSS_HEX.lastIndex = 0;
  for (const m of ctx.code.matchAll(RE_CSS_HEX)) {
    out.push({ line: lineOf(m.index, ctx.nl), detail: `hardcoded ${m[0]}` });
  }
  RE_CSS_COLOUR_FN.lastIndex = 0;
  for (const m of ctx.code.matchAll(RE_CSS_COLOUR_FN)) {
    if (m[1].includes('var(')) continue;
    out.push({ line: lineOf(m.index, ctx.nl), detail: `hardcoded ${m[0].slice(0, 40)}` });
  }
  return out;
}

/**
 * OFF-SCALE STACKING ORDER.
 *
 * Tailwind ships z-0/10/20/30/40/50. Everything above that in this tree is an
 * arbitrary value, and there is no scale to arbitrate them: the census found
 * z-[60], z-[61], z-[70], z-[75], z-[80], z-[100], z-[110], z-[120], z-[200],
 * z-[998], z-[999], z-[1000] and z-[9999] — thirteen values across 35 uses,
 * every one of them a private guess about what it needs to sit above.
 *
 * This is how a dialog ends up under a header. It is also self-reinforcing: the
 * only way to win against `z-[999]` is `z-[9999]`, which is exactly the escalation
 * the census shows.
 *
 * The ladder now exists in globals.css (`--z-scrim` … `--z-top`), every value in
 * it is the one that already shipped, and all 37 sites read it by name. So this
 * rule's job changed from "report the mess" to "keep a new number from being
 * invented". `z-[0]`-`z-[50]` spellings of the built-in steps are not flagged —
 * they are on-scale, just verbosely written.
 */
const RE_Z_ARBITRARY = /(?<![-\w])(?:[a-z0-9-]+(?:\[[^\]]*\])?:)*z-\[(\d+)\]/g;

function detectZScale(ctx) {
  const out = [];
  RE_Z_ARBITRARY.lastIndex = 0;
  for (const m of ctx.code.matchAll(RE_Z_ARBITRARY)) {
    const n = Number(m[1]);
    if ([0, 10, 20, 30, 40, 50].includes(n)) continue;
    out.push({ line: lineOf(m.index, ctx.nl), detail: `z-[${n}] — use a name from the ladder in globals.css, e.g. z-[var(--z-overlay)]` });
  }
  return out;
}

/**
 * A CUSTOM PROPERTY THAT NOTHING DECLARES.
 *
 * `z-[var(--z-overlay)]` compiles whether or not `--z-overlay` exists. When it
 * does not, the declaration is `z-index: var(--nothing)` — invalid at computed-
 * value time, so the property falls back to its initial value and the element
 * silently loses its stacking order. Same for `bg-[var(--typo)]`, `h-[var(--x)]`,
 * and every other arbitrary value.
 *
 * This is the SAME failure family as `dead-paint` and `fake-token` — a class that
 * reads correct and paints nothing — and it is the one the z-index ladder just
 * created a lot of surface area for: thirty-nine call sites now depend on a name
 * matching a declaration in another file, with nothing checking the join. A typo
 * would be invisible.
 *
 * The design system has already paid for this exact bug once:
 * `backgroundColor: "var(--color-primary-10)"`, a token declared NOWHERE, which
 * had therefore always computed to nothing.
 *
 * The declared set is read from EVERY stylesheet in the tree, not just
 * globals.css, because the trade-pro / algo / news layers legitimately declare
 * their own namespaces in their own files. `--tw-*` is Tailwind's internal
 * namespace and is declared by the compiler rather than by us.
 */
let declaredCustomProps = null;

function loadDeclaredCustomProps() {
  const fsx = require('fs'), pathx = require('path');
  const root = pathx.join(__dirname, '..');
  const out = new Set();
  const SKIP = new Set(['node_modules', '.next', 'dist', 'build', '.turbo', 'coverage', 'public']);
  (function walk(dir) {
    let entries;
    try { entries = fsx.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = pathx.join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); }
      else if (/\.s?css$/.test(e.name)) {
        for (const m of fsx.readFileSync(p, 'utf8').matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) out.add(m[1]);
      }
    }
  })(root);
  return out;
}

/* A custom property set from JS — `style={{ '--x': v }}` or `setProperty('--x')` —
   is declared, just not in a stylesheet. Collected per file. */
const RE_JS_DECLARED = /["'`](--[a-zA-Z0-9-]+)["'`]\s*(?::|,)|setProperty\(\s*["'`](--[a-zA-Z0-9-]+)["'`]/g;

/**
 * Namespaces nobody in this repo declares, and nobody should.
 *
 *  --radix-*  Radix writes these onto the popper element at RUNTIME
 *             (`--radix-select-trigger-width`, `--radix-popover-trigger-width`).
 *             Reading one is the documented way to size a dropdown to its
 *             trigger; declaring it would break that.
 *  --tw-*     Tailwind's internals, emitted by the compiler.
 *  --spacing, --container, --breakpoint-*  Tailwind v4 built-in theme keys, which
 *             live in the framework's own theme rather than in globals.css.
 */
const RUNTIME_CUSTOM_PROP = /^--(?:radix|tw)-|^--(?:spacing|container)$|^--breakpoint-/;

function detectUndeclaredCustomProp(ctx) {
  if (!declaredCustomProps) declaredCustomProps = loadDeclaredCustomProps();
  const local = new Set();
  RE_JS_DECLARED.lastIndex = 0;
  for (const m of ctx.code.matchAll(RE_JS_DECLARED)) local.add(m[1] || m[2]);

  const out = [];
  for (const m of ctx.code.matchAll(/\[[^\]]*?var\((--[a-zA-Z0-9-]+)\s*(,?)/g)) {
    const name = m[1];
    /* `var(--x, fallback)` CANNOT compute to nothing — that is what the fallback
       is for, and using one is the correct way to read a property that may not be
       set. The builder's `var(--builder-text, currentColor)` is exactly this and
       flagging it would be wrong. Only the bare, unguarded form is a defect. */
    if (m[2] === ',') continue;
    if (RUNTIME_CUSTOM_PROP.test(name)) continue;
    if (declaredCustomProps.has(name) || local.has(name)) continue;
    out.push({ line: lineOf(m.index, ctx.nl), detail: `var(${name}) is declared by no stylesheet and has no fallback — the declaration computes to nothing` });
  }
  return out;
}

/**
 * PRIMITIVE BYPASS — the same object, re-typed by hand.
 *
 * This is the dimension the design system most needs and least had. Every other
 * rule here asks "is this value on-token?". This one asks "is this object the
 * one the system defines?" — and a hand-rolled copy can be perfectly on-token
 * and still be the reason two pages read as different products.
 *
 * It is not a style opinion, it is a broken control surface. `components/ui/card.tsx`
 * spells its border `border-[length:var(--card-border-width)]`, and
 * `--card-border-width`, `--card-padding-scale` and `--card-shadow-strength` are
 * three live controls in the admin design manager's "card" group. A hand-rolled
 * `bg-card border border-border rounded-lg p-3` responds to NONE of them. The
 * admin moves the slider, 279 surfaces across 179 files do not move, and there
 * is no error anywhere — which is precisely the "slider that changes nothing"
 * failure `verify-component-tokens.js` was written to prevent. That check proves
 * a token is read by AT LEAST ONE rule; it cannot prove it is read everywhere it
 * should be. This dimension is the other half.
 *
 * `<Card>` also carries seven variants derived from measured overrides (ghost,
 * outline, dashed, muted, glass, elevated, tone=*) and an RTL-correct `border-s-4`
 * status rail, so in almost every case the hand-rolled version is strictly worse.
 *
 * PRECISION. Each shape below requires the FULL signature of the primitive, not
 * a family resemblance:
 *   card   ground + border + radius, and not floating, not a pill
 *   button a <button> that paints itself: padding AND radius AND a fill
 *   badge  a <span> pill: rounded-full AND padding AND small type AND a fill
 *   modal  fixed + inset-0 + a z-index + a scrim
 * A `<div className="bg-card">` with no border is a ground, not a card, and is
 * not flagged. A `<button className="text-muted-foreground">` is a bare control
 * and is not flagged.
 */
const PRIMITIVE_SHAPES = [
  {
    kind: 'card',
    tag: 'div',
    window: 400,
    test(bases) {
      return bases.includes('bg-card')
        && bases.some((b) => /^border(-|$)/.test(b))
        && bases.some((b) => /^rounded/.test(b))
        && !bases.includes('rounded-full')
        && !bases.some((b) => /^(fixed|absolute|sticky)$/.test(b));
    },
    fix: 'use <Card> — a hand-rolled shell ignores --card-border-width / --card-padding-scale / --card-shadow-strength',
  },
  {
    kind: 'button',
    tag: 'button',
    window: 600,
    test(bases) {
      return bases.some((b) => /^p[xy]?-\d/.test(b))
        && bases.some((b) => /^rounded/.test(b))
        && bases.some((b) => /^bg-[a-z]/.test(b));
    },
    fix: 'use <Button> — its variants carry the control tokens and the focus ring',
  },
  {
    kind: 'badge',
    tag: 'span',
    window: 300,
    test(bases) {
      return bases.includes('rounded-full')
        && bases.some((b) => /^px-\d/.test(b))
        && bases.some((b) => /^text-(xs|\[(?:[89]|1[0-2])px\])$/.test(b))
        && bases.some((b) => /^bg-[a-z]/.test(b));
    },
    fix: 'use <Badge> — its tone variants are the shared status vocabulary',
  },
];

function detectPrimitiveBypass(ctx) {
  /* HTML-AS-DATA IS NOT A COMPONENT. `components/admin/studio/legal/legal-templates.ts`
     builds legal-document markup as STRINGS — `<div class="p-6 bg-card rounded-lg
     border border-border">` — which is a template rendered through
     `dangerouslySetInnerHTML`, not JSX. "Use `<Card>` here" is not advice, it is
     nonsense: there is no React in that file. Eleven hits in that one file.
     Two guards, and both are needed. The extension test rules out `.ts` files
     that only emit markup; the `className=` test rules out HTML strings that
     appear inside a `.tsx` (the page builder's templates do exactly this), since
     JSX spells the attribute `className` and hand-written HTML spells it `class`. */
  if (!/\.[jt]sx$/.test(ctx.rel)) return [];
  const out = [];
  for (const shape of PRIMITIVE_SHAPES) {
    const re = new RegExp(`<${shape.tag}\\b[\\s\\S]{0,${shape.window}}?>`, 'g');
    for (const m of ctx.code.matchAll(re)) {
      const seg = m[0];
      if (!/\bclassName\s*=/.test(seg)) continue;
      const cls = [...seg.matchAll(/["'`]([^"'`\n]{4,600})["'`]/g)].map((x) => x[1]).join(' ');
      if (!cls) continue;
      const bases = cls.split(/\s+/).filter(Boolean).map(tokenBase);
      if (!shape.test(bases)) continue;
      out.push({ line: lineOf(m.index, ctx.nl), detail: `hand-rolled ${shape.kind} — ${shape.fix}` });
    }
  }
  /* The overlay case is a class literal rather than a tag: a scrim is usually a
     sibling div, and the dialog it belongs to is elsewhere in the file. */
  for (const lit of classLiterals(ctx.code)) {
    const { bases } = classify(lit.text);
    if (bases.includes('fixed') && bases.includes('inset-0')
      && bases.some((b) => /^z-/.test(b))
      && bases.some((b) => /^(bg-overlay|backdrop-blur)/.test(b))) {
      out.push({ line: lineOf(lit.index, ctx.nl), detail: 'hand-rolled modal scrim — use <Dialog>, which owns focus trap, scroll lock and Escape' });
    }
  }
  return out;
}

/**
 * OFF-LEDGER ELEVATION — R3, enforced outside the card.
 *
 * "R3 — Elevation is a surface ramp, not a gradient. Four grounds plus one
 * hairline. A card is visible because it is one step lighter than what is under
 * it. No gradient, no glow, no tinted border to fake depth."
 *
 * `card-shell drift` already gates this, but ONLY on a literal that also carries
 * `bg-card` — so it sees the shadow on a card and is blind to the same shadow on
 * everything else. 453 remain on non-floating elements.
 *
 * It is not merely stylistic. `--card-shadow-strength: 0` is the documented flat
 * look and a real owner request; these shadows do not read it, so "flat" comes
 * out not-flat. And in dark mode a black shadow on a 6.7%-lightness ground reads
 * as almost nothing, so the elevation the author asked for is not there either.
 *
 * FLOATING surfaces are exempt for the reason the shell rule exempts them: a
 * popover, toast or dropdown sits ABOVE the page and a border alone cannot say
 * so. `shadow-none` is the opt-out, not a hit.
 */
function detectOffLedgerElevation(ctx) {
  const out = [];
  for (const lit of classLiterals(ctx.code)) {
    const { bases } = classify(lit.text);
    const shadow = bases.find((b) => /^shadow-(2?xs|sm|md|lg|xl|2xl)$/.test(b));
    if (!shadow) continue;
    if (bases.includes('bg-card')) continue;                                   // the shell rule owns this
    if (bases.some((b) => /^(fixed|absolute|sticky)$/.test(b))) continue;      // floating: legitimate
    if (bases.some((b) => /^backdrop-blur/.test(b))) continue;
    if (bases.some((b) => /^z-/.test(b))) continue;
    out.push({ line: lineOf(lit.index, ctx.nl), detail: `${shadow} on a page-level surface — R3 puts depth in the surface ramp` });
  }
  return out;
}

/**
 * A SHADOW NAMESPACE THAT WAS NEVER REGISTERED.
 *
 * Phase 16b registered `--shadow-2xs … --shadow-2xl` and `--inset-shadow-sm` in
 * `@theme` and declared elevation a themeable axis. `--drop-shadow-*` was never
 * declared, so `drop-shadow-lg` falls through to Tailwind's own default —
 * `0 4px 4px rgb(0 0 0 / 0.15)`, a literal black that no token can reach. It is
 * the exact defect Phase 16b closed for `shadow-*`, surviving one namespace over,
 * on blog hero headings where it is most visible.
 *
 * DERIVED, NOT A BLOCKLIST. The declared steps are parsed out of globals.css at
 * run time, so registering `--drop-shadow-lg` both fixes the sites and clears the
 * rule, and a future `text-shadow-*` is caught the first time somebody types it.
 * A hardcoded list would have to be remembered; this cannot go stale.
 */
const SHADOW_NAMESPACES = ['shadow', 'inset-shadow', 'drop-shadow', 'text-shadow'];
let declaredShadowSteps = null;

function loadDeclaredShadowSteps(cssPath) {
  const out = new Set();
  let css = '';
  try { css = require('fs').readFileSync(cssPath, 'utf8'); } catch { return out; }
  for (const m of stripCssComments(css).matchAll(/--((?:inset-|drop-|text-)?shadow)-([a-z0-9]+)\s*:/g)) {
    out.add(`${m[1]}-${m[2]}`);
  }
  return out;
}

/* Tailwind's own always-available steps that carry no theme key and are not
   elevation: `shadow-none` and the colour form `shadow-{token}`. */
const SHADOW_STEP = /^(shadow|inset-shadow|drop-shadow|text-shadow)-([a-z0-9]+)$/;

function detectUnregisteredShadow(ctx) {
  if (!declaredShadowSteps) {
    declaredShadowSteps = loadDeclaredShadowSteps(
      require('path').join(__dirname, '..', 'app', 'globals.css')
    );
  }
  const out = [];
  for (const lit of classLiterals(ctx.code)) {
    for (const b of classify(lit.text).bases) {
      const m = SHADOW_STEP.exec(b);
      if (!m) continue;
      const [, ns, step] = m;
      if (step === 'none' || step === 'initial') continue;
      /* `shadow-{token}` sets the shadow COLOUR — a different utility that shares
         the prefix. Only the size ramp is judged here. */
      if (!/^(2?xs|sm|md|lg|xl|2xl|3xl)$/.test(step)) continue;
      if (declaredShadowSteps.has(`${ns}-${step}`)) continue;
      out.push({
        line: lineOf(lit.index, ctx.nl),
        detail: `${b} — \`--${ns}-${step}\` is not declared in @theme, so this paints Tailwind's literal black`,
      });
    }
  }
  return out;
}

/**
 * A SATURATED FILL WEARING ANOTHER TONE'S INK.
 *
 * `bg-success text-primary-foreground` is only legible today by coincidence:
 * every `*-foreground` currently resolves to one of two near-identical values, so
 * the mismatch is invisible. The moment an owner gives `--primary-foreground` a
 * tint in the design manager — which is exactly what that control is for — every
 * one of these labels changes colour on a ground it was never paired with.
 *
 * Two exemptions, both mandatory and both measured:
 *   - NEUTRAL surfaces. `bg-card text-muted-foreground` is the documented correct
 *     pairing and accounts for 22 of the 36 raw matches. Judging it would be
 *     wrong, not merely noisy.
 *   - `bg-up` / `bg-down`. globals.css declares no `--up-foreground` or
 *     `--down-foreground`, so those sites have no correct alternative and
 *     flagging them is a demand with no fix — the fastest way to get a rule
 *     switched off.
 */
const SATURATED_TONES = ['primary', 'secondary', 'success', 'warning', 'destructive', 'info'];

function detectMismatchedTonalInk(ctx) {
  const out = [];
  for (const lit of classLiterals(ctx.code)) {
    /* `bare`, NOT `bases`. Variant-stripped tokens conflate a HOVER fill with a
       RESTING one: `text-muted-foreground bg-muted hover:bg-primary` reduces to
       `bg-primary` + `text-muted-foreground` and reads as a mismatch, when the
       two never co-exist in any single state. That shape is the whole of the
       blog pagination control and it accounted for 12 of the 26 raw hits — every
       one of them wrong. A pairing rule has to compare ONE state at a time. */
    const { bare } = classify(lit.text);
    const fill = SATURATED_TONES.find((t) => bare.includes(`bg-${t}`));
    if (!fill) continue;
    const ink = bare.find((b) => /^text-([a-z-]+)-foreground$/.test(b));
    if (!ink) continue;
    const inkTone = ink.slice(5, -11);
    if (inkTone === fill) continue;
    out.push({
      line: lineOf(lit.index, ctx.nl),
      detail: `bg-${fill} + ${ink} — legible only while every *-foreground holds the same value; use text-${fill}-foreground`,
    });
  }
  return out;
}

/**
 * `animate-*` BESIDE `delay-*` WITH NO TRANSITION.
 *
 * `delay-*` sets `transition-delay`. An element with an ANIMATION and no
 * transition has nothing for it to delay, so the class does nothing. Phase 17b
 * found fourteen of these — "fourteen sites wrote `animate-pulse delay-1000`
 * intending to offset one decorative blob against another … every blob pulsed in
 * lockstep" — fixed them, added `@utility animate-delay-*` as the correct
 * spelling, and never gated it. This gates at ZERO on day one, which is the
 * cheapest possible moment to add a rule: it can only ever fire on a regression.
 *
 * Neither existing dead-class dimension can see it. `BANNED_FAKE_TOKEN` was
 * written for the colour namespace and needs a numeric shade suffix;
 * `BANNED_RUNTIME_CLASS` needs a `${`. Both classes here are real and both
 * compile — the defect is the PAIRING.
 */
function detectAnimateDelayPairing(ctx) {
  const out = [];
  for (const lit of classLiterals(ctx.code)) {
    const { bases } = classify(lit.text);
    if (!bases.some((b) => /^animate-(?!delay)[a-z0-9-]+$/.test(b))) continue;
    const delay = bases.find((b) => /^delay-\d+$/.test(b));
    if (!delay) continue;
    /* A transition IS present, so the delay is doing its job. */
    if (bases.some((b) => /^(transition|duration-)/.test(b))) continue;
    out.push({ line: lineOf(lit.index, ctx.nl), detail: `${delay} beside an animation with no transition — did you mean animate-${delay}?` });
  }
  return out;
}

/**
 * A LITERAL CORNER RADIUS, frozen against `--radius`.
 *
 * Phase 10 rebuilt the whole ramp to derive from one `--radius` token, and Phase
 * 20 pushed it into the SVG drawings. An arbitrary `rounded-[4px]` opts out: two
 * of the sites hardcode the ramp's own CURRENT values, so they look correct right
 * up until an owner moves the slider and everything else follows except them.
 *
 * Exempt when the value derives from the token (`calc(var(--radius-xl) * …)`) or
 * is `rounded-[inherit]` — both are correct-by-construction and both already
 * exist in the tree.
 *
 * BUDGET tier, not ratchet, and the reason is worth stating: several of the
 * remaining sites are device bezels in a KYC form-preview — a phone mockup at
 * `rounded-[32px]` is an ILLUSTRATION OF A PHONE, not a UI corner, and forcing it
 * onto the ramp would make the drawing wrong. Distinguishing "corner of a
 * control" from "corner of a picture of a device" is not decidable from a class
 * list, so the honest gate is a count that may not grow.
 */
/**
 * THE RAMP'S CEILING IS THE EXEMPTION, and it is not a fudge.
 *
 * The ramp runs `--radius-xs` (1px) to `--radius-4xl` (16px), all derived from
 * `--radius: 0.25rem`. A radius at or above that ceiling cannot be expressed as
 * a step at all, and in this tree every such value is a DRAWING rather than a
 * control: `rounded-[32px]` and `rounded-[24px]` are the phone and tablet bezels
 * in the KYC form preview, `rounded-[4rem]`/`[3.5rem]`/`[3rem]` are the handset
 * illustration on the landing page. Those are pictures of devices. Forcing them
 * onto a 4px-derived ramp would make the drawing wrong, and a rule that demands
 * it is a rule that gets switched off.
 *
 * Below the ceiling the opposite holds: the value COULD be a step, so not being
 * one is a choice to opt out of the token. Measured, that split is exactly right
 * — 8 of the 12 sites were device bezels above the ceiling, and all 4 below it
 * were genuine, including two that hardcoded the ramp's own current values
 * (`rounded-[2px]` = `--radius-sm`, `rounded-[4px]` = `--radius-lg`). Those look
 * correct right up until an owner moves the slider and everything else follows
 * except them.
 */
const RADIUS_CEILING_PX = 16;

/**
 * One file, named explicitly, for a reason of the kind an exemption has to have:
 * the rule is definitionally inapplicable, not merely inconvenient.
 *
 * `form-preview.tsx` draws a PHONE and a TABLET around the form being previewed.
 * Its bezels (`rounded-[32px]`, `rounded-[24px]`) are already above the ramp
 * ceiling and exempt for that reason, but the matching inner SCREEN corners are
 * `rounded-[18px]` and `rounded-[14px]` — and the ceiling splits that pair,
 * exempting one half of one drawing and demanding the other half follow a 4px
 * control ramp. Both are the same picture. Naming the file keeps the ceiling rule
 * honest everywhere else rather than bending it to fit.
 */
const DEVICE_MOCKUP_FILES = new Set([
  'app/[locale]/(dashboard)/admin/crm/kyc/components/level-builder/form-preview.tsx',
]);

function radiusPx(value) {
  const m = /^([\d.]+)(px|rem)$/.exec(value);
  if (!m) return null;
  return m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
}

function detectOffRampRadius(ctx) {
  if (DEVICE_MOCKUP_FILES.has(ctx.rel)) return [];
  const out = [];
  for (const lit of classLiterals(ctx.code)) {
    for (const b of classify(lit.text).bases) {
      const m = /^rounded(?:-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?-\[(.+)\]$/.exec(b);
      if (!m) continue;
      const value = m[1];
      if (value.includes('var(--radius') || value === 'inherit') continue;
      const px = radiusPx(value);
      if (px !== null && px >= RADIUS_CEILING_PX) continue;   // a drawing, not a control
      out.push({ line: lineOf(lit.index, ctx.nl), detail: `${b} — a corner inside the ramp's range that does not use it` });
    }
  }
  return out;
}

/**
 * DEAD BADGE VARIANT — a chip whose colour name does not exist.
 *
 * A DataTable column declares `type: "badge"` with a `variant` that must be one
 * of nine names. `badge.tsx` looks the value up and falls through to grey when it
 * misses, so `{ FIXED_PRICE: "blue", AUCTION: "purple", BUNDLE: "orange" }`
 * renders every row the same colour and the legend the column was for does not
 * exist. No error, no warning — the table just quietly stops distinguishing.
 *
 * The union is parsed from the types file rather than hardcoded, so adding a
 * variant there clears the rule rather than requiring a second edit here.
 *
 * ANCHORING IS THE WHOLE RULE. A bare `\bvariant\s*:` scan reports 153 hits in 46
 * files, nearly all of them themed-art variants (`variant: "crosses"`) and
 * action-button variants (`variant: "outline"`) in unrelated config objects.
 * Brace-matching the `config:` block that follows `type: "badge"` takes it to 14
 * in 2 files with no false positives.
 */
let badgeVariants = null;

function loadBadgeVariants() {
  const out = new Set();
  try {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'components', 'blocks', 'data-table', 'types', 'table.ts'), 'utf8'
    );
    const i = src.indexOf('export type BadgeVariant');
    if (i < 0) return out;
    const body = src.slice(i, src.indexOf(';', i));
    for (const m of body.matchAll(/"([a-z]+)"/g)) out.add(m[1]);
  } catch { /* the rule reports nothing rather than everything if the file moves */ }
  return out;
}

/** Brace-match forward from `openIdx` (which must point at `{`). */
function braceSlice(code, openIdx, limit = 6000) {
  let depth = 0;
  for (let i = openIdx; i < Math.min(code.length, openIdx + limit); i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') { depth--; if (!depth) return code.slice(openIdx, i + 1); }
  }
  return null;
}

/**
 * The VALUE of `key:` — up to the comma or closing brace at the SAME depth.
 *
 * Reading to the end of the enclosing block instead is not a small
 * approximation, it is most of the answer wrong. `config:` holds `variant:`
 * beside `label:` and `withDot:`, so a scan that runs past the variant slot
 * collects the i18n strings out of `label: (v) => v ? tCommon("active") :
 * tCommon("inactive")` and reports "active" and "inactive" as dead chip
 * colours. That mechanism alone produced 26 of 40 raw hits, all false.
 */
function valueAfterColon(block, colonIdx) {
  let i = colonIdx + 1;
  while (i < block.length && /\s/.test(block[i])) i++;
  const start = i;
  let depth = 0;
  while (i < block.length) {
    const c = block[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < block.length) {
        if (block[i] === '\\') { i += 2; continue; }
        if (block[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') { if (!depth) break; depth--; }
    else if (c === ',' && !depth) break;
    i++;
  }
  return { text: block.slice(start, i), start };
}

function detectDeadBadgeVariant(ctx) {
  if (!badgeVariants) badgeVariants = loadBadgeVariants();
  if (!badgeVariants.size) return [];
  const out = [];
  for (const m of ctx.code.matchAll(/type:\s*["']badge["']/g)) {
    const cfg = ctx.code.indexOf('config:', m.index);
    if (cfg < 0 || cfg - m.index > 400) continue;
    const brace = ctx.code.indexOf('{', cfg);
    if (brace < 0) continue;
    const block = braceSlice(ctx.code, brace);
    if (!block) continue;
    const vm = /\bvariant\s*:/.exec(block);
    if (!vm) continue;
    const slot = valueAfterColon(block, vm.index + vm[0].length - 1);

    for (const s of slot.text.matchAll(/["']([a-zA-Z_][a-zA-Z0-9_-]*)["']/g)) {
      const value = s[1];
      if (badgeVariants.has(value)) continue;
      const after = slot.text.slice(s.index + s[0].length, s.index + s[0].length + 4);
      const before = slot.text.slice(Math.max(0, s.index - 26), s.index).trimEnd();
      /* A string in KEY position (`{ DEPOSIT: "success" }`) or in COMPARAND
         position (`value === "OPEN" ? …`, `["A","B"].includes(v)`) is the enum
         being mapped FROM, not a colour name. Only strings that can reach the
         return value are variant names. */
      if (/^\s*:/.test(after)) continue;
      if (/(===|!==|==|!=)$/.test(before)) continue;
      if (/\.(includes|indexOf|startsWith|endsWith|match|test|has|split|replace|toUpperCase|toLowerCase)\s*\(\s*$/.test(before)) continue;
      if (/^\s*[,)\]]?\s*\.(includes|indexOf|has)\s*\(/.test(after)) continue;
      out.push({
        line: lineOf(brace + vm.index, ctx.nl),
        detail: `badge variant "${value}" is not a BadgeVariant — the chip falls through to grey`,
      });
    }
  }
  return out;
}

/**
 * A CALLER'S LITERAL LENGTH DELETING THE COMPONENT TOKEN.
 * ============================================================================
 *
 * This is the biggest single reason the design manager's sliders appear not to
 * work, and NOTHING could see it.
 *
 * `cn()` is `twMerge(clsx(...))`, and every primitive puts the caller's
 * `className` LAST — `button.tsx` passes it into `buttonVariants({...})` so cva
 * appends it, `card.tsx` is `cn(..., SECTION_PADDING[padding], className)`,
 * `dialog.tsx` is `cn(BASE, sizeClasses[size], className)`. twMerge then resolves
 * the conflict in the caller's favour and REMOVES the primitive's class outright.
 * Measured in this repo, not assumed:
 *
 *     twMerge('h-[calc(2.5rem*var(--control-height-scale))]', 'h-9')  ->  'h-9'
 *     twMerge('p-[calc(1.5rem*var(--card-padding-scale))]',   'p-6')  ->  'p-6'
 *
 * The token is not outranked, it is GONE from the DOM. So `<Button size="icon"
 * className="h-9 w-9">` is pinned at 36px at every setting of Control height, and
 * an owner dragging that slider watches most of the app refuse to move.
 *
 * WHY `verify-component-tokens.js` REPORTS 27/27 ANYWAY. That check asks one
 * question: does `var(--control-height-scale)` appear anywhere in the compiled
 * stylesheet? It does — the primitive's rule was emitted. The check proves a
 * token is READ BY A RULE; it cannot prove the rule survives to the element. The
 * failure it was written to prevent — "a slider that moves, saves, persists,
 * reloads, and changes nothing on screen" — simply moved from the component file
 * to its 356 callers, where nothing was looking. COMPONENT-SYSTEM.md §7 names the
 * gap outright: "scan-design-debt.js bans palette classes, not hardcoded lengths."
 *
 * THE GROUPS ARE DERIVED FROM THE PRIMITIVES, and three arms that look obvious
 * are deliberately absent because they were measured and are NOT kills:
 *
 *   - BADGE. `badge.tsx` sizes are plain literals (`xs: px-1.5 py-0`), and
 *     lib/design-theme.ts declares only `--badge-radius-scale`. There is no badge
 *     padding token, so a caller's `px-4` kills nothing. Including it added 251
 *     phantom hits.
 *   - `px-*` / `py-*` ON CARD AND DIALOG SECTIONS. twMerge keeps BOTH
 *     `p-[calc(...)]` and `py-16` — a one-axis override leaves the other axis
 *     tokenised, and `py-16` on an empty state is a deliberate spacer. 82 phantom
 *     hits. Only exact `p-*` conflicts.
 *   - Anything derived by a `calc`-only regex. `dialog.tsx` spells its token
 *     `p-[var(--dialog-padding)]` with no `calc`, so a `/-\[calc\(/` derivation
 *     silently drops DialogContent and reports a comfortable partial zero — the
 *     `[...TOKEN_NAMES]` failure mode again.
 *
 * Three exemptions, each a real intent rather than a concession:
 *   `p-0` / `px-0`   "remove it", which no multiplier can express
 *   `h-auto`, `w-full`, `h-fit` …  an explicit opt-out of a fixed length
 *   `sm:h-8`, `hover:p-4`          a state override, not a base kill
 */
const TOKEN_DRIVEN_PROPS = {
  Button: ['h', 'px'],
  Input: ['h', 'px'],
  CardContent: ['p'],
  CardHeader: ['p'],
  CardFooter: ['p'],
  DialogContent: ['p'],
};
const PRIMITIVE_IMPORT = /from ["'][^"']*components\/ui\/(?:button|input|card|dialog)["']/;
const PRIMITIVE_FILES = new Set([
  'components/ui/button.tsx', 'components/ui/input.tsx', 'components/ui/card.tsx',
  'components/ui/dialog.tsx', 'components/ui/badge.tsx',
]);
/* Lengths that are not a number on the spacing scale. Overriding a token with
   one of these is a change of KIND, not of value. */
const INTRINSIC_LENGTH = /^(auto|full|fit|min|max|screen|px|svh|dvh|lvh)$/;

/** Walk from `<Tag` to its matching top-level `>`, honouring braces and quotes. */
function jsxOpenTag(code, start, limit = 2000) {
  let depth = 0, i = start;
  const end = Math.min(code.length, start + limit);
  while (i < end) {
    const c = code[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < end) { if (code[i] === '\\') { i += 2; continue; } if (code[i] === q) { i++; break; } i++; }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return code.slice(start, i + 1);
    i++;
  }
  return null;
}

function detectComponentTokenKilled(ctx) {
  if (PRIMITIVE_FILES.has(ctx.rel)) return [];
  if (!PRIMITIVE_IMPORT.test(ctx.code)) return [];
  const out = [];
  for (const [tag, props] of Object.entries(TOKEN_DRIVEN_PROPS)) {
    const re = new RegExp(`<${tag}(?![A-Za-z0-9_])`, 'g');
    for (const m of ctx.code.matchAll(re)) {
      const seg = jsxOpenTag(ctx.code, m.index);
      if (!seg) continue;
      const cls = [...seg.matchAll(/["'`]([^"'`\n]{1,400})["'`]/g)].map((x) => x[1]).join(' ');
      if (!cls) continue;
      for (const t of cls.split(/\s+/).filter(Boolean)) {
        if (t.includes(':')) continue;                       // a state override
        if (t.includes('[')) continue;                       // already an arbitrary/tokenised value
        const hit = /^([a-z]+)-(.+)$/.exec(t);
        if (!hit) continue;
        const [, prop, value] = hit;
        if (!props.includes(prop)) continue;
        if (value === '0') continue;                         // "remove it"
        if (INTRINSIC_LENGTH.test(value)) continue;          // a change of kind
        out.push({
          line: lineOf(m.index, ctx.nl),
          detail: `<${tag} className="… ${t} …"> — twMerge DELETES the ${prop}-[…var(--${prop === 'p' ? (tag === 'DialogContent' ? 'dialog-padding' : 'card-padding-scale') : prop === 'h' ? 'control-height-scale' : 'control-padding-scale'})…] the primitive sets`,
        });
      }
    }
  }
  return out;
}

/* ==========================================================================
   AUTHOR STYLESHEETS — two ways a .css file overrules the whole system
   ========================================================================== */

/**
 * AN AUTHOR STYLESHEET REDEFINING A TAILWIND UTILITY NAME.
 *
 * `admin/builder/…/text-alignment.css` declares `.text-left`, `.text-center`,
 * `.text-right` and `.text-justify` at top level with `!important`, and
 * `builder/layout.tsx` imports it. Those are not the builder's class names —
 * they are Tailwind's, so every `text-right` in every SHARED component rendered
 * anywhere under `/admin/builder` is silently overruled, including components
 * that have nothing to do with the builder.
 *
 * The tell is the top-level (unscoped) selector. `.tp-workspace .text-xs { … }`
 * in trading-pro.css looks identical and is CORRECT: it is the documented
 * font-scale mechanism, deliberately scoped to one workspace. Requiring the
 * selector to be unscoped is what separates them.
 *
 * globals.css is excluded — it owns the `@layer` / `@utility` vocabulary on
 * purpose and defining utilities is its job.
 */
/**
 * "Is this name a real Tailwind utility?" — answered by ROOT **and** VALUE, never
 * by prefix alone.
 *
 * A bare prefix test is far too loose and says yes to every custom class that
 * happens to start with an English word: `.text-element`, `.text-element-wrapper`,
 * `.transition-height`, `.h-safe-area-inset-bottom` are all local names and none
 * is a utility. Five of nine raw hits were exactly that.
 *
 * So each root carries its value set, and a numeric/fraction/arbitrary value is
 * accepted for the scale roots. `text-element` fails because `element` is neither
 * an alignment nor a size; `text-right` passes because `right` is an alignment.
 */
const UTILITY_VALUES = {
  text: /^(left|center|right|justify|start|end|xs|sm|base|lg|xl|[2-9]xl|wrap|nowrap|balance|pretty|ellipsis|clip)$/,
  font: /^(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|sans|serif|mono)$/,
  items: /^(start|end|center|baseline|stretch)$/,
  justify: /^(start|end|center|between|around|evenly|stretch|normal)$/,
  self: /^(auto|start|end|center|stretch|baseline)$/,
  content: /^(start|end|center|between|around|evenly|normal|stretch|none)$/,
  rounded: /^(none|xs|sm|md|lg|xl|[2-9]xl|full)$/,
  shadow: /^(2?xs|sm|md|lg|xl|2xl|none|inner)$/,
  animate: /^(spin|ping|pulse|bounce|none|in|out)$/,
  transition: /^(none|all|colors|opacity|shadow|transform)$/,
  overflow: /^(auto|hidden|clip|visible|scroll|x-auto|y-auto|x-hidden|y-hidden)$/,
  cursor: /^(auto|default|pointer|wait|text|move|help|not-allowed|grab|grabbing)$/,
  whitespace: /^(normal|nowrap|pre|pre-line|pre-wrap|break-spaces)$/,
  leading: /^(none|tight|snug|normal|relaxed|loose|\d+)$/,
  tracking: /^(tighter|tight|normal|wide|wider|widest)$/,
  opacity: /^\d{1,3}$/,
  z: /^(auto|\d+)$/,
  order: /^(first|last|none|\d+)$/,
};
/** Scale roots: any numeric, fractional, `px`, `full`, `auto` or arbitrary value. */
const SCALE_ROOTS = new Set([
  'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr', 'ps', 'pe',
  'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr', 'ms', 'me',
  'w', 'h', 'size', 'gap', 'top', 'left', 'right', 'bottom', 'inset', 'basis',
]);
const SCALE_VALUE = /^(\d+(\.5)?|px|auto|full|screen|min|max|fit|\d+\/\d+|\[.+\])$/;
const TAILWIND_UTILITY_BARE = new Set([
  'flex', 'grid', 'block', 'inline', 'hidden', 'absolute', 'relative', 'fixed',
  'sticky', 'static', 'contents', 'truncate', 'italic', 'underline', 'uppercase',
  'lowercase', 'capitalize', 'container', 'invisible', 'visible', 'transition',
]);

function isTailwindUtilityName(name) {
  if (TAILWIND_UTILITY_BARE.has(name)) return true;
  const dash = name.indexOf('-');
  if (dash < 0) return false;
  const root = name.slice(0, dash);
  const value = name.slice(dash + 1);
  if (UTILITY_VALUES[root]) return UTILITY_VALUES[root].test(value);
  if (SCALE_ROOTS.has(root)) return SCALE_VALUE.test(value);
  return false;
}

function detectCssUtilityShadow(ctx) {
  if (ctx.rel === 'app/globals.css') return [];
  const out = [];
  for (const m of ctx.code.matchAll(/(^|\})\s*((?:\.[A-Za-z0-9_-]+\s*,\s*)*\.[A-Za-z0-9_-]+)\s*(?::[a-z-]+(?:\([^)]*\))?)?\s*\{/g)) {
    for (const sel of m[2].split(',')) {
      const name = sel.trim().slice(1);
      if (!isTailwindUtilityName(name)) continue;
      out.push({
        line: lineOf(m.index, ctx.nl),
        detail: `.${name} is a Tailwind utility name — this redefines it for every component on the routes that import this file`,
      });
    }
  }
  return out;
}

/**
 * `!important` ON A TOKEN-DRIVEN PROPERTY, FROM AN UNSCOPED SELECTOR.
 *
 * `[contenteditable="true"] { border: none !important; background: transparent
 * !important; … }` in the builder's stylesheet is unscoped, so it reaches every
 * contenteditable element on those routes. One of its declarations is
 * `box-shadow: none !important` on `:focus`, which erases the focus ring the
 * design system defines through `--ring` — the indicator Phase 11e added to 774
 * input call sites because there was not one.
 *
 * LAYOUT properties are deliberately NOT judged. `width`/`height`/`flex`/
 * `display` overrides are the legitimate third-party-widget escape hatch that
 * globals.css reserves unlayered space for, and including them reports 51 hits in
 * trading-pro.css alone — which is how this rule would get switched off in a week.
 * Only properties the token system owns are here.
 */
const TOKEN_OWNED_PROPERTY =
  /(?:^|;|\{)\s*(color|background|background-color|border|border-color|box-shadow|fill|stroke|font-family|font-size|font-weight|letter-spacing)\s*:[^;{}]*!important/g;

function detectCssImportantOverToken(ctx) {
  if (ctx.rel === 'app/globals.css') return [];
  const out = [];
  for (const m of ctx.code.matchAll(TOKEN_OWNED_PROPERTY)) {
    /* Find the selector this declaration sits under, and require it to be
       UNSCOPED — a descendant selector (`.tp-workspace .text-xs`) is a deliberate,
       bounded override and is the correct way to do this.

       `lastIndexOf('{', m.index)` and not `slice(0, m.index).lastIndexOf('{')`:
       the leading `(?:^|;|\{)` means that for the FIRST declaration in a block the
       match STARTS at the brace, so anything looking strictly before m.index finds
       the previous rule's brace or none at all. The strict form returned -1 and
       skipped every first-declaration hit — which is most of them, and which is
       exactly what the fixture caught on the first run of this rule. */
    const open = ctx.code.lastIndexOf('{', m.index);
    if (open < 0) continue;
    const before = ctx.code.slice(0, open);
    const selStart = Math.max(before.lastIndexOf('}'), before.lastIndexOf('{')) + 1;
    const selector = before.slice(selStart).trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue;
    /* A selector is SCOPED when it can only reach elements this codebase chose.
       Three ways to say that, and all three count:
         - a class or an id            `.tp-orderbook-select`, `.editable-content[contenteditable]`
         - a `data-` attribute         `[data-snapshot="true"]` — author-defined by construction
         - a descendant combinator     `[role="dialog"] input[type="text"]`
       Everything else is a bare element/native-attribute selector that reaches
       whatever the browser puts in front of it. That is the real danger and it
       was real here: the builder's `[contenteditable="true"] { border: none
       !important; background: transparent !important }` plus
       `[contenteditable="true"]:focus { box-shadow: none !important }` applied to
       the SHARED WYSIWYG primitive on every builder route, stripping its border,
       its ground, and the focus ring the design system defines through `--ring`.

       Both narrower definitions were tried and both cried wolf. "Has no space"
       flagged `.tp-orderbook-select` overriding itself — a local decision, not a
       reach. "Has no class or id" flagged `[data-snapshot="true"]`, which forces
       system fonts inside a screenshot container and is exactly as owned as a
       class. The union is the one that leaves only genuine reaches. */
    if (selector.split(',').every((s) => /[.#][A-Za-z_-]|\[data-|\s/.test(s.trim()))) continue;
    out.push({
      line: lineOf(m.index, ctx.nl),
      detail: `${m[1]} !important on unscoped \`${selector.slice(0, 48)}\` — outranks every token-driven rule`,
    });
  }
  return out;
}

/* ==========================================================================
   THE REGISTRY
   ========================================================================== */

const DIMENSIONS = [
  {
    id: 'palette', label: 'palette utilities', hint: 'bg-blue-500, hover:text-zinc-400',
    tier: 'ratchet', scope: 'code', detect: matcher(RE_PALETTE),
    fixture: {
      bad: ['<div className="bg-blue-500 text-slate-100" />', '<p className="hover:text-zinc-400" />', '<i className="border-l-green-500" />'],
      good: ['<div className="bg-primary text-foreground" />', 'const x = "my-custom-blue-500-thing";'],
    },
  },
  {
    id: 'dark-fork', label: 'dark: colour forks', hint: 'dark:bg-zinc-900 — delete, do not migrate',
    tier: 'ratchet', scope: 'code', detect: matcher(RE_DARK),
    fixture: {
      bad: ['<div className="dark:bg-zinc-900" />', '<div className="dark:text-white" />', '<div className="dark:bg-background" />'],
      /* R5's documented exemption: per-theme ALPHA on one token is a platform
         convention (~70 sites in components/ alone), not debt. Two independent
         reviewers read R5 in isolation and both concluded otherwise, which would
         have been a large, confidently wrong refactor. */
      good: ['<div className="bg-success/10 dark:bg-success/20" />', '<div className="ring-ring/10 dark:ring-ring/20" />',
        '<div className="dark:border-border-strong/50" />', '<div className="shadow-black/20 dark:shadow-black/40" />',
        '<div className="dark:shadow-none dark:border-2" />'],
    },
  },
  {
    id: 'fake-token', label: 'fake tokens', hint: 'text-muted-800, bg-danger-500 — compile to NOTHING',
    tier: 'ratchet', scope: 'code', detect: matcher(RE_FAKE_TOKEN),
    fixture: {
      bad: ['<div className="text-muted-800" />', '<div className="bg-success-500" />', '<div className="hover:border-primary-500" />'],
      /* `{2,3}` digits is what keeps the legitimate single-digit tokens safe. */
      good: ['<div className="text-chart-1 bg-surface-2 border-surface-3" />', '<div className="bg-muted text-destructive" />'],
    },
  },
  {
    id: 'runtime-class', label: 'runtime-built classes', hint: '`md:grid-cols-${n}` — never emitted',
    tier: 'ratchet', scope: 'code', detect: detectRuntimeClass,
    fixture: {
      bad: ['const c = `md:grid-cols-${n}`;', 'const c = `gap-${size}`;', 'const c = `text-${size}`;'],
      good: ['const k = `col${i}`;', 'const k = `sparkline-gradient-${i}`;', 'key={`left-${i}`}', 'const orderId = `order-${stamp}`;'],
    },
  },
  {
    id: 'class-conflict', label: 'class conflicts', hint: '"bg-card bg-muted" in one literal',
    tier: 'ratchet', scope: 'code', detect: detectClassConflict,
    fixture: {
      bad: ['<div className="p-4 bg-card bg-muted rounded-lg" />', '<div className="border-2 border-white border-border" />',
        '<div className="p-2 shadow-md shadow-shadow/10 shadow-shadow/20" />',
        // the multiline case the 400-char no-newline window could never see
        '<div className="w-full pl-12 rounded-lg border border-border border-border-strong\n bg-card text-foreground" />'],
      good: ['<div className="bg-card hover:bg-muted rounded-lg p-4" />', '<div className="border-transparent p-2 rounded-md" />',
        '<div className="p-2 shadow-shadow/10 dark:shadow-shadow/20" />'],
    },
  },
  {
    id: 'dead-paint', label: 'dead paint', hint: 'compiles but CANNOT paint',
    tier: 'ratchet', scope: 'code', detect: detectDeadPaint,
    fixture: {
      /* `muted-foreground` is deliberately the first sample. It exists ONLY in
         the compound `TOKEN` list, never in `TOKEN_BASE` and never in the
         hardcoded extras — so it is the one name that goes missing when the
         `.split('|')` on TOKEN_NAMES is dropped and the alternation collapses to
         single characters. A fixture of `var(--border)` alone does NOT catch
         that regression, because `border` is reachable through TOKEN_BASE and
         the rule keeps passing while blind to every compound token. Verified by
         re-injecting the historical bug: with only `var(--border)` here the
         self-test stayed green. */
      bad: ['<text fill="var(--muted-foreground)" />', '<rect fill="var(--card-foreground)" />',
        '<line stroke="var(--border)" />', '<stop stopColor="var(--primary)" />',
        'const s = `${gradient.from}40`;',
        '<div className="flex items-center bg-linear-to-br p-4 rounded-lg" />',
        '<div className="p-2 rounded-md hover:from-primary" />',
        '<span className="bg-success text-success px-2" />'],
      good: ['<line stroke="hsl(var(--border))" />', '<div style={{ color: "var(--color-primary)" }} />',
        '<div className="flex bg-linear-to-br from-primary to-secondary p-4" />',
        '<span className="bg-success text-success-foreground px-2" />',
        '<div className="flex bg-linear-to-br ${dynamicStops} p-4" />'],
    },
  },
  {
    id: 'card-shell', label: 'card-shell drift', hint: 'a radius or shadow that is not the Ledger shell',
    tier: 'ratchet', scope: 'code', detect: detectCardShell,
    fixture: {
      bad: ['<div className="bg-card rounded-2xl border border-border p-4" />',
        '<div className="bg-card rounded-lg border shadow-md p-4" />',
        'import { Card } from "@/components/ui/card";\n<Card className="border-border/40 shadow-sm" />',
        'import { Card } from "@/components/ui/card";\n<Card className="rounded-2xl overflow-hidden" />'],
      good: ['<div className="bg-card rounded-lg border border-border p-4" />',
        'import { Card } from "@/components/ui/card";\n<Card variant="elevated" className="shadow-lg" />',
        'import { Card } from "@/components/ui/card";\n<Card className="border-border/40" />',
        '<div className="fixed bg-card rounded-xl shadow-lg p-4" />',
        '<div className="bg-card rounded-full h-8 w-8" />',
        '<div className="bg-card rounded-sm h-7 w-7" />'],
    },
  },
  {
    id: 'card-interior', label: 'card-interior drift', hint: 'a corner blob, or a bare icon where a tile belongs',
    tier: 'ratchet', scope: 'code', detect: detectCardInterior,
    fixture: {
      bad: ['<div className="absolute bg-linear-to-br from-primary to-transparent rounded-full" />',
        '<div className="absolute bg-gradient-to-br from-primary to-transparent rounded-full" />',
        '<Activity className="h-4 w-4 text-muted-foreground" /></CardHeader>'],
      good: ['<div className="absolute bg-linear-to-br from-primary to-secondary rounded-full" />',
        '<div className="h-7 w-7 rounded-sm bg-primary/10 grid place-items-center"><Activity className="h-4 w-4 text-primary" /></div></CardHeader>'],
    },
  },
  {
    id: 'chart', label: 'chart drift', hint: 'inline tooltip style, pie outside-label, raw hex',
    tier: 'ratchet', scope: 'code', detect: detectChart,
    fixture: {
      bad: ['import { Pie } from "recharts";\n<Tooltip contentStyle={{ background: "x" }} />',
        'import { Pie } from "recharts";\n<Pie labelLine={false} />',
        'import { Legend } from "recharts";\n<Legend />',
        'import { Bar } from "recharts";\n<Bar fill="#8884d8" />'],
      good: ['<Tooltip content={<ChartTooltipContent />} />',
        // no recharts import: an inline SVG asset may legitimately carry a hex
        '<path fill="#8884d8" />'],
    },
  },
  {
    id: 'soft-chip-ink', label: 'soft-chip contrast', hint: 'bg-{tone}/N + text-{tone} at small type — fails AA',
    tier: 'ratchet', scope: 'code', detect: detectSoftChipInk,
    fixture: {
      bad: ['<span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-[11px] text-success" />',
        '<div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive" />',
        '<div className="bg-info/10 px-1.5 text-[10px] text-info rounded-full" />'],
      good: ['<span className="rounded-full bg-success/10 px-2 text-[11px] text-success-ink" />',
        // no type size in the literal: undecidable, and correct on an icon-only tile
        '<div className="rounded-md bg-destructive/10 p-2 text-destructive" />',
        // large type: AA's large-text allowance applies
        '<div className="bg-info/10 p-4 text-2xl text-info rounded-lg" />',
        // no -ink counterpart exists for muted, so there is nothing to migrate to
        '<div className="bg-muted/10 p-2 text-xs text-muted" />'],
    },
  },
  {
    id: 'css-colour', label: 'hardcoded colour in CSS', hint: 'a stylesheet outside every gate',
    tier: 'ratchet', scope: 'css', detect: detectCssHardcodedColour,
    fixture: {
      bad: ['.tab-active { color: #7c3aed; }', '.x:hover { box-shadow: 0 10px 20px rgb(0 0 0 / 0.1); }', '.y { background: rgba(12, 16, 22, 0.8); }'],
      good: ['.tab-active { color: hsl(var(--primary)); }',
        '.x:hover { box-shadow: 0 10px 20px hsl(var(--shadow) / 0.1); }',
        '.y { background: color-mix(in oklab, hsl(var(--card)) 80%, transparent); }',
        ':root { --primary: 217 91% 60%; }'],
    },
  },
  {
    id: 'z-scale', label: 'off-scale stacking order', hint: 'invent a number instead of naming a rung',
    /* RATCHET, not budget: the ladder landed and all 37 sites read it by name, so
       this is at zero and the only way to see a hit again is for somebody to
       invent a fifteenth number. That is exactly the regression worth failing on,
       and it is cheap to fix at the moment it happens rather than at census time. */
    tier: 'ratchet', scope: 'code', detect: detectZScale,
    fixture: {
      bad: ['<div className="fixed inset-0 z-[999]" />', '<div className="fixed z-[9999] p-2" />', '<div className="absolute z-[60] p-1" />'],
      good: ['<div className="fixed inset-0 z-50" />', '<div className="relative z-10 p-2" />', '<div className="fixed z-[50] p-2" />'],
    },
  },
  {
    id: 'token-killed-at-callsite', label: 'component token killed at call site',
    hint: 'a literal h-9 / p-6 that twMerge substitutes FOR the token',
    tier: 'budget', scope: 'code', detect: detectComponentTokenKilled,
    fixture: {
      bad: ['import { Button } from "@/components/ui/button";\n<Button size="icon" className="h-9 w-9 rounded-xl" />',
        'import { Input } from "@/components/ui/input";\n<Input className="pl-10 h-10 rounded-lg" />',
        'import { Card, CardContent } from "@/components/ui/card";\n<CardContent className="p-4">x</CardContent>',
        'import { DialogContent } from "@/components/ui/dialog";\n<DialogContent className="p-6">x</DialogContent>',
        // the multi-line form, which a line-based grep undercounts badly
        'import { Button } from "@/components/ui/button";\n<Button\n  variant="ghost"\n  size="sm"\n  className="h-8 px-2 text-xs"\n/>'],
      good: ['import { Button } from "@/components/ui/button";\n<Button size="icon" className="rounded-xl" />',
        // a variant prefix is a state override, not a base kill
        'import { Button } from "@/components/ui/button";\n<Button className="sm:h-8" />',
        // "remove it" — no multiplier can express zero
        'import { DialogContent } from "@/components/ui/dialog";\n<DialogContent className="p-0">x</DialogContent>',
        // a change of KIND, not of value
        'import { Button } from "@/components/ui/button";\n<Button className="h-auto py-4 flex-col" />',
        // one-axis override: twMerge keeps BOTH, so the token survives
        'import { CardContent } from "@/components/ui/card";\n<CardContent className="py-16">x</CardContent>',
        // Badge has no padding token, so nothing is killed
        'import { Badge } from "@/components/ui/badge";\n<Badge className="px-4 py-2">x</Badge>',
        // already tokenised
        'import { Button } from "@/components/ui/button";\n<Button className="h-[calc(2rem*var(--control-height-scale))]" />',
        // no primitive import: a local <Button> of someone else’s
        '<Button className="h-9 px-4" />'],
    },
  },
  {
    id: 'undeclared-token', label: 'undeclared custom property', hint: 'var(--typo) in a class — computes to nothing',
    tier: 'ratchet', scope: 'code', detect: detectUndeclaredCustomProp,
    fixture: {
      bad: ['<div className="z-[var(--z-doesnotexist)] fixed inset-0" />',
        '<div className="bg-[var(--no-such-token)] p-2 rounded" />'],
      good: ['<div className="z-[var(--z-overlay)] fixed inset-0" />',
        '<div className="border-[length:var(--card-border-width)] p-2 rounded" />',
        '<div className="text-[var(--tp-text-muted)] p-2 rounded" />',
        // a fallback makes it safe by construction
        '<div className="text-[var(--not-declared,currentColor)] p-2 rounded" />',
        // set from JS on the same element, so it IS declared — just not in CSS
        '<div style={{ "--local-w": w }} className="w-[var(--local-w)] p-2" />',
        // Radix writes these on the popper at runtime; declaring them would break it
        '<div className="w-[var(--radix-select-trigger-width)] p-2 rounded" />',
        // Tailwind declares its own internals and built-in theme keys
        '<div className="shadow-[var(--tw-shadow)] p-2 rounded" />',
        '<div className="p-[calc(var(--spacing)*2)] rounded" />'],
    },
  },
  {
    id: 'primitive-bypass', label: 'primitive bypass', hint: 'the same object, re-typed by hand',
    tier: 'budget', scope: 'code', detect: detectPrimitiveBypass,
    fixture: {
      bad: ['<div className="bg-card rounded-lg border border-border p-3">x</div>',
        '<button className="px-4 py-2 rounded-md bg-primary text-primary-foreground">Go</button>',
        '<span className="rounded-full px-2 py-0.5 text-xs bg-success/10">Live</span>',
        '<div className="fixed inset-0 z-[999] bg-overlay/70 backdrop-blur-sm" />'],
      good: ['<Card className="p-3">x</Card>',
        // HTML-as-data: `class`, not `className`, and usually in a .ts file
        '<div class="p-6 bg-card rounded-lg border border-border">x</div>',
        '<div className="bg-card p-3">no border, no radius — a ground, not a card</div>',
        '<button className="text-muted-foreground hover:text-foreground">bare control</button>',
        '<div className="bg-card rounded-full h-8 w-8 border border-border" />'],
    },
  },
  {
    id: 'off-ledger-elevation', label: 'off-Ledger elevation', hint: 'R3 puts depth in the surface ramp, not a shadow',
    tier: 'budget', scope: 'code', detect: detectOffLedgerElevation,
    fixture: {
      bad: ['<div className="rounded-lg border border-border p-4 shadow-sm" />',
        '<div className="flex items-center gap-2 p-3 shadow-lg rounded-md" />'],
      good: ['<div className="fixed rounded-lg p-4 shadow-lg" />',
        '<div className="absolute p-2 shadow-md rounded-md" />',
        '<div className="rounded-lg p-4 shadow-none border border-border" />',
        '<div className="bg-card rounded-lg border p-4 shadow-sm" />',
        '<div className="p-2 backdrop-blur-sm shadow-lg rounded-md" />'],
    },
  },
  {
    id: 'unregistered-shadow', label: 'unregistered shadow step', hint: 'drop-shadow-lg paints Tailwind’s literal black',
    tier: 'ratchet', scope: 'code', detect: detectUnregisteredShadow,
    /* The `bad` samples used to be `drop-shadow-lg` / `drop-shadow-sm`. Both
       became LEGITIMATE the moment `--drop-shadow-*` was registered in
       globals.css to fix the eleven real sites — and the self-test caught the
       stale fixture on the very next run, which is the behaviour it exists for.
       `text-shadow-*` is the namespace Tailwind ships and this stylesheet still
       does not declare, so it is the honest known-bad today. If someone later
       registers `--text-shadow-*`, this fixture goes red and has to be moved
       again; that is correct, and cheap. */
    fixture: {
      bad: ['<h1 className="text-4xl font-bold text-overlay-foreground text-shadow-lg" />',
        '<h2 className="text-xl font-bold text-shadow-sm p-2" />'],
      good: ['<div className="rounded-lg border p-4 shadow-md" />',
        '<div className="rounded-lg border p-4 inset-shadow-sm" />',
        '<h1 className="text-4xl font-bold drop-shadow-lg" />',
        '<div className="p-2 rounded-md shadow-none" />',
        '<div className="p-2 rounded-md shadow-shadow/10" />'],
    },
  },
  {
    id: 'mismatched-ink', label: 'mismatched tonal ink', hint: 'bg-success + text-primary-foreground',
    tier: 'ratchet', scope: 'code', detect: detectMismatchedTonalInk,
    fixture: {
      bad: ['<div className="rounded-md p-2 bg-success text-primary-foreground" />',
        '<div className="rounded-md p-2 bg-warning text-primary-foreground border-0" />'],
      good: ['<div className="rounded-md p-2 bg-success text-success-foreground" />',
        '<div className="text-muted-foreground bg-muted hover:bg-primary border p-2" />',
        '<div className="rounded-lg p-4 bg-card text-muted-foreground" />',
        '<div className="rounded-lg p-4 bg-muted text-card-foreground" />',
        // no --up-foreground / --down-foreground exists, so there is nothing to migrate to
        '<div className="rounded p-1 bg-up text-primary-foreground" />'],
    },
  },
  {
    id: 'animate-delay', label: 'delay on an animation', hint: 'delay-* needs a transition; use animate-delay-*',
    tier: 'ratchet', scope: 'code', detect: detectAnimateDelayPairing,
    fixture: {
      bad: ['<div className="absolute rounded-full animate-pulse delay-1000 h-32 w-32" />',
        '<div className="animate-bounce delay-150 p-2 rounded-md" />'],
      good: ['<div className="animate-pulse h-32 w-32 rounded-full" />',
        '<div className="transition-opacity delay-150 animate-in p-2" />',
        '<div className="animate-pulse animate-delay-1000 h-32 w-32 rounded-full" />',
        '<div className="duration-300 delay-150 animate-in p-2 rounded" />'],
    },
  },
  {
    id: 'dead-badge-variant', label: 'dead badge variant', hint: 'a chip colour name that does not exist — falls through to grey',
    tier: 'ratchet', scope: 'code', detect: detectDeadBadgeVariant,
    fixture: {
      bad: ['const c = { render: { type: "badge", config: { variant: (v) => ({ FIXED_PRICE: "blue", AUCTION: "purple" })[v] } } };',
        'const c = { render: { type: "badge", config: { variant: "outline" } } };'],
      good: ['const c = { render: { type: "badge", config: { variant: "success" } } };',
        'const c = { render: { type: "badge", config: { variant: (v) => (v ? "success" : "muted"), label: (v) => (v ? t("active") : t("inactive")) } } };',
        'const c = { render: { type: "badge", config: { variant: (v) => { switch (v) { case "DEPOSIT": return "success"; } } } } };',
        'const c = { render: { type: "badge", config: { variant: (v) => (v === "OPEN" ? "success" : "muted") } } };',
        // an unrelated config object that also has a `variant` key
        'const art = { type: "pattern", config: { variant: "crosses" } };'],
    },
  },
  {
    id: 'off-ramp-radius', label: 'off-ramp corner radius', hint: 'rounded-[14px] cannot follow --radius',
    tier: 'ratchet', scope: 'code', detect: detectOffRampRadius,
    fixture: {
      bad: ['<div className="border p-2 rounded-[14px]" />',
        '<div className="grid h-4 w-4 place-items-center rounded-[4px] border" />',
        '<div className="inline-block h-3 w-3 rounded-[2px] border" />'],
      good: ['<div className="border p-2 rounded-lg" />',
        // above the ramp ceiling: a device bezel, i.e. a drawing of a phone
        '<div className="border-8 border-border p-4 rounded-[32px]" />',
        '<div className="h-full w-full rounded-[4rem] bg-primary/20" />',
        '<div className="p-2 rounded-[calc(var(--radius-xl)*var(--table-radius-scale))]" />',
        '<div className="overflow-hidden rounded-[inherit] p-2" />'],
    },
  },
  {
    id: 'css-utility-shadow', label: 'CSS redefines a utility', hint: '.text-right in an author stylesheet overrules Tailwind',
    /* BUDGET, not ratchet, and the reason is scope rather than doubt. Every hit
       is real — `.text-left` in the builder's stylesheet genuinely overrules
       Tailwind for every shared component on those routes. But clearing them
       means renaming the classes AND editing the builder markup that applies
       them, which is a behavioural change to the page builder, not a lint fix.
       Recorded so it cannot grow while somebody decides. */
    tier: 'ratchet', scope: 'css', detect: detectCssUtilityShadow,
    fixture: {
      bad: ['.text-left { text-align: left !important; }', '.rounded-lg, .rounded-md { border-radius: 2px; }'],
      good: ['.tp-workspace .text-xs { font-size: calc(0.75rem * var(--tp-font-scale)); }',
        '.text-element, .text-element-wrapper { padding: 2px; }',
        '.transition-height { transition-property: height; }',
        '.h-safe-area-inset-bottom { height: env(safe-area-inset-bottom); }',
        '.builder-canvas { padding: 1rem; }',
        '.custom-tab-active { color: hsl(var(--primary)); }'],
    },
  },
  {
    id: 'css-important', label: 'unscoped !important on a token property', hint: 'outranks every token-driven rule',
    /* BUDGET for the same reason as `css-utility-shadow` above: the `:focus`
       `box-shadow: none !important` in the builder erases the design system's
       focus ring, which is a real accessibility regression and a real fix — but
       it is a fix to the builder's editing surface, not a token swap. */
    tier: 'ratchet', scope: 'css', detect: detectCssImportantOverToken,
    fixture: {
      bad: ['[contenteditable="true"] { border: none !important; }',
        'a:focus { box-shadow: none !important; }',
        'input[type="text"] { background: transparent !important; }'],
      good: ['.tp-workspace .text-xs { color: hsl(var(--foreground)) !important; }',
        '.editable-content[contenteditable="true"] { border: none !important; }',
        '.tp-orderbook-select { font-size: 11px !important; }',
        '[data-snapshot="true"] { font-family: system-ui !important; }',
        '[role="dialog"] input[type="text"] { font-size: max(16px, 1rem) !important; }',
        '.widget { width: 100% !important; height: auto !important; }',
        '[data-radix-popper-content-wrapper] { max-width: 100% !important; }',
        '.thing { border: 1px solid hsl(var(--border)); }'],
    },
  },
  {
    id: 'arbitrary-hex', label: 'arbitrary hex', hint: 'bg-[#ff0000] — 4 remain, all documented brand colours',
    tier: 'report', scope: 'code', detect: matcher(RE_ARBITRARY_HEX),
    fixture: {
      bad: ['<div className="bg-[#1DA1F2]" />', '<div className="text-[#25D366]" />'],
      good: ['<div className="bg-primary" />', '<div className="bg-[hsl(var(--card))]" />'],
    },
  },
];

module.exports = {
  DIMENSIONS,
  stripComments,
  stripCssComments,
  lineIndex,
  lineOf,
  tokenBase,
  classLiterals,
  classify,
};
