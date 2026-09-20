"use client";

/**
 * The only number printer on the investment surfaces.
 *
 * WHAT IT REPLACES
 * ----------------
 * FOUR hand-rolled `formatCurrency` copies — dashboard/client.tsx:46,
 * plan/client.tsx:55, plan/[id]/client.tsx:71 and
 * components/featured-plans-section.tsx:42 — which disagreed with each other on
 * decimals (two decimal places on the dashboard, ZERO on the three plan
 * surfaces, so the same $1,250.75 plan minimum read "$1,251" on one page and
 * "$1,250.75" on another) and agreed with each other on two defects:
 *
 *   1. All four gated on `isValidCurrencyCode`, whose own doc comment says in
 *      as many words that it is a fiat-or-crypto DECIMALS heuristic against a
 *      deliberately partial 50-entry list and must not be used to decide
 *      whether `Intl` will accept a code. A real AED, SAR or VND amount is
 *      absent from that list, so it took the crypto branch and printed
 *      "1,000 AED" where every other screen in the app prints "AED 1,000.00".
 *
 *   2. Two of the four declared `currency = "USD"` as a DEFAULT PARAMETER.
 *      That default is the documented cause of the "$40,000.50" defect the
 *      dashboard still carries a 19-line comment about: a portfolio holding BTC
 *      and NGN plans summed to one scalar and printed with a dollar sign that
 *      appears nowhere in the JSX. `currency` is REQUIRED on everything here,
 *      and it is required rather than optional precisely because the omitted-
 *      prop default is the unsafe direction.
 *
 * `formatMoney` from `@/utils/currency` already solved the formatting half and
 * its doc comment names these exact five hand-rolled arrays. This module is the
 * investment product's decisions ON TOP of it: which precision a figure gets
 * from its ROLE, and how a signed figure carries its sign.
 */

import { cn } from "@/lib/utils";
import { formatMoney } from "@/utils/currency";

/* ---------------------------------------------------------------------------
   Precision by role
   ------------------------------------------------------------------------- */

/**
 * PRECISION IS A PROPERTY OF THE FIGURE'S JOB, NOT OF THE ASSET.
 *
 * A plan's advertised minimum is a threshold someone compares against — two
 * decimals, because "at least 0.005 BTC" rounded to "0.01 BTC" is a different
 * and higher threshold than the one the plan actually enforces. A settlement
 * figure is money that moved and keeps everything it has. A capacity or a
 * headline gets trimmed because eight decimals in a scannable column is noise.
 */
const ROLE_DECIMALS = {
  /** A bound the reader checks their own number against. */
  threshold: { min: 2, max: 8 },
  /** Money that has moved, or will move exactly. Keeps everything. */
  settlement: { min: 2, max: 8 },
  /** A figure in a scannable column or a heading. */
  headline: { min: 2, max: 4 },
} as const;

export type MoneyRole = keyof typeof ROLE_DECIMALS;

/**
 * Format an amount in its own currency, at the precision its role deserves.
 *
 * `currency` is REQUIRED. See the header note: every "$" this product ever
 * printed onto a non-dollar figure came out of a default parameter.
 */
export function formatInvestmentMoney(
  amount: number,
  currency: string,
  role: MoneyRole = "settlement"
): string {
  const { min, max } = ROLE_DECIMALS[role];
  return formatMoney(amount, currency, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

/** A grouped number with no unit, for cells whose label already names it. */
export function formatBare(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * A rate, as the plan states it.
 *
 * Trailing zeros are trimmed so a whole 12% does not read "12.00%", but a
 * fractional 12.5% keeps its digit. Never carries a sign of its own — the
 * direction is `defaultResult`, and `kit/outcome.ts` owns it.
 */
export function formatRate(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Number(value.toFixed(2))}%`;
}

/* ---------------------------------------------------------------------------
   Money
   ------------------------------------------------------------------------- */

const SIZE = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
} as const;

interface MoneyProps {
  value: number | string | null | undefined;
  /**
   * Required, and `null` is a real answer meaning "genuinely unrecorded" — it
   * prints the figure bare rather than inventing a unit for it.
   */
  currency: string | null;
  role?: MoneyRole;
  /** Emphasis, not size. `primary` is the figure the screen is about. */
  emphasis?: "primary" | "secondary" | "muted";
  size?: keyof typeof SIZE;
  className?: string;
}

/**
 * `tabular-nums` is not cosmetic: these figures appear in columns — a plan grid,
 * a portfolio strip, a list of positions — and a proportional `1` makes a
 * column of amounts impossible to compare down its own length.
 */
export function Money({
  value,
  currency,
  role = "settlement",
  emphasis = "primary",
  size = "sm",
  className,
}: MoneyProps) {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (numeric === null || numeric === undefined || !Number.isFinite(numeric)) {
    return (
      <span className={cn("text-subtle-foreground", SIZE[size], className)}>
        —
      </span>
    );
  }

  const body = currency
    ? formatInvestmentMoney(numeric, currency, role)
    : formatBare(numeric, ROLE_DECIMALS[role].max);

  return (
    <span
      className={cn(
        "font-mono tabular-nums tracking-tight",
        SIZE[size],
        emphasis === "primary" && "font-semibold text-foreground",
        emphasis === "secondary" && "font-medium text-foreground",
        emphasis === "muted" && "text-muted-foreground",
        className
      )}
    >
      {body}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   SignedMoney
   ------------------------------------------------------------------------- */

interface SignedMoneyProps {
  /**
   * A SIGNED change, already resolved. Pass `null` when the direction is not
   * known — this component will not guess one, because the whole reason it
   * exists is that `investment.profit` arrives unsigned and the old dashboard
   * painted every value of it green.
   */
  value: number | null | undefined;
  currency: string | null;
  size?: keyof typeof SIZE;
  className?: string;
}

/**
 * A gain or a loss, with its sign and its ink.
 *
 * COLOUR RULE. This uses the OPERATION-STATUS family (`success`/`destructive`),
 * not the price-direction family (`up`/`down`). A settled investment is a
 * contract the platform resolved, not a market that moved, and the two token
 * families are kept apart on purpose even though they share hex values today.
 *
 * The ink is the `-ink` variant, not the raw token: these figures render inside
 * tonal chips and panels (`bg-{tone}/10`), which is exactly where the raw tones
 * were measured below the 4.5:1 floor.
 *
 * The SIGN carries the meaning on its own, so this stays legible in monochrome
 * and under every CVD profile; the tint only reinforces it.
 */
export function SignedMoney({
  value,
  currency,
  size = "sm",
  className,
}: SignedMoneyProps) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return (
      <span className={cn("text-subtle-foreground", SIZE[size], className)}>
        —
      </span>
    );
  }

  const magnitude = currency
    ? formatInvestmentMoney(Math.abs(value), currency, "settlement")
    : formatBare(Math.abs(value), 8);

  // Zero is neither a gain nor a loss and takes no sign and no tint. A DRAW
  // settlement lands here, and "+0.00" would read as a gain of nothing rather
  // than as the principal coming back untouched.
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";

  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums tracking-tight",
        SIZE[size],
        value > 0 && "text-success-ink",
        value < 0 && "text-destructive-ink",
        value === 0 && "text-muted-foreground",
        className
      )}
    >
      {sign}
      {magnitude}
    </span>
  );
}
