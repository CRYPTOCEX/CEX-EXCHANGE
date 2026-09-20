/**
 * Layout constants for the core dashboard.
 *
 * WHAT USED TO BE HERE, AND WHY IT IS GONE
 * ----------------------------------------
 * This file exported `CORE_THEME`, `API_THEME`, `CRM_THEME`, `FINANCE_THEME`,
 * `CONTENT_THEME`, `SYSTEM_THEME`, `getModuleTheme()` and
 * `getCoreDesignConfig()` — 140 of its 173 lines. A repo-wide grep for all eight
 * identifiers returned nothing outside this file: every one was DEAD.
 *
 * They were also actively harmful to leave lying around. The module themes were
 * one raw Tailwind palette per admin section (`API_THEME` blue-600/indigo-600,
 * `CRM_THEME` emerald-600/teal-600, `FINANCE_THEME` green/emerald,
 * `CONTENT_THEME` purple-600/violet-600, `SYSTEM_THEME` slate/gray) — i.e.
 * exactly the palette-per-section scheme DESIGN-SYSTEM Phase 3 collapsed onto a
 * single token. Because they were stored as string DATA rather than as class
 * names, `npm run design:check` could not see them, so the file read as a
 * sanctioned source of truth to anyone who opened it, and copying from it would
 * have re-introduced the thing that migration removed.
 *
 * `CORE_THEME.gradients` was six keys that all said `bg-muted`, and
 * `CORE_THEME.shadows` handed out `shadow-lg shadow-muted/25`, which R3 forbids.
 *
 * Colour now comes from the tokens in `app/globals.css` and the primitives in
 * `components/ui`; page frames come from `components/layout/page-shell.tsx`.
 * Do not add a per-section palette here again.
 */

/**
 * Standard page padding for dashboard pages that do not use `DataTable`.
 *
 * PREFER `PageShell` (`components/layout/page-shell.tsx`), whose
 * `clearance: true` produces this exact pair. All 23 core-admin call sites have
 * been migrated; this export survives only for the 47 remaining importers under
 * `(ext)` and `/user`, and should be deleted once the addon sweep lands
 * (plans/ADMIN-SYSTEM.md §8).
 *
 * THE TOP HALF IS HEADER CLEARANCE, NOT TASTE. `pt-header-clear` is
 * `--header-height + 2rem`, which at the shipped 4rem bar is exactly the `pt-24`
 * it replaced — no pixel moved.
 *
 * It has to be the token rather than the literal because the dashboard renders
 * the SAME `fixed top-0` bar as the public site: `components/partials/header`
 * re-exports `SiteHeader`, and that bar is `h-header`, whose height a navbar
 * variant overrides (see `lib/chrome/variants.ts`). Left at `pt-24`, choosing
 * the 6.5rem `stacked` navbar would drop the bar over the first line of every
 * page using this constant.
 */
export const PAGE_PADDING = "pt-header-clear pb-16";
