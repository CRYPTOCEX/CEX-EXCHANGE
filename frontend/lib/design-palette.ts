/**
 * PALETTE GENERATION — "unique site with ease".
 *
 * Handing an owner 41 colour pickers per scheme (82 in total) does not produce
 * a unique site; it produces an incoherent one. Almost nobody can hold the
 * relationships between a surface ramp, a border ramp and six categorical chart
 * hues in their head, and the ones that matter are exactly the ones that are
 * invisible until they are wrong: the card that no longer lifts off the page,
 * the focus ring that vanishes, the "subtle" label at 3.1:1.
 *
 * So the panel's primary control is a handful of SEEDS — a brand hue, how
 * tinted the greys are, how dark the dark theme goes — and this file derives
 * the rest using the same relationships Obsidian was built from. Every
 * derivation that carries text is SOLVED for a contrast target rather than
 * guessed, so a generated palette is legible by construction.
 *
 * The owner can still override any individual token afterwards. The generator
 * produces a good starting point; it does not take the pen away.
 *
 * Depends only on lib/design-contrast.ts — no React, importable from anywhere.
 */

import { splitBase } from "./design-theme";
import {
  contrastRatio,
  hslToRgb,
  relativeLuminance,
  parseHslTriple,
  deltaE,
  CVD_FLOOR,
  CVD_TARGET,
} from "./design-contrast";

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Build a triple, clamping to legal ranges. */
function t(h: number, s: number, l: number): string {
  const H = ((h % 360) + 360) % 360;
  const S = Math.max(0, Math.min(100, s));
  const L = Math.max(0, Math.min(100, l));
  return `${r1(H)} ${r1(S)}% ${r1(L)}%`;
}

function luminanceOf(triple: string): number {
  const p = parseHslTriple(triple);
  if (!p) return 0;
  return relativeLuminance(hslToRgb(p[0], p[1], p[2]));
}

/**
 * Find the lightness at which `hue`/`sat` hits `target` contrast against
 * `ground`, searching in one direction.
 *
 * Binary search rather than algebra because relative luminance is not monotonic
 * in HSL lightness in a way that inverts cleanly per hue — a saturated yellow
 * and a saturated blue at L=50 differ by a factor of four in luminance. Twenty
 * iterations lands well inside a tenth of a percent, which is finer than the
 * value is stored at.
 *
 * Returns the closest lightness found even when the target is unreachable (a
 * mid-grey ground simply cannot yield 7:1 in either direction), because a
 * best-effort colour plus a panel warning beats refusing to generate.
 */
export function solveLightness(
  hue: number,
  sat: number,
  ground: string,
  target: number,
  prefer: "darker" | "lighter"
): number {
  let lo = prefer === "darker" ? 0 : 50;
  let hi = prefer === "darker" ? 50 : 100;
  let best = prefer === "darker" ? 0 : 100;
  let bestDelta = Infinity;

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const ratio = contrastRatio(t(hue, sat, mid), ground);
    const delta = Math.abs(ratio - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = mid;
    }
    // Moving toward the ground's own lightness lowers contrast.
    const tooMuch = ratio > target;
    if (prefer === "darker") {
      if (tooMuch) lo = mid;
      else hi = mid;
    } else {
      if (tooMuch) hi = mid;
      else lo = mid;
    }
  }
  return r1(best);
}

/**
 * Pick whichever of near-white / near-black reads better on `ground`.
 *
 * Pure 100% white rather than a tinted 98%: the tint bought nothing visible and
 * cost about 4% of the contrast ratio, which was enough to land a generated
 * accent button on 4.49:1 — a hair under AA, and the kind of near-miss that is
 * indefensible when the correct value is free.
 */
function inkFor(ground: string, hue: number, chroma: number): string {
  const light = t(0, 0, 100);
  const dark = t(hue, Math.min(chroma * 1.4, 40), 7);
  return contrastRatio(light, ground) >= contrastRatio(dark, ground) ? light : dark;
}

/* ==========================================================================
   SEEDS
   ========================================================================== */

export interface PaletteSeed {
  /** Brand hue, 0-360. */
  accentHue: number;
  /** Brand saturation, 0-100. */
  accentSat: number;
  /** Hue of the neutrals. A grey biased toward the accent reads as chosen. */
  neutralHue: number;
  /**
   * How tinted the neutrals are. 0 = pure grey. Above ~12 the surfaces start to
   * read as a colour rather than a neutral.
   */
  neutralChroma: number;
  /** Lightness of the light theme's page surface. */
  lightBase: number;
  /** Lightness of the dark theme's page surface. */
  darkBase: number;
  /** Status hues. Defaults are the shipped ones. */
  successHue?: number;
  warningHue?: number;
  destructiveHue?: number;
  infoHue?: number;
  /** Market direction. Defaults follow success/destructive. */
  upHue?: number;
  downHue?: number;
  /** Rotation applied across the six chart series. */
  chartSpread?: number;
}

export const DEFAULT_SEED: PaletteSeed = {
  accentHue: 217,
  accentSat: 91,
  neutralHue: 218,
  neutralChroma: 24,
  lightBase: 96.7,
  darkBase: 3.5,
};

/* ==========================================================================
   GENERATION
   ========================================================================== */

export interface GeneratedPalette {
  light: Record<string, string>;
  dark: Record<string, string>;
}

function generateScheme(seed: PaletteSeed, scheme: "light" | "dark"): Record<string, string> {
  const isLight = scheme === "light";
  const nh = seed.neutralHue;
  const nc = seed.neutralChroma;
  const ah = seed.accentHue;
  const as = seed.accentSat;

  /* ---- surface ramp -----------------------------------------------------
     Four steps, and the direction flips with the scheme: a light theme's
     panels get DARKER as they come forward (a white card on a grey page), a
     dark theme's get LIGHTER. Getting this backwards is what produces the
     "everything is the same flat slab" look that gradients then get added to
     paper over. */
  /* The light page is clamped below 97.2%. A card in a light theme is pure
     white, and white is a ceiling — so a page set at 98% leaves under two
     points of headroom and the card stops lifting (measured: 1.04:1, under the
     1.05 floor). Clamping the page is the fix that keeps the card at 100%,
     which is where the reading surface belongs. */
  const base = isLight ? Math.min(seed.lightBase, 97.2) : seed.darkBase;
  const step = isLight ? -1 : 1;

  const background = t(nh, nc, base);

  /* How many points of lightness buy one visible step of elevation.
     ---------------------------------------------------------------
     NOT a constant, because contrast is not linear in lightness. Near black,
     3.2 points is a visible lift (Obsidian's 3.5 -> 6.7 measures 1.05:1); at
     5.5% the same 3.2 points measures 1.04 and the card stops reading as a
     separate surface. Two of the eight presets failed on exactly that.

     So solve for it: find the smallest step that clears 1.09:1 against the page
     and express the whole ramp in multiples of it. A dark theme that starts
     lighter automatically gets bigger steps, which is what a designer does by
     eye without noticing they are doing it. */
  let unit = 3.2;
  if (!isLight) {
    for (let d = 1; d <= 16; d += 0.2) {
      if (contrastRatio(t(nh, nc, base + d), background) >= 1.09) {
        unit = d;
        break;
      }
      unit = d;
    }
  }

  // The card is the one surface allowed to reach pure white in a light theme:
  // it is the reading surface, and the extra step is what makes it lift.
  const card = isLight ? t(nh, nc * 0.15, 100) : t(nh, nc * 1.2, base + unit);
  const popover = card;
  const surface2 = isLight ? t(nh, nc * 0.9, base - 3.5) : t(nh, nc * 1.1, base + unit * 1.9);
  const surface3 = isLight ? t(nh, nc * 0.9, base - 7.5) : t(nh, nc, base + unit * 2.8);
  const muted = isLight ? t(nh, nc * 0.8, base - 4.5) : t(nh, nc * 1.1, base + unit * 1.6);

  const foreground = isLight ? t(nh, nc * 2.2, 8.2) : t(nh - 6, nc * 1.5, 92.7);
  const cardForeground = foreground;

  /* ---- ink ramp ---------------------------------------------------------
     Solved, not chosen. `--subtle-foreground` is the one that matters most:
     it carries axis ticks and form labels and it is the token most often
     picked "a bit lighter than muted" straight through the AA floor. */
  const mutedFgL = solveLightness(nh, nc * 0.7, background, 4.9, isLight ? "darker" : "lighter");
  const subtleFgL = solveLightness(nh, nc * 0.6, card, 4.6, isLight ? "darker" : "lighter");
  const mutedForeground = t(nh, nc * 0.7, mutedFgL);
  const subtleForeground = t(nh, nc * 0.6, subtleFgL);

  /* ---- brand ------------------------------------------------------------
     The accent keeps ITS HUE in both themes — a brand that changes identity
     with the colour scheme is the single failure that produced ~43k hardcoded
     palette classes in this codebase before the migration. Only lightness
     moves, and it moves to hit a contrast target against the page. */
  const primaryL = solveLightness(ah, as, background, isLight ? 4.6 : 4.9, isLight ? "darker" : "lighter");
  const primary = t(ah, as, primaryL);
  const primaryForeground = inkFor(primary, nh, nc);

  // Secondary is the accent's quiet sibling: same hue, much less chroma.
  const secondary = isLight ? t(nh, nc * 0.8, base - 5) : t(nh, nc * 1.2, base + unit * 1.9);
  const secondaryForeground = foreground;

  // The hover wash is a whisper of the accent over the surface.
  const accent = isLight ? t(ah, Math.min(as * 0.25, 30), base - 4) : t(ah, Math.min(as * 0.3, 34), base + unit * 2.2);
  const accentForeground = foreground;

  // The focus ring must clear 3:1 against the PAGE, not against the control.
  const ringL = solveLightness(ah, as, background, 3.2, isLight ? "darker" : "lighter");
  const ring = t(ah, as, ringL);

  /* ---- borders ----------------------------------------------------------
     A border is a boundary, not text: 1.5-2:1 against its surface is right.
     Pushing borders to text contrast is what makes an interface look like a
     spreadsheet. */
  const border = isLight ? t(nh, nc * 0.7, base - 8.5) : t(nh, nc * 1.1, base + unit * 3.4);
  const borderStrong = isLight ? t(nh, nc * 0.7, base - 16) : t(nh, nc, base + unit * 5.5);
  const input = border;

  /* ---- status -----------------------------------------------------------
     A tone token is INK FIRST. `--success` is written as `text-success` far more
     often than as `bg-success`, and `--up` / `--down` are *only* ever ink — no
     component in the tree fills a surface with them. So the constraint that
     matters is: readable as text on a card, WITH ITS HUE INTACT.

     An earlier version of this scanned the whole lightness range and picked
     whichever value maximised the contrast of white-or-black placed ON TOP of
     the tone. That is the right question for a solid filled badge and the wrong
     one for everything else, and it had a bad failure mode: on a dark card the
     best "ink on top" score always belongs to a near-white tone, so green and
     red were driven to about 90% lightness and came out as pale, almost
     colourless tints. On a purple theme the candles and every +/-% figure lost
     their hue completely — the loudest colours on a trading screen, gone.

     Solving for ink against the card instead keeps the authored saturation and
     only moves lightness, which is what the shipped palette does (its `--up`
     measures 5.21:1 against the card while staying unmistakably green).

     The fill case still has to work, because a filled badge does exist. It is
     handled by DERIVING the foreground rather than by moving the tone: with the
     tone at ~4.7:1 against a white card, pure white on that tone lands at ~4.7:1
     too, by symmetry of the contrast formula. On a dark card the tone is light,
     so near-black ink on it scores higher still. `nudgeForInk` is the safety
     net for the handful of hues where that symmetry is not enough — it walks
     lightness a little further until the foreground clears AA, and gives up
     rather than desaturate. */
  const statusOn = card;
  const TONE_TARGET = isLight ? 4.7 : 5.0;
  const mk = (hue: number, sat: number) => {
    const dir = isLight ? "darker" : "lighter";
    let l = solveLightness(hue, sat, statusOn, TONE_TARGET, dir);
    let fill = t(hue, sat, l);
    let ink = inkFor(fill, nh, nc);

    // nudgeForInk: keep hue and saturation, move lightness only.
    for (let n = 0; n < 30 && contrastRatio(ink, fill) < 4.5; n++) {
      l += isLight ? -1 : 1;
      if (l < 6 || l > 94) break;
      fill = t(hue, sat, l);
      ink = inkFor(fill, nh, nc);
    }
    return { fill, ink };
  };

  const success = mk(seed.successHue ?? 152, isLight ? 78 : 62);
  const warning = mk(seed.warningHue ?? 38, isLight ? 92 : 80);
  const destructive = mk(seed.destructiveHue ?? 358, isLight ? 72 : 62);
  const info = mk(seed.infoHue ?? 199, isLight ? 88 : 70);

  /* ---- market direction -------------------------------------------------
     Separate tokens from success/destructive by design (rule R1): they are the
     loudest colour on a trading screen and may need to diverge from status.
     Ink-only, so they take the tone solve directly. */
  const up = mk(seed.upHue ?? seed.successHue ?? 152, isLight ? 80 : 64).fill;
  const down = mk(seed.downHue ?? seed.destructiveHue ?? 358, isLight ? 74 : 64).fill;

  /* ---- scrim ------------------------------------------------------------
     Dark in BOTH schemes and light ink in both: a scrim sits over a photograph,
     not over the page, so it must not follow --background. */
  const overlay = t(nh, nc * 1.4, isLight ? 8.2 : seed.darkBase);
  const overlayForeground = t(0, 0, 100);

  /* ---- chart ramp -------------------------------------------------------
     Six categorical hues, and the thing that makes them tellable apart is NOT
     hue alone.

     The first version of this spread hues around the wheel and left lightness
     to whatever the 3:1-against-the-page solve produced — which is nearly the
     same lightness for all six. Six colours at one lightness are separable to
     normal vision and collapse into two clusters under deuteranopia, because
     red-green discrimination is exactly what is missing and lightness is what
     remains. Measured ΔE on that ramp: adjacent pairs at 1.0-1.2.

     So each slot gets its own contrast target against the page as well as its
     own hue, and consecutive slots deliberately alternate light/dark. The
     targets below are not evenly spaced: they zig-zag, so slot N and slot N+1
     always differ in lightness even when their hues happen to converge.

     Separation is then MEASURED by the panel (OKLab ΔE, protan and deutan)
     rather than assumed here — with an owner-chosen spread it can genuinely be
     unsatisfiable, and an honest warning beats silently overriding the hue the
     owner picked. */
  const spread = seed.chartSpread ?? 58;
  const chart: Record<string, string> = {};
  const chartSats = [62, 96, 88, 52, 74, 100];
  const chartTargets = isLight
    ? [4.2, 7.4, 3.2, 6.1, 3.6, 8.6]
    : [5.0, 3.1, 7.2, 3.6, 8.4, 4.4];
  const chartOrder = [0, 3, 1, 4, 2, 5];
  for (let i = 0; i < 6; i++) {
    const hue = ah + spread * chartOrder[i];
    const sat = isLight ? chartSats[i] : Math.min(100, chartSats[i] * 1.05);
    const l = solveLightness(
      hue,
      sat,
      background,
      chartTargets[i],
      isLight ? "darker" : "lighter"
    );
    chart[`--chart-${i + 1}`] = t(hue, sat, l);
  }

  /* REPAIR PASS — generate, then MEASURE, then fix.
     ----------------------------------------------
     The lightness zig-zag above gets most ramps to a passing ΔE, but not all of
     them: at a narrow spread two adjacent hues can land close enough that
     deuteranopia folds them together even at different lightnesses (violet's
     slots 4 and 5 measured ΔE 2.6 under deutan while reading 28 to normal
     vision — invisibly broken for roughly one man in twelve).

     Rather than pretend the heuristic is sufficient, walk the ramp and push any
     colliding slot's lightness apart until it clears the floor. Bounded at 40
     steps and constrained to keep 2.5:1 against the page, so a slot can never
     be repaired into invisibility; if no lightness works, the best attempt is
     kept and the panel's own audit reports the pair. */
  for (let i = 1; i < 6; i++) {
    const prev = chart[`--chart-${i}`];
    const key = `--chart-${i + 1}`;
    const parsed = parseHslTriple(chart[key]);
    if (!parsed) continue;
    const [hue, sat] = parsed;
    let bestL = parsed[2];
    let bestScore = Math.min(deltaE(prev, chart[key], "protan"), deltaE(prev, chart[key], "deutan"));
    if (bestScore >= CVD_FLOOR) continue;

    const away = luminanceOf(prev) > luminanceOf(chart[key]) ? -1 : 1;
    for (let n = 1; n <= 40; n++) {
      const candL = parsed[2] + away * n * 1.5;
      if (candL < 8 || candL > 94) break;
      const cand = t(hue, sat, candL);
      if (contrastRatio(cand, background) < 2.5) break;
      const score = Math.min(deltaE(prev, cand, "protan"), deltaE(prev, cand, "deutan"));
      if (score > bestScore) {
        bestScore = score;
        bestL = candL;
      }
      if (score >= CVD_TARGET) break;
    }
    chart[key] = t(hue, sat, bestL);
  }

  return {
    "--background": background,
    "--foreground": foreground,
    "--card": card,
    "--card-foreground": cardForeground,
    "--popover": popover,
    "--popover-foreground": cardForeground,
    "--surface-2": surface2,
    "--surface-3": surface3,
    "--primary": primary,
    "--primary-foreground": primaryForeground,
    "--secondary": secondary,
    "--secondary-foreground": secondaryForeground,
    "--accent": accent,
    "--accent-foreground": accentForeground,
    "--ring": ring,
    "--muted": muted,
    "--muted-foreground": mutedForeground,
    "--subtle-foreground": subtleForeground,
    "--destructive": destructive.fill,
    "--destructive-foreground": destructive.ink,
    "--success": success.fill,
    "--success-foreground": success.ink,
    "--warning": warning.fill,
    "--warning-foreground": warning.ink,
    "--info": info.fill,
    "--info-foreground": info.ink,
    "--up": up,
    "--down": down,
    "--border": border,
    "--border-strong": borderStrong,
    "--input": input,
    "--overlay": overlay,
    "--overlay-foreground": overlayForeground,
    "--shadow": isLight ? t(nh, nc * 1.5, 0) : t(nh, nc, 0),
    ...chart,
  };
}

export function generatePalette(seed: PaletteSeed): GeneratedPalette {
  return {
    light: generateScheme(seed, "light"),
    dark: generateScheme(seed, "dark"),
  };
}

/* ==========================================================================
   PRESETS

   A preset is a seed plus the non-colour axes. They exist so an owner can get
   somewhere distinctive in one click and then adjust, rather than facing a wall
   of pickers. Each one commits to a different combination of ALL the axes —
   shape and typeface change the character of an interface at least as much as
   hue, and a preset gallery where every entry is the same product in a
   different colour is not worth having.
   ========================================================================== */

export interface Preset {
  id: string;
  label: string;
  blurb: string;
  seed: PaletteSeed;
  radius: string;
  fonts: { sans: string; mono: string };
  motionScale?: string;
  /** Values applied verbatim after generation, per scheme. */
  overrides?: { light?: Record<string, string>; dark?: Record<string, string> };
}

export const PRESETS: Preset[] = [
  {
    id: "obsidian",
    label: "Obsidian",
    blurb: "The shipped look. Cold blue-black, a single azure accent, tight 4px corners.",
    seed: DEFAULT_SEED,
    radius: "0.25rem",
    fonts: { sans: "geist", mono: "jetbrains" },
  },
  {
    id: "aurora",
    label: "Aurora",
    blurb: "Deep indigo with a cyan accent and generous corners. Softer, more consumer.",
    seed: {
      accentHue: 190,
      accentSat: 88,
      neutralHue: 252,
      neutralChroma: 22,
      lightBase: 97.5,
      darkBase: 5.5,
      infoHue: 210,
      chartSpread: 47,
    },
    radius: "0.75rem",
    fonts: { sans: "jakarta", mono: "geistMono" },
  },
  {
    id: "carbon",
    label: "Carbon",
    blurb: "No hue at all in the neutrals, square corners, engineered type. Reads as instrumentation.",
    seed: {
      accentHue: 28,
      accentSat: 96,
      neutralHue: 0,
      neutralChroma: 0,
      lightBase: 95,
      darkBase: 6,
      chartSpread: 64,
    },
    radius: "0px",
    fonts: { sans: "plex", mono: "jetbrains" },
    motionScale: "0.6",
  },
  {
    id: "mint",
    label: "Mint",
    blurb: "Bright, airy, rounded. A green accent on near-white with plenty of light.",
    seed: {
      accentHue: 162,
      accentSat: 84,
      neutralHue: 165,
      neutralChroma: 14,
      lightBase: 98,
      darkBase: 7,
      chartSpread: 52,
    },
    radius: "0.875rem",
    fonts: { sans: "manrope", mono: "geistMono" },
    motionScale: "1.15",
  },
  {
    id: "ember",
    label: "Ember",
    blurb: "Warm charcoal and amber. The neutrals lean brown, which is unusual and reads as deliberate.",
    seed: {
      accentHue: 24,
      accentSat: 92,
      neutralHue: 28,
      neutralChroma: 16,
      lightBase: 96,
      darkBase: 4.5,
      warningHue: 45,
      chartSpread: 55,
    },
    radius: "0.5rem",
    fonts: { sans: "outfit", mono: "jetbrains" },
  },
  {
    id: "violet",
    label: "Violet",
    blurb: "Saturated purple against near-black, with an off-beat grotesque. The loudest option here.",
    seed: {
      accentHue: 272,
      accentSat: 90,
      neutralHue: 268,
      neutralChroma: 26,
      lightBase: 97,
      darkBase: 4,
      chartSpread: 43,
    },
    radius: "0.625rem",
    fonts: { sans: "spaceGrotesk", mono: "geistMono" },
  },
  {
    id: "press",
    label: "Press",
    blurb: "Serif body copy on warm paper. Turns a dashboard into a publication.",
    seed: {
      accentHue: 348,
      accentSat: 68,
      neutralHue: 40,
      neutralChroma: 12,
      lightBase: 97.5,
      darkBase: 8,
      chartSpread: 61,
    },
    radius: "0.125rem",
    fonts: { sans: "sourceSerif", mono: "systemMono" },
    motionScale: "1.3",
  },
  {
    id: "slate",
    label: "Slate",
    blurb: "Neutral, quiet, system-native. Zero font bytes and nothing competing for attention.",
    seed: {
      accentHue: 212,
      accentSat: 72,
      neutralHue: 215,
      neutralChroma: 10,
      lightBase: 97,
      darkBase: 6.5,
      chartSpread: 57,
    },
    radius: "0.375rem",
    fonts: { sans: "system", mono: "systemMono" },
  },

  /* ------------------------------------------------------------------------
     THE SECOND SET
     ------------------------------------------------------------------------
     Each of these moves an axis the first eight left unexplored, rather than
     re-hueing one of them — a gallery of near-identical blues is a longer list
     that offers no more choice. What was missing: gold, a light-first theme, a
     genuinely low-chroma one, a soft consumer palette, a true teal, and a
     square high-contrast terminal.

     NO RED-ACCENT PRESET, deliberately. A red brand would sit on the same hue
     as `--destructive` and, worse, as `--down`: on a platform where red already
     means "you lost money", making it also mean "our brand" puts the loudest
     colour in the interface on both the thing you must not miss and the thing
     that is always on screen. The seed can produce one; it is not offered.
     ------------------------------------------------------------------------ */
  {
    id: "bullion",
    label: "Bullion",
    blurb: "Brass on near-black with barely-there corners. A trading desk after hours.",
    seed: {
      accentHue: 43,
      accentSat: 86,
      neutralHue: 40,
      neutralChroma: 9,
      lightBase: 96.5,
      darkBase: 3,
      // Amber accent and amber warning would be one colour; the warning moves
      // toward orange so an alert still reads as an alert next to the brand.
      warningHue: 28,
      chartSpread: 59,
    },
    radius: "0.125rem",
    fonts: { sans: "jakarta", mono: "jetbrains" },
    motionScale: "0.85",
  },
  {
    id: "nordic",
    label: "Nordic",
    blurb: "Light-first and low-contrast, with a muted blue and a lot of air. The calmest option here.",
    seed: {
      accentHue: 205,
      accentSat: 52,
      neutralHue: 210,
      neutralChroma: 8,
      lightBase: 98.5,
      darkBase: 9.5,
      chartSpread: 50,
    },
    radius: "1rem",
    fonts: { sans: "inter", mono: "geistMono" },
    motionScale: "1.2",
  },
  {
    id: "basalt",
    label: "Basalt",
    blurb: "Almost no colour anywhere. The accent is a grey-blue, so structure does all the work.",
    seed: {
      accentHue: 215,
      accentSat: 20,
      neutralHue: 220,
      neutralChroma: 4,
      lightBase: 96,
      darkBase: 5,
      // The accent is nearly grey, so the STATUS hues carry every signal in the
      // interface. Spread wide, or success and info collapse into each other.
      infoHue: 198,
      successHue: 152,
      chartSpread: 66,
    },
    radius: "0.25rem",
    fonts: { sans: "plex", mono: "jetbrains" },
    motionScale: "0.8",
  },
  {
    id: "sakura",
    label: "Sakura",
    blurb: "Soft pink on warm white, fully rounded. Reads as consumer rather than trading floor.",
    seed: {
      accentHue: 334,
      accentSat: 76,
      neutralHue: 345,
      neutralChroma: 11,
      lightBase: 98,
      darkBase: 7.5,
      // Pink accent sits close to the shipped destructive rose; pushing
      // destructive toward true red keeps "delete" distinct from "brand".
      destructiveHue: 6,
      chartSpread: 45,
    },
    radius: "1rem",
    fonts: { sans: "manrope", mono: "geistMono" },
    motionScale: "1.1",
  },
  {
    id: "lagoon",
    label: "Lagoon",
    blurb: "Deep teal through the neutrals as well as the accent. Cool and saturated without going blue.",
    seed: {
      accentHue: 176,
      accentSat: 80,
      neutralHue: 186,
      neutralChroma: 19,
      lightBase: 97,
      darkBase: 5,
      // Teal accent and the green success are neighbours; success moves down
      // the wheel so a confirmation is not just "the brand again".
      successHue: 138,
      chartSpread: 63,
    },
    radius: "0.625rem",
    fonts: { sans: "outfit", mono: "jetbrains" },
  },
  {
    id: "phosphor",
    label: "Phosphor",
    blurb: "Green on true black, square corners, no easing to speak of. A terminal, not a dashboard.",
    seed: {
      accentHue: 142,
      accentSat: 90,
      neutralHue: 140,
      neutralChroma: 7,
      lightBase: 94.5,
      darkBase: 2.5,
      // The accent has taken the success hue, so success moves to a cooler
      // green-cyan and `--up` follows it — otherwise a winning trade is drawn
      // in the same colour as every button on the screen.
      successHue: 168,
      upHue: 168,
      chartSpread: 68,
    },
    radius: "0px",
    fonts: { sans: "plex", mono: "jetbrains" },
    motionScale: "0.5",
  },
];

export const PRESET_BY_ID: Record<string, Preset> = Object.fromEntries(
  PRESETS.map((p) => [p.id, p])
);

/**
 * The one preset that is NOT generated.
 *
 * "Obsidian" is described as the shipped look, and it has to actually BE the
 * shipped look. Running it through the generator does not reproduce it: measured,
 * 73 of 80 values differ, because the shipped palette was hand-tuned across ten
 * migration phases (its `--card` is a pure `0 0% 100%`; the generator derives a
 * hue-tinted `218 3.6% 100%`) while the generator solves each value from a seed.
 *
 * That mismatch was user-visible in two ways at once. After a Reset the stored
 * theme is empty — which IS the shipped palette — but carried no preset id, so
 * NOTHING highlighted and the panel could not tell you what you were looking at.
 * And clicking the chip labelled "the shipped look" would have written 73
 * different values.
 *
 * Making it an empty theme fixes both: selecting Obsidian is now a genuine no-op
 * that clears every override, and "no overrides" is a state the gallery can name.
 */
export const SHIPPED_PRESET_ID = "obsidian";

/** Turn a preset into the stored theme shape. */
export function presetToTheme(preset: Preset) {
  if (preset.id === SHIPPED_PRESET_ID) {
    return {
      version: 1 as const,
      light: {} as Record<string, string>,
      dark: {} as Record<string, string>,
      base: {} as Record<string, string>,
      fonts: {} as Record<string, string>,
      presetId: preset.id,
    };
  }
  const palette = generatePalette(preset.seed);
  const light = { ...palette.light, ...(preset.overrides?.light ?? {}) };
  const dark = { ...palette.dark, ...(preset.overrides?.dark ?? {}) };
  const base: Record<string, string> = { "--radius": preset.radius };
  if (preset.motionScale) base["--motion-scale"] = preset.motionScale;
  return {
    version: 1 as const,
    light,
    dark,
    base,
    fonts: { ...preset.fonts },
    presetId: preset.id,
  };
}

/**
 * Which preset is a theme actually showing?
 *
 * Answered by comparing VALUES, not by trusting the stored `presetId`. The id is
 * only a hint: it is absent after a reset, absent on a palette built in the seed
 * studio, absent on an imported theme, and stale the moment someone nudges one
 * token. Deriving it means the gallery is right in all of those cases, and
 * "Custom" becomes a state the panel can state plainly instead of showing
 * nothing selected and letting the owner guess.
 */
export function matchPresetId(theme: {
  light: Record<string, string>;
  dark: Record<string, string>;
  base: Record<string, string>;
  fonts: Record<string, string>;
}): string | undefined {
  const bag = (o: Record<string, string>) =>
    Object.keys(o)
      .sort()
      .map((k) => `${k}=${o[k]}`)
      .join("|");
  /* COMPONENT GEOMETRY IS NOT PART OF A PALETTE'S IDENTITY.
     ----------------------------------------------------------------------
     `base` holds `--radius` and `--motion-scale`, which a preset does own, AND
     the 27 component tokens, which it does not. Signing over the whole bag
     meant one nudge of table density made every preset stop matching: the
     gallery showed no tick at all, on a palette that was still exactly
     Obsidian. Compare the palette's half only — the same reason `applyPreset`
     preserves the other half. */
  const paletteBase = (o: Record<string, string>) => bag(splitBase(o).palette);
  const signature = [bag(theme.light), bag(theme.dark), paletteBase(theme.base), bag(theme.fonts)].join("//");
  for (const preset of PRESETS) {
    const t = presetToTheme(preset);
    const s = [bag(t.light), bag(t.dark), paletteBase(t.base), bag(t.fonts)].join("//");
    if (s === signature) return preset.id;
  }
  return undefined;
}
