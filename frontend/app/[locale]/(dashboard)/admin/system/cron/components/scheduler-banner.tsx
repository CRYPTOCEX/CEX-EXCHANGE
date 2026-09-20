"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Ban,
  CircleHelp,
  Copy,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SchedulerInfo, SchedulerStatus } from "@/store/cron";

/**
 * WHO is running the scheduler, said before anything else on the page.
 *
 * THE STATE THIS EXISTS FOR. Since the cron split became the default a
 * deployment is three processes and exactly one of them registers jobs. If that
 * one stops, every other signal stays green: the site serves, the admin panel
 * loads, and this very page still lists all 65 jobs with plausible "last run"
 * times — because the run bookkeeping is hydrated from a Redis snapshot that
 * outlives its writer by 24 hours. A job list simply cannot report the absence
 * of the thing that would have updated it. The 15-second heartbeat can, and
 * this is where an operator reads it.
 *
 * The banner is loud only when there is something to be loud about. `running`
 * renders a single quiet line naming the process, because a warning strip that
 * is always there is one nobody reads on the day it matters.
 */

/** Everything a status decides, in one place, so no two branches can disagree. */
const STATUS_STYLE: Record<
  SchedulerStatus,
  { tone: BadgeTone; frame: string; ink: string; icon: LucideIcon }
> = {
  running: {
    tone: "success",
    frame: "border-border bg-card",
    ink: "text-success",
    icon: HeartPulse,
  },
  // Two schedulers is worse than none: BullMQ hands a repeatable job to
  // whichever worker takes it and the single-flight guard is per-process, so
  // money jobs run twice over the same rows.
  duplicate: {
    tone: "destructive",
    frame: "border-destructive bg-destructive/10",
    ink: "text-destructive",
    icon: Copy,
  },
  missing: {
    tone: "destructive",
    frame: "border-destructive bg-destructive/10",
    ink: "text-destructive",
    icon: Ban,
  },
  stale: {
    tone: "destructive",
    frame: "border-destructive bg-destructive/10",
    ink: "text-destructive",
    icon: AlertTriangle,
  },
  // "I cannot tell" is not "nothing is scheduling". Warning, never destructive.
  unknown: {
    tone: "warning",
    frame: "border-warning bg-warning/10",
    ink: "text-warning",
    icon: CircleHelp,
  },
  unavailable: {
    tone: "neutral",
    frame: "border-border bg-muted/40",
    ink: "text-muted-foreground",
    icon: CircleHelp,
  },
};

interface SchedulerBannerProps {
  info: SchedulerInfo | null;
}

export function SchedulerBanner({ info }: SchedulerBannerProps) {
  const t = useTranslations("dashboard_admin");

  if (!info) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="h-4 w-64 animate-pulse rounded-sm bg-surface-3" />
      </div>
    );
  }

  const style = STATUS_STYLE[info.status] ?? STATUS_STYLE.unknown;
  const Icon = style.icon;

  const headline: Record<SchedulerStatus, string> = {
    running: t("cron_scheduler_running"),
    missing: t("cron_scheduler_missing"),
    stale: t("cron_scheduler_stale"),
    duplicate: t("cron_scheduler_duplicate"),
    unknown: t("cron_scheduler_unknown"),
    unavailable: t("cron_scheduler_unavailable"),
  };

  const beat = info.scheduler;
  const self = info.process;

  return (
    <div className={cn("rounded-lg border p-4", style.frame)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-surface-3",
              style.ink
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">
                {headline[info.status]}
              </span>
              {beat ? (
                <Badge tone={style.tone} appearance="soft" className="font-mono text-[11px]">
                  {beat.mode === "only"
                    ? t("cron_process_dedicated")
                    : t("cron_process_inline")}
                </Badge>
              ) : null}
            </div>
            {/*
              The backend's own wording, not a paraphrase. It names the process,
              the PM2 app and the command to run — an operator arriving here from
              the URGENT refusal email finds the same sentence they were sent.
            */}
            <p className="mt-1 text-sm text-muted-foreground">{info.message}</p>
          </div>
        </div>

        {/* Facts, in a fixed order, so two deployments can be compared by eye. */}
        <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1 text-xs sm:text-right">
          {beat ? (
            <>
              <dt className="text-muted-foreground">{t("cron_scheduler_host")}</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {beat.instanceId}
              </dd>
              <dt className="text-muted-foreground">{t("cron_jobs_registered")}</dt>
              <dd className="font-mono tabular-nums text-foreground">{beat.jobs}</dd>
              <dt className="text-muted-foreground">{t("cron_last_heartbeat")}</dt>
              <dd
                className={cn(
                  "font-mono tabular-nums",
                  beat.stale ? "text-destructive" : "text-foreground"
                )}
              >
                {Math.round(beat.ageMs / 1000)}s
              </dd>
            </>
          ) : null}
          {self ? (
            <>
              <dt className="text-muted-foreground">{t("cron_served_by")}</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {self.hostname}:{self.pid} · CRON_MODE={self.mode}
              </dd>
            </>
          ) : null}
        </dl>
      </div>

      {/*
        The one consequence an operator meets within seconds of opening this
        page, so it is stated here rather than discovered by pressing a button
        and reading a 503. Only shown when it is actually true.
      */}
      {self && !self.canTrigger ? (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {t("cron_manual_runs_unavailable")}
          </span>{" "}
          {t("cron_manual_runs_unavailable_why")}
        </p>
      ) : null}
    </div>
  );
}
