"use client";

import { useState, useEffect, useRef } from "react";
import { NotificationItem } from "./notification-item";
import { NotificationCard } from "./notification-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import { Bell, Check, ChevronDown, Clock, MoreVertical } from "lucide-react";
import { useNotificationsStore } from "@/store/notification-store";
import { m, AnimatePresence, LayoutGroup } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Sticky header component that detects when it's stuck
function StickyGroupHeader({
  groupKey,
  count,
  groupIndex,
  pending = false,
}: {
  groupKey: string;
  count: number;
  groupIndex: number;
  /**
   * Render the header's two VALUES — the group name and its count — as
   * placeholders. The bar itself, its dot, its padding, its border and its
   * sticky behaviour are chrome and render either way, so a pending list is
   * headed by the same bar the real one is instead of by nothing.
   */
  pending?: boolean;
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
      <m.div className="sticky top-0 z-10" layout="position">
        <div
          className={cn(
            "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 bg-background/95 backdrop-blur-xl border-border/50 shadow-md transition-all duration-200",
            isSticky
              ? "rounded-b-lg sm:rounded-b-xl rounded-t-none border-x border-b"
              : "rounded-lg sm:rounded-xl border"
          )}
        >
          <m.span
            className="inline-block w-2 h-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: groupIndex * 0.3,
            }}
          />
          <h3 className="text-xs sm:text-sm font-medium text-foreground">
            <Loadable loading={pending} placeholder="Today">
              {groupKey}
            </Loadable>
          </h3>
          <m.span
            key={count}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-xs bg-primary/10 text-primary-ink px-1.5 sm:px-2 py-0.5 rounded-full font-medium"
          >
            <Loadable loading={pending} placeholder="0">
              {count}
            </Loadable>
          </m.span>
        </div>
      </m.div>
    </>
  );
}

/**
 * How many rows to reserve while the list is in flight.
 *
 * A list has no knowable length before it arrives, so this is a reservation,
 * not a prediction: five rows in the real container, and the count settles when
 * the data lands. Five is what the removed skeleton branch reserved, so nothing
 * about the amount of space held has changed — only its shape.
 */
const PENDING_ROWS = [0, 1, 2, 3, 4];

/**
 * One pending row, in whichever of the two view modes is active.
 *
 * Deliberately built from the SAME classes the real row carries — `rounded-lg
 * border bg-card`, the `p-3 sm:p-4` inner box, the `h-10 w-10 sm:h-12 sm:w-12
 * rounded-lg sm:rounded-xl ring-2` icon tile, the badge/clock header row — so
 * the pending list and the real list are the same shape at both breakpoints.
 *
 * The shell radius is `rounded-lg` on BOTH, which is the declared card radius.
 * It was `rounded-lg sm:rounded-xl` here against a flat `rounded-xl` on the real
 * row, so the claim above was true only above the `sm` breakpoint — and the
 * `xl` step is one above the ramp the rest of the product's surfaces sit on.
 * The strings inside are the only difference, and they are `SkeletonText`,
 * which is laid out by the very element it sits in and therefore tracks a
 * typography change on its own.
 *
 * Note the row is INERT: no handlers, no dropdown, no swipe. There is nothing
 * to mark read yet, and a control that looks live and does nothing is worse
 * than no control.
 */
function PendingNotificationRow({ viewMode }: { viewMode: "list" | "grid" }) {
  const t = useTranslations("common");
  if (viewMode === "grid") {
    return (
      <Card className="group relative h-full overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-muted/20 ring-border/30">
              <Bell className="h-5 w-5 text-subtle-foreground" />
            </div>
          </div>
          <div className="flex justify-center">
            <Badge variant="outline" className="font-medium">
              <span className="flex items-center gap-1">
                <SkeletonText placeholder="Notification" />
              </span>
            </Badge>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-base">
              <SkeletonText chars={20} />
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-3">
              <SkeletonText chars={48} />
            </p>
          </div>
          <div className="flex items-center justify-center text-xs text-muted-foreground gap-1 mt-auto">
            <Clock className="h-3 w-3" />
            <SkeletonText placeholder="about 2 hours ago" />
          </div>
        </CardContent>
        <CardFooter className="p-3 border-t flex justify-between gap-2 bg-muted/30">
          <Button variant="ghost" size="sm" className="flex-1" disabled>
            <Check className="h-4 w-4 mr-1" />
            <SkeletonText placeholder={t("mark_read")} />
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" disabled>
            <MoreVertical className="h-4 w-4 mr-1" />
            <SkeletonText placeholder="More" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card">
      <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ring-2 bg-muted/20 ring-border/30">
          <Bell className="h-5 w-5 text-subtle-foreground" />
        </div>

        <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="font-medium text-[10px] sm:text-xs shrink-0 px-1.5 sm:px-2"
            >
              <SkeletonText placeholder="Notification" />
            </Badge>
            <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <SkeletonText placeholder="about 2 hours ago" />
            </div>
          </div>

          <h4 className="font-medium truncate text-sm sm:text-base text-muted-foreground">
            <SkeletonText chars={22} />
          </h4>
          <p className="text-xs sm:text-sm line-clamp-1 text-muted-foreground">
            <SkeletonText chars={46} />
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
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


  /*
    THE PENDING LIST IS THE REAL LIST WITH ITS VALUES WITHHELD.

    What was here was `if (isLoading) return <div>`: a second list made of a
    `space-y-4` container (the real one is `space-y-6` of `space-y-3` groups),
    rows with `gap-4 p-4 border rounded-lg` (the real row is `rounded-xl` with a
    `p-3 sm:p-4` inner box and a `border-l-4` when unread), an `h-12 w-12`
    circle for what is an `h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl`
    tile, and no group header at all — so a whole sticky header bar appeared out
    of nowhere the moment the notifications landed, on top of every row changing
    height and radius.

    Below is ONE tree. While the store is fetching it renders one group — the
    real `StickyGroupHeader`, with its label and count pending — over a fixed
    five rows of the real row chrome. When the data arrives the pending group
    unmounts and the real groups take the same containers.
  */

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
      {isLoading && (
        <div className="space-y-3">
          <StickyGroupHeader groupKey="" count={0} groupIndex={0} pending />
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                : "space-y-3"
            }
          >
            {PENDING_ROWS.map((i) => (
              <PendingNotificationRow key={i} viewMode={viewMode} />
            ))}
          </div>
        </div>
      )}

      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {groupOrder.map((groupKey, groupIndex) => {
            if (!visibleGroupedNotifications[groupKey]) return null;
            return (
              <m.div
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

                <m.div
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
                </m.div>
              </m.div>
            );
          })}
        </AnimatePresence>
      </LayoutGroup>

      {notifications.length > visibleCount && (
        <m.div
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
            <m.div
              animate={{ y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronDown className="h-4 w-4 relative z-10" />
            </m.div>
            <m.span
              className="absolute inset-0 bg-primary/10"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              style={{ originX: 0 }}
            />
          </Button>
        </m.div>
      )}
    </div>
  );
}
