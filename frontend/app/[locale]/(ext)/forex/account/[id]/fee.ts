/**
 * The fee a forex deposit or withdrawal will actually be charged.
 *
 * Both wizards used to print a hard-coded `formatCurrency(5, currency)` on the
 * confirm step. The real fee is a PERCENTAGE from the currency's configuration
 * (see the backend's `calculateTransactionFees`), so with USDT configured at
 * 0.5% a user depositing 1,000 was shown "Fee $5.00 / Total $1,005.00" and then
 * debited 1,005 — right by coincidence — while the same screen at 2% quoted
 * $5.00 and charged $20.00. Withdrawals had the mirror-image error, promising
 * "Total to receive" figures the backend never paid.
 *
 * This mirrors the backend's arithmetic against the same currency records the
 * wizard has already fetched, so the quote matches the charge.
 */

export interface FeeQuote {
  /** The fee itself, in the transaction currency. */
  fee: number;
  /** What leaves the wallet on a deposit: amount + fee. */
  totalCharged: number;
  /** What arrives on a withdrawal: amount - fee. */
  totalReceived: number;
}

/**
 * @param amount        the amount the user typed
 * @param currencies    the currency list the wizard fetched
 * @param currencyCode  the selected currency
 * @param walletType    FIAT or SPOT
 */
export function quoteForexFee(
  amount: number,
  currencies: any[] | undefined,
  currencyCode: string | null,
  walletType: string | undefined
): FeeQuote {
  const value = Number(amount) || 0;

  // Fiat forex movements carry no fee: the `currency` table has no fee column,
  // so the backend charges nothing on that leg.
  if (!walletType || walletType === "FIAT") {
    return { fee: 0, totalCharged: value, totalReceived: value };
  }

  /*
    ─────────────────────────────────────────────────────────────────────────
    MATCH ON `value`, WHICH IS THE FIELD THE ENDPOINT ACTUALLY SENDS.

    `/api/finance/currency` returns `{value, label}` rows
    (`finance/currency/index.get.ts`), and this looked for `c.currency` or
    `c.id`. Neither exists, so `record` was ALWAYS undefined, `fee` read as 0,
    and the deposit and withdraw wizards printed "Fee $0.00" on every render.

    The backend charges it regardless —
    `forex/account/transaction-handler.ts:142-148` is
    `(amount × currencyData.fee)/100 + fixedFee` — so a customer moving 1,000 at
    0.5% was shown *Total to be charged $1,000.00* and had 1,005.00 debited.

    `value` is checked first; `currency` and `id` stay as fallbacks so a caller
    passing a differently-shaped list still resolves.
    ─────────────────────────────────────────────────────────────────────────
  */
  const record = Array.isArray(currencies)
    ? currencies.find(
        (c: any) =>
          c?.value === currencyCode ||
          c?.currency === currencyCode ||
          c?.id === currencyCode
      )
    : undefined;

  const percent = Number(record?.fee ?? 0);
  const fee =
    Number.isFinite(percent) && percent > 0
      ? parseFloat(Math.max((value * percent) / 100, 0).toFixed(2))
      : 0;

  return {
    fee,
    totalCharged: parseFloat((value + fee).toFixed(8)),
    totalReceived: parseFloat(Math.max(0, value - fee).toFixed(8)),
  };
}
