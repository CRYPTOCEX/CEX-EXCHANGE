"use client";

import { useCronStore } from "@/store/cron";
import { format } from "date-fns";
import { CheckCircle, XCircle, Play, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

export function TimelineView() {
  const t = useTranslations("dashboard");
  const { timelineEvents, cronJobs } = useCronStore();

  const getCronTitle = (cronName: string) => {
    const cron = cronJobs.find((c) => c.name === cronName);
    return cron?.title || cronName;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "started":
        return <Play className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "scheduled":
        return <Clock className="h-4 w-4 text-slate-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-[400px] overflow-auto pr-2">
      <div className="space-y-2">
        {timelineEvents.length === 0 ? (
          <div className="text-center text-muted-foreground p-8">
            {t("no_timeline_events_yet")}.{" "}
            {t("events_will_appear_here_as_cron_jobs_run")}.
          </div>
        ) : (
          timelineEvents.map((event) => (
            <div
              key={event.id}
              className={`relative rounded-md overflow-hidden ${
                event.eventType === "completed"
                  ? "bg-green-50 dark:bg-green-950/30"
                  : event.eventType === "failed"
                    ? "bg-red-50 dark:bg-red-950/30"
                    : event.eventType === "scheduled"
                      ? "bg-slate-50 dark:bg-slate-800/30"
                      : "bg-blue-50 dark:bg-blue-950/30"
              }`}
            >
              <div className="flex">
                {/* Left sidebar with icon */}
                <div className="w-10 flex-shrink-0 flex items-center justify-center relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-blue-100 dark:bg-blue-900/30"></div>
                  <div className="z-10 bg-white dark:bg-gray-800 rounded-full p-1">
                    {getEventIcon(event.eventType)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {getCronTitle(event.cronName)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.timestamp), "HH:mm:ss")}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {event.eventType === "started" && "Started execution"}
                    {event.eventType === "completed" &&
                      `Completed successfully ${event.duration ? `in ${event.duration}ms` : ""}`}
                    {event.eventType === "failed" &&
                      `Failed ${event.duration ? `after ${event.duration}ms` : ""}`}
                    {event.eventType === "scheduled" && "Scheduled to run"}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
