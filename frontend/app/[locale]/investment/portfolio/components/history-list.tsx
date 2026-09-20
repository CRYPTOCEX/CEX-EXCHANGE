"use client";

/**
 * Everything that has already settled: completed, cancelled, rejected.
 *
 * ONE LIST, NOT A DATA TABLE.
 * ---------------------------
 * This replaces `/investment/history`, which was a `DataTable` — a sortable,
 * filterable, paginated grid for what is, for almost every account, under
 * twenty rows. Two consequences of that choice shipped:
 *
 *   - `amount` and `profit` were declared `type: "number"`, so both rendered as
 *     BARE UNDENOMINATED FIGURES. A BTC position's 0.5 and an NGN position's
 *     40,000 sat in one column with nothing saying which was which.
 *
 *   - The view dialog that WOULD have shown the currency was passed
 *     `canView={false}`, which makes rows non-expandable — so on desktop there
 *     was no way to open a row and find out. The dialog only ever rendered on
 *     mobile.
 *
 * Every figure here carries its unit, because that is the only way a mixed
 * portfolio is readable at all.
 *
 * OUTCOME IS NOT STATUS, AND BOTH ARE SHOWN.
 * ------------------------------------------
 * `status` says whether it finished; `result` says which way. A COMPLETED
 * position can be a WIN, a DRAW or a LOSS, and the old table rendered the two
 * axes as two adjacent badges with no hierarchy. The status is the chip; the
 * outcome is the signed money figure, which is what anyone actually reads.
 */

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
import { Money, SignedMoney } from "../../components/kit/money";
import { useTermLabel } from "../../components/term-label";
import { useStatusLabel } from "../../components/outcome-label";
import type { InvestmentView } from "../../components/kit/position";
import { EmptyPanel } from "../../components/page-frame";

interface HistoryListProps {
  positions: InvestmentView[];
}

export function HistoryList({ positions }: HistoryListProps) {
  const t = useTranslations("investment");
  const termLabel = useTermLabel();
  const statusLabel = useStatusLabel();

  if (positions.length === 0) {
    return (
      <EmptyPanel
        icon="lucide:history"
        title={t("nothing_settled_yet")}
        body={t("settled_positions_explainer")}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {positions.map((position) => {
        const term = termLabel(position.term);
        return (
          <li key={position.id}>
            <Link
              href={`/investment/${position.id}`}
              className="group flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-4 py-3 transition-colors hover:border-border-strong"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {position.planTitle ?? t("plan_no_longer_available")}
                  </span>
                  <Badge tone={statusTone(position.status)} appearance="soft">
                    {statusLabel(position.status)}
                  </Badge>
                </div>
                <span className="text-[11px] text-subtle-foreground">
                  {[
                    term,
                    position.clock.endDate
                      ? position.clock.endDate.toLocaleDateString()
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end gap-0.5">
                  <Money
                    value={position.amount}
                    currency={position.currency}
                    emphasis="secondary"
                    role="headline"
                  />
                  {/*
                    `realised` is null for CANCELLED and REJECTED rows, which is
                    correct and not a gap: a cancelled position was refunded at
                    principal and neither gained nor lost, so a "0.00" here
                    would be a settlement figure for a settlement that never
                    happened.
                  */}
                  {position.realised !== null ? (
                    <SignedMoney
                      value={position.realised}
                      currency={position.currency}
                      size="xs"
                    />
                  ) : (
                    <span className="text-[11px] text-subtle-foreground">
                      {position.status === "CANCELLED"
                        ? t("principal_refunded")
                        : "—"}
                    </span>
                  )}
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
