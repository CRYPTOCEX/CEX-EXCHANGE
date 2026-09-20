"use client";

/**
 * The account's figures, one row of cells per currency held.
 *
 * WHAT IT REPLACES, AND WHY IT IS NOT FOUR BIG TILES
 * --------------------------------------------------
 * The old dashboard opened with four `StatsCard`s — "Total portfolio value",
 * "Total invested", "Active investments", "Completed" — at card size, above
 * everything. Nobody opens this product to admire a completion count; they open
 * it because a term is running and they want to know when it pays. So these are
 * context at label size, above the positions, and out of the way.
 *
 * THREE NUMBERS THAT WERE WRONG
 * -----------------------------
 *   1. "Total portfolio value" summed `amount + profit` across EVERY row with
 *      no status filter, so principal that had been refunded to the wallet
 *      months earlier still counted as portfolio value.
 *
 *   2. It summed across currencies. The bucketing in `kit/position.ts` is the
 *      answer to that; this component renders one row per bucket and never adds
 *      two of them together.
 *
 *   3. `profit` is written UNSIGNED at purchase time and stays unsigned through
 *      a LOSS settlement, so "+$120" was printed for someone who had just had
 *      $120 taken off their principal. `realised` is the signed figure and it
 *      is `null` until a position actually settles.
 */

import { useTranslations } from "next-intl";
import { Loadable } from "@/components/ui/skeleton";
import { Money, SignedMoney, formatBare } from "../../components/kit/money";
import type { CurrencyBucket } from "../../components/kit/position";

interface PortfolioStripProps {
  buckets: CurrencyBucket[];
  /** Rows whose plan association is missing, so they have no currency. */
  unbucketed: number;
  loading?: boolean;
}

export function PortfolioStrip({
  buckets,
  unbucketed,
  loading = false,
}: PortfolioStripProps) {
  const t = useTranslations("investment");
  const tCommon = useTranslations("common");

  /* While pending there is exactly one row of cells, so the strip is the height
     it settles to for the common single-currency account. A second currency
     growing the strip on arrival is a real change in what is being reported,
     not a layout shift we could have avoided. */
  const rows: (CurrencyBucket | null)[] = loading ? [null] : buckets;

  if (!loading && buckets.length === 0 && unbucketed === 0) return null;

  return (
    <section
      aria-label={t("your_investment_record")}
      className="flex flex-col gap-2"
    >
      {rows.map((bucket, index) => (
        <div
          key={bucket?.currency ?? `pending-${index}`}
          className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4"
        >
          <Cell label={tCommon("currency")} note={t("this_rows_unit")}>
            <Loadable loading={loading} placeholder="USDT">
              {bucket ? bucket.currency : null}
            </Loadable>
          </Cell>

          <Cell label={tCommon("capital_at_work")} note={t("running_positions_only")}>
            <Loadable loading={loading} placeholder="12,345.00">
              {bucket ? (
                <Money
                  value={bucket.atWork}
                  currency={bucket.currency}
                  role="headline"
                  size="base"
                />
              ) : null}
            </Loadable>
          </Cell>

          <Cell
            label={t("realised")}
            note={
              bucket && bucket.settledCount > 0
                ? t("across_n_settled", { count: bucket.settledCount })
                : t("nothing_settled_yet")
            }
          >
            <Loadable loading={loading} placeholder="+1,234.00">
              {bucket ? (
                bucket.settledCount === 0 ? (
                  <span className="text-subtle-foreground">—</span>
                ) : (
                  <SignedMoney
                    value={bucket.realised}
                    currency={bucket.currency}
                    size="base"
                  />
                )
              ) : null}
            </Loadable>
          </Cell>

          <Cell label={tCommon("positions")} note={t("running_and_settled")}>
            <Loadable loading={loading} placeholder="3 / 12">
              {bucket
                ? `${formatBare(bucket.openCount, 0)} / ${formatBare(
                    bucket.openCount + bucket.settledCount,
                    0
                  )}`
                : null}
            </Loadable>
          </Cell>
        </div>
      ))}

      {/* An investment whose plan row has been deleted has no currency, and
          this component will not invent one for it. Saying how many were left
          out is the difference between a total that is incomplete and a total
          that is silently wrong. */}
      {!loading && unbucketed > 0 && (
        <p className="text-[11px] leading-tight text-subtle-foreground">
          {t("n_not_counted_missing_plan", { count: unbucketed })}
        </p>
      )}
    </section>
  );
}

function Cell({
  label,
  note,
  children,
}: {
  label: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 bg-surface-2 px-3 py-2.5">
      <span className="text-[10px] font-medium uppercase tracking-widest text-subtle-foreground">
        {label}
      </span>
      <span className="font-mono text-base font-semibold tabular-nums tracking-tight text-foreground">
        {children}
      </span>
      <span className="text-[11px] leading-tight text-subtle-foreground">
        {note}
      </span>
    </div>
  );
}
