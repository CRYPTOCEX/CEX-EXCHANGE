/**
 * The settings page FRAME, as data.
 * ============================================================================
 *
 * Eleven addon settings routes plus /admin/system/settings, /admin/trading/settings,
 * geo-restriction and blog all render `SettingsPage`. Each of them also has a
 * `loading.tsx`, and every one of those had re-described this frame by hand.
 *
 * They did not agree. Five of the six wrote `container pt-20 py-8` at the root
 * against the real `min-h-screen bg-background pt-header`, and all five omitted
 * the ~105px header band entirely — so first paint sat about a band's height
 * above where the page settles, then jumped. A sixth had no frame at all.
 *
 * They did not agree with the component either, and could not: `pt-20` is 5rem
 * frozen into a string, while `pt-header` resolves through `--spacing-header` →
 * `--header-height`, which `lib/chrome/variants.ts` overrides per chrome
 * variant. The hand-written value was wrong by 16px on the default chrome and
 * by an unbounded amount on any variant that changes the header height. No
 * amount of care in the skeleton could have fixed that, because the real value
 * is not knowable at the time the string is typed.
 *
 * So the frame stops being a string that gets retyped and becomes one exported
 * value that both the page and its pending state import. The clearance axis —
 * the single most common drift cause in this codebase's loading files, seen in
 * around thirty of them — is then structurally incapable of disagreeing.
 *
 * These are plain strings rather than a component so the page keeps its
 * existing motion wrappers and the skeleton keeps its static ones, without
 * either having to accept the other's.
 *
 * A SETTINGS PAGE IS NOT A FULL-SCREEN ROUTE
 * ==========================================
 * Fourteen of the seventeen layouts that own a settings route used to branch on
 * it and render no chrome:
 *
 *     const isSettingsPage = pathname.endsWith("/settings");
 *     if (isSettingsPage) return <>{children}</>;
 *
 * The comment above that branch always said the page "renders its own
 * full-screen chrome (tabs + back button)". It does not, and never did. What
 * `SettingsPage` renders is the band below — a title, a description, a search
 * box and a view toggle — plus a back chevron to ONE parent. There is no top
 * bar in this component to replace the one the branch removed, so an operator
 * in, say, Staking Settings could reach Staking and nothing else without the
 * browser's Back button. Compare the studios that genuinely are full-screen
 * (Site Design, the page builder, the post editor): each renders an `h-dvh`
 * shell with its own action bar. This renders a form with a sidebar rail.
 *
 * The branch also produced the visible symptom that started this: with no
 * header mounted, `SETTINGS_ROOT`'s `pt-header` — clearance for a `fixed top-0`
 * bar — reserved 64px of empty page above the title. Hiding the nav did not
 * reclaim that space, it just emptied it. Measured at 1440x900 before the fix,
 * every settings page put its first control at y=221 whether or not it had a
 * nav; the fourteen chromeless ones simply spent the top 64px on nothing.
 *
 * Ten of those fourteen returned `<>{children}</>` bare, which ALSO skipped the
 * extension's `LicenseGate` — the same hole p2p, ico and gateway had already
 * found and patched by naming the gate inside the branch. Deleting the branch
 * closes it everywhere, because the gate is on the normal path.
 *
 * So: settings routes keep the nav. The room they wanted comes out of the band
 * instead — see `SETTINGS_BAND_INNER`.
 */

/** Page ground plus header clearance. See the note above on `pt-header`. */
export const SETTINGS_ROOT = "min-h-screen bg-background pt-header";

/** The full-bleed hero band. Flush to the header bar, hairline underneath. */
export const SETTINGS_BAND = "relative border-b border-border bg-card";

/**
 * The horizontal box. Used TWICE — once inside the band, once for the body —
 * and it must stay identical or the title and the settings below it sit on
 * different left edges.
 *
 * VERTICAL padding is deliberately NOT in here. It used to be (`py-6 lg:py-8`
 * on both), which made the two slots' vertical rhythm a single knob that could
 * not be turned: shrinking the band shrank the gap above the first setting card
 * by the same amount. The two are different jobs — one is a header band, the
 * other is content rhythm — so they get their own values below and the shared
 * part stays shared.
 */
export const SETTINGS_GUTTER = "container mx-auto px-4";

/**
 * The band's own box.
 *
 * `py-4` and not `py-6 lg:py-8`. Every settings route now renders inside the
 * admin header (see the note above), so the band is the SECOND horizontal bar
 * an operator looks past to reach a control, and at 125px it was costing more
 * vertical room than the header itself. Measured at 1440x900 on the classic
 * 4rem chrome, across all seventeen routes: the band was 125px tall and put the
 * first setting card at y=221. It is now 79px and the first card is at y=167.
 *
 * The band still carries the title, the description, search and the view
 * toggle — nothing was removed to buy the room, only tightened.
 */
export const SETTINGS_BAND_INNER = `${SETTINGS_GUTTER} py-4`;

/**
 * The body's box. Asymmetric on purpose: the band's hairline already separates
 * it from the title, so the top only needs rhythm, while the bottom clears the
 * floating save bar.
 */
export const SETTINGS_CONTAINER = `${SETTINGS_GUTTER} pt-6 pb-8`;

/**
 * The band's title cluster, as classes rather than as markup.
 * ----------------------------------------------------------
 * `SettingsPageSkeleton` re-describes this cluster by hand so the pending state
 * and the settled page reserve the same box. Every value below was a literal in
 * BOTH files, so tightening the band meant editing two copies in step and the
 * skeleton silently reserving the old, taller box if you missed one — the exact
 * failure this module was created to end for `SETTINGS_ROOT`.
 *
 * These are the sizes that were reduced when the band went compact: the mark
 * tile (48px -> 36px) and the heading ramp (`text-2xl lg:text-3xl` -> `text-lg
 * lg:text-xl`, so 30px -> 20px at `lg`). The description keeps its line but
 * takes `line-clamp-1`, because a settings page's description is one sentence
 * and a second line would put the band's height back where it started.
 */
export const SETTINGS_MARK = "p-2 rounded-lg shrink-0 border";
export const SETTINGS_MARK_ICON = "w-5 h-5";
export const SETTINGS_TITLE = "text-lg lg:text-xl font-bold tracking-tight";
export const SETTINGS_DESCRIPTION =
  "text-xs text-muted-foreground mt-0.5 line-clamp-1";

/**
 * Every control in the band — back, search, clear-cache — on one height.
 *
 * They were `h-10` against a `h-8` view toggle, so the band's row height was
 * set by the tallest control rather than by the title. At `h-9` the row is the
 * title's, which is what lets `py-4` be enough.
 */
export const SETTINGS_BAND_CONTROL = "h-9";

/** Body split: stacked on small screens, sidebar beside content from `lg`. */
export const SETTINGS_BODY = "flex flex-col lg:flex-row gap-6";

/** The category rail. Absent below `lg`, so the body is full width there. */
export const SETTINGS_SIDEBAR = "hidden lg:block w-72 shrink-0";

/** Sticky offset for the rail's inner stack. */
export const SETTINGS_SIDEBAR_STACK = "sticky top-6 space-y-4";
