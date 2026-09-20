/**
 * DESIGN THEME — the contract behind the admin design manager.
 * ============================================================================
 *
 * Everything the platform paints with resolves through a CSS custom property
 * declared in `app/globals.css` (see `plans/DESIGN-SYSTEM.md`, Phases 0-19).
 * This file is the machine-readable description of that token set: what each
 * one is, what a legal value looks like, and how a saved override becomes CSS.
 *
 * It is imported by BOTH the server (to inline the theme during SSR) and the
 * admin panel (to render the editor), so it must stay free of any React or
 * Node-only import.
 *
 * ---------------------------------------------------------------------------
 * THREE RULES THIS FILE EXISTS TO ENFORCE
 * ---------------------------------------------------------------------------
 *
 * 1. VALIDATE, ALWAYS. These values are written by an administrator and end up
 *    inside a `<style>` element. A value of `red} .x{display:none` or
 *    `red</style><script>` would otherwise be a stored-XSS and a defacement
 *    vector in one. Every token therefore has a `kind`, every kind has a strict
 *    pattern, and `buildThemeCss()` DROPS anything that fails rather than
 *    escaping it — a malformed colour is a bug in the editor, and silently
 *    rendering the default is the safe failure.
 *
 * 2. STORE DIFFS, NOT SNAPSHOTS. A saved theme records only the tokens the
 *    owner actually changed. If we stored all 41, a later improvement to a
 *    default (say the light-mode contrast pass of Phase 13) would never reach
 *    any site that had ever opened the panel.
 *
 * 3. DEFAULTS LIVE IN CSS, NOT HERE. `DEFAULTS` below is a mirror of the
 *    `:root` / `.dark` blocks in globals.css, used to seed the editor's inputs
 *    and to detect "same as default". It is deliberately NOT what renders — the
 *    stylesheet is. `pnpm design:verify-tokens` re-reads globals.css and fails
 *    if the two drift.
 */

import { DEFAULT_BASE, DEFAULT_THEMED } from "./design-theme-defaults";

export type TokenKind =
  | "color" // an HSL triple, e.g. "217 91% 60%" — no hsl() wrapper
  | "length" // "0.25rem", "4px"
  | "scale" // unitless multiplier, "1", "0.5"
  | "weight" // a CSS font-weight keyword number, 100-900 in steps of 100
  | "easing" // a cubic-bezier()/steps() curve, from a pattern
  | "linejoin" // an SVG stroke-linejoin keyword
  | "linecap" // an SVG stroke-linecap keyword
  | "font"; // an id from FONT_STACKS

export type TokenGroup =
  | "surface"
  | "brand"
  | "status"
  | "market"
  | "chart"
  | "shape"
  | "type"
  | "depth"
  | "motion"
  /* Component geometry — see plans/COMPONENT-SYSTEM.md. Everything above is a
     global primitive; these are scoped to one component family each. They are
     a separate set of GROUPS rather than a separate registry so they inherit
     validation, diff storage, SSR emission, live-update, import/export and the
     `gen-design-defaults --check` ratchet without any of it being rebuilt. */
  | "table"
  | "control"
  | "card"
  | "form"
  | "dataviz";

export interface TokenDef {
  /** CSS custom property name, including the leading `--`. */
  name: string;
  label: string;
  group: TokenGroup;
  kind: TokenKind;
  /**
   * True when the token carries a separate value per colour scheme. A themed
   * token is edited twice (light and dark) and emitted into both `:root` and
   * `.dark`. Radius and motion are deliberately NOT themed: a theme changes
   * what the interface looks like, not its geometry or its speed.
   */
  themed: boolean;
  /** The token that sits ON this one, for the contrast check. */
  on?: string;
  help?: string;
}

/* ==========================================================================
   VALIDATION
   ========================================================================== */

/** `H S% L%` with optional decimals. Rejects `hsl(...)`, hex, and anything else. */
const COLOR_RE =
  /^(?:360(?:\.0+)?|3[0-5]\d(?:\.\d+)?|[12]?\d?\d(?:\.\d+)?)\s+(?:100(?:\.0+)?|\d{1,2}(?:\.\d+)?)%\s+(?:100(?:\.0+)?|\d{1,2}(?:\.\d+)?)%$/;
const LENGTH_RE = /^(?:0|\d{1,3}(?:\.\d{1,3})?)(?:px|rem|em)$/;
const SCALE_RE = /^(?:0(?:\.\d{1,3})?|[1-4](?:\.\d{1,3})?|5)$/;
/* `font-weight` as a number, 100-900 in hundreds. Deliberately NOT accepting
   `bold`/`normal`: the keywords are aliases for 700/400, so allowing both would
   make two different stored values mean the same thing and break "is this the
   default?" — the editor would show an override where none exists. Numeric-only
   also keeps the control a slider rather than a mixed slider-and-keyword. */
const WEIGHT_RE = /^[1-9]00$/;
const EASING_RE =
  /^(?:linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier\(\s*-?\d(?:\.\d+)?\s*,\s*-?\d(?:\.\d+)?\s*,\s*-?\d(?:\.\d+)?\s*,\s*-?\d(?:\.\d+)?\s*\)|steps\(\s*\d{1,2}\s*(?:,\s*(?:start|end|jump-(?:start|end|none|both))\s*)?\))$/;
/* SVG stroke keywords, deliberately narrowed to the three each property has had
   universal support for. `miter-clip` and `arcs` are real `stroke-linejoin`
   values in SVG 2 but no shipping engine implements them, so offering them
   would let an owner pick a setting that silently does nothing. */
const LINEJOIN_RE = /^(?:miter|round|bevel)$/;
const LINECAP_RE = /^(?:butt|round|square)$/;

export function isValidTokenValue(kind: TokenKind, value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > 120) return false;
  // Belt and braces: nothing that could terminate a declaration or a <style>.
  if (/[;{}<>\\]/.test(v)) return false;
  /* ASCII-printable only.
     ------------------------------------------------------------------------
     The patterns below separate components with JS `\s`, which matches 16+ code
     points, while CSS whitespace is exactly space, tab, LF, FF and CR. So a
     value like `217 91% 60%` (a NON-BREAKING SPACE instead of a space)
     passed validation and was emitted verbatim — and the browser then rejected
     the whole declaration, so the token computed to nothing and the surface it
     painted went transparent. 43 of the 45 tokens were affected; only
     `--radius` was immune.

     Not an injection — `CSS.supports` returns false and nothing executes — but a
     defacement an owner could trigger by pasting a value, and reachable through
     the panel's Import with no API access at all. Rejecting anything outside
     printable ASCII closes the whole class rather than the one code point. */
  if (/[^\x20-\x7E]/.test(v)) return false;
  switch (kind) {
    case "color":
      return COLOR_RE.test(v);
    case "length":
      return LENGTH_RE.test(v);
    case "scale":
      return SCALE_RE.test(v);
    case "weight":
      return WEIGHT_RE.test(v);
    case "easing":
      return EASING_RE.test(v);
    case "linejoin":
      return LINEJOIN_RE.test(v);
    case "linecap":
      return LINECAP_RE.test(v);
    case "font":
      return Object.prototype.hasOwnProperty.call(FONT_STACKS, v);
    default:
      return false;
  }
}

/* ==========================================================================
   FONTS

   The families are self-hosted from `public/fonts/` and declared in
   `app/fonts.css` (generated — see `scripts/vendor-fonts.mjs`), so a family
   costs disk but NOT runtime bytes: the browser fetches a woff2 only when
   something actually renders in that family. No optional family is preloaded,
   so each exposes a CSS variable that is present but unused — and unfetched —
   until the owner selects it.

   The `system` entries cost nothing at all and are always safe.
   ========================================================================== */

export interface FontStack {
  id: string;
  label: string;
  /** What `--font-sans` / `--font-mono` is set to. */
  stack: string;
  category: "sans" | "serif" | "mono";
  /** A one-line description of the voice, shown in the picker. */
  note: string;
}

const SYS_SANS =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const SYS_SERIF = "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";
const SYS_MONO =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace";

export const FONT_STACKS: Record<string, FontStack> = {
  geist: {
    id: "geist",
    label: "Geist",
    stack: `var(--font-geist-sans, ui-sans-serif), ${SYS_SANS}`,
    category: "sans",
    note: "The default. Neutral, tight, built for interfaces.",
  },
  inter: {
    id: "inter",
    label: "Inter",
    stack: `var(--font-inter, ui-sans-serif), ${SYS_SANS}`,
    category: "sans",
    note: "The workhorse UI sans. Safe, legible at small sizes.",
  },
  manrope: {
    id: "manrope",
    label: "Manrope",
    stack: `var(--font-manrope, ui-sans-serif), ${SYS_SANS}`,
    category: "sans",
    note: "Rounded geometric. Warmer and friendlier than Geist.",
  },
  jakarta: {
    id: "jakarta",
    label: "Plus Jakarta Sans",
    stack: `var(--font-jakarta, ui-sans-serif), ${SYS_SANS}`,
    category: "sans",
    note: "Wide apertures, humanist. Reads well at display sizes.",
  },
  outfit: {
    id: "outfit",
    label: "Outfit",
    stack: `var(--font-outfit, ui-sans-serif), ${SYS_SANS}`,
    category: "sans",
    note: "Geometric and confident. Strong for headings.",
  },
  plex: {
    id: "plex",
    label: "IBM Plex Sans",
    stack: `var(--font-plex, ui-sans-serif), ${SYS_SANS}`,
    category: "sans",
    note: "Engineered, slightly technical. Suits data-heavy screens.",
  },
  spaceGrotesk: {
    id: "spaceGrotesk",
    label: "Space Grotesk",
    stack: `var(--font-space-grotesk, ui-sans-serif), ${SYS_SANS}`,
    category: "sans",
    note: "Quirky grotesque with unusual details. Distinctive.",
  },
  sourceSerif: {
    id: "sourceSerif",
    label: "Source Serif 4",
    stack: `var(--font-source-serif, ui-serif), ${SYS_SERIF}`,
    category: "serif",
    note: "An editorial voice. Turns a product into a publication.",
  },
  system: {
    id: "system",
    label: "System UI",
    stack: SYS_SANS,
    category: "sans",
    note: "Whatever the visitor's OS uses. Zero bytes, native feel.",
  },
  systemSerif: {
    id: "systemSerif",
    label: "System Serif",
    stack: SYS_SERIF,
    category: "serif",
    note: "Georgia and friends. Zero bytes.",
  },
  jetbrains: {
    id: "jetbrains",
    label: "JetBrains Mono",
    stack: `var(--font-jetbrains-mono, ui-monospace), ${SYS_MONO}`,
    category: "mono",
    note: "The default for prices and balances. Tall digits, clear zero.",
  },
  geistMono: {
    id: "geistMono",
    label: "Geist Mono",
    stack: `var(--font-geist-mono, ui-monospace), ${SYS_MONO}`,
    category: "mono",
    note: "Matches Geist. Quieter than JetBrains.",
  },
  systemMono: {
    id: "systemMono",
    label: "System Mono",
    stack: SYS_MONO,
    category: "mono",
    note: "SF Mono / Consolas. Zero bytes.",
  },
};

/* ==========================================================================
   THE TOKEN SET
   ========================================================================== */

export const TOKENS: TokenDef[] = [
  /* ---- surface ramp ---- */
  { name: "--background", label: "Page", group: "surface", kind: "color", themed: true, on: "--foreground", help: "The furthest-back surface." },
  { name: "--foreground", label: "Page ink", group: "surface", kind: "color", themed: true },
  { name: "--card", label: "Card", group: "surface", kind: "color", themed: true, on: "--card-foreground", help: "One step nearer than the page. Elevation is this ramp, never a gradient." },
  { name: "--card-foreground", label: "Card ink", group: "surface", kind: "color", themed: true },
  { name: "--surface-2", label: "Surface 2", group: "surface", kind: "color", themed: true, help: "Raised panels inside a card." },
  { name: "--surface-3", label: "Surface 3", group: "surface", kind: "color", themed: true },
  { name: "--popover", label: "Popover", group: "surface", kind: "color", themed: true, on: "--popover-foreground" },
  { name: "--popover-foreground", label: "Popover ink", group: "surface", kind: "color", themed: true },
  { name: "--muted", label: "Muted", group: "surface", kind: "color", themed: true, on: "--muted-foreground" },
  { name: "--muted-foreground", label: "Muted ink", group: "surface", kind: "color", themed: true },
  { name: "--subtle-foreground", label: "Subtle ink", group: "surface", kind: "color", themed: true, help: "Labels and axis ticks. Must still clear 4.5:1." },
  { name: "--border", label: "Border", group: "surface", kind: "color", themed: true },
  { name: "--border-strong", label: "Border strong", group: "surface", kind: "color", themed: true },
  { name: "--input", label: "Input border", group: "surface", kind: "color", themed: true },
  { name: "--overlay", label: "Scrim", group: "surface", kind: "color", themed: true, on: "--overlay-foreground", help: "Dark in BOTH themes on purpose — it sits over photographs, not over the page." },
  { name: "--overlay-foreground", label: "Scrim ink", group: "surface", kind: "color", themed: true },

  /* ---- brand ---- */
  { name: "--primary", label: "Accent", group: "brand", kind: "color", themed: true, on: "--primary-foreground", help: "The accent means INTERACTIVE. Keep the same hue in both themes." },
  { name: "--primary-foreground", label: "Accent ink", group: "brand", kind: "color", themed: true },
  { name: "--secondary", label: "Secondary", group: "brand", kind: "color", themed: true, on: "--secondary-foreground" },
  { name: "--secondary-foreground", label: "Secondary ink", group: "brand", kind: "color", themed: true },
  { name: "--accent", label: "Hover wash", group: "brand", kind: "color", themed: true, on: "--accent-foreground", help: "The tint a row or menu item takes on hover." },
  { name: "--accent-foreground", label: "Hover ink", group: "brand", kind: "color", themed: true },
  { name: "--ring", label: "Focus ring", group: "brand", kind: "color", themed: true, help: "Keyboard focus. Must stay visible against every surface." },

  /* ---- status ---- */
  { name: "--success", label: "Success", group: "status", kind: "color", themed: true, on: "--success-foreground" },
  { name: "--success-foreground", label: "Success ink", group: "status", kind: "color", themed: true },
  { name: "--warning", label: "Warning", group: "status", kind: "color", themed: true, on: "--warning-foreground" },
  { name: "--warning-foreground", label: "Warning ink", group: "status", kind: "color", themed: true },
  { name: "--destructive", label: "Destructive", group: "status", kind: "color", themed: true, on: "--destructive-foreground" },
  { name: "--destructive-foreground", label: "Destructive ink", group: "status", kind: "color", themed: true },
  { name: "--info", label: "Info", group: "status", kind: "color", themed: true, on: "--info-foreground" },
  { name: "--info-foreground", label: "Info ink", group: "status", kind: "color", themed: true },

  /* ---- market direction ---- */
  { name: "--up", label: "Up", group: "market", kind: "color", themed: true, help: "Price direction. Deliberately separate from Success, which is operation status." },
  { name: "--down", label: "Down", group: "market", kind: "color", themed: true },

  /* ---- categorical chart ramp ---- */
  { name: "--chart-1", label: "Series 1", group: "chart", kind: "color", themed: true },
  { name: "--chart-2", label: "Series 2", group: "chart", kind: "color", themed: true },
  { name: "--chart-3", label: "Series 3", group: "chart", kind: "color", themed: true },
  { name: "--chart-4", label: "Series 4", group: "chart", kind: "color", themed: true },
  { name: "--chart-5", label: "Series 5", group: "chart", kind: "color", themed: true },
  { name: "--chart-6", label: "Series 6", group: "chart", kind: "color", themed: true },

  /* ---- geometry ---- */
  { name: "--radius", label: "Corner radius", group: "shape", kind: "length", themed: false, help: "Anchors the whole ramp — xs through 4xl are all derived from this one value, so 2,106 surfaces move together." },
  { name: "--icon-join", label: "Icon corners", group: "shape", kind: "linejoin", themed: false, help: "How a stroke turns a corner inside an icon. Follows the radius unless pinned." },
  { name: "--icon-cap", label: "Icon line ends", group: "shape", kind: "linecap", themed: false, help: "How a stroke ends. Round is lucide's own look; butt is the technical one." },
  { name: "--icon-radius-scale", label: "Artwork corner scale", group: "shape", kind: "scale", themed: false, help: "Multiplies every corner drawn inside an SVG — icon rectangles and the mock-UI panels in the landing illustrations. 1 is as shipped, 0 squares them." },
  /* The site header is `fixed top-0`, so its height is also the amount every
     page must be pushed down by. Both sides derive from this one value
     (`h-header`, `pt-header`, `pt-header-clear`), which is what lets a navbar
     VARIANT be a different height without 16 pages rendering underneath it. */
  { name: "--header-height", label: "Header height", group: "shape", kind: "length", themed: false, help: "The site header's bar height. Page top-clearance is derived from it, so both move together — a taller navbar never hides the first line of a page." },

  /* ---- elevation ---- */
  { name: "--shadow", label: "Shadow colour", group: "depth", kind: "color", themed: true, help: "A black shadow on a near-black ground reads as nothing, so dark themes often want their own." },

  /* ---- motion ---- */
  { name: "--motion-scale", label: "Speed", group: "motion", kind: "scale", themed: false, help: "Multiplies every duration and delay. 1 is the shipped timing; 0.5 is twice as quick." },
  { name: "--motion-ease", label: "Standard curve", group: "motion", kind: "easing", themed: false },
  { name: "--motion-ease-out", label: "Entrance curve", group: "motion", kind: "easing", themed: false },
  { name: "--motion-ease-in", label: "Exit curve", group: "motion", kind: "easing", themed: false },

  /* ======================================================================
     COMPONENT GEOMETRY — plans/COMPONENT-SYSTEM.md
     ======================================================================
     None of these are themed. Geometry does not change with the colour
     scheme, for the same reason `--radius` is declared once (see the note in
     globals.css `.dark`) — and offering a "row height (dark)" control would
     be a pointless decision to put in front of an owner.

     None of these are COLOURS either, and that is a rule rather than an
     oversight: colour is already solved by the 45 tokens above, and a
     component token carrying its own colour would escape the contrast audit
     and the CVD checks that set is validated against. This layer moves
     geometry, weight and density only. */

  /* ---- DataTable ---- */
  { name: "--table-row-height", label: "Row height", group: "table", kind: "length", themed: false, help: "How tall a body row is. The single biggest lever on how much of a table fits on screen." },
  { name: "--table-header-height", label: "Header height", group: "table", kind: "length", themed: false },
  { name: "--table-cell-padding-x", label: "Cell padding", group: "table", kind: "length", themed: false, help: "Horizontal breathing room inside every cell." },
  { name: "--table-font-scale", label: "Text size", group: "table", kind: "scale", themed: false, help: "Multiplies body text in tables only. 1 is as shipped." },
  { name: "--table-header-weight", label: "Header weight", group: "table", kind: "weight", themed: false },
  { name: "--table-row-border-width", label: "Row separator", group: "table", kind: "length", themed: false, help: "0 removes the rule between rows — pair it with striping, or rows run together." },
  { name: "--table-stripe-opacity", label: "Striping", group: "table", kind: "scale", themed: false, help: "Zebra fill strength. 0 is off, which is how the product ships." },
  { name: "--table-hover-opacity", label: "Hover strength", group: "table", kind: "scale", themed: false },
  { name: "--table-radius-scale", label: "Table corners", group: "table", kind: "scale", themed: false, help: "Multiplies the table's corners off the global radius, so it stays in step when that moves." },

  /* ---- Controls: Button, Input, Select, Badge ---- */
  { name: "--control-height-scale", label: "Control height", group: "control", kind: "scale", themed: false, help: "Multiplies every button, input and select height at once. A multiplier, not a height, so the seven-step size ramp keeps its proportions." },
  { name: "--control-padding-scale", label: "Control padding", group: "control", kind: "scale", themed: false },
  { name: "--control-radius-scale", label: "Control corners", group: "control", kind: "scale", themed: false, help: "Buttons and inputs, off the global radius. 0 squares them; high values give pills." },
  { name: "--control-font-weight", label: "Label weight", group: "control", kind: "weight", themed: false },
  { name: "--control-border-width", label: "Control border", group: "control", kind: "length", themed: false, help: "Outlined buttons, inputs and selects." },
  { name: "--badge-radius-scale", label: "Badge corners", group: "control", kind: "scale", themed: false, help: "Separate from buttons on purpose — pill-shaped badges beside square buttons is a common and deliberate look." },

  /* ---- Card ---- */
  { name: "--card-padding-scale", label: "Card padding", group: "card", kind: "scale", themed: false, help: "Multiplies the existing sm-to-xl padding ramp rather than replacing it." },
  { name: "--card-border-width", label: "Card border", group: "card", kind: "length", themed: false },
  { name: "--card-shadow-strength", label: "Elevation", group: "card", kind: "scale", themed: false, help: "How present shadows are. 0 is the fully flat look. The shadow's COLOUR is --shadow, under Elevation." },

  /* ---- Forms and dialogs ---- */
  { name: "--field-gap", label: "Field spacing", group: "form", kind: "length", themed: false, help: "Vertical rhythm between form fields." },
  { name: "--field-label-weight", label: "Label weight", group: "form", kind: "weight", themed: false },
  { name: "--dialog-padding", label: "Dialog padding", group: "form", kind: "length", themed: false },
  { name: "--dialog-overlay-opacity", label: "Scrim strength", group: "form", kind: "scale", themed: false, help: "How much the page behind a dialog is dimmed. The scrim's colour is --overlay." },

  /* ---- Charts and KPI tiles (shape only — the colour ramp is `chart`) ---- */
  /* No bar-corner token: Recharts bakes a bar's radius into a path at render
     time, so no CSS property reaches it and the live preview could not show a
     change as it was dragged. See the note in globals.css. */
  { name: "--chart-line-width", label: "Series width", group: "dataviz", kind: "length", themed: false, help: "Line and area strokes. Sparklines stay proportionally finer." },
  { name: "--chart-grid-opacity", label: "Gridlines", group: "dataviz", kind: "scale", themed: false, help: "0 removes the grid entirely." },
  { name: "--chart-point-radius", label: "Data points", group: "dataviz", kind: "length", themed: false, help: "The hovered marker stays one pixel larger than the plotted one." },
  { name: "--kpi-padding-scale", label: "KPI padding", group: "dataviz", kind: "scale", themed: false, help: "Multiplies the metric tile's own padding ramp." },
  { name: "--kpi-value-scale", label: "KPI number size", group: "dataviz", kind: "scale", themed: false, help: "The large figure on a metric tile." },
];

/**
 * Font choices are not custom properties in the same sense — they select a stack.
 *
 * `categories` is a LIST, and the interface slot accepting `serif` is the point:
 * setting body copy in a serif is one of the strongest identity choices an owner
 * can make, and the "Press" preset exists to offer exactly that. When this was a
 * single `category: "sans"`, two things broke silently — the picker filtered both
 * serif faces out so they could not be chosen at all, and `normalizeTheme`
 * rejected the serif that Press itself sets, so the one preset advertising
 * "serif body copy on warm paper" shipped in Geist. Neither failed loudly;
 * the value was simply dropped.
 *
 * `--font-mono` stays mono-only. It carries prices, sizes and balances, and R4
 * requires those to be monospaced and tabular — a proportional face there is a
 * legibility regression, not a style choice.
 */
export const FONT_SLOTS = [
  {
    key: "sans",
    cssVar: "--font-sans",
    label: "Interface",
    categories: ["sans", "serif"] as const,
    help: "Everything that is not a number.",
  },
  {
    key: "mono",
    cssVar: "--font-mono",
    label: "Numeric",
    categories: ["mono"] as const,
    help: "Prices, sizes and balances are monospaced and tabular (rule R4).",
  },
];

export const TOKEN_BY_NAME: Record<string, TokenDef> = Object.fromEntries(
  TOKENS.map((t) => [t.name, t])
);

/**
 * The groups that carry COMPONENT GEOMETRY rather than the site's palette.
 *
 * This line matters because a palette preset and a component variant are two
 * different decisions that happen to share one storage bag. Every non-themed
 * token — `--radius`, `--motion-scale` AND all 27 component tokens — is stored
 * in `theme.base`, so anything that treats `base` as "the palette's" will
 * quietly take the component layer with it. Two things did:
 *
 *   - `applyPreset` REPLACED the draft, so choosing Ember silently reset the
 *     owner's table density, control geometry and card padding.
 *   - `matchPresetId` signed over the whole `base` bag, so a single component
 *     override made the Presets gallery show nothing as active — the palette
 *     was still exactly Obsidian and the tick had vanished.
 *
 * Both now filter through `isComponentToken`.
 */
export const COMPONENT_TOKEN_GROUPS: ReadonlySet<TokenGroup> = new Set<TokenGroup>([
  "table",
  "control",
  "card",
  "form",
  "dataviz",
]);

/** True for a component-geometry token — i.e. one a palette preset must not touch. */
export function isComponentToken(name: string): boolean {
  const def = TOKEN_BY_NAME[name];
  return Boolean(def && COMPONENT_TOKEN_GROUPS.has(def.group));
}

/** Split a `base` bag into the palette's half and the component layer's half. */
export function splitBase(base: Record<string, string>): {
  palette: Record<string, string>;
  component: Record<string, string>;
} {
  const palette: Record<string, string> = {};
  const component: Record<string, string> = {};
  for (const [name, value] of Object.entries(base)) {
    (isComponentToken(name) ? component : palette)[name] = value;
  }
  return { palette, component };
}

export const GROUP_LABEL: Record<TokenGroup, string> = {
  surface: "Surfaces",
  brand: "Brand",
  status: "Status",
  market: "Market direction",
  chart: "Chart series",
  shape: "Shape",
  type: "Typography",
  depth: "Elevation",
  motion: "Motion",
  table: "Tables",
  control: "Buttons & inputs",
  card: "Cards",
  form: "Forms & dialogs",
  dataviz: "Charts & metrics",
};

/* ==========================================================================
   THE SAVED SHAPE
   ========================================================================== */

export interface DesignTheme {
  version: 1;
  /** Overrides for themed tokens, light scheme. Only changed keys. */
  light: Record<string, string>;
  /** Overrides for themed tokens, dark scheme. Only changed keys. */
  dark: Record<string, string>;
  /** Overrides for tokens that are the same in both schemes. */
  base: Record<string, string>;
  /** Font stack ids, keyed by slot (`sans`, `mono`). */
  fonts: Record<string, string>;
  /** Free-text name shown in the panel, e.g. "Midnight". Never rendered into CSS. */
  presetId?: string;
}

export const EMPTY_THEME: DesignTheme = {
  version: 1,
  light: {},
  dark: {},
  base: {},
  fonts: {},
};

/** The settings key the whole feature persists under. */
export const DESIGN_THEME_SETTING_KEY = "designTheme";

/**
 * The `href` the root layout hoists the theme <style> under, and therefore the
 * `data-href` it carries in the DOM.
 *
 * Shared rather than written out twice because it is the join between the
 * SERVER emitting the tag and the admin editor rewriting it in place on save —
 * see `lib/live-style.ts`. A typo on either side is silent: the editor would
 * create a second tag and the site would look fine until the next reload
 * disagreed with it.
 */
export const DESIGN_THEME_STYLE_HREF = "design-theme";

/* ==========================================================================
   NORMALISE + BUILD
   ========================================================================== */

/**
 * Coerce anything (a parsed settings blob, a pasted import, an old version)
 * into a DesignTheme containing only values that are legal to render.
 *
 * Never throws: a corrupt stored theme must degrade to the shipped defaults,
 * not take the site down.
 */
export function normalizeTheme(input: unknown): DesignTheme {
  const out: DesignTheme = { version: 1, light: {}, dark: {}, base: {}, fonts: {} };
  if (!input || typeof input !== "object") return out;
  const raw = input as Record<string, unknown>;

  for (const scheme of ["light", "dark", "base"] as const) {
    const bag = raw[scheme];
    if (!bag || typeof bag !== "object") continue;
    for (const [name, value] of Object.entries(bag as Record<string, unknown>)) {
      const def = TOKEN_BY_NAME[name];
      if (!def) continue; // unknown token — drop, never emit
      if (scheme === "base" ? def.themed : !def.themed) continue; // wrong bucket
      if (!isValidTokenValue(def.kind, value)) continue;
      out[scheme][name] = String(value).trim();
    }
  }

  const fonts = raw.fonts;
  if (fonts && typeof fonts === "object") {
    for (const slot of FONT_SLOTS) {
      const id = (fonts as Record<string, unknown>)[slot.key];
      if (typeof id !== "string") continue;
      const stack = FONT_STACKS[id];
      if (!stack || !slot.categories.includes(stack.category as never)) continue;
      out.fonts[slot.key] = id;
    }
  }

  if (typeof raw.presetId === "string" && /^[a-z0-9-]{1,40}$/i.test(raw.presetId)) {
    out.presetId = raw.presetId;
  }
  return out;
}

/**
 * Read a theme out of whatever the settings layer hands us.
 *
 * The settings table is key/value with a LONGTEXT value, so this arrives as a
 * JSON *string* over SSR. The client store additionally coerces some values
 * (`"true"` becomes `true`, numeric-looking strings become numbers) before the
 * panel ever sees them, so an object is equally possible. Both are accepted.
 *
 * Never throws. A corrupt or half-written blob must fall back to the shipped
 * palette, not blank the site.
 */
export function parseStoredTheme(raw: unknown): DesignTheme {
  if (!raw) return EMPTY_THEME;
  if (typeof raw === "object") return normalizeTheme(raw);
  if (typeof raw !== "string") return EMPTY_THEME;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "null" || trimmed === "{}") return EMPTY_THEME;
  try {
    return normalizeTheme(JSON.parse(trimmed));
  } catch {
    return EMPTY_THEME;
  }
}

/* ==========================================================================
   ICON GEOMETRY FOLLOWS THE RADIUS
   ========================================================================== */

/** The three tokens that describe how an icon's own corners are drawn. */
export const ICON_SHAPE_TOKENS = [
  "--icon-join",
  "--icon-cap",
  "--icon-radius-scale",
] as const;

/** A validated length token in CSS pixels. `rem`/`em` are taken at the 16px root. */
export function lengthToPx(value: string | undefined | null): number | null {
  if (!value) return null;
  const m = /^(\d+(?:\.\d+)?)(px|rem|em)?$/.exec(value.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2] === "rem" || m[2] === "em" ? n * 16 : n;
}

/**
 * Icon geometry implied by a box radius.
 *
 * An owner who drags the radius to zero has asked for a square interface. Until
 * now they got one with soft iconography sitting in it, because `--radius` only
 * ever reached boxes. This is the missing half of that single decision.
 *
 * The join and the cap step ONCE, at 2px, rather than easing across the range —
 * because SVG gives no continuum to ease across. `stroke-linejoin` is three
 * keywords; there is no half-round. So the threshold marks the one identity that
 * genuinely wants mitred icons (the square one) and everything else keeps
 * lucide's round joins, with `--icon-radius-scale` carrying the continuous part.
 *
 * The scale is `radius / 4` because 4px is the shipped radius and 1 is the
 * shipped scale, which makes the shipped theme a fixed point: an owner who never
 * touches the radius gets byte-identical icons.
 *
 * The cap of 2 was set by LOOKING (scratchpad/scale-check.png renders the nine
 * rect-bearing icons on the home page at 1, 2, 2.5 and 3.5). The arithmetic
 * argument said 3.5 was still short of a pill — a 2-unit corner becoming 7 on an
 * 18-unit rect, the same ratio the boxes use. The render disagreed: by 2.5 the
 * credit card reads as a lozenge, and by 3.5 the gift box has stopped being a
 * box and the small rects of the network icon have become dots. An icon has to
 * keep depicting its subject, which is a constraint no ratio captures. At 2
 * every specimen is still plainly itself.
 */
export function deriveIconGeometry(
  radius: string | undefined | null
): Record<string, string> {
  const px = lengthToPx(radius);
  if (px === null) return {};
  const sharp = px < 2;
  const scale = Math.min(2, Math.round((px / 4) * 100) / 100);
  return {
    "--icon-join": sharp ? "miter" : "round",
    "--icon-cap": sharp ? "butt" : "round",
    "--icon-radius-scale": String(scale),
  };
}

/**
 * The base bucket with icon geometry filled in from the radius.
 *
 * Only ever adds — a token the owner has pinned in the panel wins, and a theme
 * that never touched `--radius` gets nothing added at all, so this cannot make
 * an otherwise-empty theme render.
 */
function baseWithIconGeometry(t: DesignTheme): Record<string, string> {
  const radius = t.base["--radius"];
  if (!radius) return t.base;
  const out = { ...t.base };
  for (const [name, value] of Object.entries(deriveIconGeometry(radius))) {
    if (!(name in out)) out[name] = value;
  }
  return out;
}

/** True when the theme carries no overrides at all — i.e. render nothing. */
export function isEmptyTheme(t: DesignTheme): boolean {
  return (
    Object.keys(t.light).length === 0 &&
    Object.keys(t.dark).length === 0 &&
    Object.keys(t.base).length === 0 &&
    Object.keys(t.fonts).length === 0
  );
}

/**
 * Render a theme to CSS.
 *
 * WHY UNLAYERED, AND NOT `@layer admin-theme`
 * -------------------------------------------
 * This used to emit `@layer admin-theme{…}`, on the reasoning that globals.css
 * names `admin-theme` last in its layer-order statement so the override would
 * win "by construction, regardless of position". **That was wrong, and it was
 * measured to be wrong.**
 *
 * A layer's priority is fixed by where it is FIRST DECLARED. globals.css
 * declares the order statement *inside the linked stylesheet*, so a
 * `@layer admin-theme` block that reaches the parser BEFORE that link registers
 * the layer first — making it the LOWEST-priority layer instead of the highest.
 * Injecting the identical tag at head index 0, 1 or 2 (anywhere ahead of the
 * `<link>`) made the theme completely inert: `--primary` fell straight back to
 * the globals.css default on every route tested. It worked in production only
 * because React 19 happens to flush the stylesheet link before a
 * `precedence="high"` style — a detail of Next's CSS emission that could change
 * in a patch release and would silently disable every saved theme, with no
 * error anywhere.
 *
 * Unlayered declarations beat EVERY layer, whatever the source order. So going
 * unlayered removes the ordering dependency entirely instead of relying on it.
 *
 * The one thing the layer bought is preserved deliberately: a visitor's
 * `prefers-reduced-motion` must still outrank the owner's chosen speed. That is
 * now handled by SPECIFICITY rather than by layer — globals.css raises the
 * reduced-motion rule to `html:root` (0,1,1), which beats this `:root` (0,1,0)
 * no matter which is parsed first.
 *
 * The output is intentionally boring: custom-property declarations only, on
 * exactly two selectors. Every value has already passed `isValidTokenValue`.
 */
export function buildThemeCss(theme: DesignTheme): string {
  const t = normalizeTheme(theme);
  if (isEmptyTheme(t)) return "";

  const rootDecls: string[] = [];
  const darkDecls: string[] = [];

  for (const [name, value] of Object.entries(baseWithIconGeometry(t))) {
    rootDecls.push(`${name}:${value}`);
  }
  for (const [name, value] of Object.entries(t.light)) {
    rootDecls.push(`${name}:${value}`);
  }
  for (const [name, value] of Object.entries(t.dark)) {
    darkDecls.push(`${name}:${value}`);
  }

  for (const slot of FONT_SLOTS) {
    const id = t.fonts[slot.key];
    const stack = id ? FONT_STACKS[id] : undefined;
    if (stack) rootDecls.push(`${slot.cssVar}:${stack.stack}`);
  }

  if (!rootDecls.length && !darkDecls.length) return "";

  const parts: string[] = [];
  if (rootDecls.length) parts.push(`:root{${rootDecls.join(";")}}`);
  if (darkDecls.length) parts.push(`.dark{${darkDecls.join(";")}}`);
  // Unlayered on purpose — see the note above. Two selectors, custom
  // properties only.
  return parts.join("");
}

/** The font each slot falls back to when the theme names none. */
export const DEFAULT_FONTS: Record<string, string> = { sans: "geist", mono: "jetbrains" };

/**
 * The FULLY RESOLVED property bag — a shipped default for every token the draft
 * does not override.
 *
 * WHY THE PREVIEW CANNOT USE THE DIFF
 * -----------------------------------
 * Rule 2 of this file is "store diffs, not snapshots", and that is right for
 * STORAGE. It is wrong for the preview, and shipping it there produced a bug
 * with a very confusing signature: the Obsidian preset "did nothing".
 *
 * The preview is the real site in an iframe, so the iframe has ALREADY
 * server-rendered whatever theme is currently saved. The panel then writes the
 * draft's diff over it. A token in the diff wins; a token not in the diff falls
 * through — not to the shipped default, as the panel implies, but to the SAVED
 * theme. So the preview was always showing `saved + draft`, never `draft`.
 *
 * For most drafts that leaks a token or two. For Obsidian it is total: Obsidian
 * IS the shipped palette, so `presetToTheme` correctly returns an EMPTY theme —
 * and an empty diff writes nothing at all, leaving the previously-saved theme
 * painting every pixel. Selecting the one preset labelled "the shipped look"
 * showed the owner the look they already had. The same held for Reset.
 *
 * Resolving against the defaults makes the preview mean what it says: saving
 * replaces the stored theme outright, so what the site becomes is exactly
 * `shipped defaults + this draft`, which is what this returns.
 */
export function themeToResolvedVars(
  theme: DesignTheme,
  scheme: "light" | "dark"
): Record<string, string> {
  const t = normalizeTheme(theme);
  const out: Record<string, string> = { ...DEFAULT_BASE };

  /* Icon geometry follows `--radius` unless pinned, and the derivation has to
     run against the draft's radius, not the shipped one — otherwise a draft
     that squares the interface keeps round icons in the preview only. */
  Object.assign(out, baseWithIconGeometry(t));

  for (const [name, pair] of Object.entries(DEFAULT_THEMED)) out[name] = pair[scheme];
  Object.assign(out, t[scheme]);

  for (const slot of FONT_SLOTS) {
    const stack = FONT_STACKS[t.fonts[slot.key] ?? DEFAULT_FONTS[slot.key] ?? ""];
    if (stack) out[slot.cssVar] = stack.stack;
  }
  return out;
}
