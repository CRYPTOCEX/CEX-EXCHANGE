"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  CalendarDays,
  AlertTriangle,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
const t = useTranslations("ext");
type icoRoadmapItemAttributes = {
  id: string;
  title: string;
  description: string;
  date: string;
  completed: boolean;
};
type RoadmapTimelineProps = {
  items: icoRoadmapItemAttributes[];
  groupedByDate: Record<string, icoRoadmapItemAttributes[]>;
  onEdit: (item: icoRoadmapItemAttributes) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (item: icoRoadmapItemAttributes) => Promise<void> | void;
};
export function RoadmapTimeline({
  items,
  groupedByDate,
  onEdit,
  onDelete,
  onToggleComplete,
}: RoadmapTimelineProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.keys(groupedByDate).reduce(
      (acc, key) => {
        acc[key] = true; // Start with all groups expanded
        return acc;
      },
      {} as Record<string, boolean>
    )
  );
  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  // Calculate days from now for upcoming items
  const getDaysFromNow = (dateString: string) => {
    const itemDate = new Date(dateString);
    const today = new Date();
    const diffTime = itemDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days from now`;
  };

  // Sort the groups by date (newest first)
  const sortedGroups = Object.keys(groupedByDate).sort((a, b) => {
    const dateA = new Date(groupedByDate[a][0].date);
    const dateB = new Date(groupedByDate[b][0].date);
    return dateB.getTime() - dateA.getTime();
  });
  return (
    <div className="space-y-8 py-4">
      {sortedGroups.map((monthYear) => {
        const groupItems = groupedByDate[monthYear];
        const isExpanded = expandedGroups[monthYear];

        // Count completed items in this group
        const completedCount = groupItems.filter(
          (item) => item.completed
        ).length;
        const totalCount = groupItems.length;
        return (
          <div key={monthYear} className="relative">
            <div className="flex items-center justify-between mb-2 bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{monthYear}</h3>
                <Badge variant="outline" className="ml-2">
                  {totalCount} {totalCount === 1 ? "item" : "items"}
                </Badge>
                {completedCount > 0 && (
                  <Badge className="bg-green-500/90 text-white">
                    {completedCount}
                    {t("completed")}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleGroup(monthYear)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{
                    opacity: 0,
                    height: 0,
                  }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                  }}
                  transition={{
                    duration: 0.3,
                  }}
                  className="relative pl-6 ml-4 border-l-2 border-dashed border-muted-foreground/30"
                >
                  {groupItems.map((item, index) => {
                    const isCompleted = item.completed;
                    const daysInfo = !isCompleted
                      ? getDaysFromNow(item.date)
                      : null;
                    const isOverdue = daysInfo === "Overdue";
                    return (
                      <motion.div
                        key={item.id}
                        initial={{
                          opacity: 0,
                          x: -20,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay: index * 0.05,
                        }}
                        className="mb-4 relative"
                      >
                        {/* Timeline dot */}
                        <div className="absolute -left-[14px] top-4 h-6 w-6 rounded-full flex items-center justify-center">
                          {isCompleted ? (
                            <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center",
                                isOverdue
                                  ? "bg-amber-100 dark:bg-amber-900/30"
                                  : "bg-gray-100 dark:bg-gray-800"
                              )}
                            >
                              {isOverdue ? (
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              ) : (
                                <CalendarDays className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>

                        <Card
                          className={cn(
                            "overflow-hidden transition-all duration-200 ml-2",
                            isCompleted ? "border-l-4 border-l-green-500" : "",
                            isOverdue && !isCompleted
                              ? "border-l-4 border-l-amber-500"
                              : "",
                            "hover:shadow-md"
                          )}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <h4 className="font-medium text-base">
                                  {item.title}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {new Date(item.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                  {!isCompleted && daysInfo && (
                                    <span
                                      className={cn(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        isOverdue
                                          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {daysInfo}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm">
                                  {item.description}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onEdit(item)}
                                  className="h-8"
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1" />
                                  {t("Edit")}
                                </Button>
                                <Button
                                  variant={isCompleted ? "outline" : "default"}
                                  size="sm"
                                  onClick={() => onToggleComplete(item)}
                                  className="h-8"
                                >
                                  {isCompleted ? (
                                    <>
                                      <CalendarDays className="h-3.5 w-3.5 mr-1" />
                                      {t("mark_as_upcoming")}
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                      {t("mark_as_completed")}
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDelete(item.id)}
                                  className="h-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
