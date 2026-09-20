"use client";

/**
 * Illustration primitives.
 *
 * The grammar is lifted from the MashDiv store art (`store/public/products/*.svg`):
 * a dark ruled ground, two soft glows, mock product UI in rounded panels, a few
 * marks that move. That art is excellent — but it is a *store thumbnail*. Every
 * colour in it is a literal (`#101018`, `#34d399`), it carries the vendor
 * lockup and an "ADDON" badge, and it only has a dark mode. Shipping those files
 * into the product would put MashDiv branding on the operator's own landing page
 * and reintroduce the exact emerald Phase 8a spent a day removing.
 *
 * So this is the same craft, re-drawn on tokens. Every fill is `hsl(var(--…))`,
 * which means the art follows the theme — including a white ground in light
 * mode, which the store files cannot do — and it follows the operator's brand
 * hue if they change `--primary`.
 *
 * Two things worth knowing before adding a scene:
 *
 *  - **Gradient ids must be unique per instance.** Two scenes on one page with
 *    a `id="glow"` each means the second definition wins for both. `useSceneIds`
 *    derives them from `useId()`; never hardcode one.
 *  - **A `stroke-dasharray` draw animation is invisible at rest.** If reduced
 *    motion is on, `stroke-dashoffset` has to be reset to 0 or the line simply
 *    is not there. Same trap the store generator hit.
 *  - **An animation that loops through a figure makes the figure lie.** A
 *    `Meter` carries a number that is printed next to it, so its resting state
 *    has to BE that number. `lart-px` used to oscillate 0.72..1 forever, which
 *    left a bar labelled "74%" painting 53% at both ends of its cycle — and
 *    only reduced-motion users ever saw the truth. It now grows in once and
 *    holds at full, so the rest state matches the label in both modes.
 *
 * NOT ONLY HEROES
 * ---------------
 * The kit started as five 640x500 landing heroes, and three things were welded
 * to that: the viewBox, the two glows, and `role="img"` with a required label.
 * All three are wrong for a 120x56 step marker sitting in a product card — a
 * radial glow at that size is a smudge, and a label is a duplicate when the art
 * restates the sentence printed 8px underneath it. So `viewBox` and `glow` are
 * props now, and `label` is optional (omitted ⇒ `aria-hidden`). The defaults
 * reproduce the previous output exactly, including the glow ellipses, which are
 * now expressed as fractions of the viewBox rather than as the constants they
 * happened to be at 640x500.
 */

import React, { createContext, useContext, useId } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Per-instance ids
// ---------------------------------------------------------------------------

interface SceneIds {
  accent: string;
  accentSoft: string;
  glowA: string;
  glowB: string;
  fade: string;
  clip: string;
}

const SceneIdContext = createContext<SceneIds | null>(null);

export function useSceneIds(): SceneIds {
  const ids = useContext(SceneIdContext);
  if (!ids) throw new Error("Scene primitives must be rendered inside <Scene>");
  return ids;
}

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

/**
 * `lart-ma` runs to -240 over 9.6s, not to -120 over 4.8s. That is the SAME 25
 * units per second, so nothing on screen changes speed. What changes is which
 * dash periods can loop without a visible jump: the offset distance has to be a
 * whole number of dash periods, and 120 was a multiple of 12 (what `Flow` uses)
 * but not of 8 or 16 (what `Arrow` uses at width 2 and width 4). Every restart
 * of a width-2 `Arrow` march used to jump a third of a period. 240 divides by
 * all three.
 *
 * Nothing in here may contain a backtick — it is a template literal, and a
 * stray one silently ends the stylesheet at that character.
 */
const SCENE_CSS = `
@keyframes lart-fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes lart-pu{0%,100%{opacity:.9}50%{opacity:.45}}
@keyframes lart-bl{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes lart-ma{to{stroke-dashoffset:-240}}
@keyframes lart-dr{0%{stroke-dashoffset:1200}100%{stroke-dashoffset:0}}
@keyframes lart-be{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
@keyframes lart-eq{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.6)}}
@keyframes lart-sp{to{transform:rotate(360deg)}}
@keyframes lart-px{0%{transform:scaleX(.72)}100%{transform:scaleX(1)}}
@keyframes lart-ri{0%{transform:scale(.6);opacity:.55}100%{transform:scale(1.5);opacity:0}}
/* --- the P2P step vocabulary ------------------------------------------------
   All three LOOP and none is an entrance, because the strip they run in
   unmounts and remounts on every market filter change: an entrance would
   re-fire each time somebody changed a dropdown, which is the opposite of
   premium. A loop that is already mid-cycle when it mounts reads as ambient.
   The --lart-run custom property is the travel distance, set per call site, so
   one keyframe serves connectors of different lengths and both directions.
   (No backticks in this comment: the whole stylesheet is a template literal.) */
@keyframes lart-carry{
  0%{transform:translateX(0);opacity:0}
  12%{opacity:1}
  84%{opacity:1}
  100%{transform:translateX(var(--lart-run,0px));opacity:0}
}
@keyframes lart-hold{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:.6;transform:scale(1.12)}}
@keyframes lart-ping{0%{transform:scale(.75);opacity:.5}70%,100%{transform:scale(1.9);opacity:0}}
.lart-float{animation:lart-fl 9s ease-in-out infinite}
.lart-pulse{animation:lart-pu 6s ease-in-out infinite}
.lart-blink{animation:lart-bl 3.4s ease-in-out infinite}
.lart-march{animation:lart-ma 9.6s linear infinite}
.lart-draw{stroke-dasharray:1200;stroke-dashoffset:1200;animation:lart-dr 9s ease-in-out infinite alternate}
.lart-breathe{transform-box:fill-box;transform-origin:center;animation:lart-be 6s ease-in-out infinite}
.lart-eq{transform-box:fill-box;transform-origin:center bottom;animation:lart-eq 4s ease-in-out infinite}
.lart-spin{transform-box:fill-box;transform-origin:center;animation:lart-sp 34s linear infinite}
.lart-grow{transform-box:fill-box;transform-origin:left center;animation:lart-px 1.6s ease-out both}
.lart-ripple{transform-box:fill-box;transform-origin:center;animation:lart-ri 3.2s ease-out infinite}
.lart-carry{animation:lart-carry 4.4s cubic-bezier(.45,0,.25,1) infinite}
.lart-hold{transform-box:fill-box;transform-origin:center;animation:lart-hold 5.2s ease-in-out infinite}
.lart-ping{transform-box:fill-box;transform-origin:center;animation:lart-ping 3.6s cubic-bezier(0,.5,.4,1) infinite}
@media (prefers-reduced-motion:reduce){
  .lart-float,.lart-pulse,.lart-blink,.lart-march,.lart-draw,.lart-breathe,
  .lart-eq,.lart-spin,.lart-grow,.lart-ripple,
  .lart-carry,.lart-hold,.lart-ping{animation:none}
  /* A draw animation parks at dashoffset 1200 — i.e. nothing painted at all. */
  .lart-draw{stroke-dashoffset:0}
  .lart-ripple{opacity:0}
  /* Three that are PURE ATMOSPHERE: the mark they decorate says the same thing
     standing still, so with motion off they are removed rather than frozen —
     a travelling coin parked mid-rail, or a halo stopped at 60% opacity, is a
     shape the drawing does not otherwise contain. */
  .lart-carry,.lart-ping{opacity:0}
  .lart-hold{opacity:.35}
}
`;

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

/**
 * The stage: two glows and the defs every primitive draws from.
 *
 * `label` is the alt text. A hero scene carries real product meaning, so it
 * gets a description. OMIT IT ONLY when the art restates adjacent text — a step
 * marker drawn directly above the sentence it depicts is decoration to a screen
 * reader, and announcing both is the same fact twice.
 */
export function Scene({
  label,
  children,
  className,
  viewBox = "0 0 640 500",
  glow = true,
  preserveAspectRatio,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
  /** Defaults to the 640x500 hero stage. */
  viewBox?: string;
  /** The two radial halos. Off below roughly 200 units wide — they read as dirt. */
  glow?: boolean;
  preserveAspectRatio?: string;
}) {
  const raw = useId().replace(/:/g, "");
  const ids: SceneIds = {
    accent: `${raw}-acc`,
    accentSoft: `${raw}-accsoft`,
    glowA: `${raw}-glowa`,
    glowB: `${raw}-glowb`,
    fade: `${raw}-fade`,
    clip: `${raw}-clip`,
  };

  /* The glow geometry used to be eight literals that were only correct at
     640x500. As fractions they reproduce those literals exactly (0.5 * 640 =
     320, 0.94 * 500 = 470, …) and survive a different stage. */
  const [, , vbW = 640, vbH = 500] = viewBox.split(/[\s,]+/).map(Number);

  return (
    <SceneIdContext.Provider value={ids}>
      <svg
        viewBox={viewBox}
        preserveAspectRatio={preserveAspectRatio}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        focusable="false"
        style={{ fontFamily: "inherit" }}
        className={cn("w-full", className)}
      >
        <style>{SCENE_CSS}</style>
        <defs>
          <linearGradient id={ids.accent} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id={ids.accentSoft} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={ids.glowA} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={ids.glowB} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.14" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
          {/* The only literals in this file, and they must stay literal: inside
              a <mask> the channel value IS the alpha, so white means "keep" and
              black means "cut". These are luminance, not colour — swapping them
              for tokens would make the mask follow the theme and the fade would
              invert in light mode. */}
          <radialGradient id={`${ids.clip}-g`} cx="0.5" cy="0.45" r="0.62">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask id={ids.clip}>
            <rect width={vbW} height={vbH} fill={`url(#${ids.clip}-g)`} />
          </mask>
          <linearGradient id={ids.fade} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="0.5" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* NO GRID.

            A scene used to rule its own 40-unit grid, masked at the edges so it
            would not end in a hard line. The mask hid the edge and could do
            nothing about the real problem: the page ground *already* draws a
            grid, at 72 CSS px, and an SVG's units are not CSS pixels — a 640-unit
            viewBox laid out ~640px wide put the scene's rules at 40px against
            the page's 72px. Two grids at different pitches, one of them confined
            to a rectangle, is exactly what makes an illustration read as an image
            pasted into the page instead of as part of it. The page ground is the
            only grid; the art is transparent and lets it through.

            The glows stay. They are radial and masked to nothing at the edges, so
            they read as a halo behind the panels rather than as a tinted box —
            and unmasked they would be cut off square, since both ellipses are
            wider than the viewBox. */}
        {glow && (
          <g mask={`url(#${ids.clip})`}>
            <ellipse
              className="lart-pulse"
              cx={vbW * 0.171875}
              cy={vbH * 0.08}
              rx={vbW * 0.5}
              ry={vbH * 0.4}
              fill={`url(#${ids.glowA})`}
            />
            <ellipse
              className="lart-pulse"
              cx={vbW * 0.875}
              cy={vbH * 0.94}
              rx={vbW * 0.46875}
              ry={vbH * 0.38}
              fill={`url(#${ids.glowB})`}
              style={{ animationDelay: "1.6s" }}
            />
          </g>
        )}

        {children}
      </svg>
    </SceneIdContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

/**
 * Corner radius for a piece of mock-UI artwork, as a STYLE rather than an
 * attribute — so it follows the design system instead of being frozen.
 *
 * These scenes draw the product's own interface, so their corners are a
 * statement about the product's corners. Hardcoded, they contradicted it: a site
 * set to a 0px radius rendered a square interface next to a hero illustration of
 * a rounded one, which is the mismatch that prompted this.
 *
 * WHY A ROLE AND NOT JUST A NUMBER
 * --------------------------------
 * The first version of this took only `r` and multiplied every shape in every
 * scene by `--icon-radius-scale`. One axis for five different kinds of shape is
 * wrong in both directions, and it was wrong at every radius except zero:
 *
 *  - `--icon-radius-scale` is derived as `radius / 4` and CAPPED AT 2 (see
 *    `deriveIconGeometry`), because past that an icon stops depicting its
 *    subject. A card is not an icon. At the shipped 4px the scale is 1, so a
 *    392x236 mock panel drew a 14-unit corner next to real cards drawing 4 —
 *    three and a half times rounder than the interface it is a picture of. At
 *    a 14px radius the cap made it 28 against real cards at 14.
 *  - A pill is not a corner treatment, it is the SHAPE. globals.css already
 *    refuses to scale an icon radius past 3 user units for exactly this reason
 *    ("`rx="9"` is how lucide draws a round tag"). The landing art had no such
 *    guard, so at a 2px radius the "Long · 1.0 lot" tag became a lozenge and at
 *    0px it became a rectangle — while the real `rounded-full` chips next to it
 *    stayed pills, because `--radius` never reached them either.
 *
 * So the caller declares what the shape IS and the radius is derived per role:
 *
 *  - `panel`   an outer card            -> `--radius` (what `rounded-lg` is)
 *  - `inset`   a well/row inside a card -> `--radius * 0.75` (`rounded-md`)
 *  - `control` a button, tile or segment-> `--radius * 0.75` (`rounded-md`)
 *  - `mark`    a candle body, a depth
 *              bar, a corner inside a
 *              glyph — drawn, not boxed -> authored value x `--icon-radius-scale`
 *  - `pill`    radius IS the shape      -> authored value, never scaled
 *
 * The box roles are clamped with `min()` to the value the scene was drawn at.
 * The authored number is a ceiling, not a target: `Well` is used at r=4 on a
 * 15-unit row and at r=9 on a 64-unit one, and an unclamped 14px theme would
 * have turned the short one into a lozenge — the very failure this is here to
 * stop, reintroduced from the other end.
 *
 * `--radius` is read directly rather than through `--radius-md` / `--radius-lg`
 * because those live in Tailwind's `@theme` and are emitted only when a utility
 * uses them; `--radius` is declared in `:root` and always exists. The ratios are
 * the ramp's own (see `app/globals.css`).
 *
 * `rx` is a real CSS geometry property in SVG 2, and an inline style beats a
 * presentation attribute outright. The attribute is deliberately LEFT IN PLACE
 * by every call site: if the property is ever unsupported the artwork still
 * draws exactly as authored, it simply stops following the token.
 */
export type CornerRole = "panel" | "inset" | "control" | "mark" | "pill";

const ROLE_LENGTH: Record<"panel" | "inset" | "control", string> = {
  panel: "var(--radius)",
  inset: "calc(var(--radius) * 0.75)",
  control: "calc(var(--radius) * 0.75)",
};

export function corner(role: CornerRole, r: number): React.CSSProperties {
  const rx =
    role === "pill"
      ? `${r}px`
      : role === "mark"
        ? `calc(${r}px * var(--icon-radius-scale, 1))`
        : `min(${r}px, ${ROLE_LENGTH[role]})`;
  return { rx } as React.CSSProperties;
}

/** A mock UI panel. `accent` promotes the hairline when the panel is the point. */
export function Card({
  x,
  y,
  w,
  h,
  r = 14,
  accent = false,
  children,
  className,
  style,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  accent?: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <g className={className} style={style}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r} style={corner("panel", r)}
        fill="hsl(var(--card))"
        stroke={accent ? "hsl(var(--primary))" : "hsl(var(--border))"}
        strokeOpacity={accent ? 0.45 : 1}
        strokeWidth={accent ? 1.5 : 1}
      />
      {children}
    </g>
  );
}

/** An inset well — one step down the ramp, for rows inside a panel. */
export function Well({ x, y, w, h, r = 9 }: { x: number; y: number; w: number; h: number; r?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={r} style={corner("inset", r)} fill="hsl(var(--surface-2))" />;
}

/** Pill. `tone` stays at accent unless the value is genuinely directional. */
export function Chip({
  x,
  y,
  label,
  tone = "accent",
  w,
  size = 11,
}: {
  x: number;
  y: number;
  label: string;
  tone?: "accent" | "up" | "down" | "muted";
  w?: number;
  size?: number;
}) {
  const color =
    tone === "up"
      ? "hsl(var(--up))"
      : tone === "down"
        ? "hsl(var(--down))"
        : tone === "muted"
          ? "hsl(var(--muted-foreground))"
          : "hsl(var(--primary))";
  const width = w ?? label.length * size * 0.62 + 22;
  const h = size + 13;
  return (
    <g>
      <rect x={x} y={y} width={width} height={h} rx={h / 2} style={corner("pill", h / 2)} fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.35" />
      <text
        x={x + width / 2}
        y={y + h / 2 + size * 0.36}
        textAnchor="middle"
        fontSize={size}
        fontWeight="600"
        fill={color}
      >
        {label}
      </text>
    </g>
  );
}

/** The accent-filled tile every icon sits in, matching `Eyebrow` on the page. */
export function IconTile({
  x,
  y,
  size = 38,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  children?: React.ReactNode;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={size * 0.3} style={corner("control", size * 0.3)}
        fill="hsl(var(--primary))"
        fillOpacity="0.12"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.28"
      />
      {children}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

/**
 * `up`/`down` are PRICE direction and nothing else (R5). `success` is the
 * operation family — a settled transfer, an escrow release — and the two are
 * kept apart here so one green mark on a screen never means two things.
 *
 * `accent-ink` is NOT a second accent. It is the tonal-chip ink, and it exists
 * because a label drawn INSIDE a tinted mark is the one case where `accent` is
 * the wrong colour: `--primary` text on a `--primary`/10 ground measures
 * 3.94-4.48 (globals.css, "Tonal ink"), because the tint pulls the ground
 * toward the ink. `--color-primary-ink` is derived by mixing 88% toward
 * `--foreground`, so it follows an operator's palette instead of being a
 * hand-picked value, and it clears 4.5 on every rung of the light ramp.
 *
 * Use it whenever a `Label` sits on a tint of its own tone. On a raw surface
 * rung — a caption under a figure, a lane heading — `accent` is correct and
 * `accent-ink` would just be a duller accent.
 *
 * The fallback matters: `--color-*` names live in Tailwind's `@theme`, not in
 * `:root` directly, and a stylesheet that never compiled a `*-ink` utility
 * would leave the variable undefined and the fill invalid — which paints black,
 * not "the old colour".
 */
type Tone = "ink" | "muted" | "subtle" | "accent" | "accent-ink" | "up" | "down" | "success";

const TONE: Record<Tone, string> = {
  ink: "hsl(var(--foreground))",
  muted: "hsl(var(--muted-foreground))",
  subtle: "hsl(var(--subtle-foreground))",
  accent: "hsl(var(--primary))",
  "accent-ink": "var(--color-primary-ink, hsl(var(--primary)))",
  up: "hsl(var(--up))",
  down: "hsl(var(--down))",
  success: "hsl(var(--success))",
};

export function Label({
  x,
  y,
  children,
  size = 12,
  weight = 500,
  tone = "muted",
  anchor = "start",
  mono = false,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  weight?: number | string;
  tone?: Tone;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      fill={TONE[tone]}
      textAnchor={anchor}
      style={mono ? { fontVariantNumeric: "tabular-nums" } : undefined}
    >
      {children}
    </text>
  );
}

// ---------------------------------------------------------------------------
// Data marks
// ---------------------------------------------------------------------------

/** Build a smooth path through evenly spaced values normalised to 0..1. */
function curvePath(values: number[], x: number, y: number, w: number, h: number) {
  const step = w / (values.length - 1);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [x + i * step, y + h - ((v - min) / span) * h] as const);

  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mx = (px + cx) / 2;
    d += ` C ${mx} ${py} ${mx} ${cy} ${cx} ${cy}`;
  }
  return { d, pts };
}

/** An equity/price curve with an optional fill under it and an end marker. */
export function Curve({
  values,
  x,
  y,
  w,
  h,
  fill = true,
  tone = "accent",
  animate = true,
  marker = true,
  width = 2.5,
}: {
  values: number[];
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: boolean;
  tone?: "accent" | "up" | "down";
  animate?: boolean;
  marker?: boolean;
  width?: number;
}) {
  const ids = useSceneIds();
  const { d, pts } = curvePath(values, x, y, w, h);
  const color = tone === "up" ? "hsl(var(--up))" : tone === "down" ? "hsl(var(--down))" : "hsl(var(--primary))";
  const last = pts[pts.length - 1];

  return (
    <g>
      {fill && (
        <path
          d={`${d} L ${x + w} ${y + h} L ${x} ${y + h} Z`}
          fill={tone === "accent" ? `url(#${ids.accentSoft})` : color}
          fillOpacity={tone === "accent" ? 1 : 0.14}
        />
      )}
      <path
        className={animate ? "lart-draw" : undefined}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {marker && (
        <>
          <circle className="lart-ripple" cx={last[0]} cy={last[1]} r="9" fill={color} />
          <circle cx={last[0]} cy={last[1]} r="4" fill={color} stroke="hsl(var(--card))" strokeWidth="2" />
        </>
      )}
    </g>
  );
}

/** Candles. `up`/`down` here is real direction of price, which is what R5 reserves them for. */
export function Candles({
  values,
  x,
  y,
  w,
  h,
}: {
  values: { o: number; c: number; hi: number; lo: number }[];
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const all = values.flatMap((v) => [v.hi, v.lo]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const slot = w / values.length;
  const body = Math.max(3, slot * 0.5);
  const at = (v: number) => y + h - ((v - min) / span) * h;

  return (
    <g>
      {values.map((v, i) => {
        const cx = x + i * slot + slot / 2;
        const up = v.c >= v.o;
        const color = up ? "hsl(var(--up))" : "hsl(var(--down))";
        const top = at(Math.max(v.o, v.c));
        const bot = at(Math.min(v.o, v.c));
        return (
          <g key={i}>
            <line x1={cx} y1={at(v.hi)} x2={cx} y2={at(v.lo)} stroke={color} strokeWidth="1.5" strokeOpacity="0.8" />
            <rect
              x={cx - body / 2}
              y={top}
              width={body}
              height={Math.max(2, bot - top)}
              rx="1.5" style={corner("mark", 1.5)}
              fill={color}
              fillOpacity={up ? 0.85 : 0.85}
            />
          </g>
        );
      })}
    </g>
  );
}

/** Horizontal meter. The filled run is the figure; the track is surface. */
export function Meter({
  x,
  y,
  w,
  value,
  h = 8,
  tone = "accent",
  animate = false,
}: {
  x: number;
  y: number;
  w: number;
  value: number;
  h?: number;
  tone?: "accent" | "up" | "down";
  animate?: boolean;
}) {
  const color = tone === "up" ? "hsl(var(--up))" : tone === "down" ? "hsl(var(--down))" : "hsl(var(--primary))";
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} style={corner("pill", h / 2)} fill="hsl(var(--surface-3))" />
      <rect
        className={animate ? "lart-grow" : undefined}
        x={x}
        y={y}
        width={Math.max(h, w * Math.min(1, Math.max(0, value)))}
        height={h}
        rx={h / 2} style={corner("pill", h / 2)}
        fill={color}
      />
    </g>
  );
}

/** Progress ring, for a single headline percentage. */
export function Ring({
  cx,
  cy,
  r,
  value,
  width = 9,
  children,
}: {
  cx: number;
  cy: number;
  r: number;
  value: number;
  width?: number;
  children?: React.ReactNode;
}) {
  const circumference = 2 * Math.PI * r;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--surface-3))" strokeWidth={width} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={`${circumference * Math.min(1, value)} ${circumference}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {children}
    </g>
  );
}

/** Volume/activity bars. Decorative rhythm, so they stay on the surface ramp. */
export function Bars({
  values,
  x,
  y,
  w,
  h,
  tone = "surface",
}: {
  values: number[];
  x: number;
  y: number;
  w: number;
  h: number;
  tone?: "surface" | "accent";
}) {
  const slot = w / values.length;
  const bw = slot * 0.56;
  const max = Math.max(...values) || 1;
  return (
    <g>
      {values.map((v, i) => {
        const bh = Math.max(3, (v / max) * h);
        return (
          <rect
            key={i}
            className="lart-eq"
            style={{ animationDelay: `${(i % 7) * 0.22}s`, ...corner("mark", 2) }}
            x={x + i * slot + (slot - bw) / 2}
            y={y + h - bh}
            width={bw}
            height={bh}
            rx={2}
            fill={tone === "accent" ? "hsl(var(--primary))" : "hsl(var(--surface-3))"}
            fillOpacity={tone === "accent" ? 0.75 : 1}
          />
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Connectors & figures
// ---------------------------------------------------------------------------

/** Animated dashed run between two points — the "something is moving" mark. */
export function Flow({
  x1,
  y1,
  x2,
  y2,
  delay = 0,
  width = 3.5,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay?: number;
  width?: number;
}) {
  return (
    <line
      className="lart-march"
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="hsl(var(--primary))"
      strokeWidth={width}
      strokeDasharray="2 10"
      strokeLinecap="round"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

/**
 * A DIRECTED connector.
 *
 * `Flow` says "something is moving" and nothing about which way, which is fine
 * for a fan-out where every branch goes the same direction anyway. It is not
 * fine for a diagram whose whole content is that two legs of one trade travel
 * in OPPOSITE directions — there the arrowhead is the information.
 *
 * `march` animates the shaft's dashes. Under reduced motion they stop and the
 * shaft is still painted, unlike `lart-draw`, which parks at "nothing drawn at
 * all" and needs the explicit reset in SCENE_CSS.
 *
 * `dashed` is the same dash pattern standing still. It exists because "outside
 * this platform" is a STRUCTURAL fact about a rail, not a temporal one — the
 * cash leg is dashed whether or not it happens to be moving — and tying the
 * pattern to the animation made those two ideas impossible to separate.
 *
 * THE DASH PERIOD IS NOT A FREE CHOICE. `lart-march` runs
 * `stroke-dashoffset` to -120, so the pattern only loops seamlessly if 120 is a
 * whole number of periods. This was "2 7" — period 9, 13.33 periods — and every
 * restart visibly jumped. "2 6" is period 8, which divides 120 exactly 15 times.
 */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  tone = "accent",
  march = false,
  dashed = false,
  width = 2,
  head = 7,
  delay = 0,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: "accent" | "muted" | "success";
  march?: boolean;
  dashed?: boolean;
  width?: number;
  /** Length of the head along the run; the shaft stops short by exactly this. */
  head?: number;
  delay?: number;
}) {
  const color = TONE[tone];
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  const hw = head * 0.55;

  return (
    <g>
      <line
        className={march ? "lart-march" : undefined}
        x1={x1}
        y1={y1}
        x2={bx}
        y2={by}
        stroke={color}
        strokeWidth={width}
        /* BUTT caps on a dashed run, round on a solid one. A round cap adds
           half the stroke width to EACH end of EVERY dash, so "2 6" at width 2
           paints 4-long capsules with 4 of gap — a row of dots, not a dashed
           line — and the pattern you authored is not the one on screen. */
        strokeLinecap={march || dashed ? "butt" : "round"}
        /* Equal dash and gap at twice the stroke width, so a heavier arrow gets
           a proportionally longer dash. 240 % (4 * width) must be 0 for the
           march to loop seamlessly; it holds at every width this kit uses
           (2 -> period 8, 3 -> 12, 4 -> 16). */
        strokeDasharray={march || dashed ? `${width * 2} ${width * 2}` : undefined}
        style={march ? { animationDelay: `${delay}s` } : undefined}
      />
      <path
        d={`M ${x2} ${y2} L ${bx - uy * hw} ${by + ux * hw} L ${bx + uy * hw} ${by - ux * hw} Z`}
        fill={color}
      />
    </g>
  );
}

/** Static connector for structure (a tree edge, a rail) rather than movement. */
export function Link2({ d, dashed = false }: { d: string; dashed?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="hsl(var(--border-strong))"
      strokeWidth="1.5"
      strokeDasharray={dashed ? "4 5" : undefined}
    />
  );
}

/** A person. Used wherever the scene is about counterparties, not accounts. */
export function Avatar({
  cx,
  cy,
  r = 20,
  tone = "accent",
}: {
  cx: number;
  cy: number;
  r?: number;
  tone?: "accent" | "muted";
}) {
  const color = tone === "accent" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity="0.14" stroke={color} strokeOpacity="0.45" strokeWidth="1.5" />
      <circle cx={cx} cy={cy - r * 0.24} r={r * 0.3} fill={color} />
      <path
        d={`M ${cx - r * 0.52} ${cy + r * 0.58} Q ${cx} ${cy + r * 0.02} ${cx + r * 0.52} ${cy + r * 0.58}`}
        fill={color}
      />
    </g>
  );
}

/** Status dot with a live blink. */
export function Dot({ cx, cy, r = 4, tone = "up" }: { cx: number; cy: number; r?: number; tone?: Tone }) {
  return <circle className="lart-blink" cx={cx} cy={cy} r={r} fill={TONE[tone]} />;
}
