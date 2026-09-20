/**
 * One order shape, two doors: the REST snapshot and the websocket stream.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 *
 * The Pro panel used to have exactly one way to learn that an order changed:
 * throw away everything it held and re-request both order lists over HTTP. The
 * websocket frame that told it something had happened carried the ORDER ITSELF,
 * and the layout dropped it on the floor — it dispatched a bare DOM event and
 * the panel refetched.
 *
 * That is what a customer sees as flicker. The refetch sets `isLoading`, and
 * `isLoading` in OpenOrdersTab/OrderHistoryTab/TradeHistoryTab replaces every
 * row with three skeleton rows. A trading bot re-quoting 29 orders produces a
 * frame per order per side of its cycle, so the table blanked and refilled
 * dozens of times in a row while the tab badge — computed from state that was
 * never cleared — kept saying "Open 29".
 *
 * The standard (non-Pro) panel never had the bug because it merges the frame
 * into its list (`components/orders/orders-panel.tsx`, `handleOrderMessage`).
 * This module is that same decision, extracted so the Pro panel can share it,
 * so both doors normalise identically, and so the merge is testable without a
 * websocket, a browser or an HTTP mock.
 *
 * NORMALISE ONCE, AT THE EDGE. The two doors disagree about types: the REST
 * payload comes off Sequelize DECIMAL columns, which serialise as STRINGS, and
 * the ecosystem websocket payload has already been through `fromBigInt` and is
 * numeric. `OrderRow` calls `.toFixed()` on these values, which throws on a
 * string — so nothing may reach state without passing through here.
 */

import { toNum } from "@/lib/precision-utils";
import type { Order } from "./OrderRow";

/**
 * The statuses that keep an order in the OPEN tab.
 *
 * Written as a positive test rather than a list of terminal statuses, because
 * the orders stream carries more lifecycle vocabulary than any allowlist has
 * ever kept up with: stop orders report TRIGGERED and FAILED, the engine's own
 * cleanup broadcasts CANCELLED (double L) while the ecosystem cancel path
 * writes CANCELED (single L), and a filled ecosystem order is CLOSED rather
 * than FILLED. An allowlist of terminal statuses missed each of those in turn
 * and left the row sitting in the Open tab for good — a triggered stop showing
 * "open, filled 0" after it had already executed.
 */
export function isOpenStatus(status: string | undefined | null): boolean {
  const s = String(status ?? "").toUpperCase();
  return s === "OPEN" || s === "ACTIVE" || s === "PARTIALLY_FILLED";
}

/**
 * One raw order — from either door — as the panel's `Order`.
 *
 * `remaining` is DERIVED when absent rather than defaulted to zero: the
 * exchange door omits it, and a zero there renders as a fully-filled order in
 * the Filled column of something that has not filled at all.
 *
 * `fallbackStatus` exists because the two REST endpoints are already scoped:
 * the closed-orders call cannot return an open order, so a row that arrives
 * without a status from THAT door is terminal, and calling it OPEN would file it
 * under the Open tab with a Cancel button that has nothing to cancel.
 */
export function toPanelOrder(raw: any, fallbackStatus: Order["status"] = "OPEN"): Order {
  const filled = toNum(raw?.filled);
  const amount = toNum(raw?.amount);
  return {
    id: raw?.id || raw?.orderId,
    symbol: raw?.symbol,
    side: (raw?.side?.toUpperCase?.() || "BUY") as Order["side"],
    type: (raw?.type?.toUpperCase?.() || "LIMIT") as Order["type"],
    price: toNum(raw?.price),
    amount,
    filled,
    remaining:
      raw?.remaining !== undefined && raw?.remaining !== null
        ? toNum(raw.remaining)
        : amount - filled,
    status: (raw?.status?.toUpperCase?.() || fallbackStatus) as Order["status"],
    stopPrice:
      raw?.stopPrice !== undefined && raw?.stopPrice !== null
        ? toNum(raw.stopPrice)
        : undefined,
    isStop: !!raw?.isStop,
    createdAt: raw?.createdAt || raw?.created_at || new Date().toISOString(),
    updatedAt: raw?.updatedAt || raw?.updated_at || new Date().toISOString(),
  };
}

/** Did anything about this order that the panel RENDERS actually change? */
function differs(a: Order, b: Order): boolean {
  return (
    a.status !== b.status ||
    a.filled !== b.filled ||
    a.remaining !== b.remaining ||
    a.price !== b.price ||
    a.amount !== b.amount ||
    a.stopPrice !== b.stopPrice ||
    a.updatedAt !== b.updatedAt
  );
}

/**
 * Apply a websocket frame to the list the panel is holding.
 *
 * IDENTITY IS THE WHOLE CONTRACT, in both directions:
 *
 *  - **Unchanged rows keep their object**, so `OrderRow`'s `memo` sees the same
 *    prop and does not re-render. Rebuilding every row on every frame would
 *    reproduce the flicker this replaces with a cheaper mechanism — 29 rows
 *    repainting several times a second is still a strobing table.
 *  - **The ARRAY keeps its identity when nothing changed**, so a frame carrying
 *    an order this panel does not hold (another market, with `hideOther` on)
 *    costs no render at all. `setState` bails out on an identical reference.
 *
 * A terminal order is NOT removed. The panel's Open tab filters on status
 * anyway, and the History tab is built from the same array — dropping the row
 * here would make a just-filled order vanish from both tabs until the next
 * snapshot arrived, which is the disappearing-content complaint again, wearing
 * a different hat.
 *
 * An order the panel has never seen is APPENDED, so a bot's newly placed rungs
 * appear without waiting for a refetch. Order within the array does not matter:
 * every tab sorts or filters before rendering.
 */
export function mergeOrders(prev: Order[], incoming: Order[]): Order[] {
  if (!Array.isArray(incoming) || incoming.length === 0) return prev;

  let next: Order[] | null = null;
  const indexById = new Map<string, number>();
  prev.forEach((order, i) => indexById.set(String(order.id), i));

  for (const raw of incoming) {
    if (!raw || !raw.id) continue;
    const key = String(raw.id);
    const at = indexById.get(key);

    if (at === undefined) {
      next = next ?? [...prev];
      indexById.set(key, next.length);
      next.push(raw);
      continue;
    }

    const current = (next ?? prev)[at];
    // MERGED OVER THE HELD ROW, not substituted for it. A frame is not obliged
    // to be a complete order — `stopPrice` and `isStop` in particular are
    // snapshot-only fields on some markets — and replacing the row outright
    // would drop them, turning a resting stop into an ordinary limit in the UI.
    const merged: Order = { ...current, ...raw };
    if (!differs(current, merged)) continue;
    next = next ?? [...prev];
    next[at] = merged;
  }

  return next ?? prev;
}
