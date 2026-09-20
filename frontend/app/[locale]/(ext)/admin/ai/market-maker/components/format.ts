/**
 * HOW THIS ADDON PRINTS MONEY, IN ONE PLACE.
 * ===========================================================================
 *
 * Every screen here reports sums over pools that are each denominated in their
 * own quote asset, and the rule the console settled on is: **no currency symbol
 * unless the whole set agrees on one.** The overview endpoint sends
 * `quoteCurrency: null` the moment two markets quote in different assets, and
 * the unit disappears with it.
 *
 * That rule was implemented once, inside `dashboard-client.tsx`, and the
 * analytics page did the opposite — `$${(totalTVL / 1000).toFixed(1)}K` on four
 * heading figures, so a platform running MO/USDT and BTC/EUR reported its TVL in
 * dollars it does not hold, rounded to the nearest hundred. This is that
 * implementation, extracted so there is one.
 *
 * `amount` is the bare figure and `money` adds the unit. A table names the unit
 * ONCE in its column header and uses `amount`; a tile uses `money` through
 * `MoneyFigure`, which sets the unit apart from the digits — "1.2M USDT" is
 * prose to `isFigureValue`, so passing it as a raw `StatsCard` value would drop
 * the whole figure out of the monospace face.
 */

import { formatMoney, isIntlCurrencyCode } from "@/utils/currency";

export interface MoneyFormat {
  /** Bare figure. `compact` abbreviates — never use it where a count must be exact. */
  amount: (value: number, compact?: boolean) => string;
  /** Figure plus unit, or bare when the set has no single quote asset. */
  money: (value: number, compact?: boolean) => string;
  signed: (value: number) => string;
  signedMoney: (value: number) => string;
  /**
   * A price. Precision follows magnitude, because a token at 0.00004312 and a
   * pair at 41,200 cannot share a fixed `toFixed`.
   */
  price: (value: number) => string;
  /** `" (USDT)"`, or empty. For naming the unit once in a column header. */
  quoteSuffix: string;
}

export function moneyFormat(quote?: string | null): MoneyFormat {
  const unit = quote ? String(quote) : "";

  /**
   * `compact` is a REQUEST, not an instruction.
   *
   * `notation: "compact"` on a small number drops significant digits it did not
   * need to: 0.5 renders as "0.5" where the figure beside it reads "+0.50", and
   * 1,234.56 becomes "1.2K" in a heading with room for all of it. Abbreviation
   * earns its place at thousands and above; below that it is just precision
   * thrown away. The threshold is applied here so no call site has to know it.
   */
  const COMPACT_FLOOR = 10_000;

  const amount = (value: number, compact = true) => {
    const numeric = Number(value) || 0;
    const abbreviate = compact && Math.abs(numeric) >= COMPACT_FLOOR;
    return new Intl.NumberFormat(
      "en-US",
      abbreviate
        ? { notation: "compact", maximumFractionDigits: 2 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    ).format(numeric);
  };

  const money = (value: number, compact = true) => {
    const numeric = Number(value) || 0;
    if (!unit) return amount(numeric, compact);
    const abbreviate = compact && Math.abs(numeric) >= COMPACT_FLOOR;
    /* A three-letter code gets Intl's symbol form ("$1.2M"); a ticker Intl
       refuses gets figure-then-code, which is the order `MoneyFigure` splits on.
       `formatMoney` guards the RangeError Intl throws on "USDT". */
    if (isIntlCurrencyCode(unit)) {
      return formatMoney(
        numeric,
        unit,
        abbreviate
          ? { notation: "compact", maximumFractionDigits: 2 }
          : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      );
    }
    return `${amount(numeric, compact)} ${unit}`;
  };

  return {
    amount,
    money,
    signed: (value) => `${value >= 0 ? "+" : "-"}${amount(Math.abs(value))}`,
    signedMoney: (value) => `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`,
    price: (value) =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits:
          Math.abs(Number(value)) >= 1000 ? 2 : Math.abs(Number(value)) >= 1 ? 4 : 8,
      }).format(Number(value) || 0),
    quoteSuffix: unit ? ` (${unit})` : "",
  };
}
