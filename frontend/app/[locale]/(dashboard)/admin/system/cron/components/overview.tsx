"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatDistanceToNowStrict } from "date-fns";
import { Activity, Ban, Clock, ListChecks, XCircle } from "lucide-react";

import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import type { CronJob } from "@/store/cron";

import { cronJobState, isNotWorking, toDate } from "./job-state";

/**
 * The five figures, in the order an operator needs them.
 *
 * "Not doing their work" is second and never hidden, because it is the only one
 * of the five that the old page could not express at all: a refused job reported
 * `completed`, so the dashboard's own health figure counted it as a success. A
 * page whose headline number can read 100% while a withdrawal processor has not
 * run in a week is worse than no page.
 */
interface OverviewProps {
  jobs: CronJob[];
}

export function Overview({ jobs }: OverviewProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const stats = useMemo(() => {
    const total = jobs.length;
    const notWorking = jobs.filter(isNotWorking).length;
    const failed = jobs.filter((job) => cronJobState(job) === "failed").length;
    const running = jobs.filter((job) => job.status === "running").length;
    const categories = new Set(jobs.map((job) => job.category || "normal")).size;

    // The most recent run ANY job completed. On a healthy deployment with
    // 5-second jobs this is always seconds ago; a figure in minutes is the
    // cheapest possible read on "has the scheduler stopped".
    let latest: Date | null = null;
    for (const job of jobs) {
      const at = toDate(job.lastRun);
      if (at && (!latest || at > latest)) latest = at;
    }

    // Refused and failed are BOTH excluded, so a refusing scheduler cannot
    // read 100%. Deliberately not a weighted score: an operator reading this
    // during an incident should be able to reconstruct it from the other four
    // tiles in their head.
    const healthy = Math.max(0, total - notWorking - failed);
    const health = total > 0 ? Math.round((healthy / total) * 100) : 100;

    return { total, notWorking, failed, running, categories, latest, health };
  }, [jobs]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatsCard
        index={0}
        label={t("cron_jobs_registered")}
        value={stats.total}
        icon={ListChecks}
        progress={stats.health}
        /* The bar IS the health figure, so the caption has to name it — an
           unlabelled fill under a count reads as decoration. */
        description={t("cron_categories_count", {
          count: stats.categories,
          health: stats.health,
        })}
        {...statsCardColors.neutral}
      />
      <StatsCard
        index={1}
        label={t("cron_not_working")}
        value={stats.notWorking}
        icon={Ban}
        description={t("cron_not_working_hint")}
        color={stats.notWorking > 0 ? "text-destructive" : "text-muted-foreground"}
        bgColor={stats.notWorking > 0 ? "bg-destructive/15" : "bg-surface-3"}
      />
      <StatsCard
        index={2}
        label={t("cron_failed_last_run")}
        value={stats.failed}
        icon={XCircle}
        description={t("cron_failed_hint")}
        color={stats.failed > 0 ? "text-destructive" : "text-muted-foreground"}
        bgColor={stats.failed > 0 ? "bg-destructive/15" : "bg-surface-3"}
      />
      <StatsCard
        index={3}
        label={t("cron_running_now")}
        value={stats.running}
        icon={Activity}
        description={t("cron_running_hint")}
        {...(stats.running > 0 ? statsCardColors.info : statsCardColors.neutral)}
      />
      <StatsCard
        index={4}
        // Prose, not a figure — StatsCard keeps it out of the monospace face.
        value={
          stats.latest
            ? formatDistanceToNowStrict(stats.latest, { addSuffix: true })
            : tCommon("never")
        }
        label={tCommon("cron_last_activity")}
        icon={Clock}
        description={t("cron_last_activity_hint")}
        {...statsCardColors.neutral}
      />
    </div>
  );
}
