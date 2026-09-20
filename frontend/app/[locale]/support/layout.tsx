"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/routing";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";
import { WorkspaceGround } from "@/components/layout/workspace-ground";
import LiveChat from "./ticket/components/live-chat";

/**
 * The support shell.
 *
 * ---------------------------------------------------------------------------
 * NO CUSTOM NAV — AND THAT IS THE POINT
 * ---------------------------------------------------------------------------
 * This layout used to pass `SiteHeader` a bespoke two-item menu: "Support
 * Center" → `/support` and "Tickets" → `/support/ticket`. Both were wrong.
 *
 * The first duplicated the app's own navigation: `config/menu.ts` already
 * carries "Support Center" → `/support` under Services, so a customer could
 * reach the same room by two doors and the section swapped the whole product's
 * nav for a smaller one to do it. The second existed only because the hub and
 * the list were separate pages; they are one page now.
 *
 * It also caused a visible bug. `isActiveMenu` in `site-header.tsx` is a plain
 * prefix test with no longest-match rule, so `/support` — a prefix of
 * `/support/ticket` — stayed underlined on the list route and BOTH entries lit
 * up. That was patched with `exact: true`; deleting the menu removes the whole
 * class of problem instead, and the main nav highlights Services exactly as it
 * does on every other page.
 *
 * ---------------------------------------------------------------------------
 * ONE GROUND, DRAWN ONCE
 * ---------------------------------------------------------------------------
 * `WorkspaceGround` is a `fixed inset-0 -z-10` element, so a second copy is
 * pure cost, and every page root below must stay transparent or it paints
 * straight over the ground and nothing appears to have changed. That is exactly
 * what these pages used to do: each opened with its own `min-h-screen
 * bg-background`, which is why the area read as a flat black field while the
 * addons beside it did not.
 *
 * The chat widget is mounted at the shell, not on a page, so it survives
 * navigation. (`components/global/floating-chat-provider.tsx` deliberately
 * excludes `/support` from the global bubble for this reason — check that list
 * before moving this mount.)
 */

/**
 * Routes that own the whole viewport and get NO site chrome.
 *
 * ONE conversation is a full-screen app. The anchored `[^/]+$` is what keeps
 * `/support/ticket` — now a redirect to `/support` — out of it.
 *
 * Suppressing chrome HERE, in the segment layout, rather than painting over it
 * from the page is the rule `EditorShell` states outright: a `fixed inset-0`
 * page that covers a mounted header leaves that header eating pointer events.
 * Bare children, then an ordinary 100vh block.
 *
 * The floating chat bubble goes too. It is pinned bottom-end, which is where
 * that screen's own composer controls sit, and offering a SECOND support
 * conversation on top of the one being read is the definition of noise.
 */
const CHROMELESS = [/^\/support\/ticket\/[^/]+$/];

export default function SupportLayout({ children }: { children: ReactNode }) {
  // Locale-stripped — `@/i18n/routing`'s hook, not Next's raw one. A path still
  // carrying `/en` matches nothing above and the page would render inside the
  // chrome it is trying to replace.
  const pathname = usePathname();

  if (CHROMELESS.some((pattern) => pattern.test(pathname))) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <WorkspaceGround />
      {/* No `menu` prop: the app's own user navigation, same as everywhere
          else. */}
      <SiteHeader />
      {/* No `pt-header` here: every page below opens with a masthead carrying
          `pt-header-clear`, and clearing the bar twice reserves 64px of nothing
          under the nav. */}
      <main className="flex-1">{children}</main>
      <Footer />
      {/*
        AFTER the footer, and that is load-bearing.

        `components/partials/footer/index.tsx` wraps itself in `<div class="w-full
        z-50">`. The div is `position: static`, where `z-index` is normally
        inert — but it is a FLEX ITEM of this container, and flex items
        participate in z-index ordering regardless of position. So the footer
        really does paint at level 50.

        The widget's launcher is `fixed … z-50` too. Everything in this app sits
        at 50 — the site header, dialogs, sheets, popovers, the footer — so
        among them DOM ORDER decides, and with the widget written first the
        footer painted over the bubble. That is the reported symptom.

        Raising the widget to `z-60` would "fix" it and break something worse:
        dialogs and sheets are `z-50` PORTALLED TO document.body, i.e. later in
        the document than anything here, so a 50-level widget correctly sits
        under an open modal and a 60-level one would float on top of it —
        including this section's own details sheet.

        Ordering is also what the global mount already does: `provider/
        providers.tsx` renders `<FloatingChatProvider/>` after `{children}`, and
        every other page's footer is inside those children. This layout was the
        only place that got it backwards.
      */}
      <LiveChat />
    </div>
  );
}
