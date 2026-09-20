/**
 * Colour interop for consumers whose parser is older than the design system.
 * ============================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * Every colour the site designer owns is stored, and emitted into `:root` /
 * `.dark`, as a BARE HSL TRIPLE — `"217 91% 60%"` — because that is the shape
 * `hsl(var(--primary))` needs (see `lib/design-theme.ts`). That is a CSS-side
 * contract, and it holds perfectly for anything painted by a stylesheet.
 *
 * It stops holding the moment a token has to cross into JavaScript. Several
 * consumers in this app take a colour as a STRING and parse it themselves, with
 * a parser that predates CSS Color 4 — and each of them fails differently:
 *
 *   - The TradingView charting library (`public/lib/chart/charting_library/`)
 *     accepts ONLY named colours, `#rgb`/`#rrggbb`, `rgb(r, g, b)` and
 *     `rgba(r, g, b, a)`, all comma-separated with INTEGER channels. It has no
 *     `hsl()` branch at all. Anything else THROWS
 *     "Passed color string does not match any of the known color
 *     representations" out of `parseRgb`, and because the throw happens inside
 *     the pane constructor it takes the whole widget down — the chart never
 *     draws. This is the bug this module was written for: the pane background
 *     was being handed `hsl(0 0% 100%)`.
 *   - `<input type="color">` accepts ONLY `#rrggbb`; anything else silently
 *     resets the control to `#000000`.
 *   - `ctx.fillStyle = <garbage>` is IGNORED (the previous colour is reused, so
 *     the canvas quietly paints the wrong thing), while
 *     `gradient.addColorStop(0, <garbage>)` THROWS and blanks the frame.
 *
 * So the rule is: a token may be interpolated into CSS as-is, but any token
 * that reaches a JS-side parser has to come through here first.
 *
 * WHAT IT GUARANTEES
 * ------------------
 * `toLegacyColor` maps ANY colour the browser itself can paint — a bare triple,
 * `var(--x)`, hex in all four lengths, `rgb()`/`hsl()` in either syntax,
 * `oklch()`, `lab()`, `color(display-p3 …)`, `color-mix()`, a named colour —
 * onto `#rrggbb` (opaque) or `rgba(r, g, b, a)` (translucent), which is the
 * INTERSECTION of what every consumer above accepts. Unrecognisable input
 * returns `null` rather than a guess, so callers can omit the key and leave the
 * consumer on its own default instead of feeding it something that throws.
 *
 * That is what makes it future-proof against the design manager: the tokens do
 * not have to stay HSL triples for this to keep working. If the palette is ever
 * re-expressed in oklch — which is the whole reason CSS Color 4 exists — this
 * file needs no change, because the browser does the parsing, not us.
 */

import { hslToRgb, type Rgb } from "./design-contrast";

export interface Rgba extends Rgb {
  /** 0..1. */
  a: number;
}

/* ==========================================================================
   PARSING
   ========================================================================== */

/**
 * A bare design-token value: `H S% L%`, with the optional `/ A` that CSS Color 4
 * allows inside `hsl()`. Deliberately NOT a general colour matcher — this is the
 * one shape that is *not* valid CSS on its own, so it has to be recognised here
 * before the string is ever handed to the browser.
 */
const TRIPLE_RE =
  /^(-?\d*\.?\d+)(?:deg)?\s+(\d*\.?\d+)%\s+(\d*\.?\d+)%(?:\s*\/\s*(\d*\.?\d+%?))?$/;

const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * One `var()` reference with an optional fallback. Nested parens in the fallback
 * are deliberately not matched: a `var()` this cannot expand is left alone and
 * fails the browser parse below, which returns `null`. A wrong colour is worse
 * than no colour, because no colour means "keep your default".
 */
const VAR_RE = /var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,([^()]*))?\)/;

/** Read a custom property off `<html>`, where the design tokens are declared. */
export function readTokenValue(name: string): string {
  if (typeof document === "undefined" || !document.documentElement) return "";
  const prop = name.startsWith("--") ? name : `--${name}`;
  return getComputedStyle(document.documentElement)
    .getPropertyValue(prop)
    .trim();
}

/**
 * Expand `var()` textually against the live tokens.
 *
 * The browser cannot do this for us: `var()` is resolved against an ELEMENT, and
 * neither a canvas context nor a detached node has the custom properties in
 * scope. Bounded recursion because a token may legitimately reference another
 * one, and because a cyclic definition must not hang the render loop.
 */
function substituteVars(value: string, depth = 0): string {
  if (depth > 8 || !value.includes("var(")) return value;
  const next = value.replace(VAR_RE, (_match, name: string, fallback?: string) => {
    const resolved = readTokenValue(name);
    return resolved || (fallback ?? "").trim();
  });
  return next === value ? value : substituteVars(next, depth + 1);
}

function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  const value = raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

function parseHex(value: string): Rgba | null {
  let hex = value.slice(1);
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return {
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: hex.length === 8 ? channel(6) / 255 : 1,
  };
}

/**
 * The serialisations a 2D context can hand back. Per spec `fillStyle` reads back
 * as `#rrggbb` when opaque and `rgba(…)` otherwise, but a wide-gamut input can
 * come back as `color(srgb …)` in engines that keep the colour space, so both
 * are handled before falling through to the pixel readback.
 */
function parseSerialised(value: string): Rgba | null {
  if (value.startsWith("#")) return parseHex(value);

  const rgb =
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(
      value
    );
  if (rgb) {
    return {
      r: parseFloat(rgb[1]),
      g: parseFloat(rgb[2]),
      b: parseFloat(rgb[3]),
      a: parseAlpha(rgb[4]),
    };
  }

  const srgb =
    /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(
      value
    );
  if (srgb) {
    return {
      r: parseFloat(srgb[1]) * 255,
      g: parseFloat(srgb[2]) * 255,
      b: parseFloat(srgb[3]) * 255,
      a: parseAlpha(srgb[4]),
    };
  }

  return null;
}

/** 1x1 scratch context — the browser's own colour parser, reused. */
let scratch: CanvasRenderingContext2D | null | undefined;
function scratchCtx(): CanvasRenderingContext2D | null {
  if (scratch !== undefined) return scratch;
  if (typeof document === "undefined") {
    scratch = null;
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  scratch = canvas.getContext("2d", { willReadFrequently: true });
  return scratch;
}

/**
 * Last resort: paint the colour and read the pixel back.
 *
 * Reached only when the context serialises to something neither branch of
 * `parseSerialised` knows. Lossy for very low alphas (the backing store is
 * premultiplied), which is why it is the fallback and not the primary path.
 */
function pixelParse(ctx: CanvasRenderingContext2D, value: string): Rgba | null {
  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  } catch {
    /* getImageData is blocked by some anti-fingerprinting extensions. */
    return null;
  }
}

/**
 * Let the browser parse it.
 *
 * Assigning an invalid colour to `fillStyle` is IGNORED rather than throwing, so
 * validity is detected by writing the value over two DIFFERENT sentinels: if
 * both assignments were ignored the two readbacks disagree, and if the value was
 * accepted they are identical. That is why there are two — a single sentinel
 * cannot tell "rejected" from "the input happened to be the sentinel".
 */
function browserParse(value: string): Rgba | null {
  const ctx = scratchCtx();
  if (!ctx) return null;

  let first: string;
  let second: string;
  try {
    ctx.fillStyle = "#000000";
    ctx.fillStyle = value;
    first = String(ctx.fillStyle);
    ctx.fillStyle = "#ffffff";
    ctx.fillStyle = value;
    second = String(ctx.fillStyle);
  } catch {
    return null;
  }
  if (first !== second) return null;

  return parseSerialised(first) ?? pixelParse(ctx, value);
}

/**
 * Parse any colour the browser can paint, plus the bare HSL triple the design
 * tokens are stored in. Returns `null` — never a guess — on anything else.
 */
export function parseCssColor(input: string | null | undefined): Rgba | null {
  if (typeof input !== "string") return null;

  let value = input.trim();
  if (!value) return null;
  if (value.includes("var(")) value = substituteVars(value).trim();
  if (!value) return null;

  /* Before the browser, because a bare triple is the one shape that is NOT a
     valid CSS colour on its own. */
  const triple = TRIPLE_RE.exec(value);
  if (triple) {
    const { r, g, b } = hslToRgb(
      parseFloat(triple[1]),
      parseFloat(triple[2]),
      parseFloat(triple[3])
    );
    return { r, g, b, a: parseAlpha(triple[4]) };
  }

  /* Cheap and DOM-free, so it also works during SSR and in a worker. */
  if (HEX_RE.test(value)) return parseHex(value);

  return browserParse(value);
}

/* ==========================================================================
   FORMATTING
   ========================================================================== */

const clampChannel = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
const toHexPair = (n: number) => clampChannel(n).toString(16).padStart(2, "0");

/**
 * Serialise alpha so it survives the strictest consumer's regex.
 *
 * TradingView's is `-?[\d]{0,10}(?:\.\d+)?` — fixed notation only. `toFixed`
 * before trimming is what keeps a very small alpha out of exponent form, which
 * `(0.0001).toString()` would not.
 */
function formatAlpha(a: number): string {
  return a.toFixed(3).replace(/\.?0+$/, "") || "0";
}

/**
 * `#rrggbb` when opaque, `rgba(r, g, b, a)` otherwise — comma-separated, integer
 * channels. The intersection of what the legacy parsers in this app accept.
 */
export function formatLegacyColor(color: Rgba): string {
  const a = Math.min(1, Math.max(0, color.a));
  if (a >= 1) {
    return `#${toHexPair(color.r)}${toHexPair(color.g)}${toHexPair(color.b)}`;
  }
  return `rgba(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(
    color.b
  )}, ${formatAlpha(a)})`;
}

/**
 * Normalise any colour — token triple, `var()`, hex, `rgb()`, `hsl()`, `oklch()`,
 * a named colour — to a form every legacy parser in this app accepts.
 *
 * @param alpha optional 0..1 multiplier applied to whatever alpha the input had.
 * @returns `null` when the input is not a colour, so the caller can OMIT the
 *   value and leave the consumer on its own default.
 */
export function toLegacyColor(
  input: string | null | undefined,
  alpha?: number
): string | null {
  const parsed = parseCssColor(input);
  if (!parsed) return null;
  const a = alpha === undefined ? parsed.a : parsed.a * alpha;
  return formatLegacyColor({ ...parsed, a });
}

/**
 * Read one design token and return it in that same legacy-safe form.
 *
 * This is the function to reach for at a JS/CSS boundary. It reads the LIVE
 * value, so it follows both the colour scheme and whatever the site designer has
 * saved — but it must be re-read when either changes, since the returned string
 * is a snapshot (see `onDesignTokensChanged` in `lib/live-style.ts`).
 *
 * @param name token name, with or without the leading `--`.
 */
export function readTokenColor(name: string, alpha?: number): string | null {
  return toLegacyColor(readTokenValue(name), alpha);
}

/** Normalise to `#rrggbb`, discarding alpha. For `<input type="color">`. */
export function toHexColor(input: string | null | undefined): string | null {
  const parsed = parseCssColor(input);
  if (!parsed) return null;
  return `#${toHexPair(parsed.r)}${toHexPair(parsed.g)}${toHexPair(parsed.b)}`;
}
