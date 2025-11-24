"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  CheckCircle,
  CalendarDays,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

type RoadmapStatsProps = {
  completionPercentage: number;
  totalItems: number;
  completedItems: number;
  upcomingItems: number;
  overdueItems: number;
};

export function RoadmapStats({
  completionPercentage,
  totalItems,
  completedItems,
  upcomingItems,
  overdueItems,
}: RoadmapStatsProps) {
  const t = useTranslations("ext");
  const stats = [
    {
      title: "Total Items",
      value: totalItems,
      icon: BarChart,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Completed",
      value: completedItems,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      title: "Upcoming",
      value: upcomingItems,
      icon: CalendarDays,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Overdue",
      value: overdueItems,
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/20",
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("roadmap_progress")}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {completionPercentage}%
              </span>
              <span className="text-sm text-muted-foreground">
                {t("complete")}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("Progress")}</span>
              <span className="font-medium">
                {completedItems}
                {t("of")}
                {totalItems}
                {t("items")}
              </span>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                className="flex flex-col p-4 rounded-lg border"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-2 rounded-md ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
