"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/routing";
import { useGuidanceStore } from "@/store/guidance";
import GuidedTour from "./guided-tour";
import CompanionRail from "./companion-rail";

/**
 * Mounted once, above the router, for the whole signed-in app.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS SOLVES
 * ---------------------------------------------------------------------------
 * The assistant's guidance is the only thing on this platform that deliberately
 * OUTLIVES a navigation. A walkthrough of the withdrawal page begins in a chat
 * on `/support/ticket/[id]` and has to still be running after `router.push`
 * has unmounted that entire tree.
 *
 * So the two pieces that must survive live here — in the layout, above the page
 * — and everything below them is free to unmount. This component does three
 * things and holds no state of its own.
 *
 * ---------------------------------------------------------------------------
 * ONE: PROMOTE A PENDING WALKTHROUGH WHEN ITS ROUTE ARRIVES
 * ---------------------------------------------------------------------------
 * `request()` records an intention; this turns it into a running walkthrough,
 * and only once `usePathname()` agrees we are there. Starting on request would
 * run stop one against the page the customer is leaving.
 *
 * ---------------------------------------------------------------------------
 * TWO: HAND OFF TO A PAGE'S OWN TOUR WHEN IT HAS ONE
 * ---------------------------------------------------------------------------
 * Four terminals shipped their own onboarding long before this addon existed.
 * Those tours know things a support catalogue does not — that the order ticket
 * moves on a phone, which anchors are load-bearing for the page's own CSS — so
 * the assistant starts THEM rather than drawing a second, worse tour of the
 * same screen.
 *
 * ---------------------------------------------------------------------------
 * THREE: KEEP THE RAIL ON SCREEN
 * ---------------------------------------------------------------------------
 * See `companion-rail.tsx`. It reads its own state from the server rather than
 * from this store, because a multi-day process must survive a reload and a
 * store does not.
 */

/**
 * A tour id from the backend catalogue → how to start that page's own tour.
 *
 * This table is the ONLY place the two worlds touch, and it is here rather than
 * in the backend catalogue for the same reason a stop names an `anchor` instead
 * of a CSS selector: "which CustomEvent does this page listen for" is a DOM
 * fact, and a backend catalogue that carried it would rot the first time a page
 * renamed one.
 *
 * The events are the ones those pages already dispatch to themselves from their
 * own help menus — nothing new was added to three of the four, so the assistant
 * starts exactly what the Help button starts.
 */
const NATIVE_TOURS: Record<string, string> = {
  "binary-trading-intro": "binary-tour:start",
  "trading-pro-intro": "tp-start-tutorial",
  "fx-terminal-intro": "fx-tour:start",
  "dex-swap-intro": "dex-tour:start",
};

/**
 * How long to wait for a destination page to mount before starting.
 *
 * A guide's first stop resolves anchors immediately, and a route transition in
 * this app renders a loading state before the real page. Half a second is long
 * enough for the common case and short enough that nobody experiences it as a
 * pause; the resolver re-tries on an interval regardless, so this only affects
 * whether the OPENING stop lands on a painted page.
 */
const SETTLE_MS = 500;

export default function GuidanceHost() {
  const pathname = usePathname();
  const pending = useGuidanceStore((state) => state.pending);
  const begin = useGuidanceStore((state) => state.begin);
  const dismiss = useGuidanceStore((state) => state.dismiss);

  useEffect(() => {
    if (!pending) return;

    /*
     * Prefix, not equality. A guide's route is `/dex/swap` while the customer
     * may legitimately be on `/dex/swap?from=USDT` — and `usePathname` from the
     * i18n router has already stripped the locale, so `/en/dex/swap` is
     * `/dex/swap` here.
     */
    const arrived =
      pathname === pending.route || pathname.startsWith(`${pending.route}/`);
    if (!arrived) return;

    const timer = setTimeout(() => {
      const native = pending.native ? NATIVE_TOURS[pending.native] : null;
      if (native) {
        /*
         * Hand off and let go. The page's own tour owns the screen from here,
         * has its own dismiss, and knows nothing about this store — so holding
         * `pending` would leave a walkthrough waiting forever behind a tour
         * that already ran.
         */
        window.dispatchEvent(new CustomEvent(native));
        dismiss();
        return;
      }
      if (pending.stops.length) begin();
      // A guide with neither stops nor a known native tour is a catalogue
      // entry this build cannot draw. Drop it rather than leave it pending.
      else dismiss();
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [pathname, pending, begin, dismiss]);

  return (
    <>
      <CompanionRail />
      <GuidedTour />
    </>
  );
}
