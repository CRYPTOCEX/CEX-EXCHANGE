"use client";

import { useState, useEffect } from "react";
import { ActivityItem } from "./activity-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Inbox } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { useTranslations } from "next-intl";

interface ActivityListProps {
  activities: any[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onView?: (activity: any) => void;
  onDelete?: (id: string) => void;
}

export function ActivityList({
  activities,
  isLoading,
  hasMore,
  onLoadMore,
  onView,
  onDelete,
}: ActivityListProps) {
  const t = useTranslations("ext_admin");
  const [visibleCount, setVisibleCount] = useState(20);
  const [ref, inView] = useInView();

  // Auto-load more when scrolling to the bottom
  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  // Group activities by date
  const groupedActivities = activities.reduce(
    (groups, activity) => {
      const date = new Date(activity.createdAt);
      const today = new Date();

      let groupKey = "Earlier";

      if (isToday(date)) {
        groupKey = "Today";
      } else if (isYesterday(date)) {
        groupKey = "Yesterday";
      } else if (isThisWeek(date)) {
        groupKey = "This Week";
      } else if (isThisMonth(date)) {
        groupKey = "This Month";
      } else {
        // Group by month for older activities
        groupKey = format(date, "MMMM yyyy");
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
      return groups;
    },
    {} as Record<string, any[]>
  );

  const groupOrder = [
    "Today",
    "Yesterday",
    "This Week",
    "This Month",
    ...Object.keys(groupedActivities)
      .filter(key => !["Today", "Yesterday", "This Week", "This Month"].includes(key))
      .sort((a, b) => {
        // Sort month groups by date (newest first)
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
      })
  ];

  const visibleGroupedActivities = Object.fromEntries(
    Object.entries(groupedActivities).map(([key, items]) => [
      key,
      (items as any[]).slice(0, visibleCount)
    ])
  );

  if (isLoading && activities.length === 0) {
    return (
      <div className="space-y-6">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-full max-w-[400px]" />
                <Skeleton className="h-4 w-full max-w-[300px]" />
                <Skeleton className="h-10 w-full max-w-[500px]" />
              </div>
            </div>
          ))}
      </div>
    );
  }

  if (activities.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Inbox className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t("no_activity_found")}</h3>
        <p className="text-muted-foreground max-w-sm">
          {t("there_are_no_activities_matching_your_filters")} {t("try_adjusting_your_filters_or_check_back_later")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {groupOrder.map((groupKey) => {
          if (!visibleGroupedActivities[groupKey] || visibleGroupedActivities[groupKey].length === 0) return null;

          return (
            <motion.div
              key={groupKey}
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Group header */}
              <div className="sticky top-28 z-10 bg-background/60 backdrop-blur-sm py-2 pl-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                  {groupKey}
                  <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                    {visibleGroupedActivities[groupKey].length}
                  </span>
                </h3>
              </div>

              {/* Activities in this group */}
              <div className="space-y-4">
                {visibleGroupedActivities[groupKey].map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    onView={onView}
                    onDelete={onDelete}
                    index={index}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Loading more indicator */}
      {isLoading && activities.length > 0 && (
        <div className="flex gap-4 p-4 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-full max-w-[400px]" />
            <Skeleton className="h-4 w-full max-w-[300px]" />
          </div>
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && (
        <div className="flex justify-center mt-6" ref={ref}>
          <Button
            variant="outline"
            onClick={onLoadMore}
            className="gap-2 group relative overflow-hidden"
          >
            <span className="relative z-10">{t("load_more_activity")}</span>
            <ChevronDown className="h-4 w-4 relative z-10" />
            <span className="absolute inset-0 bg-primary/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
          </Button>
        </div>
      )}

      {/* End of list message */}
      {!hasMore && activities.length > 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {t("youve_reached_the_end_of_the_activity_feed")}
        </div>
      )}
    </div>
  );
}
