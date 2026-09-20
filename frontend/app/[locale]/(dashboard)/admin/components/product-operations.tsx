"use client";

import { useMemo } from "react";
import {
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonText } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { checkPermission } from "@/components/blocks/data-table/utils/permissions";
import { useUserStore } from "@/store/user";
import { formatMoney } from "@/utils/currency";
import { cn } from "@/lib/utils";

import { PRODUCT_BY_NAME } from "./product-catalog";
import type { DashboardData, OperationsSummary } from "./types";
import { useTranslations } from "next-intl";

/**
 * The products this platform is actually running, and what each one wants.
 *
 * "Show content according to the active addons" is the requirement, and the
 * honest version of it is narrower than it first looks: SIX OF THE TWENTY-ONE
 * EXTENSIONS HAVE NO DECISION QUEUE AT ALL — ecosystem, futures, the two AI
 * engines, wallet_connect and chart_engine are configured once and then run
 * themselves. Rendering "0 pending" for those is not a neutral default, it is a
 * false claim that a queue exists and is empty.
 *
 * So a product gets one of three readings here, and never a made-up metric:
 *   - it has work waiting        -> the count, linked to the queue
 *   - it has a queue and it is clear -> "Clear"
 *   - it has no queue at all     -> its revenue, or "Running", and no count
 *
 * Both inputs are already addon-filtered upstream. `revenueByStream` drops
 * streams whose extension is disabled, and `/operations/summary` only counts
 * queues for enabled extensions — so nothing on this card can advertise a
 * product the operator has switched off.
 */

interface ProductRow {
  name: string;
  label: string;
  /* `LucideIcon`, not a hand-written `ComponentType<{className}>`: the wider
     shape is a SUPERtype, so `ProductRow` was not assignable back to the
     inferred row literal and the `row is ProductRow` guard below could not
     compile. Take the type the catalogue actually holds. */
  icon: LucideIcon;
  href: string | null;
  /** Null when this product has no decision queue at all. */
  pending: number | null;
  breached: number;
  unavailable: boolean;
  /** The single busiest queue, so the tile can link where the work is. */
  primaryHref: string | null;
  revenue: number;
}

export function ProductOperations({
  data,
  operations,
  extensions,
  loading,
}: {
  data: DashboardData | null;
  operations: OperationsSummary | null;
  extensions: string[];
  loading: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const user = useUserStore((s) => s.user);
  const currency = data?.overview.revenue.currency ?? "USD";

  const rows = useMemo<ProductRow[]>(() => {
    const queues = (operations?.queues ?? []).filter(
      (q) => q.group === "addon" && checkPermission(user, q.permission)
    );

    const revenueByExtension = new Map<string, number>();
    for (const stream of data?.revenueByStream ?? []) {
      if (!stream.extension) continue;
      revenueByExtension.set(
        stream.extension,
        (revenueByExtension.get(stream.extension) ?? 0) + stream.amount
      );
    }

    return extensions
      .map((name): ProductRow | null => {
        const product = PRODUCT_BY_NAME.get(name);
        if (!product) return null;

        const own = queues.filter((q) => q.extension === name);
        const busiest = own.reduce<(typeof own)[number] | null>(
          (best, q) => (best === null || q.count > best.count ? q : best),
          null
        );

        return {
          name,
          label: product.label,
          icon: product.icon,
          href: product.href,
          /* `null`, not `0`. See the header note — the two mean different
             things and the tile renders them differently. */
          pending: own.length > 0 ? own.reduce((s, q) => s + q.count, 0) : null,
          breached: own.reduce((s, q) => s + q.breached, 0),
          unavailable: own.some((q) => q.unavailable),
          primaryHref: busiest && busiest.count > 0 ? busiest.href : product.href,
          revenue: revenueByExtension.get(name) ?? 0,
        };
      })
      .filter((row): row is ProductRow => row !== null)
      /* Work first, then earnings, then alphabetical — so the products that
         want something are always at the top left. */
      .sort(
        (a, b) =>
          (b.pending ?? 0) - (a.pending ?? 0) ||
          b.revenue - a.revenue ||
          a.label.localeCompare(b.label)
      );
  }, [data, operations, extensions, user]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-chart-4/15 text-chart-4">
              <Boxes className="h-3.5 w-3.5" />
            </span>
            {t("your_products")}
          </CardTitle>
          {rows.length > 0 && (
            <Badge tone="neutral" appearance="soft" className="tabular-nums">
              {rows.length} active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/*
          HOW MANY TILES THERE ARE IS NOT WAITING ON THE FETCH. WHICH TILE GOES
          WHERE IS.
          =====================================================================
          `rows` is derived from `extensions` alone — the queue payload and the
          revenue payload only decide what each tile SAYS and, through the sort,
          what ORDER they come in. So `rows.length` is knowable before
          `/operations/summary` answers, and it is what the pending grid
          reserves.

          It used to be a fixed EIGHT tiles regardless. On a twenty-product
          install that is two rows becoming five: the card went 231px ->
          464.5px when the payload landed and pushed the footer 233.5px down —
          a third of this route's 777.5px of travel, and the only part of it
          that was ever knowable in advance. The count was not close to right
          and nothing kept it close, which is the same defect the note below
          records about the tile's HEIGHT.

          THE PENDING TILES STAY ANONYMOUS, and that is deliberate rather than
          lazy. Every label, icon and href IS known here, so a first attempt
          rendered the real tiles with only the status line withheld. That
          reserved the height perfectly and introduced a worse defect: the sort
          is `pending desc, revenue desc, label`, and with no payload every row
          scores zero, so the grid renders alphabetically and then RE-SORTS when
          the counts land. Measured: twenty labelled tiles each moving up to
          701px vertically and 991px horizontally — twenty pieces of static
          chrome moving, in exchange for the height that skeleton tiles reserve
          just as exactly. Reserve the box, withhold the claim: the number of
          products is a fact about the install, their ranking is a fact about
          the data.

          `|| 8` covers the one case where even the count is unknown:
          `extensions` is a persisted CLIENT store, so the server renders zero
          rows. Eight bordered tiles is the "we do not know yet" shape; falling
          through to `EmptyState` there would tell an operator with twenty
          products that they have none.
        */}
        {loading && !operations ? (
          /*
            The tile shell is real: `p-3` around a 32px icon square beside a
            `text-sm` line and a `text-[11px]` line with `mt-0.5`. `h-20` was a
            guess at that — 80px happens to be near it today and is pinned to
            nothing. The border is the part that mattered most: the real tiles
            are `rounded-lg border border-border bg-card`, and eight borderless
            grey blocks becoming eight bordered cards is a visible change of
            material as well as of size.
          */
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: rows.length || 8 }, (_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-surface-3" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      <SkeletonText placeholder={t("product_name")} />
                    </span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    <SkeletonText placeholder="0 waiting" />
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-5 w-5" />}
            title={t("no_extensions_enabled")}
            description={t("products_you_enable_appear_here_with")}
          />
        ) : (
          /* `xl:grid-cols-4` is the page-level move made local: this card is
             rendered full-bleed, so at xl a twenty-product install is five rows
             rather than seven. The lower breakpoints are unchanged — the card
             still reads correctly if it is ever placed back in a column. */
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((row) => {
              const Icon = row.icon;
              const target = row.primaryHref ?? row.href;
              const hasWork = (row.pending ?? 0) > 0;

              const body = (
                <>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{row.label}</span>
                      {row.breached > 0 && (
                        <Badge tone="destructive" appearance="soft" className="tabular-nums">
                          {row.breached} overdue
                        </Badge>
                      )}
                    </span>

                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                      {row.unavailable ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <HelpCircle className="h-3 w-3" />
                          {t("queue_unreadable")}
                        </span>
                      ) : hasWork ? (
                        <span className="font-medium text-primary-ink">
                          {row.pending} waiting
                        </span>
                      ) : row.pending === 0 ? (
                        <span className="flex items-center gap-1 text-success-ink">
                          <CheckCircle2 className="h-3 w-3" />
                          Clear
                        </span>
                      ) : (
                        /* No queue exists for this product. Saying "Clear"
                           would imply one does. */
                        <span className="text-subtle-foreground">Running</span>
                      )}

                      {row.revenue !== 0 && (
                        <>
                          <span aria-hidden className="text-subtle-foreground">·</span>
                          <span className="font-mono tabular-nums text-muted-foreground">
                            {formatMoney(row.revenue, currency, {
                              notation: "compact",
                              maximumFractionDigits: 1,
                            })}
                          </span>
                        </>
                      )}
                    </span>
                  </span>

                  {target && (
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 self-start text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </>
              );

              const shell = cn(
                "group flex items-start gap-3 rounded-lg border border-border bg-card p-3",
                hasWork && "border-border-strong"
              );

              /* A product with no admin section (wallet_connect) renders as a
                 plain tile rather than a link to nowhere. */
              return target ? (
                <Link
                  key={row.name}
                  href={target}
                  className={cn(
                    shell,
                    "transition-colors duration-200 hover:border-border-strong",
                    "focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div key={row.name} className={shell}>
                  {body}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
