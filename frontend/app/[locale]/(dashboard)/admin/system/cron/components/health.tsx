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
    <div className="bg-background border rounded-lg p-3 sm:p-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {systemStatus === "warning" && (
            <span className="text-amber-500 flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 sm:w-5 sm:h-5"
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
            <span className="text-blue-500 flex-shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          )}
          {systemStatus === "healthy" && (
            <span className="text-green-500 flex-shrink-0">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          )}
          <span className="font-medium text-sm sm:text-base truncate">
            {systemStatus === "warning"
              ? "System Warning"
              : systemStatus === "active"
                ? "System Active"
                : "System Healthy"}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end">
          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
            {healthPercentage}
            {t("%_health")}
          </span>
          <div className="w-16 sm:w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
            <div
              className={`h-full transition-all duration-300 ${
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
      
      {/* Additional stats row for mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t text-xs">
        <div className="text-center">
          <div className="font-medium text-blue-600">{counts.running}</div>
          <div className="text-muted-foreground">Running</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-green-600">{counts.completed}</div>
          <div className="text-muted-foreground">Completed</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-red-600">{counts.failed}</div>
          <div className="text-muted-foreground">Failed</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-600">{counts.idle}</div>
          <div className="text-muted-foreground">Idle</div>
        </div>
      </div>
    </div>
  );
}
