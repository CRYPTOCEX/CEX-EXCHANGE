"use client";

import { useState, useEffect, useRef } from "react";
import { NotificationItem } from "./notification-item";
import { NotificationCard } from "./notification-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "lucide-react";
import { useNotificationsStore } from "@/store/notification-store";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("dashboard");
  const [visibleCount, setVisibleCount] = useState(10);
  const { markAsRead, markAsUnread, deleteNotification } =
    useNotificationsStore();
  const [ref, inView] = useInView();
  const [stickyHeaders, setStickyHeaders] = useState<Record<string, boolean>>(
    {}
  );

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

  // Setup intersection observers for headers
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const headerElements = document.querySelectorAll(".group-header");

    headerElements.forEach((header) => {
      const groupKey = header.getAttribute("data-group");
      if (!groupKey) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (groupKey) {
            setStickyHeaders((prev) => ({
              ...prev,
              [groupKey]: entry.isIntersecting ? false : true,
            }));
          }
        },
        { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
      );

      observer.observe(header);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [notifications]);

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
      <AnimatePresence>
        {groupOrder.map((groupKey) => {
          if (!visibleGroupedNotifications[groupKey]) return null;
          return (
            <motion.div
              key={groupKey}
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="sticky top-28 z-10 bg-background/60 backdrop-blur-sm py-2 pl-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                  {groupKey}
                  <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">
                    {visibleGroupedNotifications[groupKey].length}
                  </span>
                </h3>
              </div>

              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                    : "space-y-2"
                }
              >
                {visibleGroupedNotifications[groupKey].map(
                  (notification, index) =>
                    viewMode === "grid" ? (
                      <NotificationCard
                        key={
                          notification.id
                            ? `${notification.id}-${index}`
                            : index
                        }
                        notification={notification}
                        onMarkAsRead={() => markAsRead(notification.id)}
                        onMarkAsUnread={() => markAsUnread(notification.id)}
                        onDelete={() => deleteNotification(notification.id)}
                        index={index}
                      />
                    ) : (
                      <NotificationItem
                        key={
                          notification.id
                            ? `${notification.id}-${index}`
                            : index
                        }
                        notification={notification}
                        onMarkAsRead={() => markAsRead(notification.id)}
                        onMarkAsUnread={() => markAsUnread(notification.id)}
                        onDelete={() => deleteNotification(notification.id)}
                        index={index}
                      />
                    )
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {notifications.length > visibleCount && (
        <div className="flex justify-center mt-6" ref={ref}>
          <Button
            variant="outline"
            onClick={handleLoadMore}
            className="gap-2 group relative overflow-hidden"
          >
            <span className="relative z-10">{t("load_more")}</span>
            <ChevronDown className="h-4 w-4 relative z-10" />
            <span className="absolute inset-0 bg-primary/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
          </Button>
        </div>
      )}
    </div>
  );
}
