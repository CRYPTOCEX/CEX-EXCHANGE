"use client";

import { useState, useEffect } from "react";
import { ActivityItem } from "./activity-item";
import { Button } from "@/components/ui/button";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Inbox } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { m, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { useTranslations } from "next-intl";

/**
 * A pending feed row, built from `ActivityItem`'s OWN box.
 * ============================================================================
 *
 * The five-row skeleton this replaces was a separate tree that had drifted
 * from the row it stood in for. It rendered `h-5 / h-4 / h-10` stacked blocks
 * against a row whose real content is a 22px badge line, a `text-sm
 * leading-relaxed` description and an optional 56px token preview — so the
 * placeholder row measured ~113px against a real row of ~130px, and the feed
 * grew by roughly 85px across five rows the moment the data landed. It also
 * omitted the row's `items-start` and the icon's `ring-2 ring-background`,
 * neither of which is expensive to keep.
 *
 * This version copies the row's structural classes verbatim and puts
 * `SkeletonText` INSIDE the same typography elements, so the height is
 * produced by the same text layout in both states. The icon is the only thing
 * with no text metrics, so it is the only `SkeletonBlock` — sized with the same
 * `h-12 w-12` string the real icon carries.
 */
function PendingActivityRow() {
  return (
    <div className="relative flex items-start gap-4 rounded-lg border p-4">
      <SkeletonBlock className="relative z-10 h-12 w-12 shrink-0 rounded-full ring-2 ring-background" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-medium">
              <SkeletonText placeholder="TRANSFER" />
            </Badge>
            <span className="text-xs text-muted-foreground">
              <SkeletonText placeholder="about 2 hours ago" />
            </span>
          </div>
          {/* The action buttons are chrome: same three 32px targets in both
              states, so the row's top line cannot change height. */}
          <div className="flex items-center gap-1">
            <SkeletonBlock className="h-8 w-8 rounded-md" />
            <SkeletonBlock className="h-8 w-8 rounded-md" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <SkeletonText chars={46} />
        </p>
      </div>
    </div>
  );
}

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

  /*
    THREE STATES, ONE TREE.
    ==========================================================================
    This component used to return early three separate times: a skeleton list,
    an empty state, and the feed. Each `return` replaced the whole subtree, so
    the surrounding `space-y-6` container went from a five-row skeleton to a
    160px centred empty state to a grouped feed with sticky headers — three
    different heights in the same slot.

    Naming the two conditions makes the difference explicit and keeps the
    branches inside ONE returned tree: `firstLoad` is "we have nothing yet and
    are asking", `isEmpty` is "we asked and there is nothing". They were
    previously spelled `isLoading && !length` / `!isLoading && !length` in two
    different `if`s several lines apart, which is how the two states drift.
  */
  const firstLoad = isLoading && activities.length === 0;
  const isEmpty = !isLoading && activities.length === 0;

  return (
    <div className="space-y-6">
      {firstLoad &&
        Array.from({ length: 5 }).map((_, i) => <PendingActivityRow key={i} />)}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Inbox className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t("no_activity_found")}</h3>
          <p className="text-muted-foreground max-w-sm">
            {t("there_are_no_activities_matching_your_filters")} {t("try_adjusting_your_filters_or_check_back_later")}
          </p>
        </div>
      )}

      <AnimatePresence>
        {groupOrder.map((groupKey) => {
          if (!visibleGroupedActivities[groupKey] || visibleGroupedActivities[groupKey].length === 0) return null;

          return (
            <m.div
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
            </m.div>
          );
        })}
      </AnimatePresence>

      {/* The next page, appended. Same row component as the feed itself, so a
          page arriving does not change the height of what was standing in for
          it — the old inline skeleton here was a THIRD copy of the row shape,
          and a shorter one (no action buttons, no badge line). */}
      {isLoading && activities.length > 0 && <PendingActivityRow />}

      {/* Load more.
          `hasMore && !isLoading` withheld this button for the whole duration of
          every page fetch, so the 36px control plus its `mt-6` — 60px — vanished
          and came back on each scroll-triggered load, dragging the end-of-feed
          message and everything below it up and then down again. The button is
          knowable whenever `hasMore` is true; only whether it can be PRESSED
          depends on the request, and that is what `disabled` is for. Keeping it
          mounted also keeps the `ref` in the tree, which is what the
          intersection observer that triggers auto-load is attached to. */}
      {hasMore && (
        <div className="flex justify-center mt-6" ref={ref}>
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
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
