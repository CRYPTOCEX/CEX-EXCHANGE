"use client";

/**
 * ONE SHAPE FOR AN INVESTMENT, DERIVED ONCE.
 *
 * The list page, the position page and the portfolio strip all answer the same
 * questions about a row — what is it worth, has it matured, did it gain or
 * lose, can this person cancel it — and each used to answer them inline, with
 * its own arithmetic and its own defaults. That is how the dashboard came to
 * count CANCELLED principal as invested capital while the history table did
 * not, and how a LOSS settlement rendered green on one screen and red on
 * another.
 *
 * Everything that reads a server payload goes through `viewInvestment` here.
 * Components decide layout and emphasis and NOTHING about state.
 *
 * The clock is a PARAMETER, so this stays pure and every row on a screen reads
 * the same instant — see `usePageClock` in `./term`.
 */

import { maturityClock, termParts, type MaturityClock, type TermParts } from "./term";
import { investmentOutcome, realisedChange, type Outcome } from "./outcome";

export type InvestmentStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export interface InvestmentView {
  id: string;
  status: InvestmentStatus;
  /** The plan's title, or `null` when the association did not come back. */
  planTitle: string | null;
  planId: string | null;
  /**
   * The currency EVERY figure on this row is denominated in. `null` when the
   * plan association is missing, and deliberately not defaulted to USD — a
   * figure printed with the wrong unit is worse than one printed with none.
   */
  currency: string | null;
  /** The principal. Always real, on every status. */
  amount: number;
  /**
   * Realised gain or loss, SIGNED — `null` until the position settles.
   *
   * An ACTIVE row's `profit` column is the ROI the purchase route wrote at
   * creation, i.e. a projection nobody has earned. Treating it as realised is
   * what made a fresh investment show a profit the moment it was opened.
   */
  realised: number | null;
  /** The outcome it settled under, or is headed for. */
  outcome: Outcome | null;
  term: TermParts | null;
  clock: MaturityClock;
  /** Counts toward "capital at work". */
  isOpen: boolean;
  /** Settled, whichever way. */
  isSettled: boolean;
  /**
   * Cancel is offered. The backend refuses anything but ACTIVE
   * ("Only active investments can be cancelled"), so a control on any other
   * status is a button the server would always reject — and this product had
   * no cancel control at all, on a route that has been implemented and
   * refunding principal the whole time.
   */
  canCancel: boolean;
  /** The row as it arrived, for anything a view needs and this does not model. */
  source: investmentAttributes;
}

function readStatus(raw: unknown): InvestmentStatus {
  const value = String(raw ?? "").toUpperCase();
  return value === "COMPLETED" ||
    value === "CANCELLED" ||
    value === "REJECTED" ||
    value === "ACTIVE"
    ? (value as InvestmentStatus)
    : "ACTIVE";
}

export function viewInvestment(
  row: investmentAttributes,
  now: number
): InvestmentView {
  const status = readStatus(row?.status);
  const amount = Number(row?.amount);

  return {
    id: String(row?.id ?? ""),
    status,
    planTitle: row?.plan?.title ?? null,
    planId: row?.planId ?? row?.plan?.id ?? null,
    currency: row?.plan?.currency ?? null,
    amount: Number.isFinite(amount) ? amount : 0,
    realised: realisedChange(row as any),
    outcome: investmentOutcome(row as any),
    term: termParts(row?.duration),
    clock: maturityClock(row, now),
    isOpen: status === "ACTIVE",
    isSettled: status !== "ACTIVE",
    canCancel: status === "ACTIVE",
    source: row,
  };
}

/* ---------------------------------------------------------------------------
   Ordering
   ------------------------------------------------------------------------- */

/**
 * Running positions first, and among them the ones closest to maturity.
 *
 * The reason someone opens this product is a position that is running; the
 * reason they open it TODAY is usually one that is about to mature. A row with
 * no readable clock sorts after the ones that have one rather than to the top,
 * because an unknown maturity is not an imminent one.
 */
export function byUrgency(a: InvestmentView, b: InvestmentView): number {
  if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;

  if (a.isOpen && b.isOpen) {
    const aKnown = a.clock.known || a.clock.endDate !== null;
    const bKnown = b.clock.known || b.clock.endDate !== null;
    if (aKnown !== bKnown) return aKnown ? -1 : 1;
    if (aKnown && bKnown) return a.clock.remainingMs - b.clock.remainingMs;
    return 0;
  }

  // Settled rows: most recently finished first.
  const aEnd = a.clock.endDate?.getTime() ?? 0;
  const bEnd = b.clock.endDate?.getTime() ?? 0;
  return bEnd - aEnd;
}

/* ---------------------------------------------------------------------------
   Portfolio totals
   ------------------------------------------------------------------------- */

export interface CurrencyBucket {
  currency: string;
  /** Principal in positions that are still running. */
  atWork: number;
  /** Realised gain or loss across settled positions. Signed. */
  realised: number;
  openCount: number;
  settledCount: number;
}

/**
 * THE PORTFOLIO, ONE BUCKET PER CURRENCY — AND ONLY WHAT IS ACTUALLY AT STAKE.
 *
 * Two rules the old dashboard broke, both of which overstated the number:
 *
 *   1. NOTHING IS SUMMED ACROSS CURRENCIES. The same account can hold a USDT
 *      plan, a BTC plan and an NGN plan, every figure is in its plan's own
 *      currency, and this browser has no exchange rates. The old code reduced
 *      them to one scalar and handed it to a formatter whose `currency = "USD"`
 *      default parameter stamped a "$" on it — 0.5 BTC plus 40,000 NGN was
 *      reported as "$40,000.50". Inventing a rate client-side is how that
 *      number got printed, so no rate is invented here.
 *
 *   2. CANCELLED AND REJECTED PRINCIPAL IS NOT CAPITAL AT WORK. The old sum ran
 *      over every row with no status filter, so money that had been refunded to
 *      the wallet months ago still counted as invested. `atWork` is ACTIVE
 *      only; settled rows contribute their realised result and nothing else.
 *
 * A row whose plan association is missing has no currency, so it cannot join
 * any bucket without being given one. It is counted in `unbucketed` instead of
 * being quietly filed under USD.
 */
export function bucketByCurrency(views: InvestmentView[]): {
  buckets: CurrencyBucket[];
  unbucketed: number;
} {
  const map = new Map<string, CurrencyBucket>();
  let unbucketed = 0;

  for (const view of views) {
    if (!view.currency) {
      unbucketed += 1;
      continue;
    }
    const bucket =
      map.get(view.currency) ??
      ({
        currency: view.currency,
        atWork: 0,
        realised: 0,
        openCount: 0,
        settledCount: 0,
      } as CurrencyBucket);

    if (view.isOpen) {
      bucket.atWork += view.amount;
      bucket.openCount += 1;
    } else {
      bucket.settledCount += 1;
      if (view.realised !== null) bucket.realised += view.realised;
    }

    map.set(view.currency, bucket);
  }

  const buckets = Array.from(map.values()).sort((a, b) => {
    // The currency with the most capital running is the one the account is
    // really in; ties fall back to the alphabet so the order is stable across
    // renders rather than dependent on Map insertion.
    if (b.atWork !== a.atWork) return b.atWork - a.atWork;
    return a.currency.localeCompare(b.currency);
  });

  return { buckets, unbucketed };
}
