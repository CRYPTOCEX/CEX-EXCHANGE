import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { getFooterVariant, getNavbarVariant } from "./variants";

/**
 * Wireframe diagrams of the chrome variants, for the admin picker.
 * ============================================================================
 *
 * Drawn, not photographed. A screenshot of each layout would be prettier for
 * about one release: it goes stale the moment someone moves the action cluster,
 * and it goes stale SILENTLY — nothing fails, the picker just starts lying to
 * the owner about what they are choosing. It also doubles (light and dark) and
 * quadruples again at 2x, so a four-variant picker ships eight to sixteen binary
 * assets that no test covers. These are a few hundred bytes of SVG that inherit
 * the current theme's tokens, so dark mode is free and there is nothing to
 * re-export when a layout changes.
 *
 * WHAT THESE MUST AGREE WITH
 *
 * The navbar diagrams mirror `components/partials/header/navbar-layouts.tsx` at
 * desktop width (>=xl), because that is where the variants actually differ — the
 * mobile bar is nearly identical in all four. A diagram that disagrees with the
 * component is worse than none: it makes the owner's choice wrong and they only
 * find out after saving. Bar heights are read from the registry rather than
 * copied, so a variant that changes height cannot leave a stale diagram behind.
 *
 * Footer variants are not built yet (phase 4), so those three are drawn from
 * their registered `columns` count and capabilities. When the layouts land,
 * check them against the components the same way.
 */

/* One canvas for every diagram, so a row of picker cards shares a baseline and
   the height difference between variants is the thing the eye picks up. */
const CANVAS_W = 200;
const CANVAS_H = 96;
const PAD_X = 12;

/** Diagram units per declared `rem`. 6.5rem -> 65 of the 96-unit canvas. */
const REM_UNITS = 10;
/** `classic`'s height, and the only sane answer for a value we cannot read. */
const FALLBACK_REM = 4;
/** Leave room under the tallest bar for the page ghost that gives it scale. */
const MAX_BAR_H = CANVAS_H - 16;

/**
 * Turn the registry's CSS length into a drawn bar height.
 *
 * The registry types `height` as a string, so it can hold `72px` or an empty
 * string as easily as `4rem`. `parseFloat("px")` is NaN, NaN reaches the `y`
 * attribute, and the browser drops the whole shape — an empty card rather than a
 * loud failure. Falling back to the classic height keeps the picker useful.
 */
function barHeightFor(cssLength: string | undefined): number {
  const match = /^\s*(\d*\.?\d+)\s*rem\s*$/.exec(cssLength ?? "");
  const rem = match ? Number.parseFloat(match[1]) : Number.NaN;
  const safe = Number.isFinite(rem) && rem > 0 ? rem : FALLBACK_REM;
  return Math.min(Math.round(safe * REM_UNITS), MAX_BAR_H);
}

/* Rounded on the two corners that touch the frame's edge only — a fully rounded
   rect would pull away from the frame's border where the two meet. Paths rather
   than a <clipPath> because a clip needs an id, ids collide when four diagrams
   sit on one page, and de-colliding them needs `useId`, which would make these
   client-only for no other reason. */
function topRoundedPath(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y + h}V${y + r}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}V${y + h}Z`;
}

function bottomRoundedPath(x: number, y: number, w: number, h: number, r: number) {
  return `M${x},${y}V${y + h - r}a${r},${r} 0 0 1 ${r},${r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${-r}V${y}Z`;
}

/* --------------------------------------------------------------------------
   Shared marks. Every diagram is built from these, so "the logo" looks like the
   same object in all seven and the only thing that changes between cards is
   WHERE things sit.
   ----------------------------------------------------------------------- */

const NAV_H = 5;

/**
 * The brand. The one mark drawn in `fill-primary`, and the only one — an owner
 * comparing two cards should be able to find the logo without reading anything.
 */
function Brand({ x, cy, mark = 12, word = 18 }: { x: number; cy: number; mark?: number; word?: number }) {
  return (
    <g>
      <rect x={x} y={cy - mark / 2} width={mark} height={mark} rx={3.5} className="fill-primary" />
      <rect
        x={x + mark + 4}
        y={cy - NAV_H / 2}
        width={word}
        height={NAV_H}
        rx={NAV_H / 2}
        className="fill-primary/45"
      />
    </g>
  );
}

const brandWidth = (mark = 12, word = 18) => mark + 4 + word;

/** Nav items: neutral bars, deliberately quieter than the brand. */
function NavItems({ x, cy, widths, gap = 5 }: { x: number; cy: number; widths: number[]; gap?: number }) {
  /* Offsets are DERIVED, not accumulated in a mutable cursor across the map
     callback. The accumulator version rendered identically but is a write to a
     variable captured from the render scope, which `react-hooks/immutability`
     rejects and the React Compiler is entitled to break — it may memoise the
     callback and reuse it, at which point the running total is whatever the
     previous render left behind and every bar after the first is misplaced. */
  const offsets = widths.reduce<number[]>((acc, w, i) => {
    acc.push(i === 0 ? x : acc[i - 1] + widths[i - 1] + gap);
    return acc;
  }, []);

  return (
    <g>
      {widths.map((w, i) => (
        <rect
          key={i}
          x={offsets[i]}
          y={cy - NAV_H / 2}
          width={w}
          height={NAV_H}
          rx={NAV_H / 2}
          className="fill-muted-foreground/40"
        />
      ))}
    </g>
  );
}

const navItemsWidth = (widths: number[], gap = 5) =>
  widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, widths.length - 1);

const ACTION_PILL_H = 11;
const ACTION_DOT_R = 4;
const SEARCH_W = 22;
const CTA_W = 20;

/**
 * The right-hand controls: an optional search trigger, two icon buttons, a CTA.
 *
 * `search` is not decoration — it is the registry capability, and `centered` and
 * `minimal` declare it false. Drawing a search box on those cards would promise
 * a control the caller never hands to the layout.
 */
function ActionCluster({ xRight, cy, search }: { xRight: number; cy: number; search: boolean }) {
  const top = cy - ACTION_PILL_H / 2;
  const ctaX = xRight - CTA_W;
  const dot2 = ctaX - 6 - ACTION_DOT_R;
  const dot1 = dot2 - ACTION_DOT_R - 5 - ACTION_DOT_R;
  const searchX = dot1 - ACTION_DOT_R - 6 - SEARCH_W;
  const glyphCx = searchX + 8;

  return (
    <g>
      {search ? (
        <g>
          <rect
            x={searchX}
            y={top}
            width={SEARCH_W}
            height={ACTION_PILL_H}
            rx={ACTION_PILL_H / 2}
            className="fill-muted-foreground/12 stroke-border"
            strokeWidth={1}
          />
          <circle
            cx={glyphCx}
            cy={cy - 0.6}
            r={2.2}
            className="fill-none stroke-muted-foreground/60"
            strokeWidth={1.2}
          />
          <line
            x1={glyphCx + 1.6}
            y1={cy + 1}
            x2={glyphCx + 3.4}
            y2={cy + 2.8}
            className="stroke-muted-foreground/60"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </g>
      ) : null}
      <circle cx={dot1} cy={cy} r={ACTION_DOT_R} className="fill-muted-foreground/30" />
      <circle cx={dot2} cy={cy} r={ACTION_DOT_R} className="fill-muted-foreground/30" />
      <rect
        x={ctaX}
        y={top}
        width={CTA_W}
        height={ACTION_PILL_H}
        rx={ACTION_PILL_H / 2}
        className="fill-primary/65"
      />
    </g>
  );
}

const HAMBURGER_W = 16;

/**
 * The drawer trigger. Drawn on a button surface and in the strongest neutral in
 * the set, because on `minimal` it is the ONLY way to the navigation and an
 * owner who misses it picks the variant and loses their menu.
 */
function Hamburger({ x, cy }: { x: number; cy: number }) {
  return (
    <g>
      <rect
        x={x}
        y={cy - HAMBURGER_W / 2}
        width={HAMBURGER_W}
        height={HAMBURGER_W}
        rx={4.5}
        className="fill-muted-foreground/12"
      />
      {[-3.2, 0, 3.2].map((dy) => (
        <rect
          key={dy}
          x={x + 3.5}
          y={cy + dy - 0.9}
          width={9}
          height={1.8}
          rx={0.9}
          className="fill-foreground/70"
        />
      ))}
    </g>
  );
}

/**
 * Ghosted page content, so a bar has something to be tall RELATIVE TO. Rows are
 * dropped once they no longer fit rather than clipped, which is how `stacked`
 * ends up with one faint line and `minimal` with three — the squeeze is the
 * information.
 */
function PageGhost({ top, bottom }: { top: number; bottom: number }) {
  const rows = [
    { w: 76, h: 6 },
    { w: 150, h: 4 },
    { w: 118, h: 4 },
  ];
  const out: ReactNode[] = [];
  let y = top;
  for (const row of rows) {
    if (y + row.h > bottom) break;
    out.push(
      <rect
        key={y}
        x={PAD_X}
        y={y}
        width={row.w}
        height={row.h}
        rx={row.h / 2}
        className="fill-muted-foreground/12"
      />
    );
    y += row.h + 5;
  }
  return <g>{out}</g>;
}

/** The page outline every diagram sits in. */
function Frame() {
  return (
    <rect
      x={0.5}
      y={0.5}
      width={CANVAS_W - 1}
      height={CANVAS_H - 1}
      rx={6}
      className="fill-none stroke-border"
      strokeWidth={1}
    />
  );
}

function Canvas({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      preserveAspectRatio="xMidYMid meet"
      /* Decorative: the picker card already carries the variant's label and
         description, and a screen reader announcing a second, worse version of
         them is noise. */
      aria-hidden="true"
      focusable="false"
      className={cn("w-full h-auto", className)}
    >
      {children}
    </svg>
  );
}

/* --------------------------------------------------------------------------
   Navbars
   ----------------------------------------------------------------------- */

const NAV_3 = [13, 15, 11];
const NAV_5 = [13, 16, 11, 14, 12];

/**
 * Diagram for one navbar variant. Unknown ids resolve to `classic` through the
 * registry's own getter, matching what `NavbarLayout` will actually render for
 * that id — a stored id outlives the build that rendered it, and a blank card is
 * a worse answer than the layout the site is really going to get.
 */
export function NavbarSchematic({ variant, className }: { variant: string; className?: string }) {
  const meta = getNavbarVariant(variant);
  const barH = barHeightFor(meta.height);
  const cy = barH / 2;
  const rightEdge = CANVAS_W - PAD_X;
  const brandX = PAD_X;

  /* Every variant except `minimal` hides the drawer trigger at >=xl, so it is
     absent from three of the four diagrams on purpose — see the `xl:hidden` on
     the trigger in `site-header.tsx`. */
  let content: ReactNode;

  switch (meta.id) {
    case "centered": {
      /* Brand LEFT, nav centred, actions right — a `1fr auto 1fr` grid. Note
         this is the implemented layout; the registry's description still says
         "logo centred", which the component does not do. The component wins:
         the diagram has to predict what the owner will see. */
      const navW = navItemsWidth(NAV_3);
      content = (
        <g>
          <Brand x={brandX} cy={cy} />
          <NavItems x={(CANVAS_W - navW) / 2} cy={cy} widths={NAV_3} />
          <ActionCluster xRight={rightEdge} cy={cy} search={false} />
        </g>
      );
      break;
    }

    case "stacked": {
      /* Two equal `flex-1` rows inside one taller bar: brand + actions on top,
         the full-width nav row beneath. More nav items than the one-row variants
         because the extra room is the entire reason to choose it. */
      const rowOneCy = barH / 4;
      const rowTwoCy = (barH * 3) / 4;
      const navW = navItemsWidth(NAV_5, 6);
      content = (
        <g>
          <Brand x={brandX} cy={rowOneCy} />
          <ActionCluster xRight={rightEdge} cy={rowOneCy} search={true} />
          <line
            x1={PAD_X}
            y1={barH / 2}
            x2={rightEdge}
            y2={barH / 2}
            className="stroke-border/60"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <NavItems x={(CANVAS_W - navW) / 2} cy={rowTwoCy} widths={NAV_5} gap={6} />
        </g>
      );
      break;
    }

    case "minimal": {
      /* Trigger, brand, controls — and a conspicuously empty middle where the
         other three variants put their navigation. The trigger is drawn on the
         far left because that is where the component puts it (it precedes the
         brand in the same flex group); what says "the nav moved" is the gap
         between the brand and the actions, not the glyph's position. */
      content = (
        <g>
          <Hamburger x={brandX} cy={cy} />
          <Brand x={brandX + HAMBURGER_W + 6} cy={cy} />
          <ActionCluster xRight={rightEdge} cy={cy} search={false} />
        </g>
      );
      break;
    }

    case "classic":
    default: {
      /* Trigger + brand + nav in one left group, actions hard right. */
      content = (
        <g>
          <Brand x={brandX} cy={cy} />
          <NavItems x={brandX + brandWidth() + 10} cy={cy} widths={NAV_3} />
          <ActionCluster xRight={rightEdge} cy={cy} search={true} />
        </g>
      );
      break;
    }
  }

  return (
    <Canvas className={className}>
      <Frame />
      <path d={topRoundedPath(1, 1, CANVAS_W - 2, barH - 1, 5)} className="fill-muted-foreground/8" />
      <line x1={1} y1={barH} x2={CANVAS_W - 1} y2={barH} className="stroke-border" strokeWidth={1} />
      {content}
      <PageGhost top={barH + 10} bottom={CANVAS_H - 8} />
    </Canvas>
  );
}

/* --------------------------------------------------------------------------
   Footers
   ----------------------------------------------------------------------- */

const FOOTER_LINK_ROW = [14, 12, 16, 11];
const FOOTER_LINK_GAP = 8;
const SOCIAL_R = 3;

/**
 * How tall the footer block is drawn.
 *
 * Footers declare no height (nothing depends on it the way page clearance
 * depends on `--header-height`), so it is derived from what the variant says it
 * contains. Same principle as the navbar: the registry decides, the diagram
 * follows, and `compact` cannot end up drawn the same size as `columns`.
 */
function footerHeightFor(meta: ReturnType<typeof getFooterVariant>): number {
  const base = 26; // socials + legal bar, which every variant has
  const brand = meta.capabilities.brandBlock ? 18 : 0;
  const links = meta.columns > 0 ? 16 : 0;
  const newsletter = meta.capabilities.newsletter ? 10 : 0;
  return Math.min(base + brand + links + newsletter, CANVAS_H - 20);
}

function Socials({ cx, cy, r = SOCIAL_R }: { cx: number[]; cy: number; r?: number }) {
  return (
    <g>
      {cx.map((x) => (
        <circle key={x} cx={x} cy={cy} r={r} className="fill-muted-foreground/28" />
      ))}
    </g>
  );
}

/** One link column: a heavier heading bar over lighter links. */
function LinkColumn({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={15} height={4} rx={2} className="fill-muted-foreground/45" />
      {[20, 14, 17].map((w, i) => (
        <rect
          key={i}
          x={x}
          y={y + 8 + i * 6}
          width={w}
          height={3}
          rx={1.5}
          className="fill-muted-foreground/20"
        />
      ))}
    </g>
  );
}

/**
 * Diagram for one footer variant. Unknown ids resolve to `columns` via the
 * registry getter, for the same reason the navbar falls back to `classic`.
 */
export function FooterSchematic({ variant, className }: { variant: string; className?: string }) {
  const meta = getFooterVariant(variant);
  const h = footerHeightFor(meta);
  const top = CANVAS_H - h;
  const rightEdge = CANVAS_W - PAD_X;
  const linkRowW = navItemsWidth(FOOTER_LINK_ROW, FOOTER_LINK_GAP);

  let content: ReactNode;

  switch (meta.id) {
    case "compact": {
      /* One row, nothing above it: logo, inline links, socials. */
      const cy = top + h / 2;
      content = (
        <g>
          <Brand x={PAD_X} cy={cy} mark={10} word={14} />
          <NavItems x={60} cy={cy} widths={FOOTER_LINK_ROW} gap={FOOTER_LINK_GAP} />
          <Socials cx={[166, 176, 186]} cy={cy} />
        </g>
      );
      break;
    }

    case "centered": {
      /* Everything on one axis: logo, tagline, one link row, socials, legal. */
      const brandW = brandWidth(12, 20);
      content = (
        <g>
          <Brand x={(CANVAS_W - brandW) / 2} cy={top + 12} mark={12} word={20} />
          <rect x={74} y={top + 22} width={52} height={3} rx={1.5} className="fill-muted-foreground/18" />
          <NavItems
            x={(CANVAS_W - linkRowW) / 2}
            cy={top + 32}
            widths={FOOTER_LINK_ROW}
            gap={FOOTER_LINK_GAP}
          />
          <Socials cx={[86, 100, 114]} cy={top + 42} r={3.5} />
          <rect x={78} y={top + 50} width={44} height={3} rx={1.5} className="fill-muted-foreground/20" />
        </g>
      );
      break;
    }

    case "columns":
    default: {
      /* Brand block and newsletter on the left, four link columns to the right,
         a legal bar and socials under a divider. */
      const columnXs = [88, 114, 140, 166];
      content = (
        <g>
          <Brand x={PAD_X} cy={top + 13} mark={10} word={14} />
          <rect x={PAD_X} y={top + 22} width={46} height={3} rx={1.5} className="fill-muted-foreground/18" />
          <rect x={PAD_X} y={top + 28} width={34} height={3} rx={1.5} className="fill-muted-foreground/18" />
          {meta.capabilities.newsletter ? (
            <g>
              <rect
                x={PAD_X}
                y={top + 34}
                width={40}
                height={9}
                rx={4.5}
                className="fill-none stroke-border"
                strokeWidth={1}
              />
              <rect x={54} y={top + 34} width={13} height={9} rx={4.5} className="fill-primary/60" />
            </g>
          ) : null}
          {columnXs.slice(0, Math.max(1, meta.columns)).map((x) => (
            <LinkColumn key={x} x={x} y={top + 8} />
          ))}
          <line
            x1={PAD_X}
            y1={top + 50}
            x2={rightEdge}
            y2={top + 50}
            className="stroke-border/70"
            strokeWidth={1}
          />
          <rect x={PAD_X} y={top + 55} width={54} height={3} rx={1.5} className="fill-muted-foreground/20" />
          <Socials cx={[166, 176, 186]} cy={top + 56.5} />
        </g>
      );
      break;
    }
  }

  return (
    <Canvas className={className}>
      <Frame />
      <path
        d={bottomRoundedPath(1, top, CANVAS_W - 2, CANVAS_H - top - 1, 5)}
        className="fill-muted-foreground/8"
      />
      <line x1={1} y1={top} x2={CANVAS_W - 1} y2={top} className="stroke-border" strokeWidth={1} />
      <PageGhost top={10} bottom={top - 8} />
      {content}
    </Canvas>
  );
}
