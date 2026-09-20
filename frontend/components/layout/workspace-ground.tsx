/**
 * The page ground for WORKING pages — boards, rooms, lists, forms.
 *
 * WHY THIS IS NOT `PageBackground`
 * --------------------------------
 * `components/landing/kit.tsx` already has a ground, and it is the right one
 * for a landing page: two blurred stops of the brand colour high on the page,
 * the hairline grid, and film grain over the whole thing. Every addon's landing
 * uses it, and next to it every OTHER page in the same addon looks unfinished —
 * which is the observation this component answers.
 *
 * The fix is not to put the landing's ground on those pages. It carries three
 * things a working page cannot afford:
 *
 *   1. A `bg-primary/10` glow across the top third. R2 reserves the accent for
 *      what is interactive or the one figure that matters; behind an order book
 *      it tints every price on the screen with the brand hue, and the reader has
 *      no way to know the tint is decorative.
 *   2. Film grain at `opacity-.015` over the whole viewport. Harmless behind
 *      36px marketing type, a real legibility cost over the 10–11px
 *      `tabular-nums` these screens are made of.
 *   3. A grid that stays visible for 75% of the viewport height, so it runs
 *      underneath tables and cards rather than around them.
 *
 * WHAT THIS DRAWS INSTEAD
 * -----------------------
 * The same 72px hairline grid, at the same `--border` colour, so the two page
 * families are recognisably one product — but masked to die inside the first
 * ~380px, which is the band above the content where a page's title and controls
 * live. Below that it is the flat ground it always was.
 *
 * Plus one step of the surface ramp fading out over the top 200px. That is R3's
 * own mechanism (`background -> card -> surface-2 -> surface-3`), not a hue and
 * not a gradient standing in for elevation: it gives the fixed header something
 * to sit against instead of meeting an unbroken flat field, which is the other
 * half of why these pages read as empty.
 *
 * No accent. No grain. Nothing animated.
 *
 * USAGE
 * -----
 * Render it ONCE per route tree — a layout is the right place — and let the page
 * roots below it stay transparent. A page root that keeps its own opaque
 * `bg-background` will paint straight over this and nothing will appear to have
 * changed.
 *
 * A SECOND COPY INSIDE THE FIRST IS FREE, AND THAT IS DELIBERATE.
 * `data-workspace-ground` is not decoration: `globals.css` carries one rule that
 * hides every ground nested under a mounted one. It exists because the DataTable
 * hero now draws its own — that is the only way ~120 table pages spread across
 * thirty route trees get the ground without thirty layout edits — and roughly a
 * dozen of those pages sit under a layout that already draws it (`ai/support`,
 * `p2p`, `support`). Without the rule both paint: `bg-background` is opaque so
 * nothing breaks, but the grid composites 40% over 40% and the addon's tables
 * would carry visibly heavier hairlines than every other page in the same addon.
 */
export function WorkspaceGround() {
  return (
    <div
      data-workspace-ground=""
      className="fixed inset-0 -z-10 overflow-hidden bg-background"
      aria-hidden="true"
    >
      {/* One ramp step, fading out. `surface-2` is the raised-strip rung, which
          is what the top of a page effectively is once the header is over it.

          `to-surface-2/0` and NOT `to-transparent`: Tailwind v4 interpolates
          gradients in oklab, where the keyword `transparent` is transparent
          BLACK. Fading a near-white light-mode `--surface-2` (213 42% 98.4%)
          toward transparent black puts a grey band through the middle of the
          ramp — invisible in dark mode, where the stop is near-black anyway,
          and a smudge across the top of every light-mode page. The same colour
          at zero alpha has nowhere to drift to. */}
      <div className="absolute inset-x-0 top-0 h-[200px] bg-linear-to-b from-surface-2 to-surface-2/0 opacity-70" />

      {/* ONE diffuse stop of the accent, and only above the content.

          The landing's ground gets most of its character from `bg-primary/10`
          across the top third, and without any hue at all these pages will read
          flatter than it no matter how the greys are arranged. So the same
          light source is here — at 4% rather than 10%, 220px tall against the
          landing's 70vh, and blurred past any edge. It lives in the band a page
          spends on its title and controls, and is gone before the first row of
          any table. The rule it must not break is "no accent behind data", not
          "no accent". */}
      <div className="absolute -top-32 left-1/2 h-[220px] w-[120vw] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-[120px]" />

      {/* The hairline grid, masked to the same band. `hsl(var(--border))` is the
          line every panel edge is drawn with, so it reads as structure rather
          than as texture — and the radial mask is the landing's, so the two
          page families fade the grid out the same way. */}
      <div
        className="absolute inset-x-0 top-0 h-[560px] opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 78%)",
        }}
      />
    </div>
  );
}

export default WorkspaceGround;
