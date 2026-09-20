"use client";

import { memo, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonText } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status-tone";
import type { CronJob } from "@/store/cron";

import {
  categoryLabel,
  cronJobState,
  formatDuration,
  formatPeriod,
  isNotWorking,
  nextRunAt,
  toDate,
  type CronJobState,
} from "./job-state";

/**
 * The job table, grouped by the registry's own category.
 *
 * WHY GROUPED. There are ~65 jobs across core and sixteen addon categories, and
 * a flat list of 65 rows is a list nobody reads — the previous page rendered
 * them as 65 equal cards in a three-up grid, where a refused withdrawal
 * processor looked exactly like a healthy analytics aggregator two rows down.
 * The category is also the unit an operator reasons in ("did the ecosystem
 * crons stop?"), and a category that contains something not working carries
 * that up to its header so a collapsed group can never hide it.
 */

interface JobListProps {
  jobs: CronJob[];
  /** Every job, unfiltered — the group headers count against the whole set. */
  allJobs: CronJob[];
  onSelect: (name: string) => void;
  onTrigger: (name: string) => void;
  triggering: string | null;
  /** False on a web process that has delegated cron; explains the disabled run. */
  canTrigger: boolean;
  loading: boolean;
}

/** Which glyph a not-working row wears. Paint only — the tone is resolved above. */
const STATE_ICON: Partial<Record<CronJobState, LucideIcon>> = {
  refused: Ban,
  degraded: AlertTriangle,
};

/**
 * The four figure columns, declared ONCE.
 *
 * The header row and 65 body rows have to line up, and the only way that stays
 * true through an edit is for both to read the same widths. It is also why the
 * labels are in a header at all: repeated on every row — which is what the
 * first pass did — four uppercase captions x 65 rows is 260 words of chrome
 * above the eleven numbers that matter.
 */
const COLUMN_WIDTH = {
  every: "w-14",
  lastRun: "w-24",
  duration: "w-16",
  nextRun: "w-24",
} as const;

/** Header + rows share this so a column cannot drift out of alignment. */
const FIGURES_ROW = "hidden shrink-0 items-baseline gap-x-4 text-right sm:flex";

export function JobList({
  jobs,
  allJobs,
  onSelect,
  onTrigger,
  triggering,
  canTrigger,
  loading,
}: JobListProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  /**
   * Categories, ordered by how much they need looking at.
   *
   * Not alphabetical, and not registry order: a category with a refused job in
   * it goes to the top, because the whole point of this screen is that the one
   * broken thing must not be below the fold. Ties break on name so the order is
   * stable between renders.
   */
  const groups = useMemo(() => {
    const byCategory = new Map<string, CronJob[]>();
    for (const job of jobs) {
      const key = job.category || "normal";
      const list = byCategory.get(key);
      if (list) list.push(job);
      else byCategory.set(key, [job]);
    }

    return Array.from(byCategory.entries())
      .map(([category, list]) => ({
        category,
        jobs: list,
        notWorking: list.filter(isNotWorking).length,
        failed: list.filter((job) => cronJobState(job) === "failed").length,
        running: list.filter((job) => job.status === "running").length,
      }))
      .sort((a, b) => {
        if (a.notWorking !== b.notWorking) return b.notWorking - a.notWorking;
        if (a.failed !== b.failed) return b.failed - a.failed;
        return a.category.localeCompare(b.category);
      });
  }, [jobs]);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  /**
   * PENDING AND EMPTY ARE DIFFERENT ANSWERS, AND THE TABLE FRAME BELONGS TO
   * NEITHER OF THEM.
   * ==========================================================================
   *
   * What was here: `if (loading && !jobs.length) return <div className="space-y-2
   * p-4">{six h-12 pulses}</div>`, i.e. the component returned a DIFFERENT tree
   * while waiting. Two things were lost by that, and only one of them is the
   * obvious one.
   *
   *  - The sticky column legend — NAME / EVERY / LAST RUN / DURATION / NEXT RUN
   *    — is knowable before the fetch and was withheld anyway. It is 26px of
   *    `border-b` chrome at the top of a scroll container, so every row below
   *    it started 26px too high and the whole table stepped down the moment the
   *    jobs landed.
   *
   *  - The blocks themselves were `h-12` (48px) against a real row that is two
   *    lines of text plus `py-2.5` — 57px on desktop and taller again on a
   *    phone, where the `<dl>` adds a third line. Six of them therefore
   *    under-reserved by ~54px, and this list sits inside a `max-h-[38rem]`
   *    scroller, so the scrollbar itself appeared and re-flowed the row width.
   *
   * Both disappear if the pending state is the SAME table with unknown figures:
   * `PendingJobRow` below reads the same `FIGURES_ROW` and `COLUMN_WIDTH`
   * constants the real row does, so a column cannot be reserved at one width
   * and painted at another.
   */
  const showPendingRows = loading && jobs.length === 0;

  /**
   * Empty is a CONCLUSION — the filter ran and matched nothing — so it must not
   * be reachable while the answer is still in flight. Named here rather than
   * written `!loading && !jobs.length` inline at the JSX, both because the two
   * states are decided in one place that way and because the inline spelling is
   * exactly the `hidden-while-loading` shape the scanner flags.
   */
  const showEmptyState = !loading && jobs.length === 0;

  return (
    <div className="divide-y divide-border">
      {/* The column legend, once. Sticky so it survives 65 rows of scrolling. */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-3 py-1.5 text-[10px] uppercase tracking-wide text-subtle-foreground">
        <span className="min-w-0 flex-1">{tCommon("name")}</span>
        <div className={FIGURES_ROW}>
          <span className={COLUMN_WIDTH.every}>{t("every")}</span>
          <span className={COLUMN_WIDTH.lastRun}>{t("last_run")}</span>
          <span className={COLUMN_WIDTH.duration}>{tCommon("duration")}</span>
          <span className={COLUMN_WIDTH.nextRun}>{t("next_run")}</span>
        </div>
        <span className="w-7 shrink-0" />
      </div>

      {/*
        Six pending rows, and the count is admitted to be a guess.

        There is no knowable row count here — the registry is ~65 jobs across
        core and sixteen addon categories and the tab filter can cut it to two —
        so what is reserved is the CONTAINER and the row ANATOMY, not the exact
        number of children (SKELETONS.md, "Lists and grids"). What the group
        headers cost is not reserved either: which categories exist is a
        property of the payload.
      */}
      {showPendingRows
        ? Array.from({ length: 6 }).map((_, index) => (
            <PendingJobRow
              key={index}
              labels={{
                every: t("every"),
                lastRun: t("last_run"),
                duration: tCommon("duration"),
                runNow: t("run_now"),
              }}
            />
          ))
        : null}

      {showEmptyState ? (
        <EmptyState
          size="md"
          title={t("no_cron_jobs_match")}
          description={t("no_cron_jobs_match_hint")}
        />
      ) : null}

      {groups.map((group) => {
        const isCollapsed = collapsed[group.category];
        const total = allJobs.filter(
          (job) => (job.category || "normal") === group.category
        ).length;

        return (
          <section key={group.category}>
            <button
              type="button"
              onClick={() =>
                setCollapsed((previous) => ({
                  ...previous,
                  [group.category]: !previous[group.category],
                }))
              }
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                "bg-surface-2 hover:bg-surface-3",
                "focus-visible:outline-hidden focus-visible:ring-[3px] focus-visible:ring-ring/50"
              )}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate text-sm font-semibold text-foreground">
                {categoryLabel(group.category)}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {group.jobs.length === total
                  ? group.jobs.length
                  : `${group.jobs.length}/${total}`}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                {/* Carried onto the header so collapsing a group cannot hide it. */}
                {group.notWorking > 0 ? (
                  <Badge tone="destructive" appearance="soft" className="text-[11px]">
                    <Ban className="mr-1 h-3 w-3" />
                    {group.notWorking}
                  </Badge>
                ) : null}
                {group.failed > 0 ? (
                  <Badge tone="destructive" appearance="outline" className="text-[11px]">
                    {t("failed_count", { count: group.failed })}
                  </Badge>
                ) : null}
                {group.running > 0 ? (
                  <Badge tone="info" appearance="soft" className="text-[11px]">
                    {t("running_count", { count: group.running })}
                  </Badge>
                ) : null}
              </span>
            </button>

            {!isCollapsed ? (
              <div className="divide-y divide-border">
                {group.jobs.map((job) => (
                  <JobRow
                    key={job.name}
                    job={job}
                    onSelect={onSelect}
                    onTrigger={onTrigger}
                    isTriggering={triggering === job.name}
                    canTrigger={canTrigger}
                    labels={{
                      never: tCommon("never"),
                      lastRun: t("last_run"),
                      nextRun: t("next_run"),
                      every: t("every"),
                      duration: tCommon("duration"),
                      runNow: t("run_now"),
                      runNowBlocked: t("cron_manual_runs_unavailable"),
                      dueNow: t("cron_due_now"),
                    }}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/**
 * One job whose figures have not arrived yet.
 *
 * It is a separate component and not a `pending` branch inside `JobRow` because
 * `JobRow` derives eleven values off a `CronJob` that does not exist yet
 * (`cronJobState`, `statusTone`, `nextRunAt`, the border-left rule, the
 * strike-through on a refused next run) — threading `job?: CronJob` through all
 * of them would put an `undefined` guard on every line of the real row to serve
 * the state it is not in.
 *
 * What stops the two drifting apart is that everything MEASURABLE is shared:
 * the frame classes, `FIGURES_ROW`, and all four `COLUMN_WIDTH` entries are the
 * same constants the real row reads, so a column cannot be reserved at one
 * width and painted at another. The captions in the phone `<dl>` are the same
 * translated strings too — they are chrome, knowable now, and withholding them
 * would make the pending row a line shorter than the one replacing it.
 *
 * The figures themselves go through `SkeletonText`, which measures the
 * placeholder with the span's own font — `font-mono tabular-nums` here — rather
 * than a hand-typed `h-4 w-12` that could not follow a typography change.
 */
function PendingJobRow({ labels }: { labels: Record<string, string> }) {
  const t = useTranslations("dashboard_admin");
  return (
    <div
      /* `border-l-2 border-l-transparent` is the resting state of the real
         row's status rule. Dropping it would make every pending row 2px
         narrower in content and shift the whole column sideways on arrival. */
      className="border-l-2 border-l-transparent px-3 py-2.5"
      aria-busy="true"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              <SkeletonText placeholder={t("process_pending_withdrawals")} />
            </span>
            <Badge tone="neutral" appearance="soft" className="text-[11px] capitalize">
              <SkeletonText chars={7} radius="rounded-xs" />
            </Badge>
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-subtle-foreground">
            <SkeletonText placeholder="processPendingWithdrawals" />
          </div>
        </div>

        <div className={cn(FIGURES_ROW, "text-xs")}>
          <span className={cn(COLUMN_WIDTH.every, "font-mono tabular-nums")}>
            <SkeletonText placeholder="5m" />
          </span>
          <span className={cn(COLUMN_WIDTH.lastRun, "tabular-nums")}>
            <SkeletonText placeholder="2h ago" />
          </span>
          <span className={cn(COLUMN_WIDTH.duration, "font-mono tabular-nums")}>
            <SkeletonText placeholder="1.2s" />
          </span>
          <span className={cn(COLUMN_WIDTH.nextRun, "tabular-nums")}>
            <SkeletonText placeholder={t("in_30s")} />
          </span>
        </div>

        <div className="shrink-0">
          <span className="inline-flex">
            <Button
              size="2xs"
              variant="outline"
              iconOnly
              aria-label={labels.runNow}
              disabled
            >
              <Play className="h-3 w-3" />
            </Button>
          </span>
        </div>
      </div>

      <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-subtle-foreground sm:hidden">
        <div className="flex gap-1">
          <dt>{labels.every}</dt>
          <dd className="font-mono tabular-nums text-foreground">
            <SkeletonText placeholder="5m" />
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>{labels.lastRun}</dt>
          <dd className="text-foreground">
            <SkeletonText placeholder="2h ago" />
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>{labels.duration}</dt>
          <dd className="font-mono tabular-nums text-foreground">
            <SkeletonText placeholder="1.2s" />
          </dd>
        </div>
      </dl>
    </div>
  );
}

interface JobRowProps {
  job: CronJob;
  onSelect: (name: string) => void;
  onTrigger: (name: string) => void;
  isTriggering: boolean;
  canTrigger: boolean;
  labels: Record<string, string>;
}

/**
 * One job.
 *
 * `memo` because every WebSocket status frame re-renders the list, and there
 * are 65 of these — at a 5-second job that is a re-render of the whole table
 * several times a second.
 */
const JobRow = memo(function JobRow({
  job,
  onSelect,
  onTrigger,
  isTriggering,
  canTrigger,
  labels,
}: JobRowProps) {
  const state = cronJobState(job);
  const tone = statusTone(state);
  const StateIcon = STATE_ICON[state];
  const lastRun = toDate(job.lastRun);
  const nextRun = nextRunAt(job);
  const overdue = nextRun ? nextRun.getTime() <= Date.now() : false;
  const notWorking = isNotWorking(job);

  return (
    <div
      className={cn(
        "group relative cursor-pointer px-3 py-2.5 transition-colors hover:bg-surface-2",
        // The rule is the only place a row's own state paints its frame. A
        // refused row must be findable while scrolling past sixty-four others.
        "border-l-2",
        notWorking
          ? state === "refused"
            ? "border-l-destructive bg-destructive/5"
            : "border-l-warning bg-warning/5"
          : state === "failed"
            ? "border-l-destructive"
            : state === "running"
              ? // Matches the badge beside it. `statusTone` puts RUNNING on
                // `success` (healthy activity, never the accent — R2), and a
                // rule in a different hue from the pill on the same row reads
                // as two different states.
                "border-l-success"
              : "border-l-transparent"
      )}
      onClick={() => onSelect(job.name)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(job.name);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {job.title}
            </span>
            <Badge tone={tone} appearance="soft" className="text-[11px] capitalize">
              {state === "running" ? (
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              ) : StateIcon ? (
                <StateIcon className="mr-1 h-3 w-3" />
              ) : null}
              {state}
            </Badge>
          </div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-subtle-foreground">
            {job.name}
          </div>

          {/*
            The reason, on the row, truncated to one line.

            Not hidden behind the detail dialog: an operator scanning this table
            has to be able to tell "refused because the fx bridge is elsewhere"
            from "refused because ecosystem is disabled" without opening
            anything, or the refused state degrades back into a red pill that
            means "something, somewhere".
          */}
          {job.refusal ? (
            <p
              className={cn(
                "mt-1 line-clamp-1 text-xs",
                job.refusal.kind === "refused" ? "text-destructive" : "text-warning"
              )}
            >
              {job.refusal.reason}
            </p>
          ) : null}
          {!job.refusal && job.lastRunError ? (
            <p className="mt-1 line-clamp-1 text-xs text-destructive">
              {job.lastRunError}
            </p>
          ) : null}
        </div>

        {/* Figures only — the captions live in the sticky header above. */}
        <div className={cn(FIGURES_ROW, "text-xs")}>
          <span
            className={cn(
              COLUMN_WIDTH.every,
              "font-mono tabular-nums text-foreground"
            )}
          >
            {formatPeriod(job.period)}
          </span>
          <span
            className={cn(
              COLUMN_WIDTH.lastRun,
              "tabular-nums",
              lastRun ? "text-foreground" : "text-subtle-foreground"
            )}
          >
            {lastRun
              ? formatDistanceToNowStrict(lastRun, { addSuffix: true })
              : labels.never}
          </span>
          <span
            className={cn(
              COLUMN_WIDTH.duration,
              "font-mono tabular-nums text-foreground"
            )}
          >
            {formatDuration(job.executionTime)}
          </span>
          {/*
            Struck through when the job is not working. The field is real and is
            genuinely set — the scheduler stamps `lastRun + period` on every
            tick, refused ones included — so rendering it plainly would promise
            work in 30 seconds when the same refusal is what will happen.
          */}
          <span
            className={cn(
              COLUMN_WIDTH.nextRun,
              "tabular-nums",
              notWorking
                ? "text-subtle-foreground line-through"
                : nextRun
                  ? "text-foreground"
                  : "text-subtle-foreground"
            )}
          >
            {nextRun
              ? overdue
                ? labels.dueNow
                : formatDistanceToNowStrict(nextRun, { addSuffix: true })
              : "—"}
          </span>
        </div>

        <div className="shrink-0" onClick={(event) => event.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button
                  size="2xs"
                  variant="outline"
                  iconOnly
                  aria-label={labels.runNow}
                  disabled={!canTrigger || isTriggering || job.status === "running"}
                  onClick={() => onTrigger(job.name)}
                >
                  {isTriggering || job.status === "running" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {canTrigger ? labels.runNow : labels.runNowBlocked}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/*
        Phone layout. Three of the four figures, each carrying its own caption
        because there is no header row at this width. "Next run" is the one
        dropped: it is derived from the two beside it, and on a phone the row
        has to stay two lines or 65 of them become a scroll nobody finishes.
      */}
      <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-subtle-foreground sm:hidden">
        <div className="flex gap-1">
          <dt>{labels.every}</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {formatPeriod(job.period)}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>{labels.lastRun}</dt>
          <dd className="text-foreground">
            {lastRun
              ? formatDistanceToNowStrict(lastRun, { addSuffix: true })
              : labels.never}
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>{labels.duration}</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {formatDuration(job.executionTime)}
          </dd>
        </div>
      </dl>
    </div>
  );
});
