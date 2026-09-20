/**
 * THE TRANSFER FORM ROUNDED CRYPTO TO CENTS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `transfer-store.ts` quoted its fee as
 *
 *     Math.round(amount * (feePercentage / 100) * 100) / 100
 *
 * — two decimal places — and its "recipient receives" the same way, on a form
 * that transfers BTC as readily as USD. The backend does no such rounding:
 * `api/finance/transfer/utils.ts:54-56` returns `(amount * feePercentage) / 100`
 * raw and `index.post.ts:422` credits `amount − fee` at full precision.
 * `walletTransferFee` ships at "1".
 *
 * What that produced, on the default 1%:
 *
 *   transfer 0.5 BTC   real fee 0.005 BTC, quoted **0.01 BTC** — double
 *                      recipient receives 0.495, quoted 0.49
 *
 *   transfer 0.001 BTC real fee 0.00001 BTC, quoted **0.00** — so the fee row
 *                      is suppressed entirely (`transferFee > 0` is false) and
 *                      "Recipient receives" reads **0.00 BTC** where 0.00099
 *                      actually lands. A transfer that looks like it delivers
 *                      nothing.
 *
 * Cross-currency transfers inherited the error through `amountAfterFee` BEFORE
 * the rate was applied, so the receive figure was off by the rounding delta
 * times the rate even though it was then formatted to eight decimals — a
 * precise-looking number built on a rounded one.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY PRECISION IS DECIDED BY THE WALLET TYPE.
 *
 * FIAT is money with cents; SPOT and ECO hold tokens whose smallest unit is
 * eight decimals or finer. There is no single right number of places, and
 * picking the smaller one for everything is what caused this. The type is
 * already on the store — it is what the form asks the customer for first — so
 * the answer is available at every call site.
 *
 * These are DISPLAY quantities. The authoritative fee and credit are the
 * server's; rounding here exists so the screen does not print more precision
 * than the asset has, not so the client can predict the ledger.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Decimals a wallet type's figures are worth showing. */
export function walletPrecision(walletType: string | null | undefined): number {
  return String(walletType ?? "").toUpperCase() === "FIAT" ? 2 : 8;
}

/**
 * The fee to quote, at the source wallet's precision.
 *
 * ROUNDED UP, deliberately, and only in the last place the asset has. A fee
 * quoted BELOW what will be charged reads as a better deal than the customer
 * gets; quoting the exact sub-unit remainder up is the direction that cannot
 * mislead. On FIAT this is a hundredth of a cent's worth of difference; on a
 * token it is a satoshi.
 */
export function quoteTransferFee(
  amount: number,
  feePercentage: number,
  fromWalletType: string | null | undefined
): number {
  const value = Number(amount);
  const rate = Number(feePercentage);
  if (!Number.isFinite(value) || !Number.isFinite(rate) || value <= 0 || rate <= 0) return 0;

  const exact = (value * rate) / 100;
  const factor = Math.pow(10, walletPrecision(fromWalletType));
  // The epsilon absorbs binary-float error so an exactly-representable fee is
  // not pushed up a whole unit: 0.005 * 100000000 is 499999.99999999994.
  return Math.ceil(exact * factor - 1e-9) / factor;
}

/** A figure shown to the customer, at the destination wallet's precision. */
export function roundToWalletPrecision(
  value: number,
  walletType: string | null | undefined
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = Math.pow(10, walletPrecision(walletType));
  return Math.round(n * factor) / factor;
}
