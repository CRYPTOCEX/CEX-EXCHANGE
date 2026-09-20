/**
 * Order book maths, once.
 *
 * Both books in this app — `app/[locale]/trade/components/orderbook` (retail)
 * and `app/[locale]/trade/pro/components/orderbook` (the docked terminal) —
 * used to carry their own copy of "group the levels, run the cumulative, size
 * the depth bar". The copies had drifted: one grouped BOTH sides downward,
 * which crosses the displayed book; one measured the depth bar against the top
 * 15 levels while rendering 25, so a deep level drew a bar wider than its row.
 *
 * The rules that are easy to get wrong, and are therefore encoded here:
 *
 *  - **Bids group DOWN, asks group UP.** Flooring both sides is the single
 *    defect that makes a grouped book cross itself: a bid at 100.2 and an ask
 *    at 100.4 both land on 100 at tick 1, and the panel then shows a best bid
 *    equal to its best ask, which is not a market that can exist.
 *  - **A level with a non-positive or non-finite size is not a level.** Feeds
 *    send `0` to mean "this level is gone"; a raw exchange payload can carry a
 *    string, and `toNum` turns an unparseable one into 0. Either way it must
 *    not reach a row, a cumulative or a max.
 *  - **Depth is measured over exactly what is rendered.** `maxAmount` and
 *    `maxCumulative` are computed after the depth cut, never before.
 *  - **Sorting is asserted, not assumed.** ccxt sorts; the ecosystem engine
 *    sorts; a delta merged into a snapshot need not. One sort here is cheaper
 *    than a book that renders out of order once a week.
 */

import { toNum } from "@/lib/precision-utils";

/* ------------------------------------------------------------------ *
 * Shapes
 * ------------------------------------------------------------------ */

/** A raw `[price, amount]` pair as it arrives on the wire. */
export type RawLevel = [number, number];

export type BookSide = "bid" | "ask";

export interface BookLevel {
  /** Grouped price. Equal to the raw price when `tickSize` is 0. */
  price: number;
  /** Base-currency size resting at this grouped price. */
  amount: number;
  /** `price * amount` — quote-currency value of this level alone. */
  total: number;
  /** Running base size from the best price down to and including this level. */
  cumulative: number;
  /** Running quote value from the best price to here. */
  cumulativeQuote: number;
  /** How many raw levels were folded into this one. 1 when ungrouped. */
  count: number;
}

export interface BookSnapshot {
  bids: BookLevel[];
  asks: BookLevel[];
  /** Largest single-level size across BOTH rendered sides. */
  maxAmount: number;
  /** Largest running size across BOTH rendered sides. */
  maxCumulative: number;
  /**
   * The same two figures PER SIDE, which is what a depth bar should measure
   * against.
   *
   * A book is routinely lopsided — one side carrying eight times the other is
   * an ordinary morning — and measuring both ladders against a shared maximum
   * renders the thinner one as a column of empty rows while every row of the
   * fatter one is pinned at full width. Neither ladder then says anything. Per
   * side, each uses its own full width and the shape of its own liquidity is
   * legible; the IMBALANCE between them is what the imbalance bar is for.
   */
  maxBidAmount: number;
  maxAskAmount: number;
  bestBid: number | null;
  bestAsk: number | null;
  /** `bestAsk - bestBid`, or null when either side is empty. */
  spread: number | null;
  /** Spread as a percentage of the mid price. */
  spreadPercent: number | null;
  mid: number | null;
  /** Base size summed over the rendered bids / asks. */
  bidVolume: number;
  askVolume: number;
  /**
   * `bidVolume / (bidVolume + askVolume)`, 0..1, or null when the book is
   * empty. 0.5 is balanced; above 0.5 the rendered depth leans bid-side.
   */
  imbalance: number | null;
  /**
   * True when the best bid is at or above the best ask. Always a defect —
   * either upstream or in a merge — and worth surfacing rather than drawing.
   */
  crossed: boolean;
}

export interface BuildBookInput {
  bids: readonly RawLevel[] | null | undefined;
  asks: readonly RawLevel[] | null | undefined;
  /** Grouping increment. 0, negative or non-finite means "do not group". */
  tickSize?: number;
  /** How many grouped levels to keep per side. */
  depth?: number;
}

export const EMPTY_BOOK: BookSnapshot = Object.freeze({
  bids: [],
  asks: [],
  maxAmount: 0,
  maxCumulative: 0,
  maxBidAmount: 0,
  maxAskAmount: 0,
  bestBid: null,
  bestAsk: null,
  spread: null,
  spreadPercent: null,
  mid: null,
  bidVolume: 0,
  askVolume: 0,
  imbalance: null,
  crossed: false,
}) as BookSnapshot;

/* ------------------------------------------------------------------ *
 * Numeric helpers
 * ------------------------------------------------------------------ */

/**
 * Relative slack for the grouping divide.
 *
 * `1.2 / 0.1` is `11.999999999999998` in binary floating point, so a bare
 * `Math.floor` puts a level one whole tick below where it belongs — visible as
 * a book whose best bid jumps a tick and back as sizes churn. The nudge is
 * relative so it holds at 1e-8 and at 1e5 alike.
 */
const GROUP_EPSILON = 1e-9;

/** Decimal places carried by a tick, so a grouped price can be re-rounded. */
export function decimalsOf(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const text = Math.abs(value).toString();
  if (text.includes("e") || text.includes("E")) {
    // 1e-7 and friends: the exponent IS the decimal count.
    const [mantissa, exponent] = text.split(/[eE]/);
    const exp = Number(exponent);
    if (exp >= 0) return 0;
    const mantissaDecimals = mantissa.split(".")[1]?.length ?? 0;
    return Math.min(20, mantissaDecimals - exp);
  }
  return Math.min(20, text.split(".")[1]?.length ?? 0);
}

/** Round away the artefacts a multiply leaves behind. */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const places = Math.max(0, Math.min(20, decimals));
  return Number(value.toFixed(places));
}

/**
 * Snap a price onto the grouping ladder.
 *
 * Bids go DOWN and asks go UP, which is what keeps a grouped book from
 * crossing itself. See the module header.
 */
export function groupPrice(price: number, tickSize: number, side: BookSide): number {
  if (!Number.isFinite(price)) return 0;
  if (!Number.isFinite(tickSize) || tickSize <= 0) return price;

  const ratio = price / tickSize;
  const slack = Math.abs(ratio) * GROUP_EPSILON;
  const steps =
    side === "bid" ? Math.floor(ratio + slack) : Math.ceil(ratio - slack);

  return roundTo(steps * tickSize, decimalsOf(tickSize));
}

/* ------------------------------------------------------------------ *
 * Building
 * ------------------------------------------------------------------ */

interface Bucket {
  price: number;
  amount: number;
  total: number;
  count: number;
}

/**
 * Coerce, reject and group one side.
 *
 * Returns buckets sorted best-first: bids descending, asks ascending.
 */
function collectSide(
  raw: readonly RawLevel[] | null | undefined,
  side: BookSide,
  tickSize: number,
  depth: number
): Bucket[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const buckets = new Map<number, Bucket>();

  for (let i = 0; i < raw.length; i++) {
    const level = raw[i];
    if (!Array.isArray(level) || level.length < 2) continue;

    const price = toNum(level[0]);
    const amount = toNum(level[1]);

    // A feed writes 0 to retire a level, and `toNum` writes 0 for anything it
    // cannot parse. Neither is a row.
    if (!Number.isFinite(price) || !Number.isFinite(amount)) continue;
    if (price <= 0 || amount <= 0) continue;

    const key = groupPrice(price, tickSize, side);
    const existing = buckets.get(key);
    if (existing) {
      existing.amount += amount;
      // Priced at the RAW price, not the grouped one: the quote value of a
      // group is what those orders are actually worth, and rounding the price
      // first would misreport it by up to a tick per level.
      existing.total += price * amount;
      existing.count += 1;
    } else {
      buckets.set(key, {
        price: key,
        amount,
        total: price * amount,
        count: 1,
      });
    }
  }

  const list = Array.from(buckets.values());
  list.sort((a, b) => (side === "bid" ? b.price - a.price : a.price - b.price));

  return depth > 0 ? list.slice(0, depth) : list;
}

/** Run the cumulative over an already-cut, already-sorted side. */
function accumulate(buckets: Bucket[]): BookLevel[] {
  let cumulative = 0;
  let cumulativeQuote = 0;
  const out: BookLevel[] = new Array(buckets.length);

  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i];
    cumulative += bucket.amount;
    cumulativeQuote += bucket.total;
    out[i] = {
      price: bucket.price,
      amount: bucket.amount,
      total: bucket.total,
      cumulative,
      cumulativeQuote,
      count: bucket.count,
    };
  }

  return out;
}

/**
 * The one place a rendered order book is produced.
 *
 * Everything a panel needs — rows, depth denominators, spread, mid, imbalance
 * — comes out together and is therefore consistent with itself. A component
 * computing `maxAmount` separately from the rows it drew is how a depth bar
 * ends up wider than its row.
 */
export function buildBook({
  bids,
  asks,
  tickSize = 0,
  depth = 0,
}: BuildBookInput): BookSnapshot {
  const safeTick = Number.isFinite(tickSize) && tickSize > 0 ? tickSize : 0;
  const safeDepth = Number.isFinite(depth) && depth > 0 ? Math.floor(depth) : 0;

  const bidLevels = accumulate(collectSide(bids, "bid", safeTick, safeDepth));
  const askLevels = accumulate(collectSide(asks, "ask", safeTick, safeDepth));

  if (bidLevels.length === 0 && askLevels.length === 0) return EMPTY_BOOK;

  // Measured over exactly what will be rendered — see the module header.
  let maxBidAmount = 0;
  let maxAskAmount = 0;
  for (const level of bidLevels) {
    if (level.amount > maxBidAmount) maxBidAmount = level.amount;
  }
  for (const level of askLevels) {
    if (level.amount > maxAskAmount) maxAskAmount = level.amount;
  }
  const maxAmount = Math.max(maxBidAmount, maxAskAmount);

  const bidVolume = bidLevels.length ? bidLevels[bidLevels.length - 1].cumulative : 0;
  const askVolume = askLevels.length ? askLevels[askLevels.length - 1].cumulative : 0;
  const maxCumulative = Math.max(bidVolume, askVolume);

  const bestBid = bidLevels.length ? bidLevels[0].price : null;
  const bestAsk = askLevels.length ? askLevels[0].price : null;

  let spread: number | null = null;
  let spreadPercent: number | null = null;
  let mid: number | null = null;
  let crossed = false;

  if (bestBid !== null && bestAsk !== null) {
    spread = bestAsk - bestBid;
    mid = (bestAsk + bestBid) / 2;
    spreadPercent = mid > 0 ? (spread / mid) * 100 : null;
    crossed = spread <= 0;
  }

  const totalVolume = bidVolume + askVolume;

  return {
    bids: bidLevels,
    asks: askLevels,
    maxAmount,
    maxCumulative,
    maxBidAmount,
    maxAskAmount,
    bestBid,
    bestAsk,
    spread,
    spreadPercent,
    mid,
    bidVolume,
    askVolume,
    imbalance: totalVolume > 0 ? bidVolume / totalVolume : null,
    crossed,
  };
}

/**
 * Depth-bar width, 0..100, for one level.
 *
 * `basis` picks what the bar measures: `"amount"` sizes each bar against the
 * largest single level, which reads as "where is the wall"; `"cumulative"`
 * sizes it against the running total, which reads as "how far to fill". The
 * bar must measure the same quantity the row PRINTS, or the widest bar sits
 * next to a number that is not the largest.
 *
 * Always against the level's OWN side — see `maxBidAmount` on the snapshot.
 */
/**
 * What a sweep to the hovered level would actually come to.
 *
 * The number every other venue shows on order-book hover, and the reason the
 * sweep tint exists at all: the tint says WHICH levels you would cross, and
 * this says what crossing them costs. Without it the trader is left to add up a
 * column of numbers that the book has already added up.
 *
 * It is a READ, not a second accumulation. `buildBook` already carries
 * `cumulative` and `cumulativeQuote` on every level, running from the touch of
 * the book outward — which is exactly the span the sweep highlights. Re-summing
 * the visible rows here would be a second implementation of the same arithmetic
 * that could disagree with the depth bars beside it, and would be wrong in the
 * one case that matters: a grouped book, where a displayed row is several raw
 * levels folded together.
 *
 * `avgPrice` is the VWAP of the sweep — quote over base — not the midpoint of
 * the price span, which is the mistake that makes a thin far level look as
 * expensive as a fat near one.
 *
 * ---------------------------------------------------------------------------
 * ADDRESSED BY INDEX, NOT BY PRICE
 * ---------------------------------------------------------------------------
 *
 * This took a price and looked it up with `findIndex`. A book is a live thing:
 * the level under the pointer gets consumed, and on the very next frame that
 * price is not in the array. The lookup then returned `null` and the summary
 * card vanished — while the ladder's own tint, which used a RANGE comparison
 * (`price <= hovered` for asks), still matched. Two different answers to one
 * question, and the range half degraded far worse: once the hovered price fell
 * outside the book's span every remaining level satisfied the comparison and
 * the entire ladder lit up as though it were all swept.
 *
 * The index is the level's distance from the touch of the book, which is
 * exactly what a sweep is measured in, and slot N exists for as long as the
 * ladder is N levels deep — so a price disappearing is no longer an event any
 * of this has to survive.
 */
export interface SweepSummary {
  /** How many displayed levels the sweep covers, the hovered one included. */
  levels: number;
  /** Base-currency size across the sweep. */
  amount: number;
  /** Quote-currency value across the sweep. */
  value: number;
  /** Volume-weighted average price actually paid. */
  avgPrice: number;
  /** The level the pointer is on. */
  price: number;
}

export function sweepSummary(
  levels: BookLevel[],
  index: number
): SweepSummary | null {
  /* A ladder that shrank past the hovered slot leaves the pointer over empty
     space, which is a no-sweep, not a clamped one. */
  if (!Number.isInteger(index) || index < 0 || index >= levels.length) {
    return null;
  }

  const level = levels[index];
  const amount = level.cumulative;
  const value = level.cumulativeQuote;

  return {
    levels: index + 1,
    amount,
    value,
    /* A book can carry a zero-size level after a grouping collapse; dividing by
       it would put NaN on screen where a price belongs. */
    avgPrice: amount > 0 ? value / amount : level.price,
    price: level.price,
  };
}

export function depthPercent(
  level: BookLevel,
  snapshot: BookSnapshot,
  basis: "amount" | "cumulative",
  side: BookSide
): number {
  const value = basis === "cumulative" ? level.cumulative : level.amount;
  const isBid = side === "bid";

  const max =
    basis === "cumulative"
      ? isBid
        ? snapshot.bidVolume
        : snapshot.askVolume
      : isBid
        ? snapshot.maxBidAmount
        : snapshot.maxAskAmount;

  if (!(max > 0) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

/* ------------------------------------------------------------------ *
 * Grouping ladder
 * ------------------------------------------------------------------ */

const LADDER_STEPS = [1, 2, 5] as const;

/**
 * Sensible grouping increments for one instrument.
 *
 * Hardcoding `0.000001 … 10` — which both panels did — is wrong at both ends
 * of a catalogue that spans a $100,000 asset and a $0.00003 one: the default
 * groups BTC by a millionth of a dollar (i.e. not at all), and the coarsest
 * option collapses a memecoin's whole book into one row.
 *
 * The ladder starts at the market's own tick (10^-pricePrecision) and climbs
 * 1 → 2 → 5 → 10 until a step would group away more than roughly a tenth of a
 * percent of the price, which is about where a book stops being readable.
 */
export function tickSizeOptions(
  referencePrice: number | null | undefined,
  pricePrecision: number | null | undefined,
  count = 6
): number[] {
  const precision =
    Number.isFinite(pricePrecision as number) && (pricePrecision as number) >= 0
      ? Math.min(12, Math.floor(pricePrecision as number))
      : 2;

  const base = roundTo(Math.pow(10, -precision), precision);
  const price =
    Number.isFinite(referencePrice as number) && (referencePrice as number) > 0
      ? (referencePrice as number)
      : 0;

  // Coarsest step worth offering is about a tenth of a percent of the price;
  // past that a book collapses into a handful of rows. Always leave room for
  // the 1 / 2 / 5 of the base decade so the control is never a single option,
  // and with no price yet climb a fixed number of decades instead.
  const softCap = price > 0 ? price / 1000 : base * Math.pow(10, count - 1);
  const cap = Math.max(softCap, base * 5);

  // The full 1 / 2 / 5 ladder, base upward.
  const ladder: number[] = [];
  for (let magnitude = precision; magnitude > precision - 24; magnitude--) {
    for (const step of LADDER_STEPS) {
      const tick = roundTo(step * Math.pow(10, -magnitude), Math.max(0, magnitude));
      if (tick < base) continue;
      if (tick > cap) continue;
      if (ladder[ladder.length - 1] !== tick) ladder.push(tick);
    }
    if (roundTo(Math.pow(10, -(magnitude - 1)), Math.max(0, magnitude - 1)) > cap) break;
  }

  if (ladder.length === 0) return [base];
  if (ladder.length <= count) return ladder;

  /*
    Thinning. The finest and the coarsest rungs both have to survive — one is
    the market's real tick, the other is the "show me the shape" view — so the
    budget is spent on what sits between them, powers of ten first, then the
    halves, then the doubles, and coarser before finer within each group. For a
    2-decimal market around $100,000 that yields 0.01 / 0.1 / 1 / 10 / 50 / 100,
    which is the ladder every major venue offers for such an instrument.
  */
  const mantissaRank = (tick: number): number => {
    const decade = Math.floor(Math.log10(tick) + 1e-9);
    const mantissa = tick / Math.pow(10, decade);
    if (Math.abs(mantissa - 1) < 1e-6) return 0; // 1 x 10^k
    if (Math.abs(mantissa - 5) < 1e-6) return 1; // 5 x 10^k
    return 2; // 2 x 10^k
  };

  const first = ladder[0];
  const last = ladder[ladder.length - 1];
  const middle = ladder.slice(1, -1);

  middle.sort((a, b) => {
    const rank = mantissaRank(a) - mantissaRank(b);
    return rank !== 0 ? rank : b - a;
  });

  const chosen = new Set<number>([first, last]);
  for (const tick of middle) {
    if (chosen.size >= count) break;
    chosen.add(tick);
  }

  return Array.from(chosen).sort((a, b) => a - b);
}

/** Label for a grouping option — the tick at its own precision, never `1e-7`. */
export function formatTickSize(tick: number): string {
  if (!Number.isFinite(tick) || tick <= 0) return "0";
  return tick.toFixed(decimalsOf(tick));
}
