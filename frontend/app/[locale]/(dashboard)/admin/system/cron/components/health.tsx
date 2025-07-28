"use client";

import { useCronStore } from "@/store/cron";
import { CheckCircle, Activity } from "lucide-react";
import { useTranslations } from "next-intl";

export function CronHealth() {
  const t = useTranslations("dashboard");
  const { cronJobs } = useCronStore();

  // Count jobs by status
  const counts = {
    all: cronJobs.length,
    idle: cronJobs.filter((job) => job.status === "idle").length,
    running: cronJobs.filter((job) => job.status === "running").length,
    completed: cronJobs.filter((job) => job.status === "completed").length,
    failed: cronJobs.filter((job) => job.status === "failed").length,
  };

  // Calculate system health percentage
  const healthPercentage =
    cronJobs.length > 0
      ? Math.round(((counts.completed + counts.idle) / cronJobs.length) * 100)
      : 100;

  // Determine system status
  const systemStatus =
    counts.failed > 0 ? "warning" : counts.running > 0 ? "active" : "healthy";

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {systemStatus === "warning" && (
          <span className="text-amber-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
        {systemStatus === "active" && (
          <span className="text-blue-500">
            <Activity className="w-5 h-5" />
          </span>
        )}
        {systemStatus === "healthy" && (
          <span className="text-green-500">
            <CheckCircle className="w-5 h-5" />
          </span>
        )}
        <span className="font-medium">
          {systemStatus === "warning"
            ? "System Warning"
            : systemStatus === "active"
              ? "System Active"
              : "System Healthy"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {healthPercentage}
          {t("%_health")}
        </span>
        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              healthPercentage > 80
                ? "bg-green-500"
                : healthPercentage > 50
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${healthPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
