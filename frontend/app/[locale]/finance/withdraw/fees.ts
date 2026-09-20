/**
 * WHAT A WITHDRAWAL ACTUALLY COSTS, PER WALLET TYPE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A MODULE AND NOT A LINE IN THE COMPONENT.
 *
 * The withdrawal form serves three wallet types whose backends charge in three
 * genuinely different ways, and the form computed ONE blended figure —
 * `fixedFee + amount × percentageFee / 100` — that matches none of them:
 *
 *   FIAT  (api/finance/withdraw/fiat/index.post.ts:209-221, :298)
 *         fee   = amount × pct/100 + fixedFee, rounded to 2dp
 *         debit = amount                      ← the GROSS
 *         send  = amount − fee                ← the fee is NETTED
 *
 *   SPOT  (api/finance/withdraw/spot/index.post.ts:269-314)
 *         internal = amount × (pct + spotWithdrawFee)/100     ← a SETTING
 *         external = withdrawChainFee ? 0 : fixedFee
 *         debit    = amount + internal        ← charged ON TOP
 *         send     = amount − external
 *
 *   ECO   (api/(ext)/ecosystem/withdraw/index.post.ts:569-574, :713-721)
 *         fee   = MAX(amount × pct/100, minFee)   ← max, not sum
 *         debit = amount + fee                ← charged ON TOP
 *         send  = amount                      ← the recipient gets the FULL amount
 *
 * Three consequences the customer paid for:
 *
 *  1. `spotWithdrawFee` IS INVISIBLE. It is a platform setting the form never
 *     read, added to the currency's own percentage server-side. Withdrawing
 *     1 ETH with a 0.005 chain fee showed *amount 1 · fee 0.005 · you'll receive
 *     0.995*; the wallet was debited **1.01** and the address received 0.995.
 *     ~0.01 ETH taken that no line on the page accounted for.
 *
 *  2. THE ECO FEE WAS OVERSTATED. `min + pct` where the server charges
 *     `max(min, pct)`. On a token with `{min: 1, percentage: 2}` withdrawing
 *     100 USDT the form said *Total debited 103.00*; the real debit is **102.00**.
 *
 *  3. THE ECO UTXO BRANCH HAD THE SIGN BACKWARDS. It printed "Amount to send =
 *     amount − fee" on chains where the server debits `amount + fee` and sends
 *     the full `amount`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO FEES, TWO DIRECTIONS, AND WHY BOTH NUMBERS HAVE TO BE ON SCREEN.
 *
 * "Fee" is not one quantity here. An INTERNAL fee is added to what leaves your
 * wallet; an EXTERNAL fee is subtracted from what arrives. A form that prints a
 * single "fee" row cannot be right about both, and on SPOT both exist at once.
 * So this returns four figures and the form shows the two that bracket the
 * transaction: what your wallet loses, and what the destination gains.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not decide whether the caller is
 * a Super Admin (the backend zeroes the internal fee for one), and it does not
 * round the way each backend rounds — FIAT fixes to 2dp, the others to the
 * token's precision. `precision` is threaded so the display can match, but the
 * authoritative figure is always the server's. This exists so the form stops
 * being WRONG, not so it can stop asking.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type WithdrawWalletKind = "FIAT" | "SPOT" | "ECO";

export interface WithdrawFeeInputs {
  kind: WithdrawWalletKind;
  /** The amount the customer typed. */
  amount: number;
  /** `withdraw_method.fixedFee` — the chain fee on SPOT, `fee.min` on ECO. */
  fixedFee?: number;
  /** `withdraw_method.percentageFee` — the currency's own rate. */
  percentageFee?: number;
  /**
   * SPOT only: the `spotWithdrawFee` platform setting, in percent. Settings are
   * TEXT rows on this platform, so this accepts a string; an absent or
   * unparseable value is 0, which is what `CacheManager.toNumber` does with it
   * server-side.
   */
  platformPercentageFee?: number | string | null;
  /**
   * SPOT only: the `withdrawChainFee` setting. When true the platform absorbs
   * the chain fee and the destination receives the full amount.
   */
  chainFeePaidByPlatform?: boolean;
  /** Decimals to round the displayed figures to. FIAT is 2; tokens vary. */
  precision?: number;
  /**
   * ECO only: the network fee the backend quotes for this withdrawal, in the
   * withdrawn currency (`GET /api/ecosystem/withdraw/max` → `estimatedNetworkFee`).
   * For a token on an EVM chain it is charged on top of the amount at
   * initiation and the unused part is refunded after confirmation; for the
   * chain's own coin it is the gas debited after confirmation. Either way it
   * leaves the wallet in addition to the amount, so it belongs in the total.
   */
  networkFee?: number | string | null;
}

export interface WithdrawFigures {
  /** Added to the amount. What the platform keeps. */
  internalFee: number;
  /** Subtracted from what is sent. What the network takes. */
  externalFee: number;
  /** ECO: the quoted network fee, charged on top of the amount. */
  networkFee: number;
  /** What leaves the wallet: `amount + internalFee + networkFee`. */
  totalDebited: number;
  /** What arrives at the destination: `amount − externalFee`. */
  netReceived: number;
}

/** Settings are TEXT rows; "1" and 1 both mean one percent, "" means none. */
function percent(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function round(value: number, precision: number): number {
  if (!Number.isFinite(value)) return 0;
  // `toFixed` then back, matching how each backend route rounds before it
  // writes the row. Left as a number so callers format once, at the edge.
  return parseFloat(value.toFixed(precision));
}

export function withdrawFigures(inputs: WithdrawFeeInputs): WithdrawFigures {
  const amount = Number.isFinite(inputs.amount) && inputs.amount > 0 ? inputs.amount : 0;
  const fixedFee = percent(inputs.fixedFee);
  const pct = percent(inputs.percentageFee);
  const precision = Number.isFinite(inputs.precision as number)
    ? (inputs.precision as number)
    : inputs.kind === "FIAT"
      ? 2
      : 8;

  let internalFee = 0;
  let externalFee = 0;
  let networkFee = 0;

  switch (inputs.kind) {
    case "FIAT": {
      // One fee, netted. `withdraw/fiat/index.post.ts:216-221` rounds to 2dp
      // before subtracting, and `:298` debits the gross.
      externalFee = round(Math.max((amount * pct) / 100 + fixedFee, 0), 2);
      break;
    }

    case "SPOT": {
      // The platform's own percentage is ADDED to the currency's, and the sum is
      // charged on top. `withdraw/spot/index.post.ts:274` is
      // `combinedPercentageFee = percentageFee + spotWithdrawFee`.
      const combined = pct + percent(inputs.platformPercentageFee);
      internalFee = round(Math.max((amount * combined) / 100, 0), precision);
      // `:307` — when the platform pays the chain fee, nothing is netted.
      externalFee = inputs.chainFeePaidByPlatform ? 0 : round(fixedFee, precision);
      break;
    }

    case "ECO": {
      // MAX, not sum: `calculateWithdrawalFee` is
      // `Math.max((amount * pct) / 100, minimumWithdrawalFee)`. The recipient
      // receives the full amount on every chain. The network cost is a
      // SEPARATE, quoted line (`withdraw/index.post.ts` folds it into the
      // debit for EVM tokens; the surplus comes back after confirmation).
      internalFee = round(Math.max((amount * pct) / 100, fixedFee), precision);
      externalFee = 0;
      networkFee = amount > 0 ? round(percent(inputs.networkFee), precision) : 0;
      break;
    }
  }

  return {
    internalFee,
    externalFee,
    networkFee,
    totalDebited: round(amount + internalFee + networkFee, precision),
    netReceived: round(Math.max(amount - externalFee, 0), precision),
  };
}

/**
 * The largest amount this wallet can withdraw, given that the internal fee is
 * charged ON TOP of it.
 *
 * "Use Max" set `balance − fixedFee` for every type. On SPOT the server requires
 * `balance ≥ amount + amount × combined/100`, so pressing Max produced a
 * GUARANTEED `400 Insufficient funds` — the one button whose entire job is to
 * name a valid amount could not.
 *
 * Solving `amount + amount × p/100 ≤ balance` gives `amount ≤ balance / (1 + p/100)`.
 * Rounded DOWN at the target precision, because rounding up reintroduces the
 * refusal at the last decimal place.
 */
export function maxWithdrawable(
  balance: number,
  inputs: Omit<WithdrawFeeInputs, "amount">
): number {
  const available = Number.isFinite(balance) && balance > 0 ? balance : 0;
  const precision = Number.isFinite(inputs.precision as number)
    ? (inputs.precision as number)
    : inputs.kind === "FIAT"
      ? 2
      : 8;

  if (inputs.kind === "FIAT") {
    // The fee is netted, so the whole balance is withdrawable.
    return floorTo(available, precision);
  }

  const pct =
    percent(inputs.percentageFee) +
    (inputs.kind === "SPOT" ? percent(inputs.platformPercentageFee) : 0);
  const byPercentage = available / (1 + pct / 100);

  if (inputs.kind === "ECO") {
    /*
      ECO's fee is `max(pct, min)`, so the percentage solution is only valid
      while it exceeds the floor. Below that the fee is the flat minimum and the
      answer is `balance − min`. Taking the SMALLER of the two is what keeps
      both regimes satisfied — the larger would be rejected in whichever regime
      actually applies.
    */
    const minFee = percent(inputs.fixedFee);
    const byMinimum = available - minFee;
    return floorTo(Math.max(0, Math.min(byPercentage, byMinimum)), precision);
  }

  return floorTo(Math.max(0, byPercentage), precision);
}

function floorTo(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.floor(value * factor) / factor;
}
