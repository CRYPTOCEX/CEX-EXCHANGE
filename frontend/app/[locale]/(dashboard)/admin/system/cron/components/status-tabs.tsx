"use client";

import { useCronStore } from "@/store/cron";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  LayoutGrid,
} from "lucide-react";
import { useTranslations } from "next-intl";

export function StatusTabs() {
  const t = useTranslations("dashboard");
  const { activeTab, setActiveTab, cronJobs } = useCronStore();

  // Count jobs by status
  const counts = {
    all: cronJobs.length,
    idle: cronJobs.filter((job) => job.status === "idle").length,
    running: cronJobs.filter((job) => job.status === "running").length,
    completed: cronJobs.filter((job) => job.status === "completed").length,
    failed: cronJobs.filter((job) => job.status === "failed").length,
  };

  return (
    <div className="space-y-4">
      {/* Enhanced status tabs with horizontal layout */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList className="grid grid-cols-5 w-full h-12 p-1 bg-muted/80">
          <TabsTrigger
            value="all"
            className="flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>{t("All")}</span>
            <Badge
              variant="secondary"
              className="ml-1 bg-gray-200 dark:bg-gray-700 text-xs"
            >
              {counts.all}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="idle"
            className="flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Clock className="h-4 w-4 text-slate-500" />
            <span>{t("Idle")}</span>
            <Badge
              variant="secondary"
              className="ml-1 bg-slate-200 dark:bg-slate-700 text-xs"
            >
              {counts.idle}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="running"
            className="flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Activity className="h-4 w-4 text-blue-500" />
            <span>{t("Running")}</span>
            <Badge
              variant="secondary"
              className="ml-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs"
            >
              {counts.running}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="completed"
            className="flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{t("Completed")}</span>
            <Badge
              variant="secondary"
              className="ml-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs"
            >
              {counts.completed}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="failed"
            className="flex items-center justify-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <XCircle className="h-4 w-4 text-red-500" />
            <span>{t("Failed")}</span>
            <Badge
              variant="secondary"
              className="ml-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs"
            >
              {counts.failed}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
