"use client";

import { useTranslations } from "next-intl";
import { format, formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, Ban, Loader2, Play } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status-tone";
import type { CronJob } from "@/store/cron";

import {
  categoryLabel,
  cronJobState,
  formatDuration,
  formatPeriod,
  nextRunAt,
  toDate,
} from "./job-state";

/**
 * One job, in full.
 *
 * The REFUSAL PANEL is above the figures, and that order is the whole design.
 * "Ran 30 seconds ago, in 4ms, 100% success" is true of a refused job and beside
 * the point: it ran, it returned, it did nothing. Reason / not happening / fix
 * is the shape the backend records (`cron/refusal.ts`) and the shape the URGENT
 * alert email uses, so an operator arriving from that email finds the same three
 * lines in the same order.
 */
interface CronDetailModalProps {
  job: CronJob | null;
  isOpen: boolean;
  onClose: () => void;
  onTrigger: (name: string) => void;
  isTriggering: boolean;
  /** False where a manual run is structurally refused; explained inline. */
  canTrigger: boolean;
  triggerBlockedReason?: string;
  /** Focus the live log on this job — the operator's usual next step. */
  onFocusLog: (name: string) => void;
}

export function CronDetailModal({
  job,
  isOpen,
  onClose,
  onTrigger,
  isTriggering,
  canTrigger,
  triggerBlockedReason,
  onFocusLog,
}: CronDetailModalProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  if (!job) return null;

  const state = cronJobState(job);
  const tone = statusTone(state);
  const lastRun = toDate(job.lastRun);
  const nextRun = nextRunAt(job);
  const overdue = nextRun ? nextRun.getTime() <= Date.now() : false;
  const refusal = job.refusal;
  const since = toDate(refusal?.since);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="3xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
                {job.title}
                <Badge tone={tone} appearance="soft" className="capitalize">
                  {state}
                </Badge>
              </DialogTitle>
              <DialogDescription>{job.description}</DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge appearance="outline" tone="neutral">
                {categoryLabel(job.category)}
              </Badge>
              <Button
                size="sm"
                onClick={() => onTrigger(job.name)}
                disabled={!canTrigger || isTriggering || job.status === "running"}
              >
                {isTriggering || job.status === "running" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-1.5 h-4 w-4" />
                )}
                {t("run_now")}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Why the button above is disabled, said where the button is. */}
        {!canTrigger && triggerBlockedReason ? (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {triggerBlockedReason}
          </p>
        ) : null}

        {refusal ? (
          <div
            className={cn(
              "rounded-md border p-4 text-sm",
              refusal.kind === "refused"
                ? "border-destructive bg-destructive/10"
                : "border-warning bg-warning/10"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 font-medium",
                refusal.kind === "refused" ? "text-destructive" : "text-warning"
              )}
            >
              {refusal.kind === "refused" ? (
                <Ban className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>
                {refusal.kind === "refused"
                  ? t("cron_job_not_running_headline")
                  : t("cron_job_degraded_headline")}
              </span>
            </div>
            <dl className="mt-3 space-y-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {tCommon("since")}
                </dt>
                <dd className="text-foreground">
                  {since
                    ? `${formatDistanceToNowStrict(since, { addSuffix: true })} (${format(
                        since,
                        "MMM d, yyyy HH:mm:ss"
                      )})`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {tCommon("reason")}
                </dt>
                <dd className="text-foreground">{refusal.reason}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("cron_not_happening")}
                </dt>
                <dd className="text-foreground">{refusal.impact}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {tCommon("fix")}
                </dt>
                <dd className="text-foreground">{refusal.fix}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {job.lastRunError ? (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3">
            <p className="text-xs uppercase tracking-wide text-destructive">
              {tCommon("last_error")}
            </p>
            <p className="mt-1 break-words font-mono text-xs text-foreground">
              {job.lastRunError}
            </p>
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={t("every")} value={formatPeriod(job.period)} mono />
          <Fact
            label={t("last_run")}
            value={
              lastRun
                ? formatDistanceToNowStrict(lastRun, { addSuffix: true })
                : tCommon("never")
            }
          />
          <Fact
            label={t("next_run")}
            value={
              nextRun
                ? overdue
                  ? t("cron_due_now")
                  : formatDistanceToNowStrict(nextRun, { addSuffix: true })
                : "—"
            }
            /* Struck through while refused — the tick will fire and be declined
               again, so a plain "in 30s" would promise work that is not coming. */
            muted={state === "refused" || state === "degraded"}
          />
          <Fact
            label={tCommon("duration")}
            value={formatDuration(job.executionTime)}
            mono
          />
        </dl>

        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("cron_recent_runs")}
            </p>
            {typeof job.successRate === "number" ? (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {t("cron_success_rate", { rate: job.successRate })}
              </span>
            ) : null}
          </div>
          {job.lastExecutions?.length ? (
            <ul className="mt-2 space-y-1">
              {job.lastExecutions.slice(0, 10).map((execution, index) => {
                const at = toDate(execution.timestamp);
                return (
                  <li
                    key={`${at?.getTime() ?? index}-${index}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <Badge
                      tone={statusTone(execution.status)}
                      appearance="soft"
                      className="text-[11px] capitalize"
                    >
                      {execution.status}
                    </Badge>
                    <span className="flex-1 truncate text-right font-mono tabular-nums text-muted-foreground">
                      {formatDuration(execution.duration)}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-subtle-foreground">
                      {at ? format(at, "MMM d HH:mm:ss") : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("cron_no_recorded_runs")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="truncate font-mono text-[11px] text-subtle-foreground">
            {job.function}
          </span>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              onFocusLog(job.name);
              onClose();
            }}
          >
            {t("cron_show_in_log")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Fact({
  label,
  value,
  mono,
  muted,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm font-medium",
          mono && "font-mono tabular-nums",
          muted ? "text-subtle-foreground line-through" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
