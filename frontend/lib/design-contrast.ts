/**
 * Contrast arithmetic for the design manager.
 *
 * The point of this file is that the panel never says "looks fine". Phase 13
 * of the migration found `text-{tone}` on `bg-{tone}/10` sitting at 3.94-4.48:1
 * — a failure nobody had noticed for the life of the codebase, because it was
 * eyeballed rather than computed. The owner is about to be handed the same
 * knobs, so the same arithmetic has to run on every keystroke.
 *
 * Tokens are stored as bare HSL triples (`"217 91% 60%"`), which is what
 * `hsl(var(--primary))` expects. Everything here speaks that format.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse `"217 91% 60%"`. Returns null rather than throwing on junk. */
export function parseHslTriple(triple: string): [number, number, number] | null {
  const m = String(triple)
    .trim()
    .match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]);
  const l = parseFloat(m[3]);
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = L - c / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function hslTripleToHex(triple: string): string | null {
  const parsed = parseHslTriple(triple);
  if (!parsed) return null;
  return rgbToHex(hslToRgb(parsed[0], parsed[1], parsed[2]));
}

/** `#1a2b3c` (or `#abc`) back to a bare HSL triple, for the native colour input. */
export function hexToHslTriple(hex: string): string | null {
  let v = String(hex).trim().replace(/^#/, "");
  if (v.length === 3) v = v.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(v)) return null;
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return `${r1(h)} ${r1(s * 100)}% ${r1(l * 100)}%`;
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two HSL triples. Returns 0 when either is junk. */
export function contrastRatio(a: string, b: string): number {
  const pa = parseHslTriple(a);
  const pb = parseHslTriple(b);
  if (!pa || !pb) return 0;
  const la = relativeLuminance(hslToRgb(pa[0], pa[1], pa[2]));
  const lb = relativeLuminance(hslToRgb(pb[0], pb[1], pb[2]));
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export type ContrastLevel = "AAA" | "AA" | "AA-large" | "fail";

export function contrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

/**
 * Approximate `--{tone}-ink`: the derived colour a soft/tonal chip uses.
 *
 * globals.css computes these with `color-mix(in oklab, hsl(var(--tone)) 88%,
 * hsl(var(--foreground)))`. Reproducing oklab mixing faithfully in the panel
 * would be a lot of matrix code for a preview, so this mixes in linear sRGB
 * instead. It is CLOSE but not identical, so it is used only to warn, never to
 * claim a pass — the panel labels these as estimates.
 */
export function mixTriples(a: string, b: string, aWeight: number): string | null {
  const pa = parseHslTriple(a);
  const pb = parseHslTriple(b);
  if (!pa || !pb) return null;
  const ra = hslToRgb(pa[0], pa[1], pa[2]);
  const rb = hslToRgb(pb[0], pb[1], pb[2]);
  const w = Math.max(0, Math.min(1, aWeight));
  const mix = {
    r: Math.round(ra.r * w + rb.r * (1 - w)),
    g: Math.round(ra.g * w + rb.g * (1 - w)),
    b: Math.round(ra.b * w + rb.b * (1 - w)),
  };
  return hexToHslTriple(rgbToHex(mix));
}

/* ==========================================================================
   PERCEPTUAL DIFFERENCE — for the chart ramp

   WCAG contrast is the WRONG metric for "can I tell these two series apart".
   Two colours of equal lightness score 1.0 against each other however far apart
   their hues are, so a contrast-based check calls a perfectly readable red/blue
   pair a failure and says nothing at all about a red/orange one.

   The right measure is perceptual distance, and the shipped ramp was already
   validated with it ("worst adjacent ΔE 8.1 deutan" in the globals.css comment).
   This is the same arithmetic: Euclidean distance in OKLab ×100, optionally
   through the Machado-Oliveira-Fernandes (2009) colour-vision-deficiency
   transform at severity 1.0.

   Thresholds are carried over unchanged so the panel judges a generated ramp by
   the same bar the hand-tuned one passed. They are calibrated TO the Machado
   model — swapping in a different simulation would require recalibrating them.
   ========================================================================== */

export const CVD_TARGET = 8.0;
export const CVD_FLOOR = 6.0;
export const NORMAL_FLOOR = 15.0;

const MACHADO: Record<"protan" | "deutan", number[][]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

const toLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

function linearFromTriple(triple: string): [number, number, number] | null {
  const p = parseHslTriple(triple);
  if (!p) return null;
  const { r, g, b } = hslToRgb(p[0], p[1], p[2]);
  return [toLinear(r / 255), toLinear(g / 255), toLinear(b / 255)];
}

function oklabFromLinear([r, g, b]: [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function simulateCvd(
  lin: [number, number, number],
  kind: "protan" | "deutan"
): [number, number, number] {
  const M = MACHADO[kind];
  const clamp = (c: number) => Math.max(0, Math.min(1, c));
  return [
    clamp(M[0][0] * lin[0] + M[0][1] * lin[1] + M[0][2] * lin[2]),
    clamp(M[1][0] * lin[0] + M[1][1] * lin[1] + M[1][2] * lin[2]),
    clamp(M[2][0] * lin[0] + M[2][1] * lin[1] + M[2][2] * lin[2]),
  ];
}

/** OKLab ΔE ×100 between two HSL triples. `kind` omitted = normal vision. */
export function deltaE(a: string, b: string, kind?: "protan" | "deutan"): number {
  const la = linearFromTriple(a);
  const lb = linearFromTriple(b);
  if (!la || !lb) return 0;
  const oa = oklabFromLinear(kind ? simulateCvd(la, kind) : la);
  const ob = oklabFromLinear(kind ? simulateCvd(lb, kind) : lb);
  return 100 * Math.hypot(oa[0] - ob[0], oa[1] - ob[1], oa[2] - ob[2]);
}

export interface ContrastFinding {
  /** Token whose value is the ink. */
  ink: string;
  /** Token whose value is the ground. */
  ground: string;
  label: string;
  ratio: number;
  level: ContrastLevel;
  /** The bar this particular pairing has to clear. Not always 4.5. */
  min: number;
  /**
   * Whether it clears its own bar.
   *
   * Deliberately separate from `level`. A card is supposed to sit at ~1.1:1
   * against the page — that is elevation, not text — so scoring it with the
   * text ladder would report a permanent failure on a correct palette and train
   * the owner to ignore the panel. `level` describes the ratio; `pass`
   * describes the requirement.
   */
  pass: boolean;
  scheme: "light" | "dark";
}

/**
 * Every pairing worth checking, with the label the panel shows.
 *
 * Kept as data rather than derived from `TokenDef.on` alone because a few
 * important pairs are not "foreground of" relationships — subtle ink and the
 * borders are judged against the surfaces they actually sit on.
 */
export const CONTRAST_PAIRS: Array<{
  ink: string;
  ground: string;
  label: string;
  /** 3:1 is the bar for large text, icons and UI boundaries; 4.5:1 for body. */
  min: number;
}> = [
  { ink: "--foreground", ground: "--background", label: "Body text on the page", min: 4.5 },
  { ink: "--card-foreground", ground: "--card", label: "Body text on a card", min: 4.5 },
  { ink: "--muted-foreground", ground: "--background", label: "Secondary text", min: 4.5 },
  { ink: "--subtle-foreground", ground: "--card", label: "Labels and axis ticks", min: 4.5 },
  { ink: "--popover-foreground", ground: "--popover", label: "Popover text", min: 4.5 },
  { ink: "--primary-foreground", ground: "--primary", label: "Text on an accent button", min: 4.5 },
  { ink: "--secondary-foreground", ground: "--secondary", label: "Text on a secondary button", min: 4.5 },
  { ink: "--accent-foreground", ground: "--accent", label: "Text on a hovered row", min: 4.5 },
  { ink: "--success-foreground", ground: "--success", label: "Text on a success fill", min: 4.5 },
  { ink: "--warning-foreground", ground: "--warning", label: "Text on a warning fill", min: 4.5 },
  { ink: "--destructive-foreground", ground: "--destructive", label: "Text on a destructive fill", min: 4.5 },
  { ink: "--info-foreground", ground: "--info", label: "Text on an info fill", min: 4.5 },
  { ink: "--overlay-foreground", ground: "--overlay", label: "Text on a scrim", min: 4.5 },
  { ink: "--primary", ground: "--background", label: "Accent as a link on the page", min: 4.5 },
  { ink: "--up", ground: "--card", label: "Rising price on a card", min: 4.5 },
  { ink: "--down", ground: "--card", label: "Falling price on a card", min: 4.5 },
  { ink: "--ring", ground: "--background", label: "Focus ring against the page", min: 3 },
  /* A hairline border is not a boundary anyone reads — it is a hint that two
     regions differ. The shipped, hand-tuned Obsidian palette sits at 1.28:1 in
     light and 1.22:1 in dark, and looks right. An earlier draft of this table
     demanded 1.5 and therefore reported a permanent failure on the very palette
     it was calibrated against; the bar below only catches a border that has
     genuinely vanished into its surface. */
  { ink: "--border", ground: "--card", label: "Card border", min: 1.15 },
  { ink: "--card", ground: "--background", label: "Card lifted off the page", min: 1.05 },
];

/**
 * Score a resolved palette. `resolve` returns the effective value of a token in
 * the given scheme — i.e. the override if there is one, else the shipped default.
 */
export function auditPalette(
  resolve: (name: string, scheme: "light" | "dark") => string,
  scheme: "light" | "dark"
): ContrastFinding[] {
  const out: ContrastFinding[] = [];
  for (const pair of CONTRAST_PAIRS) {
    const ink = resolve(pair.ink, scheme);
    const ground = resolve(pair.ground, scheme);
    const ratio = contrastRatio(ink, ground);
    if (!ratio) continue;
    out.push({
      ink: pair.ink,
      ground: pair.ground,
      label: pair.label,
      ratio,
      level: contrastLevel(ratio),
      min: pair.min,
      pass: ratio >= pair.min,
      scheme,
    });
  }
  return out;
}

export interface SeriesFinding {
  a: string;
  b: string;
  /** Normal vision. */
  normal: number;
  /** The worse of protan and deutan. */
  cvd: number;
  pass: boolean;
  /** Clears the CVD floor but not the target — legal only with a second encoding. */
  marginal: boolean;
}

/**
 * Adjacent-pair separation across the six categorical chart hues.
 *
 * Adjacent pairs rather than all 15 combinations because that is what the
 * shipped ramp was validated on, and because a chart draws series in order —
 * neighbouring slots are the ones a reader actually has to tell apart.
 */
export function chartSeparation(
  resolve: (name: string, scheme: "light" | "dark") => string,
  scheme: "light" | "dark"
): SeriesFinding[] {
  const names = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6"];
  const out: SeriesFinding[] = [];
  for (let i = 0; i < names.length - 1; i++) {
    const a = resolve(names[i], scheme);
    const b = resolve(names[i + 1], scheme);
    const normal = deltaE(a, b);
    const cvd = Math.min(deltaE(a, b, "protan"), deltaE(a, b, "deutan"));
    out.push({
      a: names[i],
      b: names[i + 1],
      normal,
      cvd,
      pass: cvd >= CVD_FLOOR && normal >= NORMAL_FLOOR,
      marginal: cvd >= CVD_FLOOR && cvd < CVD_TARGET,
    });
  }
  return out;
}
