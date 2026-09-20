/**
 * Navigation colour schema.
 *
 * ---------------------------------------------------------------------------
 * This file used to define **20 different navigation hues** — one per extension
 * (gateway=indigo, forex=emerald, nft=purple, futures=amber, ico=teal, …). The
 * result was that the single most visible surface in the product, the top nav,
 * changed its entire colour identity as you walked between sections. That is the
 * headline problem DESIGN-SYSTEM.md exists to fix.
 *
 * Under Obsidian (rule R2) the accent means **"this is interactive"** — it is not
 * a section label. A nav item is either the current one (accent) or it is not
 * (muted). Which extension you happen to be in is communicated by the page, the
 * heading and the URL; it is not a colour.
 *
 * So every key below now resolves to the SAME token-based schema. The keys are
 * kept because 32 `menu.ts` files do `export const colorSchema = NAV_COLOR_SCHEMAS.<ext>`
 * and two components read `.textActive` / `.text` off the result — remapping the
 * values keeps all 34 call sites working untouched. Adding a new extension needs
 * no entry here at all; the lookup falls through to `default`.
 * ---------------------------------------------------------------------------
 */

export interface NavColorSchema {
  primary: string;
  secondary?: string;
  text: string;
  textHover: string;
  textActive: string;
  bgHover: string;
  bgActive: string;
  borderActive: string;
  glow: string;
  indicatorStyle?: "underline" | "gradient-underline" | "pill" | "dot" | "glow";
  gradientDirection?: "to-r" | "to-l" | "to-t" | "to-b" | "to-br" | "to-bl" | "to-tr" | "to-tl";
}

/**
 * The one navigation schema. Frozen so a caller cannot reintroduce a per-section
 * hue by mutating a shared reference.
 *
 * `indicatorStyle` stays `"underline"`: a 2px accent rule under the active item.
 * The old `"gradient-underline"` / `"glow"` styles are still accepted by the
 * type (extensions may have them persisted) but now render identically, because
 * a gradient between one colour and itself is that colour.
 */
const TOKEN_SCHEMA: NavColorSchema = Object.freeze({
  primary: "primary",
  text: "text-muted-foreground",
  textHover: "text-foreground",
  textActive: "text-primary",
  bgHover: "hover:bg-muted",
  bgActive: "bg-primary/10",
  borderActive: "border-primary",
  glow: "shadow-none",
  indicatorStyle: "underline",
});

/**
 * Every extension resolves to the same schema. The keys — including the
 * `mlm` / `knowledge_base` / `trading_bot` aliases the old file carried — are
 * preserved so no `menu.ts` needs editing.
 *
 * Listed explicitly rather than served from a Proxy: `forex-trading/menu.ts`
 * does `Object.values(NAV_COLOR_SCHEMAS)[0]`, and a `get`-only Proxy would also
 * hand back a schema for `toString`, `Symbol.iterator` and every other incidental
 * property access. A plain object stays predictable under spread, iteration and
 * logging. Unknown keys fall through to `default` via `getNavColorSchema`.
 */
const SCHEMA_KEYS = [
  "default",
  "gateway",
  "copy-trading",
  "forex",
  "staking",
  "p2p",
  "ico",
  "affiliate",
  "mlm",
  "ecommerce",
  "faq",
  "knowledge_base",
  "nft",
  "ai",
  "binary-engine",
  "ecosystem",
  "futures",
  "mailwizard",
  "trading-bot",
  "trading_bot",
  "hummingbot",
] as const;

export const NAV_COLOR_SCHEMAS: Record<string, NavColorSchema> = Object.fromEntries(
  SCHEMA_KEYS.map((key) => [key, TOKEN_SCHEMA])
);

/** Get the navigation schema. Always the same one — see the note at the top. */
export function getNavColorSchema(_extensionName?: string): NavColorSchema {
  return TOKEN_SCHEMA;
}

/**
 * Colour values for the handful of places the nav needs CSS-in-JS rather than a
 * class (framer-motion `style` props on the active indicator).
 *
 * These are **token references, not hexes**. The old map held 17 pairs of raw
 * light/dark hexes selected by an `isDark` boolean — which was also a live bug:
 * `isDark` is derived from `resolvedTheme`, which is undefined until mount, so
 * the nav indicator painted its LIGHT hex for one frame in dark mode on every
 * page load. `hsl(var(--primary))` is resolved by CSS and has no such window.
 */
export const COLOR_HEX_MAP: Record<string, { light: string; dark: string }> = {
  primary: { light: "hsl(var(--primary))", dark: "hsl(var(--primary))" },
  success: { light: "hsl(var(--success))", dark: "hsl(var(--success))" },
  warning: { light: "hsl(var(--warning))", dark: "hsl(var(--warning))" },
  destructive: { light: "hsl(var(--destructive))", dark: "hsl(var(--destructive))" },
  info: { light: "hsl(var(--info))", dark: "hsl(var(--info))" },
};

/**
 * Resolve a colour name to a CSS value.
 *
 * `isDark` is accepted for signature compatibility and deliberately ignored —
 * the returned token is already theme-correct. Unknown names (the old palette
 * names, if any persisted config still carries them) fall back to the accent
 * rather than to purple.
 */
export function getColorHex(colorName: string, _isDark: boolean = false): string {
  return COLOR_HEX_MAP[colorName]?.light ?? "hsl(var(--primary))";
}

/**
 * Accent at a given opacity, for the CSS-in-JS spots that need a translucent
 * rule or glow.
 *
 * Use this instead of appending hex alpha to `getColorHex()`. Call sites used to
 * build `` `${primaryColor}30` `` — valid only while the value was a 6-digit
 * hex. It was **already** broken for the `default` schema, whose `primary` entry
 * has always been `hsl(var(--primary))`: that produced the string
 * `hsl(var(--primary))30`, which no browser parses, so the affected rules were
 * silently dropped on every non-extension page.
 *
 * @param alpha 0–1.
 */
export function getAccentAlpha(alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));
  return `hsl(var(--primary) / ${a})`;
}

/**
 * Background value for the active-item indicator.
 *
 * Returns a flat accent. The previous implementation built a two-hue
 * `linear-gradient`, which is what made each section's nav read as a different
 * product; R3 also rules out gradients as a way to signal state.
 */
export function getGradientStyle(schema: NavColorSchema, isDark: boolean = false): string {
  return getColorHex(schema.primary, isDark);
}

/** Classes for a nav item in a given state. */
export function getNavItemClasses(
  schema: NavColorSchema,
  isActive: boolean,
  isHovered: boolean = false
): string {
  const classes: string[] = [];

  if (isActive) {
    if (schema.textActive) classes.push(schema.textActive);
    if (schema.bgActive) classes.push(schema.bgActive);
  } else if (isHovered) {
    if (schema.textHover) classes.push(schema.textHover);
  } else {
    if (schema.text) classes.push(schema.text);
  }

  if (!isActive && schema.bgHover) {
    classes.push(schema.bgHover);
  }

  return classes.join(" ");
}

/** Classes for the active indicator. */
export function getIndicatorClasses(schema: NavColorSchema, isActive: boolean): string {
  if (!isActive) return "";

  if (schema.indicatorStyle === "pill") {
    return `rounded-md ${schema.bgActive || "bg-primary/10"}`;
  }
  return `border-b-2 ${schema.borderActive || "border-primary"}`;
}
