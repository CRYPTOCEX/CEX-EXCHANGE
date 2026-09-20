/**
 * Single source of truth for the design-system ratchet patterns.
 *
 * Required by BOTH eslint.config.js (developer feedback) and
 * scan-design-debt.js (CI gate + baseline generation). They must never drift:
 * a scanner narrower than the rule produces a baseline that leaves CI red, and
 * a scanner wider than the rule fails on debt nobody can see in their editor.
 */
'use strict';

/** Tailwind palette families — never allowed, always a hardcoded colour. */
const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|' +
  'teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';

/**
 * Utilities that can carry a colour.
 *
 * `border` takes an optional side suffix. Without it the rule never saw
 * `border-l-green-500`, and 85 of them were sitting in the codebase unflagged —
 * the left-accent stripe is a favourite here, so the miss was systematic rather
 * than incidental. Same for `divide-x/y`.
 */
const UTIL =
  'bg|text|border(?:-[tblrxyse])?|from|to|via|ring|shadow|decoration|outline|' +
  'divide(?:-[xy])?|placeholder|accent|caret|fill|stroke';

/**
 * Design tokens. Listed longest-first so `muted-foreground` wins over `muted`.
 * These are only used by the dark: rule — a token is correct on its own, it is
 * only wrong behind a `dark:` variant, because tokens are already theme-aware.
 */
const TOKEN = [
  'card-foreground', 'popover-foreground', 'primary-foreground',
  'secondary-foreground', 'muted-foreground', 'subtle-foreground',
  'accent-foreground', 'destructive-foreground', 'success-foreground',
  'warning-foreground', 'info-foreground', 'border-strong',
  'surface-2', 'surface-3', 'chart-[1-6]',
  'background', 'foreground', 'card', 'popover', 'primary', 'secondary',
  'muted', 'accent', 'destructive', 'success', 'warning', 'info',
  'border', 'input', 'ring', 'up', 'down',
].join('|');

/**
 * What counts as a colour behind `dark:`. Deliberately an ALLOWLIST, and
 * narrowed twice after real false positives:
 *
 *  1. An earlier version banned `dark:` + any colour-capable utility, which hit
 *     `dark:shadow-none`, `dark:text-sm`, `dark:border-2` — none are colours.
 *
 *  2. A token with an EXPLICIT ALPHA is allowed behind `dark:`, because the
 *     same token at a different opacity per theme is a real design need, not
 *     debt: `ring-ring/10 dark:ring-ring/20` (a focus ring reads weaker on a
 *     dark ground) and `bg-muted/50 dark:bg-muted/30`. A BARE token is still
 *     flagged — `bg-background dark:bg-background` is pure redundancy.
 *
 *  3. The token guard must be `(?![-\w/])`, not `(?!\/)`. Listing tokens
 *     longest-first is NOT enough on its own, because the regex BACKTRACKS: in
 *     `dark:border-border-strong/50` the alternation first matches
 *     `border-strong`, fails the `/` guard, retries the shorter `border`, and
 *     that one passes because its next character is `-`. The result was a false
 *     positive reading `dark:border-border` out of a compound token — and it hit
 *     precisely the alpha'd compounds (`dark:border-border-strong/50`,
 *     `dark:text-muted-foreground/70`) that rule 2 exists to allow.
 *
 *  4. `white` and `black` get the SAME alpha guard as a token, for the same
 *     reason. `shadow-black/20 dark:shadow-black/40` is a shadow that has to
 *     read harder on a dark ground — per-theme opacity on one colour, which is
 *     rule 2 exactly. Without the guard the rule flagged it while allowing the
 *     identical construction on a token, and there is no shadow token to
 *     migrate it to. A BARE `dark:text-white` is still flagged.
 *
 * A ratchet that cries wolf gets switched off, so precision matters more here
 * than catching every last case.
 */
const COLOUR_VALUE =
  `(?:${PALETTE})-[0-9]{2,3}|(?:white|black|${TOKEN})(?![-\\w/])`;

/**
 * Hardcoded palette colour anywhere, e.g. `bg-blue-500`, `hover:text-zinc-400`.
 *
 * The negative lookbehind is load-bearing twice over: without it
 * `my-custom-blue-500` false-positives, and an anchor-alternation such as
 * (^|[\s:'"`]) MISSES `bg-blue-500` in the middle of a className string, which
 * is where most of them live.
 */
const BANNED_PALETTE = `(?<![-\\w])(?:${UTIL})-(?:${PALETTE})-[0-9]{2,3}`;

/** `dark:` colour variant — a deletion, not a migration (DESIGN-SYSTEM.md R5). */
const BANNED_DARK = `(?<![-\\w])dark:(?:${UTIL})-(?:${COLOUR_VALUE})`;

/**
 * Token BASE names — the flat tokens, without their `-foreground` compounds.
 * `danger` is in the list precisely because it is NOT a token: it is the name
 * people reach for when they mean `destructive`, and `bg-danger-500` looks
 * enough like a token to survive review.
 */
const TOKEN_BASE =
  'background|foreground|card|popover|primary|secondary|muted|accent|' +
  'destructive|success|warning|info|danger|border|input|ring|surface|up|down|overlay';

/**
 * "Fake token" — a token name with a Tailwind numeric ramp step on it, e.g.
 * `text-muted-800`, `bg-success-500`, `hover:border-primary-500`.
 *
 * This design system's colour tokens are FLAT. There is no `--color-muted-800`,
 * so these compile to NOTHING and the element silently loses that style. They
 * are invisible to the palette rule above (they are not `zinc-800`) and to
 * review (they read like tokens), which is how 283 of them accumulated across
 * 12 files — including a status badge that rendered unstyled in six of its
 * seven branches.
 *
 * `{2,3}` digits is deliberate: it must NOT match the legitimate single-digit
 * tokens `chart-1`..`chart-6`, `surface-2` and `surface-3`.
 */
const BANNED_FAKE_TOKEN =
  `(?<![-\\w])(?:${UTIL})-(?:${TOKEN_BASE})-[0-9]{2,3}`;

/**
 * Tailwind class names assembled at runtime, e.g. `` `md:grid-cols-${n}` ``.
 *
 * Tailwind discovers classes by scanning source TEXT, so an interpolated class
 * is never emitted. This always fails silently — the element just doesn't get
 * the style — and it hit `StatsGrid` (every stats grid pinned to 2 columns),
 * the multi-month calendar, and two page-builder elements.
 *
 * The prefix list is explicit rather than "any word before `${`" so that
 * template literals which are not class names — `` `col${i}` ``,
 * `` `sparkline-gradient-${i}` `` — do not trip it.
 */
const RUNTIME_CLASS_PREFIX =
  'grid-cols|grid-rows|col-span|row-span|col-start|row-start|gap|gap-x|gap-y|' +
  'p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|' +
  'w|h|min-w|min-h|max-w|max-h|basis|order|z|opacity|' +
  'top|left|right|bottom|inset|space-x|space-y|divide-x|divide-y|' +
  'text|bg|border|rounded|shadow|ring|from|via|to|' +
  'translate-x|translate-y|scale|rotate|delay|duration|leading|tracking';

const BANNED_RUNTIME_CLASS =
  `(?<![-\\w])(?:[a-z0-9-]+:)*(?:${RUNTIME_CLASS_PREFIX})-\\$\\{`;

/**
 * The SAME rule, shaped for ESLint's AST — and it has to be a second pattern.
 *
 * `BANNED_RUNTIME_CLASS` looks for the literal characters `${`, which is right
 * for a scanner reading raw file text. ESLint does not see them: a template
 * literal is already parsed, and `TemplateElement.value.raw` holds only the
 * chunk BETWEEN interpolations, with the `${` stripped by the parser. So the
 * text pattern can never match a TemplateElement and the ESLint rule was silently
 * inert — it reported nothing on `` `md:grid-cols-${n}` ``, verified against the
 * real config.
 *
 * A quiet no-op rule is the same failure as a scanner that reports zero, and it
 * is worth stating plainly here because "keep the two patterns identical" is the
 * instruction at the top of this file. They must stay EQUIVALENT; identical is
 * not always available.
 *
 * The AST form anchors at end-of-chunk instead: a chunk ending in `grid-cols-`
 * is a chunk that stops exactly where an interpolation begins. A trailing bare
 * `-` after a utility prefix has no other legitimate meaning in a class string.
 */
const BANNED_RUNTIME_CLASS_AST =
  `(?<![-\\w])(?:[a-z0-9-]+:)*(?:${RUNTIME_CLASS_PREFIX})-$`;

module.exports = {
  PALETTE,
  UTIL,
  TOKEN,
  TOKEN_BASE,
  BANNED_PALETTE,
  BANNED_DARK,
  BANNED_FAKE_TOKEN,
  BANNED_RUNTIME_CLASS,
  BANNED_RUNTIME_CLASS_AST,
};
