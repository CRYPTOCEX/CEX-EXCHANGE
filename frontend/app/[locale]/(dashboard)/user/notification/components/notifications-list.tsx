"use client";

import { useState, useEffect, useRef } from "react";
import { NotificationItem } from "./notification-item";
import { NotificationCard } from "./notification-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Loader2 } from "lucide-react";
import { useNotificationsStore } from "@/store/notification-store";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Sticky header component that detects when it's stuck
function StickyGroupHeader({
  groupKey,
  count,
  groupIndex,
}: {
  groupKey: string;
  count: number;
  groupIndex: number;
}) {
  const [isSticky, setIsSticky] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is not visible (scrolled past), header is sticky
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px 0px 0px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel element to detect when header becomes sticky */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />
      <motion.div className="sticky top-0 z-10" layout="position">
        <div
          className={cn(
            "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-background/95 backdrop-blur-xl border-border/50 shadow-md transition-all duration-200",
            isSticky
              ? "rounded-b-lg sm:rounded-b-xl rounded-t-none border-x border-b"
              : "rounded-lg sm:rounded-xl border"
          )}
        >
          <motion.span
            className="inline-block w-2 h-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: groupIndex * 0.3,
            }}
          />
          <h3 className="text-xs sm:text-sm font-medium text-foreground">
            {groupKey}
          </h3>
          <motion.span
            key={count}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded-full font-medium"
          >
            {count}
          </motion.span>
        </div>
      </motion.div>
    </>
  );
}

interface NotificationsListProps {
  notifications: notificationAttributes[];
  isLoading: boolean;
  viewMode: "list" | "grid";
  soundEnabled?: boolean;
}

export function NotificationsList({
  notifications,
  isLoading,
  viewMode,
  soundEnabled = false,
}: NotificationsListProps) {
  const t = useTranslations("common");
  const [visibleCount, setVisibleCount] = useState(10);
  const { markAsRead, markAsUnread, deleteNotification } =
    useNotificationsStore();
  const [ref, inView] = useInView();

  // Auto-load more when scrolling to the bottom (removed soundEnabled from dependencies)
  useEffect(() => {
    if (inView && notifications.length > visibleCount) {
      setVisibleCount((prev) => Math.min(prev + 5, notifications.length));
    }
  }, [inView, notifications.length, visibleCount]);

  // Group notifications by date using the createdAt field with a fallback
  const groupedNotifications = notifications.reduce(
    (groups, notification) => {
      // Use fallback to current date if createdAt is undefined.
      const date = notification.createdAt
        ? new Date(notification.createdAt)
        : new Date();
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey = "Earlier";

      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else if (date > new Date(today.setDate(today.getDate() - 7))) {
        groupKey = "This Week";
      } else if (date > new Date(today.setDate(today.getDate() - 30))) {
        groupKey = "This Month";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
      return groups;
    },
    {} as Record<string, notificationAttributes[]>
  );

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 10, notifications.length));
  };


  if (isLoading) {
    return (
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 gap-4"
            : "space-y-4"
        }
      >
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className={`flex gap-4 p-4 border rounded-lg ${viewMode === "grid" ? "flex-col" : ""}`}
            >
              <Skeleton
                className={`${viewMode === "grid" ? "h-40 w-full" : "h-12 w-12 rounded-full"}`}
              />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-full max-w-[400px]" />
                <Skeleton className="h-4 w-full max-w-[300px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
              {viewMode !== "grid" && <Skeleton className="h-8 w-8" />}
            </div>
          ))}
      </div>
    );
  }

  // Flatten, sort, and paginate notifications using fallback for createdAt.
  const allSortedNotifications = Object.values(groupedNotifications)
    .flat()
    .sort(
      (a, b) =>
        (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
        (a.createdAt ? new Date(a.createdAt).getTime() : 0)
    )
    .slice(0, visibleCount);

  // Re-group the visible notifications.
  const visibleGroupedNotifications = allSortedNotifications.reduce(
    (groups, notification) => {
      const date = notification.createdAt
        ? new Date(notification.createdAt)
        : new Date();
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey = "Earlier";

      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else if (date > new Date(today.setDate(today.getDate() - 7))) {
        groupKey = "This Week";
      } else if (date > new Date(today.setDate(today.getDate() - 30))) {
        groupKey = "This Month";
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
      return groups;
    },
    {} as Record<string, notificationAttributes[]>
  );

  const groupOrder = [
    "Today",
    "Yesterday",
    "This Week",
    "This Month",
    "Earlier",
  ];

  return (
    <div className="space-y-6">
      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {groupOrder.map((groupKey, groupIndex) => {
            if (!visibleGroupedNotifications[groupKey]) return null;
            return (
              <motion.div
                key={groupKey}
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
                layout
              >
                <StickyGroupHeader
                  groupKey={groupKey}
                  count={visibleGroupedNotifications[groupKey].length}
                  groupIndex={groupIndex}
                />

                <motion.div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                      : "space-y-3"
                  }
                  layout
                >
                  <AnimatePresence mode="popLayout">
                    {visibleGroupedNotifications[groupKey].map(
                      (notification, index) =>
                        viewMode === "grid" ? (
                          <NotificationCard
                            key={notification.id || `card-${index}`}
                            notification={notification}
                            onMarkAsRead={() => markAsRead(notification.id)}
                            onMarkAsUnread={() => markAsUnread(notification.id)}
                            onDelete={() => deleteNotification(notification.id)}
                            index={index}
                          />
                        ) : (
                          <NotificationItem
                            key={notification.id || `item-${index}`}
                            notification={notification}
                            onMarkAsRead={() => markAsRead(notification.id)}
                            onMarkAsUnread={() => markAsUnread(notification.id)}
                            onDelete={() => deleteNotification(notification.id)}
                            index={index}
                          />
                        )
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </LayoutGroup>

      {notifications.length > visibleCount && (
        <motion.div
          className="flex justify-center mt-8"
          ref={ref}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="outline"
            onClick={handleLoadMore}
            className="gap-2 group relative overflow-hidden rounded-full px-6 border-primary/20 hover:border-primary/50"
          >
            <span className="relative z-10">{t("load_more")}</span>
            <motion.div
              animate={{ y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronDown className="h-4 w-4 relative z-10" />
            </motion.div>
            <motion.span
              className="absolute inset-0 bg-primary/10"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              style={{ originX: 0 }}
            />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
