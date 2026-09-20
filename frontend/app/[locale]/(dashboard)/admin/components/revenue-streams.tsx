"use client";

import { Coins, Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonText } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMoney } from "@/utils/currency";
import { cn } from "@/lib/utils";

import type { DashboardData } from "./types";
import { useTranslations } from "next-intl";

/**
 * Where the money came from, by product.
 *
 * `adminProfit.type` already records WHAT generated each fee — P2P_TRADE,
 * NFT_SALE, STAKING, GATEWAY_PAYMENT and so on — so the platform has always
 * been able to answer "which of the things I bought are earning?" and never
 * did. This is that answer, and it is the most direct form of the
 * addon-awareness the rest of the page expresses in queues: a product that is
 * enabled but has earned nothing this period simply does not appear.
 *
 * Streams whose extension is DISABLED are filtered out on the server, so this
 * list never advertises a product the operator has switched off.
 *
 * A RANKED LIST, NOT A PIE. Six-plus revenue streams in a donut is four slices
 * and a smear, and the question here is comparative magnitude ("is P2P bigger
 * than staking yet?"), which a shared baseline answers and angles do not.
 */

/*
 * Literal classes, indexed by position. The ramp is assigned BY POSITION and
 * never cycled past six — these are identities, not states, so no status token
 * appears here. Written out because a runtime `bg-chart-${i}` emits no CSS.
 */
const RAMP_BAR = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-chart-6",
] as const;

export function RevenueStreams({
  data,
  loading,
}: {
  data: DashboardData | null;
  loading: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const streams = data?.revenueByStream ?? [];
  const currency = data?.overview.revenue.currency ?? "USD";
  const unpriced = data?.overview.revenue.unpriced ?? [];

  /* The scale is the LARGEST stream, not the total. Against the total, a
     platform whose top stream is 30% renders every bar in the left third of the
     card and the ranking becomes unreadable. */
  const max = streams.reduce((m, s) => Math.max(m, Math.abs(s.amount)), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-chart-2/15 text-chart-2">
              <Coins className="h-3.5 w-3.5" />
            </span>
            {t("revenue_by_product")}
          </CardTitle>
          {unpriced.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-[11px] text-warning-ink">
                  <Info className="h-3 w-3" />
                  Partial
                </span>
              </TooltipTrigger>
              <TooltipContent>
                No USD rate for {unpriced.join(", ")} — those fees are not in
                these figures, so the totals are a lower bound.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/*
          ONE `<ul>`, both states.

          It used to branch to a `<div>` of four `h-8` bars. A real row here is
          two lines — a `text-sm` label line and a 6px bar with `space-y-1.5`
          between them, about 34px — plus `space-y-3` from the list, and `h-8`
          is 32px inside a `space-y-3` div. Close, and close is the problem:
          nothing keeps it close. Change the label to `text-base` or the bar to
          `h-2` and the two numbers separate silently, because the `h-8` has no
          relationship to the row it imitates.
        */}
        {loading && !data ? (
          <ul className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      <SkeletonText placeholder={tCommon("trading_fees")} />
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      <SkeletonText placeholder="12,345.00" />
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-subtle-foreground">
                      <SkeletonText placeholder="00" />%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-sm bg-surface-3" />
              </li>
            ))}
          </ul>
        ) : streams.length === 0 ? (
          <EmptyState
            icon={<Coins className="h-5 w-5" />}
            title={t("no_fee_revenue_this_period")}
            description={t("fees_are_credited_to_the_profit")}
          />
        ) : (
          <ul className="space-y-3">
            {streams.map((stream, index) => (
              <li key={stream.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{stream.label}</span>
                    {stream.extension && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-subtle-foreground">
                        addon
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {formatMoney(stream.amount, currency, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-subtle-foreground">
                      {stream.share}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-sm bg-surface-3">
                  <div
                    className={cn(
                      "h-full rounded-sm",
                      RAMP_BAR[index % RAMP_BAR.length]
                    )}
                    style={{
                      width: `${max > 0 ? (Math.abs(stream.amount) / max) * 100 : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
