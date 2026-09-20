/**
 * Where the floating live-chat bubble may appear.
 *
 * Extracted from `floating-chat-provider.tsx` so it can be tested without
 * mounting React, and because this list is a PRODUCT decision revisited every
 * time a new full-screen surface ships — it deserves to be findable and to have
 * its reasoning written down once.
 *
 * ---------------------------------------------------------------------------
 * WHY `pathname.includes("/trade")` WAS WRONG IN BOTH DIRECTIONS
 * ---------------------------------------------------------------------------
 * The bubble is pinned bottom-right, which is exactly where a trading workspace
 * pins its own controls. On `/trade` it covers the button used to close a
 * losing position, so those routes are excluded — that part was right.
 *
 * A substring match is not, and it failed both ways at once:
 *
 *   TOO BROAD. `/p2p/trade`, `/p2p/trade/[id]` and `/p2p/trades` all contain
 *   "/trade" and none of them is a terminal — P2P is an escrow marketplace of
 *   ordinary chromed pages, and the trade detail page (waiting on a seller who
 *   has gone quiet) is one of the places support is most wanted. Same for
 *   `/copy-trading/trade`, whose own page title is "My Copy Trades": a list.
 *
 *   TOO NARROW. `/futures` contains neither "/trade" nor "/binary" and is a
 *   full trading terminal, so the bubble has been sitting on top of it. And
 *   `/trading-bot/bot/[id]/terminal` only matched by the accident of
 *   "/trading-bot" containing the substring "/trad" — not "/trade" — so it did
 *   not match at all.
 *
 * Every pattern is anchored at `^` and ends on a boundary, so `/trades-history`
 * and `/binary-options-guide` are not swallowed by a prefix.
 */

/** Full-viewport trading workspaces. */
export const TRADING_SURFACES: RegExp[] = [
  /^\/trade(\/|$)/,
  /^\/binary(\/|$)/,
  /^\/futures(\/|$)/,
  /^\/forex-trading\/trade(\/|$)/,
  // Lives under the forex INVESTMENT addon, so a list built from top-level
  // product names misses it.
  /^\/forex\/trade(\/|$)/,
  /^\/trading-bot\/bot\/[^/]+\/terminal(\/|$)/,
  /*
    The Swap terminal. `(ext)/dex/layout.tsx` renders this route WITHOUT
    `SiteHeader`, so it owns the whole viewport exactly as `/trade` does — and
    its bottom-right corner is the swap ticket's confirm button, which is the
    one control on the page that spends money.

    `/dex/swap`, not `/dex`: the addon's landing page is an ordinary chromed
    redirect and there is nothing there for a bubble to cover. The anchor and
    the boundary are the same as every pattern above, so a future `/dex/swaps`
    list would NOT be swallowed.
  */
  /^\/dex\/swap(\/|$)/,
];

/** Everything the bubble stays off, trading surfaces included. */
export const FLOATING_CHAT_HIDDEN_ROUTES: RegExp[] = [
  ...TRADING_SURFACES,
  // Already rendered there, so a bubble would be a second copy.
  /^\/support(\/|$)/,
  // Staff have the admin support console, which is the same conversation plus
  // the tools to act on it.
  /^\/admin(\/|$)/,
  /^\/auth(\/|$)/,
  /^\/login(\/|$)/,
  /^\/register(\/|$)/,
  // A payment surface where a bubble over the confirm button costs a deposit.
  /^\/gateway\/checkout(\/|$)/,
  // The blog post editor is a chrome-free, viewport-owning writing surface. The
  // admin copy is covered above; this is the author copy under /blog.
  /^\/blog\/author\/manage\/(new|[^/]+\/edit)$/,
];

/**
 * @param pathname locale-stripped path, as `usePathname` from `@/i18n/routing`
 *   returns it. A path still carrying `/en` matches nothing here, so the bubble
 *   would come back on every trading screen — the routing-aware hook is
 *   required, not interchangeable with Next's raw one.
 */
export function isFloatingChatHidden(
  pathname: string | null | undefined
): boolean {
  const path = pathname || "/";
  return FLOATING_CHAT_HIDDEN_ROUTES.some((pattern) => pattern.test(path));
}
