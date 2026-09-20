import React from "react";
import { CellRendererProps } from "./cell-renderer-props";
import { isIntlCurrencyCode } from "@/utils/currency";

interface NumberCellProps extends CellRendererProps<number> {
  format?: Intl.NumberFormatOptions;
}

export function NumberCell({ value, row, format }: NumberCellProps) {
  // Use provided format or auto-detect needed precision for small values
  const effectiveFormat = format || {
    maximumFractionDigits: Math.max(3, countSignificantDecimals(value)),
    minimumFractionDigits: 0,
  };

  /**
   * `format` comes from a column config, and a money column on this platform is
   * as likely to be denominated in USDT as in USD. `style: "currency"` accepts
   * three ASCII letters and throws a RangeError on anything else — inside a
   * cell, i.e. inside the table body, so one such column would blank the entire
   * page rather than one figure. Every money column happens to say "USD" today;
   * that is a fact about the configs, not a property of this renderer.
   *
   * The fallback keeps the caller's digits and prints the code itself, which is
   * what Intl does anyway for the three-letter codes it does not recognise.
   */
  const { style, currency, ...withoutCurrency } = effectiveFormat;
  const intlWillAccept = style !== "currency" || isIntlCurrencyCode(currency);

  const formatter = new Intl.NumberFormat(
    undefined,
    intlWillAccept ? effectiveFormat : withoutCurrency
  );

  const text = intlWillAccept
    ? formatter.format(value)
    : `${String(currency ?? "").trim().toUpperCase()} ${formatter.format(value)}`.trim();

  return <span className="font-mono">{text}</span>;
}

/**
 * How many decimals this value actually carries, to a maximum of eight.
 *
 * THE `>= 0.001 -> 3` SHORT-CIRCUIT THIS REPLACED ROUNDED MONEY AWAY.
 *
 * It capped every value at or above a thousandth to three decimal places, which
 * is a reasonable ceiling for dollars and a wrong one for anything held in
 * eight. Reported from a live install: a P2P buyer credited **0.0099 BTC** read
 * their own transaction history as **+0.01** — the exact figure they would have
 * received if the platform fee had never been taken. The settlement was
 * correct; this cell rounded the evidence of it away, and the buyer reported a
 * fee that had not been charged as a payout that had not arrived.
 *
 * It was never only cosmetic. At the top of the truncated band the error is
 * half a thousandth of the unit, which on BTC is tens of dollars a row, and it
 * lands on the screens people reconcile against their own records.
 *
 * Trailing zeros are still dropped — the caller pairs this with
 * `minimumFractionDigits: 0` — so an ordinary fiat figure is unchanged: 1234.5
 * asks for one decimal, takes the `Math.max(3, ...)` floor, and still prints
 * "1,234.5". `toFixed(8)` first is what keeps binary noise out of the count;
 * 0.1 + 0.2 asks for one decimal, not seventeen.
 */
export function countSignificantDecimals(value: number): number {
  if (!value || !isFinite(value)) return 0;
  const abs = Math.abs(value);
  const str = abs.toFixed(8).replace(/0+$/, "");
  const decimalIndex = str.indexOf(".");
  if (decimalIndex === -1) return 0;
  return Math.min(str.length - decimalIndex - 1, 8);
}
