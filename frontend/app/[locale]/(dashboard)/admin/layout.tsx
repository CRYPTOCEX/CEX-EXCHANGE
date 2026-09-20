"use client";

import { useEffect, type ReactNode } from "react";

import Header from "@/components/partials/header";
import Footer from "@/components/partials/footer";
import { SecurityAdvisoryBanner } from "@/components/admin/system/security-advisory-banner";
import { usePathname } from "@/i18n/routing";
import { useSidebar } from "@/store";

/**
 * The admin frame. Nothing owned it before this file existed.
 *
 * NAVIGATION IS THE TOP NAV. A left sidebar was built here and removed on the
 * owner's call — the header mega-dropdown is the admin's navigation, and there
 * is deliberately no second nav surface. `Header` auto-detects `/admin` and
 * renders `SiteHeader variant="admin"`, which is what carries the menu, the
 * command palette, the admin/user switch and the top-right controls. Nothing in
 * this file should reimplement any of that.
 *
 * WHAT THIS LAYOUT IS ACTUALLY FOR
 * -------------------------------
 * `plans/DESIGN-SYSTEM.md` §Phase 10c recorded the problem: "there is no
 * `layout.tsx` at either admin root, so all ~560 page files invented their own
 * frame". Owning the frame in one place is the fix, and it is also what lets the
 * chrome decision below be made per-segment instead of in a provider shared with
 * `/user`.
 *
 * `provider/dashboard.provider.tsx` used to make that decision for the whole
 * dashboard via a 24-entry `excludedPaths` array. Only the studios below
 * genuinely own the viewport; the other twenty were ordinary READING pages —
 * every queue detail page, Platform Settings, Extensions, Updates, Trading
 * Settings — that had silently lost all navigation, so an operator who opened a
 * KYC application to approve it could only get back with the browser Back
 * button. They now render with the normal admin header.
 */

/**
 * Routes that own the whole viewport and render no admin chrome.
 *
 * These are real full-bleed editors: a control rail beside a live preview, both
 * of which want every pixel. They also cannot share the top strip with the
 * header — it is `fixed top-0 z-50` and `admin/design/page.tsx` records it
 * intercepting pointer events and making that page's own Save button
 * unclickable.
 *
 * `usePathname` is the re-export from `@/i18n/routing`, which strips the locale
 * (`/en/admin/design` -> `/admin/design`), so these patterns need no locale
 * segment. They are anchored at BOTH ends deliberately: this list is a
 * per-screen judgement, not a subtree rule, so a new `/admin/design/<thing>`
 * page has to opt in rather than inherit chromelessness from its parent.
 */
const CHROMELESS = [
  /^\/admin\/design$/,
  /**
   * The component specimen — every component this design system can restyle,
   * on one page, as the live target of the studio's preview iframe.
   *
   * Chromeless because it is a SWATCH, not a screen: an admin header above it
   * would be painted by the very tokens being judged, and inside a 1280px-wide
   * iframe it would eat the top of the thing the owner is actually looking at.
   * It is also the reason the patterns here are anchored at both ends — this
   * sits under `/admin/design` but had to opt in on its own.
   */
  /^\/admin\/design\/specimen$/,
  /^\/admin\/menus$/,
  /^\/admin\/footer$/,
  /**
   * Both halves of the page editor, and for the same reason. The LIST used to
   * be a grid of cards — an ordinary reading page that wanted navigation — but
   * it is now `PagesStudio`: the same `StudioShell` as Site Design, Menus and
   * Footer, i.e. an `h-dvh` rail-plus-live-preview surface carrying its own
   * `h-12` bar and its own back-to-Admin link. Left chromed it rendered a
   * second header above a full-viewport studio and pushed the studio's action
   * bar off screen.
   */
  /^\/admin\/default-editor$/,
  /^\/admin\/default-editor\/[^/]+\/edit$/,
  // The visual page builder is a canvas app; it bypassed the provider through a
  // separate `startsWith("/admin/builder/")` branch rather than via the excluded
  // list, which is why it is easy to miss.
  /^\/admin\/builder\/[^/]+$/,
  /**
   * The notification template manager is here on evidence rather than by
   * inheritance: `template-manager.tsx:254` renders `fixed inset-0 z-40` — a
   * two-pane editor that paints over the whole viewport. Chrome mounted behind a
   * `fixed inset-0` surface is invisible but still live, which is the failure
   * mode that made the design studio's Save button unclickable.
   *
   * TODO: convert it to `components/layout/editor-shell.tsx` like the other
   * studios, then it can stop being a special case.
   */
  /^\/admin\/system\/notification\/template$/,
  /^\/admin\/system\/notification\/template\/[^/]+$/,
  /**
   * The support desk console — the queue, the conversation and the case in one
   * viewport, the same shape as the AI add-on's Live Inbox.
   *
   * This entry is NEW, and it is the one place on this list where the pattern
   * had to be widened rather than added: `/admin/crm/support` was an ordinary
   * DataTable page and is now an `EditorShell`. The three panes are all sized
   * against the viewport, so the 64px header clearance and the footer would come
   * straight out of the conversation pane — and the bar carries its own back
   * arrow, so the navigation the header would provide is already on screen.
   *
   * The TABLE that used to live here moved to `/admin/crm/support/tickets`,
   * which is deliberately NOT on this list: it is an ordinary reading page with
   * a hero, a KPI strip and analytics, and it wants the admin header.
   */
  /^\/admin\/crm\/support$/,
  /**
   * A support ticket. The ONE queue detail page that is genuinely full-bleed,
   * and it is on this list on the same evidence as the studios rather than
   * because it is a detail page — every other queue detail screen (KYC, deposit
   * log, P2P dispute) is an ordinary reading page and keeps the header.
   *
   * `crm/support/[id]/page.tsx` roots at `h-screen w-screen … flex
   * overflow-hidden` and draws its own `h-14 md:h-16` bar carrying Back, the
   * subject, Status/Close, the theme toggle and the details-rail toggle — i.e.
   * the whole top strip the admin header would otherwise sit on top of. Chromed,
   * the `fixed top-0 z-50` header covered that bar (its Back and Status buttons
   * included) and the viewport-tall column then overflowed by the header's own
   * height.
   *
   * It costs nothing to remove: the page's Back link and Escape handler both go
   * to `/admin/crm/support`, so the navigation the header would carry is already
   * on screen. The root has no `pt-header`, so unlike a settings page it also
   * reclaims the space instead of leaving a gap.
   *
   * It stays reachable and stays chromeless: desk notifications link straight at
   * `/admin/crm/support/{id}`, and the console's `?ticket=` deep link does not
   * replace those.
   *
   * THE `(?!tickets$)` IS LOAD-BEARING. `/admin/crm/support/tickets` is a real
   * sibling route — the archive — and `[^/]+` matches it exactly as happily as
   * it matches a UUID. Without the exclusion, moving the table there would have
   * silently stripped the admin header off the one page on this subtree that
   * genuinely needs it, and the symptom (a hero page with no navigation) looks
   * like a styling mistake rather than a routing one.
   */
  /^\/admin\/crm\/support\/(?!tickets$)[^/]+$/,
  /**
   * The KYC level builder, in both of its modes — `level/create` and
   * `level/{id}`. Two routes, one component: both clients are a bare
   * `h-screen w-full` wrapper around `components/level-builder`, which roots at
   * `flex h-screen w-full overflow-hidden`.
   *
   * It is a studio by shape as much as by name: a vertical icon rail, a field
   * library, a live form preview and a field editor, all four sized against the
   * viewport. Chromed, the `fixed top-0 z-50` header sat on top of the rail and
   * the builder's own `h-12` bar — the back arrow, the editable level name and
   * Create/Save — and the `h-screen` column then overflowed the document by the
   * header's full height, so the builder's footer controls fell below the fold
   * on every screen.
   *
   * It also has the failure mode this list exists for, and worse than most: the
   * builder's own Fullscreen button sets `fixed inset-0 z-50` on the same root.
   * Chrome mounted behind a `fixed inset-0` surface is invisible but still live
   * and still eating pointer events, which is exactly what made the design
   * studio's Save button unclickable.
   *
   * Costs nothing to remove: `builder-header.tsx` ships a back arrow to
   * `/admin/crm/kyc/level`, so the navigation the header would carry is already
   * on screen, and neither client carries `pt-header`, so the route reclaims
   * the space instead of leaving a 64px gap where the nav used to be.
   *
   * `[^/]+` rather than two entries because `create` and `{id}` are the only
   * children this route has and both render the same builder. The anchors keep
   * the LIST page (`/admin/crm/kyc/level`, a DataTable with a hero) chromed —
   * it needs a trailing segment to match at all. A future sibling under here
   * that is a reading page would have to be excluded by name, the way
   * `/admin/crm/support/tickets` is above.
   */
  /^\/admin\/crm\/kyc\/level\/[^/]+$/,
  /**
   * License activation. Not a studio, but chromeless for a reason the others
   * share: `license/page.tsx` is its OWN `min-h-screen` shell with its own
   * header bar (`sticky top-0 z-10`, carrying Back and "Secure License
   * Activation"). The admin header is `fixed top-0 z-50`, so the page's bar
   * slid underneath it and the two sets of text overlapped.
   *
   * It also has to be chromeless to WORK. This page is where you land when the
   * licence check fails, and it is the one admin screen that must render while
   * the rest of the admin API is answering 403 licenseRequired — chrome that
   * fetches menus, settings and notifications on mount would each trip the
   * redirect-to-license handler in lib/api.ts. Its own Back link is the
   * navigation, which is why the page ships one.
   */
  /^\/admin\/system\/license$/,
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const setMobileMenu = useSidebar((s) => s.setMobileMenu);
  const chromeless = CHROMELESS.some((pattern) => pattern.test(pathname));

  /**
   * `mobileMenu` is persisted to localStorage and the only thing that clears it
   * is a route-change effect inside the nav that this branch does not render.
   * Navigating into a studio with the drawer open therefore leaves `true` on
   * disk, and the next chrome-bearing page paints one frame with the drawer open
   * before its own effect closes it.
   */
  useEffect(() => {
    if (chromeless) setMobileMenu(false);
  }, [chromeless, setMobileMenu]);

  if (chromeless) return <>{children}</>;

  return (
    /*
     * `flex min-h-screen flex-col` is what makes the `flex-1` below MEAN
     * anything.
     *
     * The root was a bare fragment, so `<main className="flex-1">` had no flex
     * parent and `flex: 1` did nothing — main was content-height and the footer
     * sat immediately under it. The footer's position was therefore a pure
     * function of how tall the page's data happened to make it, and on
     * `/en/admin` it travelled 777.5px (CLS 0.2347, the worst route in the
     * app).
     *
     * With a real flex column, `flex-1` stretches main to fill the viewport, so
     * the footer is pinned to the bottom on short pages and pushed down
     * naturally on long ones. Its position stops depending on the data, which
     * is the only way a fallback height could ever have been right for both.
     *
     * This is the same fix already carried by the 19 ext admin layouts — see
     * `app/[locale]/(ext)/admin/gateway/layout.tsx` for the original note.
     */
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* The layout owns the flex slot; pages own width, padding and rhythm
          (via `PageShell`, the DataTable hero, or their own container). */}
      <main className="flex-1">
        {/*
         * ABOVE the page, not inside it, and deliberately not on the update
         * screen: an operator who never opens System → Update is exactly the
         * operator running an unpatched build, so a security advisory has to
         * find them wherever they happen to be.
         *
         * It renders nothing when there is nothing to say, so the layout is
         * unchanged for the overwhelming majority of page loads. It is NOT in
         * the chromeless branch above — that branch exists for full-viewport
         * studios and for `/admin/system/license`, which has to render while
         * the rest of the admin API is answering 403.
         */}
        <SecurityAdvisoryBanner />
        {children}
      </main>
      <Footer />
    </div>
  );
}
