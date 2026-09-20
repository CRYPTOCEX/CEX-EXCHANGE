/**
 * Which fee rate a spot ticket should quote, and how to print it.
 *
 * One module because the three tickets (limit, market, stop) were each doing it
 * by hand and each getting it wrong in a different way:
 *   - the LIMIT ticket quoted `takerFee` and never read `makerFee` at all, so a
 *     resting order — the maker case, the whole reason the two rates exist — was
 *     priced at the taker rate;
 *   - all three fell back to a hardcoded 0.001, which reads as a confident
 *     "0.10%" on a market that publishes no rates, and on one running the
 *     platform's 1% default it was wrong by a factor of ten.
 *
 * Rates arrive here as FRACTIONS (0.001 = 0.1%); the caller converts from the
 * market's percent metadata. `null`/`undefined` means "the market has not told
 * us", which is reported as unknown rather than papered over with a default —
 * a blank rate is honest, a plausible-looking wrong one is not.
 */

export type SpotOrderKind = "limit" | "market" | "stop";

export interface SpotFeeInput {
  makerFee?: number | null;
  takerFee?: number | null;
  kind: SpotOrderKind;
  /** true for a buy, false for a sell. Decides which way "crossing" points. */
  isBuy: boolean;
  /** The limit price the order would rest at. Only used for `kind: "limit"`. */
  limitPrice?: number | null;
  /** Last traded price, for the crossing test. */
  marketPrice?: number | null;
}

export interface SpotFeeRate {
  /** Fraction, e.g. 0.001 for 0.1%. Zero when `known` is false. */
  rate: number;
  known: boolean;
  /** Which side of the book this order is expected to land on. */
  isTaker: boolean;
}

function toRate(value: number | null | undefined): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function resolveSpotFeeRate({
  makerFee,
  takerFee,
  kind,
  isBuy,
  limitPrice,
  marketPrice,
}: SpotFeeInput): SpotFeeRate {
  const maker = toRate(makerFee);
  const taker = toRate(takerFee);
  if (maker === null || taker === null) {
    return { rate: 0, known: false, isTaker: kind !== "limit" };
  }

  // Only a limit order can rest on the book; market and stop-market always take
  // liquidity when they fire. A limit that crosses the spread fills immediately
  // and pays taker. This mirrors the backend's test in placeOrder, which
  // compares against the top of book — the ticket only has the last traded
  // price, so the two can disagree strictly inside the spread. Either way the
  // charge is the market's own published rate; only the preview can be off by
  // one tier, and only there.
  const crosses =
    limitPrice != null &&
    limitPrice > 0 &&
    marketPrice != null &&
    marketPrice > 0 &&
    (isBuy ? limitPrice >= marketPrice : limitPrice <= marketPrice);
  const isTaker = kind !== "limit" || crosses;

  return { rate: isTaker ? taker : maker, known: true, isTaker };
}

/**
 * The rate a BUY must be SIZED against, which is not always the rate quoted.
 *
 * Quoting may be one tier off harmlessly — the preview says "maker" and the
 * backend's book test says "taker", and the user sees a slightly low estimate.
 * SIZING that is one tier low is different: on an ecosystem market the fee is
 * pre-held in quote alongside the cost, so a 100% BUY sized at the maker rate
 * on an order that crosses is an order the server refuses outright. Sizing
 * therefore assumes the worse of whatever rates the market published; 0 when it
 * published neither, which is the CEX-shaped behaviour we had before.
 */
export function resolveSpotSizingFeeRate({
  makerFee,
  takerFee,
}: Pick<SpotFeeInput, "makerFee" | "takerFee">): number {
  const known = [toRate(makerFee), toRate(takerFee)].filter(
    (r): r is number => r !== null
  );
  return known.length ? Math.max(...known) : 0;
}

/**
 * Print a fee rate as a percentage without trailing-zero noise: 0.001 -> "0.1",
 * 0.01 -> "1", 0.0005 -> "0.05". Never returns an empty string for a 0% market.
 */
export function formatFeePercent(rate: number): string {
  const s = (rate * 100).toFixed(4);
  if (!s.includes(".")) return s;
  const trimmed = s.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}
