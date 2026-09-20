import type { ReactNode } from "react";

/**
 * The navbar layouts — how the header's slots are ARRANGED inside the bar.
 * ============================================================================
 *
 * These components own nothing but arrangement. Every node they place has
 * already been built by `site-header.tsx` from state computed exactly once:
 * auth, unread counts, wallet, active route, mega-dropdown data. A layout never
 * re-derives any of that, which is what keeps a second variant from quietly
 * disagreeing with the first about which nav item is active.
 *
 * WHAT A LAYOUT MAY NOT DO
 *
 * - It may not own the `<m.header>`. The shell (`HeaderShell`) is shared,
 *   because it carries the `layout` + `layoutScroll` + `layoutRoot` contract
 *   that stops the shared-layout nav underline from flying in from hundreds of
 *   pixels below the bar after a scroll. A layout that re-declared that contract
 *   would be the fourth place to get it wrong.
 * - It may not set its own height. The bar is `h-header`, and `h-header` is
 *   `--header-height`, which every page's top clearance is also derived from.
 *   A variant that is 6.5rem tall declares that in `lib/chrome/variants.ts` and
 *   the whole app moves with it; a variant that hardcoded a taller class would
 *   push content under itself on ~40 page templates and nothing would report it.
 * - It may not filter the slots it is given. `capabilities` in the registry is
 *   the CALLER's contract — if a variant declares `search: false` the caller
 *   hands over fewer actions. A layout that also filtered would make the two
 *   disagree.
 *
 * A NOTE ON THE `pr-6` IN THE CENTRED LAYOUTS
 *
 * The nav slot carries its own `ml-6` (it sits beside the brand in `classic`).
 * In a layout that centres it, that margin is counted in the centring, so the
 * nav would land 12px right of true centre. The matching right padding cancels
 * it. It is applied on the wrapper, not the slot, so the slot stays byte-
 * identical across every variant.
 */

export interface NavbarLayoutProps {
  /** Variant id from the chrome registry. Unknown ids fall back to "classic". */
  variant: string;
  mobileTrigger: ReactNode;
  brand: ReactNode;
  nav: ReactNode;
  actions: ReactNode;
}

type LayoutSlots = Omit<NavbarLayoutProps, "variant">;

/**
 * The layout the platform ships with, and the regression baseline.
 *
 * This markup is byte-equivalent to the pre-variant header: one row, the left
 * group holding trigger + brand + nav, the action cluster right. Changing it
 * changes every site that never picked a variant, so treat it as frozen.
 */
function ClassicNavbar({ mobileTrigger, brand, nav, actions }: LayoutSlots) {
  return (
    <div className="flex items-center justify-between h-header">
      <div className="flex items-center gap-4">
        {mobileTrigger}
        {brand}
        {nav}
      </div>

      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

/**
 * Nav in the middle, brand left, actions right.
 *
 * A three-column grid rather than an absolutely positioned centre: the middle
 * track is sized to the nav, so the two `1fr` tracks stay equal and the nav is
 * centred against the BAR, not against whatever is left over after the brand.
 * The middle track collapses to zero below `xl`, where the nav is `display:none`
 * anyway, so the mobile bar is a plain two-ended row.
 */
function CenteredNavbar({ mobileTrigger, brand, nav, actions }: LayoutSlots) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 h-header">
      <div className="flex items-center gap-4">
        {mobileTrigger}
        {brand}
      </div>

      <div className="hidden xl:flex items-center justify-center pr-6">{nav}</div>

      <div className="flex items-center justify-end gap-2">{actions}</div>
    </div>
  );
}

/**
 * Brand and controls on top, a full-width nav row beneath.
 *
 * Both rows live INSIDE `h-header` — the extra height comes from the variant's
 * declared 6.5rem overriding `--header-height`, never from a class here, so page
 * clearance moves with the bar. Each row takes an equal share via `flex-1`.
 *
 * The nav row is hidden below `xl` instead of merely holding a hidden nav: an
 * empty `flex-1` row would still claim half the bar and squash the brand row on
 * exactly the screens with the least room.
 */
function StackedNavbar({ mobileTrigger, brand, nav, actions }: LayoutSlots) {
  return (
    <div className="flex flex-col h-header">
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {mobileTrigger}
          {brand}
        </div>

        <div className="flex items-center gap-2">{actions}</div>
      </div>

      <div className="hidden xl:flex flex-1 items-center justify-center pr-6">
        {nav}
      </div>
    </div>
  );
}

/**
 * Brand and controls only. The nav slot is not rendered at all.
 *
 * `capabilities.nav` is false for this variant, so navigation lives entirely in
 * the mobile drawer — which `site-header.tsx` renders outside the bar and which
 * is therefore unaffected by the layout choice. Dropping the node rather than
 * hiding it with a class keeps the mega-dropdown's hover handlers out of the
 * tree instead of leaving them attached to something invisible.
 */
function MinimalNavbar({ mobileTrigger, brand, actions }: LayoutSlots) {
  return (
    <div className="flex items-center justify-between h-header">
      <div className="flex items-center gap-4">
        {mobileTrigger}
        {brand}
      </div>

      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

/**
 * Pick a layout for `variant`, falling back to `classic`.
 *
 * The fallback is load-bearing, not defensive noise. A stored id outlives the
 * code that renders it — an owner picks `stacked`, the build is rolled back, and
 * the database still says `stacked`. Rendering the default is the difference
 * between "the navbar looks like the old one" and a 500 during SSR that takes
 * the entire page with it.
 */
export default function NavbarLayout({
  variant,
  mobileTrigger,
  brand,
  nav,
  actions,
}: NavbarLayoutProps) {
  const slots: LayoutSlots = { mobileTrigger, brand, nav, actions };

  switch (variant) {
    case "centered":
      return <CenteredNavbar {...slots} />;
    case "stacked":
      return <StackedNavbar {...slots} />;
    case "minimal":
      return <MinimalNavbar {...slots} />;
    case "classic":
    default:
      return <ClassicNavbar {...slots} />;
  }
}

export { NavbarLayout };
