"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { m } from "framer-motion";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { BUCKET_SLOT, count, type IconReport } from "./types";
import { useBucketLabel } from "./use-labels";

/**
 * The one figure this page exists to move: how much of the catalog can actually
 * draw itself.
 *
 * It is a single meter, not four cards, because the four numbers underneath it
 * (`cex`/`eco`/`fiat`/`fx`) are PARTS of one whole and reading them as separate
 * totals loses that. The bar carries the covered remainder and each class's
 * deficit as segments of the same 100%, so "97 missing" is visibly a sliver
 * rather than a scary number sitting on its own.
 *
 * Colour is never the only encoding here: every segment has a legend row with
 * its label and its count, which is also the only way the `fx` caveat below can
 * attach to the class it is about.
 */
export function CoverageBand({
  report,
  loading,
}: {
  report: IconReport | null;
  loading: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const bucketLabel = useBucketLabel();

  const model = useMemo(() => {
    if (!report || !report.totalSymbols) return null;
    const total = report.totalSymbols;
    const covered = Math.max(total - report.missing, 0);
    const segments = Object.entries(report.missingByBucket || {})
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    return {
      total,
      covered,
      /* One decimal, and never rounded UP to 100 while anything is still
         missing — a page reporting full coverage above a list of 97 gaps is
         the sort of thing nobody trusts twice. */
      pct:
        report.missing === 0
          ? 100
          : Math.min(Math.floor((covered / total) * 1000) / 10, 99.9),
      segments,
    };
  }, [report]);

  if (loading || !model) {
    return (
      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-10">
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="flex flex-wrap gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const { total, covered, pct, segments } = model;

  return (
    <Card className="overflow-hidden p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-10">
        {/* ---- the figure ------------------------------------------------ */}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("icon_coverage")}
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">
              {pct.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
            <span className="text-2xl font-medium text-muted-foreground">%</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("symbols_carry_a_real_icon", {
              covered: count(covered),
              total: count(total),
            })}
          </p>
        </div>

        {/* ---- the meter -------------------------------------------------- */}
        <div className="min-w-0 space-y-4">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <m.div
              className="h-full bg-success"
              initial={{ width: 0 }}
              animate={{ width: `${(covered / total) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            {segments.map(([bucket, n]) => (
              <m.div
                key={bucket}
                className={cn("h-full", BUCKET_SLOT[bucket] ?? "bg-muted-foreground/40")}
                initial={{ width: 0 }}
                animate={{
                  /* A class with three symbols missing out of 5,000 rounds to
                     nothing; the floor keeps it visible as a hairline so the
                     legend below is not pointing at empty space. */
                  width: `max(0.35%, ${(n / total) * 100}%)`,
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                title={`${bucketLabel(bucket)}: ${count(n)}`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <LegendItem
              swatch="bg-success"
              label={t("has_an_icon")}
              value={count(covered)}
            />
            {segments.map(([bucket, n]) => (
              <LegendItem
                key={bucket}
                swatch={BUCKET_SLOT[bucket] ?? "bg-muted-foreground/40"}
                label={bucketLabel(bucket)}
                value={count(n)}
              />
            ))}
          </div>

          {/* The headline count includes fx, but this page never fetches it:
              stock and commodity marks need a company-logo source rather than a
              crypto one, and the forex desk renders no per-symbol image today.
              Saying so stops the total looking like a number the button should
              be able to drive to zero. */}
          {(report?.missingByBucket?.fx ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("stocks_and_commodities_are_counted_but_not_fetched")}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function LegendItem({
  swatch,
  label,
  value,
}: {
  swatch: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("size-2 shrink-0 rounded-full", swatch)} aria-hidden />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
