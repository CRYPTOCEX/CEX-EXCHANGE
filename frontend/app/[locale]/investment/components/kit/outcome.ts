/**
 * WHAT MATURITY DOES TO THE PRINCIPAL.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * `plan.profitPercentage` is a RATE. It has a magnitude and no direction, and
 * every surface of this product used to render it as though the direction were
 * always "up": "Expected return 12%", "Expected profit $120", "Total return
 * $1,120", under a panel promising a "security guarantee".
 *
 * The direction is a different column. `investmentPlan.defaultResult` is an
 * operator-set ENUM("WIN","LOSS","DRAW") — `allowNull: false`, and a
 * `required: true` field on the admin plan form — and the settlement cron reads
 * it as `investment.result || plan.defaultResult`. `result` is null on every
 * row until settlement writes it, so for a normal purchase THE PLAN'S OWN
 * `defaultResult` DECIDES THE OUTCOME, deterministically, at the moment the
 * user presses the button:
 *
 *     WIN   -> principal + roi        (backend .../finance/investment/cron.ts)
 *     DRAW  -> principal
 *     LOSS  -> max(0, principal - roi)
 *
 * That field was not in the user-facing plan payload at all, so the frontend
 * could not have told the truth even if it had wanted to. It is now selected by
 * both plan endpoints, and this module is the single place that turns it into a
 * sign, a tone and a sentence — so a plan cannot describe itself one way on the
 * plan card and another way in the composer.
 *
 * ABSENT IS NOT "WIN"
 * -------------------
 * `defaultResult` is non-null in the schema, but a frontend deployed against an
 * older backend will not receive it. `outcomeOf` returns `null` for that case
 * and every consumer renders the rate WITHOUT a direction — the projection
 * panel is withheld rather than guessed. Defaulting the absent case to WIN
 * would reproduce the exact bug this module exists to fix, silently, on the one
 * install where nobody could see it.
 */

/** The sign `profitPercentage` carries at maturity under a given outcome. */
export type OutcomeSign = 1 | 0 | -1;

export interface Outcome {
  result: investmentResult;
  /** Multiply the ROI magnitude by this to get the change to the principal. */
  sign: OutcomeSign;
  /**
   * Operation-status tone (R2), NOT price direction (R1): this is a property of
   * how the platform settles a contract, not a market moving. `success` for a
   * plan that pays, `neutral` for one that returns the principal untouched,
   * `destructive` for one that takes from it.
   */
  tone: "success" | "neutral" | "destructive";
  /**
   * Icon name for the chip. Status is never colour alone — a LOSS plan has to
   * be legible in monochrome and under every CVD profile, so the glyph and the
   * word both carry it.
   */
  icon: string;
  /** i18n key under `ext_investment.outcome` for the one-line rule. */
  labelKey: "pays" | "returns" | "deducts";
  /** i18n key for the longer disclosure shown above the invest button. */
  noticeKey: "notice_win" | "notice_draw" | "notice_loss";
}

const OUTCOMES: Record<investmentResult, Outcome> = {
  WIN: {
    result: "WIN",
    sign: 1,
    tone: "success",
    icon: "lucide:trending-up",
    labelKey: "pays",
    noticeKey: "notice_win",
  },
  DRAW: {
    result: "DRAW",
    sign: 0,
    tone: "neutral",
    icon: "lucide:minus",
    labelKey: "returns",
    noticeKey: "notice_draw",
  },
  LOSS: {
    result: "LOSS",
    sign: -1,
    tone: "destructive",
    icon: "lucide:trending-down",
    labelKey: "deducts",
    noticeKey: "notice_loss",
  },
};

/**
 * The outcome a plan settles under, or `null` when the plan did not state one.
 *
 * Accepts the raw value rather than a typed one because it is read straight off
 * a network payload: an unrecognised string is treated as unstated, for the
 * same reason as an absent one.
 */
export function outcomeOf(
  defaultResult: string | null | undefined
): Outcome | null {
  if (!defaultResult) return null;
  const key = String(defaultResult).toUpperCase();
  return OUTCOMES[key as investmentResult] ?? null;
}

/**
 * The outcome an EXISTING investment settled under, or will settle under.
 *
 * Mirrors the cron's own `investment.result || plan.defaultResult` precedence,
 * so a running position shows the rule it is currently headed for and a settled
 * one shows the rule it actually got. An admin who edits a single row's
 * `result` changes that row and not its plan; reading only the plan would keep
 * showing the old promise after the outcome had already been decided.
 */
export function investmentOutcome(investment: {
  result?: string | null;
  plan?: { defaultResult?: string | null } | null;
}): Outcome | null {
  return (
    outcomeOf(investment?.result) ??
    outcomeOf(investment?.plan?.defaultResult) ??
    null
  );
}

/**
 * The signed change to the principal, in the plan's own currency.
 *
 * Returns `null` — not 0 — when the outcome is unstated, because 0 is DRAW's
 * answer and "we don't know" must not render as "nothing happens".
 */
export function projectedChange(
  amount: number,
  profitPercentage: number,
  outcome: Outcome | null
): number | null {
  if (!outcome) return null;
  if (!Number.isFinite(amount) || !Number.isFinite(profitPercentage)) return null;
  return ((amount * profitPercentage) / 100) * outcome.sign;
}

/**
 * What lands back in the wallet at maturity: principal plus the signed change.
 *
 * Floored at zero to match the cron's `Math.max(0, amount - roi)` — a plan
 * configured to deduct more than 100% cannot take the wallet negative, and a
 * projection that showed one would be describing a payout the backend will not
 * make.
 */
export function projectedReturn(
  amount: number,
  profitPercentage: number,
  outcome: Outcome | null
): number | null {
  const change = projectedChange(amount, profitPercentage, outcome);
  if (change === null) return null;
  return Math.max(0, amount + change);
}

/**
 * The magnitude actually realised on a SETTLED investment.
 *
 * `investment.profit` is written unsigned at purchase time and left unsigned by
 * settlement, so it says how much moved and never which way. This pairs it with
 * the row's outcome to produce the number a person would recognise as their
 * profit or loss. Returns `null` while the figure is not yet meaningful — an
 * ACTIVE row's `profit` is a projection, not an earning, and the portfolio
 * refuses to add projections to realised money.
 */
export function realisedChange(investment: {
  status?: string;
  profit?: number | null;
  amount?: number;
  result?: string | null;
  plan?: { defaultResult?: string | null } | null;
}): number | null {
  if (String(investment?.status).toUpperCase() !== "COMPLETED") return null;
  const magnitude = Number(investment?.profit);
  if (!Number.isFinite(magnitude)) return null;
  const outcome = investmentOutcome(investment);
  if (!outcome) return null;
  return Math.abs(magnitude) * outcome.sign;
}
