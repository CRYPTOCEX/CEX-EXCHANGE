import type { Position } from "./PositionCard";

/**
 * The wire vocabulary of the futures API, which is NOT the panel's vocabulary.
 *
 * The API speaks BUY/SELL end to end: placement validates the order side down to
 * those two (futures/order/index.post.ts), the Scylla position row stores it
 * verbatim, and GET /api/futures/position spreads `side` straight back out with
 * no mapping. LONG/SHORT is a DISPLAY vocabulary that exists only in this panel.
 *
 * The panel used to test the incoming wire value against "SHORT" — which it can
 * never equal — so every position collapsed to LONG: a short drew a green "LONG"
 * card, its mark price was derived in the wrong direction, and its
 * distance-to-liquidation came out sign-inverted, reading SAFER as the position
 * approached liquidation. The display token was also the only side the panel
 * kept, so the close request sent "LONG" back to a route that resolves the row
 * with a CQL `side = ?` equality; nothing matched and every close 404'd.
 */
export type WireSide = "BUY" | "SELL";

/**
 * Raw row from GET /api/futures/position.
 * Every numeric is a STRING — mysql2 returns DECIMAL columns as strings, so these
 * must be coerced before any arithmetic or `+` silently concatenates.
 */
export interface ApiFuturesPosition {
  id: string;
  symbol: string;
  side: string;
  entryPrice: string;
  amount: string;
  leverage: string;
  unrealizedPnl: string;
  /**
   * The price the position is marked at. Optional because a response from an
   * older backend will not carry it — `toPosition` falls back to the derivation
   * this replaced, which is exact but can only reproduce a frozen pnl.
   */
  markPrice?: number | string;
  status: string;
  liquidationPrice?: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Normalise whatever arrived in `side` to the wire value.
 *
 * The display tokens are accepted as well, matching the tolerance the standard
 * futures panel already applies (trade/components/orders/orders-panel.tsx), so a
 * row that some other surface has already relabelled is not read as a long —
 * which is exactly how this defect presented.
 */
export function toWireSide(side: unknown): WireSide {
  const s = String(side ?? "").toUpperCase();
  return s === "SELL" || s === "SHORT" ? "SELL" : "BUY";
}

/**
 * Map the API row onto the card's Position shape.
 *
 * `markPrice` IS RETURNED NOW, and reading it is the point.
 *
 * This used to derive it — `mark = entry + pnl/size` — which is circular: it can
 * only ever reproduce the pnl it was handed. The endpoint returned the STORED
 * `unrealizedPnl`, refreshed only when a fill touched the position and therefore
 * 0 from the moment the position opened, so the derived mark equalled the entry
 * price for the whole life of the trade and the distance to liquidation never
 * moved. `position/index.get.ts` now marks open positions against the live
 * ticker and reports the price it used; the derivation stays only as a fallback
 * for a response that predates the field.
 *
 * `margin = notional / leverage` is still derived, and that one is exact.
 * `realizedPnl` is 0 by definition for an open position.
 *
 * `wireSide` is carried through rather than re-derived from the label at the send
 * site. This desk is hedge mode (index.get.ts reports `mode: "HEDGE"`): a long
 * and a short on the same symbol are two independently-margined rows resolved by
 * (symbol, userId, side), so a side reconstructed from the display token would
 * close the wrong leg of a hedged pair the moment the labelling drifted again —
 * real money, wrong position, HTTP 200.
 */
export function toPosition(r: ApiFuturesPosition): Position {
  const wireSide = toWireSide(r.side);
  const side: Position["side"] = wireSide === "SELL" ? "SHORT" : "LONG";
  const size = num(r.amount);
  const entryPrice = num(r.entryPrice);
  const leverage = num(r.leverage) || 1;
  const unrealizedPnl = num(r.unrealizedPnl);
  const reportedMark = num(r.markPrice);
  const markPrice =
    Number.isFinite(reportedMark) && reportedMark > 0
      ? reportedMark
      : size > 0
        ? side === "LONG"
          ? entryPrice + unrealizedPnl / size
          : entryPrice - unrealizedPnl / size
        : entryPrice;

  return {
    id: r.id,
    symbol: r.symbol,
    side,
    wireSide,
    size,
    entryPrice,
    markPrice,
    liquidationPrice: num(r.liquidationPrice),
    unrealizedPnl,
    realizedPnl: 0,
    margin: leverage > 0 ? (entryPrice * size) / leverage : 0,
    leverage,
    stopLoss: r.stopLossPrice != null ? num(r.stopLossPrice) : undefined,
    takeProfit: r.takeProfitPrice != null ? num(r.takeProfitPrice) : undefined,
  };
}
