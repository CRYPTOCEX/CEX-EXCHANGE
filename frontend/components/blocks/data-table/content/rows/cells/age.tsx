import React from "react";
import { format } from "date-fns";
import { AlertTriangle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SLA_HOURS, formatDuration, slaLevel, type SlaKey } from "@/config/sla";
import { CellRendererProps } from "./cell-renderer-props";
import { useTranslations } from "next-intl";

/**
 * Time in queue, against the SLA for this kind of work.
 *
 * The queue contract's age axis. `DateCell` already renders relative time
 * ("3 days ago"), which answers WHEN but not WHETHER THAT IS FINE — and a
 * withdrawal pending for eight days looks exactly like one pending for eight
 * hours in a list sorted by anything else.
 *
 * TWO THINGS THIS DELIBERATELY DOES NOT DO
 * ----------------------------------------
 * 1. It does not tint a settled row. A `COMPLETED` transaction from 2023 is 400
 *    days old and that is not a problem; painting it red trains the operator to
 *    ignore red. Only rows in `activeStatuses` carry a tone.
 * 2. It does not invent thresholds. They come from `config/sla.ts`, which
 *    mirrors `backend/src/utils/sla.ts` — the same numbers the dashboard health
 *    card raises its warning from, so a red row and an amber dashboard can
 *    never disagree.
 */

export interface AgeCellConfig {
  /** Which SLA budget applies. Defaults to the generic transaction one. */
  sla?: SlaKey;
  /** Row field holding the status. Defaults to `status`. */
  statusKey?: string;
  /**
   * Statuses that are still WAITING on someone. A row in any other status is
   * shown as a plain age with no tone.
   */
  activeStatuses?: string[];
}

interface AgeCellProps extends CellRendererProps<string | number | Date> {
  config?: AgeCellConfig;
}

export function AgeCell({ value, row, config }: AgeCellProps) {
  const t = useTranslations("components_blocks");
  const sla: SlaKey = config?.sla ?? "transaction";
  const statusKey = config?.statusKey ?? "status";
  const activeStatuses = config?.activeStatuses ?? ["PENDING"];

  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  const date = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(date.getTime())) {
    return <span className="text-muted-foreground">—</span>;
  }

  const status = String(row?.[statusKey] ?? "").toUpperCase();
  const isActive = activeStatuses
    .map((s) => s.toUpperCase())
    .includes(status);

  const { level, hours, budgetHours } = slaLevel(date, sla);
  const tone = isActive ? level : "fresh";
  const label = formatDuration(hours);

  return (
    <Tooltip>
      <TooltipTrigger>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 tabular-nums",
            tone === "breached" && "font-medium text-destructive-ink",
            tone === "due" && "text-warning-ink",
            tone === "fresh" && "text-muted-foreground"
          )}
        >
          {tone === "breached" ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          ) : tone === "due" ? (
            <Clock className="h-3.5 w-3.5 shrink-0" />
          ) : null}
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-0.5">
          <div>{format(date, "PPP p")}</div>
          {isActive ? (
            <div>
              {tone === "breached"
                ? `Past the ${formatDuration(budgetHours)} target by ${formatDuration(hours - budgetHours)}`
                : `Target ${formatDuration(budgetHours)} — ${formatDuration(budgetHours - hours)} left`}
            </div>
          ) : (
            <div>{t("settled_no_target_applies")}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export { SLA_HOURS };
