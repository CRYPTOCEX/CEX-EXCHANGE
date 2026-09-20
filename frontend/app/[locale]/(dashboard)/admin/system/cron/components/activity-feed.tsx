"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Ban, CheckCircle, Clock, Play, XCircle, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status-tone";
import type { BadgeTone } from "@/components/ui/badge";
import type { CronJob, TimelineEvent } from "@/store/cron";

import { formatDuration } from "./job-state";

/**
 * What each job DID, most recent first.
 *
 * Complementary to the log stream, not a duplicate of it: the log carries
 * whatever a handler chose to say, this carries the four lifecycle facts the
 * scheduler broadcasts — started, finished, failed, refused. It is the view
 * that answers "is anything ticking at all right now", which a quiet log cannot.
 */

/** WHICH glyph an event gets is identity, so it stays a literal map. */
const EVENT_ICON: Record<TimelineEvent["eventType"], LucideIcon> = {
  started: Play,
  completed: CheckCircle,
  failed: XCircle,
  scheduled: Clock,
  // Deliberately not the failure cross: nothing broke, the work was declined.
  refused: Ban,
};

/** Tone -> ink. `statusTone()` resolves the tone; this only paints it. */
const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary",
  secondary: "text-secondary-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  neutral: "text-subtle-foreground",
};

interface ActivityFeedProps {
  events: TimelineEvent[];
  jobs: CronJob[];
  focusedJob: string | null;
  onFocusJob: (name: string | null) => void;
}

export function ActivityFeed({
  events,
  jobs,
  focusedJob,
  onFocusJob,
}: ActivityFeedProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");

  const titleByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of jobs) map.set(job.name, job.title);
    return map;
  }, [jobs]);

  const visible = useMemo(
    () =>
      focusedJob ? events.filter((event) => event.cronName === focusedJob) : events,
    [events, focusedJob]
  );

  if (!visible.length) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        {t("events_will_appear_here_as_cron_jobs_run")}
      </p>
    );
  }

  const describe = (event: TimelineEvent): string => {
    switch (event.eventType) {
      case "started":
        return t("cron_event_started");
      case "completed":
        return event.duration !== undefined
          ? t("cron_event_completed_in", { duration: formatDuration(event.duration) })
          : t("cron_event_completed");
      case "failed":
        return event.duration !== undefined
          ? t("cron_event_failed_after", { duration: formatDuration(event.duration) })
          : tCommon("failed");
      case "refused":
        return t("cron_event_refused");
      default:
        return t("cron_event_scheduled");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <ul className="divide-y divide-border">
        {visible.map((event) => {
          const tone = statusTone(event.eventType);
          const Icon = EVENT_ICON[event.eventType] ?? Clock;
          return (
            <li
              key={event.id}
              className={cn(
                "flex items-start gap-3 px-3 py-2",
                event.eventType === "refused" && "bg-destructive/5",
                event.eventType === "failed" && "bg-destructive/5"
              )}
            >
              <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", TONE_INK[tone])} />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onFocusJob(event.cronName)}
                  className="block max-w-full truncate text-left text-sm font-medium text-foreground hover:underline"
                >
                  {titleByName.get(event.cronName) ?? event.cronName}
                </button>
                <p className={cn("truncate text-xs", TONE_INK[tone])}>
                  {describe(event)}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-subtle-foreground">
                {format(new Date(event.timestamp), "HH:mm:ss")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
