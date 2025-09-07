"use client";

import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Clock, Tag, Code } from "lucide-react";
import { CronJob } from "@/store/cron";
import { useTranslations } from "next-intl";

interface CronCardProps {
  cron: CronJob;
  onClick?: () => void;
}

// Use memo to prevent unnecessary re-renders
const CronCard = memo(function CronCard({ cron, onClick }: CronCardProps) {
  const t = useTranslations("dashboard");
  const formatPeriod = (ms: number) => {
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const getBorderColor = () => {
    switch (cron.status) {
      case "running":
        return "border-blue-500";
      case "completed":
        return "border-green-500";
      case "failed":
        return "border-red-500";
      default:
        return "border-slate-300 dark:border-slate-600";
    }
  };

  const getStatusBadge = () => {
    const t = useTranslations("dashboard");
    switch (cron.status) {
      case "running":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-white status-pulse"></span>
            {t("Running")}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            {t("Completed")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            {t("Failed")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-slate-400 text-slate-400">
            {t("Idle")}
          </Badge>
        );
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      onClick={onClick}
      className="cursor-pointer"
      layout
    >
      <Card
        className={`h-full border-l-4 ${getBorderColor()} overflow-hidden rounded-md hover:shadow-md transition-shadow`}
      >
        <CardHeader className="pb-2 relative p-3 sm:p-4">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-base sm:text-lg truncate flex-1 min-w-0">{cron.title}</CardTitle>
            <div className="flex-shrink-0">
              {getStatusBadge()}
            </div>
          </div>
          <CardDescription className="line-clamp-2 text-xs sm:text-sm">
            {cron.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2 p-3 sm:p-4 pt-0">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center text-xs sm:text-sm">
              <Code className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-muted-foreground flex-shrink-0" />
              <span className="font-mono text-xs text-muted-foreground truncate">
                {cron.name}
              </span>
            </div>
            <div className="flex items-center text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground flex-1 min-w-0">
                {t("Every")} {formatPeriod(cron.period)}
              </span>
              {cron.lastRun && (
                <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
                  {t("last")}{" "}
                  {formatDistanceToNow(new Date(cron.lastRun), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center text-xs sm:text-sm">
              <Tag className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-muted-foreground flex-shrink-0" />
              <span className="capitalize text-muted-foreground truncate">
                {(cron.category || "normal").replace("_", " ")}
              </span>
            </div>

            {cron.status === "running" && (
              <div className="pt-1 sm:pt-2">
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span className="text-muted-foreground">
                    {t("progress")}
                  </span>
                  <span>{cron.progress || 0}%</span>
                </div>
                <Progress
                  value={cron.progress || 0}
                  className="h-1.5 sm:h-2 bg-slate-200 dark:bg-slate-700 rounded-full"
                />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2 p-3 sm:p-4">
          <div className="w-full flex items-center gap-2">
            <div
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                cron.status === "running"
                  ? "status-running"
                  : cron.status === "completed"
                    ? "status-completed"
                    : cron.status === "failed"
                      ? "status-failed"
                      : "status-idle"
              }`}
            ></div>
            <span className="text-xs text-muted-foreground capitalize truncate">
              {cron.status || "idle"}
            </span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
});

export { CronCard };
