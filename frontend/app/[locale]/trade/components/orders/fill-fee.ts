/**
 * What ONE fill of an order actually cost in fees.
 *
 * This exists as a shared function because the two trade panels (the standard
 * one in this folder and the Pro one in `trade/pro/components/orders/`) each had
 * their own copy, and both copies had the same defect — which is exactly what
 * happens to a formula that is written twice.
 *
 * THE DEFECT. `order.fee` is the fee for the WHOLE order. It is computed once at
 * placement (`amount * price * rate / 100`) and never rewritten as fills land:
 * the per-fill Scylla UPDATE only touches filled/remaining/status/trades. Both
 * panels split it across "how much has filled SO FAR":
 *
 *     fee = order.fee * fill.amount / totalFilled        // wrong
 *
 * `totalFilled` is a moving target. A constant numerator over a growing
 * denominator meant every row of a partially-filled order read high AND shrank
 * again each time the next fill arrived — the same completed trade reporting a
 * different fee minute to minute. A resting 0.001 BTC sell @62000 on a 1% market
 * (whole-order fee 0.62 USDT) showed its first 0.00016129 fill as 0.199736 USDT,
 * then 0.151069, then 0.121471, against a true charge of 0.100000 every time.
 *
 * A fully-filled order hid all of it, because there `totalFilled` equals the
 * order size and the wrong denominator happens to equal the right one. That is
 * why it looked like a maker-vs-taker problem: takers fill in one shot, makers
 * rest and fill in pieces. It is really fully-filled vs partially-filled, and a
 * market order that partially fills on a thin book shows it too.
 *
 * THE FIX, in order of preference:
 *   1. Use the fee the engine recorded ON the fill. Fills settled by the current
 *      matching engine carry it (see `TradeDetail.fee`), and it is the exact
 *      figure charged to the wallet.
 *   2. For rows written before that field existed, pro-rate by the ORDER SIZE —
 *      `order.fee * fill.amount / order.amount` — which is the same ratio the
 *      engine settles on (`sellOrder.fee * amountToFill / sellOrder.amount`), so
 *      it reproduces the charge exactly.
 */

/** Only the fields this needs; both panels pass their raw API rows. */
export interface FillLike {
  amount?: number | string | null;
  fee?: number | string | null;
}

export interface OrderLike {
  amount?: number | string | null;
  fee?: number | string | null;
}

export function resolveFillFee(fill: FillLike, order: OrderLike): number {
  // `== null` catches undefined AND null; `Number(null)` is 0, which would
  // silently report a real fee as zero.
  const recorded = fill?.fee == null ? NaN : Number(fill.fee);
  if (Number.isFinite(recorded)) return recorded;

  const fillAmount = Number(fill?.amount);
  const orderAmount = Number(order?.amount);
  const orderFee = Number(order?.fee);
  if (
    !Number.isFinite(fillAmount) ||
    !Number.isFinite(orderAmount) ||
    !Number.isFinite(orderFee) ||
    orderAmount <= 0
  ) {
    return 0;
  }
  return (orderFee * fillAmount) / orderAmount;
}
