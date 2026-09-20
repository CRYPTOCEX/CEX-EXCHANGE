import type { CheckoutState } from "./types";

/**
 * WHICH PARTS OF A CHECKOUT ARE STILL UNKNOWN — one answer, five designs.
 * ============================================================================
 *
 * All five checkout designs opened with the same four lines:
 *
 *     if (loading) {
 *       return <div className="min-h-screen ...">{a spinner}</div>;
 *     }
 *
 * i.e. the entire payment page — merchant panel, amount, wallet panel, pay
 * button, security footer — was replaced by a full-viewport spinner and then
 * swapped for a completely different tree the moment `GET /checkout/:id`
 * resolved. That is the most expensive possible moment for a full reflow: this
 * is the page where a customer is deciding whether to hand over money, and the
 * first thing it did was blank itself and rebuild.
 *
 * The five spinners were also five separate designs of the same nothing —
 * a pulsing circle, a hollow ring, a violet orb, a double-ring, a rotating
 * hexagon — none of which said anything about the page that was coming.
 *
 * The conversion is the same in all five, so the DECISION lives here once
 * rather than being copy-pasted into five files that would then drift. Each
 * design keeps its own markup (they share no chrome at all — different
 * palettes, different layouts, different components) and asks this module which
 * of its values are still in flight.
 *
 * THREE DISTINCT PENDING SCOPES, and conflating them is what produced the
 * defects this replaces:
 *
 *  - `session` — merchant identity, amount, line items, expiry. One fetch.
 *
 *  - `wallet` — the customer's balances, which are a SECOND fetch that cannot
 *    start until the session lands (it needs `session.walletType`/`currency`).
 *    The designs keyed this on `walletLoading` alone, which is false for the
 *    whole time the session is loading — so with the spinner gone, the payment
 *    column would render its final `else` branch, "No Wallet Found — you need
 *    to deposit $0.00", to a customer who has a perfectly good balance. The
 *    wallet panel is pending while EITHER fetch is outstanding.
 *
 *  - `timer` — the countdown is not part of the session payload. It is
 *    computed by a `setInterval` that only starts once `session.expiresAt`
 *    exists, so `timeLeft` is still 0 for up to a second AFTER the data lands.
 *    Every design gated the whole timer row on `timeLeft > 0`, so the row
 *    appeared a second late and pushed its column down a second time — a
 *    layout shift that no amount of skeletoning the session would have caught,
 *    because it happens after the "loaded" state is reached.
 */
export interface CheckoutPending {
  /** Session values (merchant, amount, currency, line items) are in flight. */
  session: boolean;
  /**
   * The customer's balances are in flight — including the whole time the
   * session is loading, because the wallet fetch cannot even start until then.
   */
  wallet: boolean;
  /** The countdown has no meaningful value yet. */
  timer: boolean;
  /**
   * Render the timer row at all. TRUE while pending so the row's box is
   * reserved from the first paint instead of appearing a second later.
   */
  showTimer: boolean;
  /**
   * Whether the customer is signed in is not yet known.
   *
   * A FOURTH pending scope, and the one that bit hardest. `isAuthenticated`
   * is `!!user` against a store nothing populates at boot, so it reads false
   * for a signed-in customer and a guest alike. Every design branched on it
   * directly, which meant a customer arriving from a merchant redirect was
   * shown "sign in to pay" over a funded account — and, because the wallet
   * effect is gated on the same flag, their balances were never fetched.
   *
   * Do not render a signed-out state while this is true.
   */
  auth: boolean;
}

export function checkoutPending(state: CheckoutState): CheckoutPending {
  const session = state.loading;
  const timer = session || state.timeLeft <= 0;
  const auth = !state.authResolved;

  return {
    session,
    auth,
    /* Unresolved auth is a third reason the balances are unknown: the wallet
       request is gated on `isAuthenticated`, so until that settles the fetch
       has not even been attempted. */
    wallet: session || auth || state.walletLoading,
    timer,
    /* An EXPIRED session sets `error` and the design renders its error screen
       instead, so "pending or counting" covers every case where this page is
       still the payment page. */
    showTimer: session || state.timeLeft > 0,
  };
}

/**
 * Placeholder strings, shared for the same reason the flags are.
 *
 * `SkeletonText` reserves the box the REAL string will occupy, so these are
 * sized like the values they stand in for rather than being round numbers:
 * an amount is four significant digits plus separators because that is what a
 * typical checkout total looks like, and every figure on this page is mono +
 * tabular, where character count IS width.
 */
export const CHECKOUT_PLACEHOLDER = {
  merchantName: "Merchant Name",
  merchantHost: "merchant.example",
  amount: "$0,000.00",
  balance: "$0,000.00",
  walletType: "FIAT",
  timer: "00:00",
} as const;
