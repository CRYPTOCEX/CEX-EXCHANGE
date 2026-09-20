"use client";

import { cn } from "@/lib/utils";

/**
 * The assistant's mark — a small instrument that shows what it is doing.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A DRAWING AND NOT A SPINNER
 * ---------------------------------------------------------------------------
 * A spinner says "wait". This has four states and each is a different thing the
 * reader needs to know: it is idle, it is thinking, it is holding something that
 * needs their approval, or it has finished. A generic spinner collapses all four
 * into "wait", and the one that matters most — *something is waiting for YOU* —
 * is the one that disappears.
 *
 * So the geometry carries the state. The rings turn slowly when nothing is
 * happening and quickly while a question is in flight; the core opens into a
 * held ring when an approval is outstanding, which is a shape the eye reads as
 * unfinished; and it closes into a tick when the work is done.
 *
 * ---------------------------------------------------------------------------
 * HOW IT IS BUILT, AND THE FOUR RULES THAT ARE NOT NEGOTIABLE
 * ---------------------------------------------------------------------------
 * The house convention for frontend art, followed exactly:
 *
 *   ONE STYLE ELEMENT, as a child of the svg. Not a stylesheet, not a styled
 *   component — the animation belongs to this drawing and travels with it.
 *
 *   NAMESPACED CLASSES. Every class starts `aim-`. A bare `.ring` in a global
 *   stylesheet would style somebody else's ring in a month.
 *
 *   NO `id` ANYWHERE. Two of these can be on screen at once (the rail's header
 *   and its launcher), and an `id` is document-global — the second copy's
 *   `url(#…)` references would resolve to the first one's defs, which is a
 *   defect that only appears when a second instance mounts.
 *
 *   TRANSFORM, OPACITY AND `stroke-dashoffset` ONLY. Everything else animates
 *   off the compositor and costs layout on a panel that floats over whatever
 *   admin screen is behind it.
 *
 * ---------------------------------------------------------------------------
 * THE OPACITY BASE IS LOAD-BEARING
 * ---------------------------------------------------------------------------
 * An element with an `animation-delay` renders in its NORMAL style until the
 * delay elapses — so three orbiting dots staggered by delay all appear at full
 * opacity on the first frame and then start moving, which reads as a flash. Each
 * animated element therefore declares its resting appearance as its base style
 * and the keyframes move away from it, never towards it.
 *
 * ---------------------------------------------------------------------------
 * COLOUR COMES FROM `currentColor`
 * ---------------------------------------------------------------------------
 * Every stroke and fill is `currentColor` at a declared opacity, so the whole
 * mark is themed by one Tailwind token class on the wrapper — and it is correct
 * in both light and dark without a `dark:` fork, because the token already is.
 */

export type CoreState = "idle" | "thinking" | "waiting" | "done";

const CSS = `
/*
 * 'aim-idle' is deliberately NOT styled: idle IS the base, and every other state
 * is a set of overrides on top of it. A rule for it would be a second place the
 * resting appearance is written, which is how the two drift.
 */

/*
 * ONE RULE, TWO PROPERTIES, EVERY ROTATING ELEMENT. BOTH ARE LOAD-BEARING AND
 * THE SECOND IS THE ONE NOBODY EXPECTS.
 *
 * transform-box: an SVG shape resolves transform-origin against ITS OWN
 * bounding box by default, so 32px 32px on the 12px core rect (box starting at
 * 26,26) meant a point 32px from that rect's own corner — off the drawing.
 *
 * transform-origin: and this is the trap. For an SVG element the INITIAL value
 * is '0 0', NOT the '50% 50%' every HTML element gets. So the two rings, which
 * declared no origin because "the default is the centre", were rotating about
 * the top-left CORNER of the viewBox — swinging on a radius of 45 units around
 * a mark that is 64 wide. Measured, frozen at five points on the timeline: the
 * outer ring's centre travelled 240px away from the mark in a 200px render.
 *
 * Both were invisible to every check that reads text. The CSS is valid, the
 * selectors match, tsc sees strings, and the numbers are exactly the numbers
 * anyone would write assuming the viewBox. It took rendering the thing, then —
 * when it still looked wrong after fixing only transform-box — reading the
 * COMPUTED style rather than the authored one:
 *
 *     .aim-outer  transform-origin: 0px 0px      <- the whole bug, in one row
 *     .aim-core   transform-origin: 32px 32px
 *
 * Declared HERE for every animated element rather than per rule, so a new
 * rotating part inherits both instead of inheriting the trap. The test in
 * admin-assistant-mark.test.ts asserts exactly that: anything named by an
 * animation shorthand must appear in this selector list.
 */
.aim-outer, .aim-mid, .aim-sweep, .aim-orbit, .aim-core, .aim-halo, .aim-tick {
  transform-box: view-box;
  transform-origin: 32px 32px;
}

/* Outer ring: a broken circle that turns. The dash pattern is what makes the
   rotation legible — a solid circle rotating is a circle. */
.aim-outer {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.25;
  stroke-opacity: 0.35;
  stroke-linecap: round;
  stroke-dasharray: 26 14;
  animation: aim-spin 14s linear infinite;
}
.aim-mid {
  fill: none;
  stroke: currentColor;
  stroke-width: 1;
  stroke-opacity: 0.22;
  stroke-linecap: round;
  stroke-dasharray: 8 12;
  /* Counter-rotating, and slower. Two rings turning the same way read as one
     thick ring; opposed, they read as a mechanism. */
  animation: aim-spin-back 22s linear infinite;
}

/* The sweep — a short bright arc that only exists while thinking. Base state is
   fully transparent so it cannot flash before its state applies. */
.aim-sweep {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-dasharray: 20 130;
  opacity: 0;
}

/* Core: a rotated square, which reads as a diamond and is a more deliberate
   shape than a dot. It breathes on idle and holds open when waiting. */
.aim-core {
  fill: currentColor;
  fill-opacity: 0.9;
  animation: aim-breathe 4.5s ease-in-out infinite;
}
.aim-halo {
  fill: currentColor;
  fill-opacity: 0.12;
  animation: aim-halo 4.5s ease-in-out infinite;
}

/* Three satellites on the mid ring. Each is placed by its own rotation, and the
   group turns — so their spacing is geometry rather than three hand-picked
   coordinates that drift when the radius changes. */
.aim-sat { fill: currentColor; fill-opacity: 0.55; }
.aim-orbit { animation: aim-spin 9s linear infinite; }

/* The tick. Drawn by dashoffset so it writes itself rather than appearing. */
.aim-tick {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.25;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 22;
  stroke-dashoffset: 22;
  opacity: 0;
}

/* --- thinking ----------------------------------------------------------- */
.aim-thinking .aim-outer { animation-duration: 3.2s; stroke-opacity: 0.5; }
.aim-thinking .aim-mid { animation-duration: 5s; }
.aim-thinking .aim-orbit { animation-duration: 2.4s; }
.aim-thinking .aim-sweep { opacity: 1; animation: aim-spin 1.15s linear infinite; }
.aim-thinking .aim-core { animation-duration: 1.6s; }
.aim-thinking .aim-halo { animation-duration: 1.6s; }

/* --- waiting for approval ----------------------------------------------- */
/* The core opens: a ring instead of a solid diamond. An unfilled shape reads as
   unfinished, which is exactly the state. */
.aim-waiting .aim-core {
  fill-opacity: 0;
  stroke: currentColor;
  stroke-width: 2;
  animation: aim-knock 1.9s ease-in-out infinite;
}
.aim-waiting .aim-halo { animation: aim-knock-halo 1.9s ease-in-out infinite; }
.aim-waiting .aim-outer { stroke-opacity: 0.55; animation-duration: 9s; }

/* --- done ---------------------------------------------------------------- */
/*
 * Both "animation: none" AND "opacity: 0", and the first is what does the work.
 * A running animation's computed value beats a normal declaration, so .aim-halo
 * — whose keyframes animate opacity — would have gone on pulsing straight
 * through an opacity of 0 written here. Cancelling the animation is what lets
 * the static rule apply at all.
 *
 * (No backticks anywhere in this block: it is a template literal, and a backtick
 * in a CSS comment ends the string. That is a parse error a hundred lines away
 * from the character that caused it.)
 */
.aim-done .aim-core,
.aim-done .aim-halo,
.aim-done .aim-orbit { opacity: 0; animation: none; }
.aim-done .aim-tick {
  opacity: 1;
  animation: aim-draw 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.aim-done .aim-outer { stroke-opacity: 0.5; animation-duration: 20s; }

@keyframes aim-spin { to { transform: rotate(360deg); } }
@keyframes aim-spin-back { to { transform: rotate(-360deg); } }
@keyframes aim-breathe {
  0%, 100% { transform: rotate(45deg) scale(1); }
  50%      { transform: rotate(45deg) scale(1.16); }
}
/* Rotated to match the core, so the two read as one concentric diamond rather
   than as a square with a diamond sitting on it. */
@keyframes aim-halo {
  0%, 100% { transform: rotate(45deg) scale(1); opacity: 1; }
  50%      { transform: rotate(45deg) scale(1.5); opacity: 0.35; }
}
@keyframes aim-knock {
  0%, 100% { transform: rotate(45deg) scale(1); }
  18%      { transform: rotate(45deg) scale(1.28); }
  36%      { transform: rotate(45deg) scale(1); }
}
@keyframes aim-knock-halo {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  18%      { transform: scale(1.9); opacity: 0; }
}
@keyframes aim-draw { to { stroke-dashoffset: 0; } }

/*
 * Reduced motion: the mark keeps every SHAPE and loses every loop.
 *
 * Not display:none and not a frozen spinner — the four states are information,
 * and a reader who has asked for less motion still needs to know which one they
 * are in. The waiting state stays legible because it is a shape (an open core)
 * rather than a pulse, which is why it was drawn that way.
 */
@media (prefers-reduced-motion: reduce) {
  .aim-outer, .aim-mid, .aim-orbit, .aim-core, .aim-halo, .aim-sweep, .aim-tick {
    animation: none !important;
  }
  .aim-core { transform: rotate(45deg); }
  .aim-thinking .aim-sweep { opacity: 1; }
  .aim-done .aim-tick { opacity: 1; stroke-dashoffset: 0; }
}
`;

export function CoreMark({
  state = "idle",
  className,
}: {
  state?: CoreState;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="presentation"
      aria-hidden
      className={cn(
        `aim-${state}`,
        // Colour is inherited. The wrapper sets a token class; nothing in the
        // drawing names a colour, so it is correct in both themes for free.
        "shrink-0",
        className
      )}
    >
      <style>{CSS}</style>

      <circle className="aim-outer" cx="32" cy="32" r="27" />
      <circle className="aim-mid" cx="32" cy="32" r="19" />
      <circle className="aim-sweep" cx="32" cy="32" r="27" />

      <g className="aim-orbit">
        {/* Placed by rotation about the centre rather than by three sets of
            coordinates — move the radius and all three follow. */}
        <circle className="aim-sat" cx="32" cy="13" r="2" />
        <circle
          className="aim-sat"
          cx="32"
          cy="13"
          r="1.6"
          transform="rotate(120 32 32)"
        />
        <circle
          className="aim-sat"
          cx="32"
          cy="13"
          r="1.6"
          transform="rotate(240 32 32)"
        />
      </g>

      <rect className="aim-halo" x="24" y="24" width="16" height="16" rx="3" />
      <rect className="aim-core" x="26" y="26" width="12" height="12" rx="2.5" />

      <path className="aim-tick" d="M24 32.5 L29.5 38 L40 25.5" />
    </svg>
  );
}
