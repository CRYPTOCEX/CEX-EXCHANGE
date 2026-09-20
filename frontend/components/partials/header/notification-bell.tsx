"use client";

import { useEffect, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  X,
  ExternalLink,
  Volume2,
  VolumeX,
  AlertTriangle,
  Coins,
  MessageSquare,
  UserRound,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { useNotificationsStore } from "@/store/notification-store";
import { useTranslations } from "next-intl";

/**
 * Glyph + tile tint per notification type.
 *
 * Was an emoji dropped into a FULLY SATURATED fill (`bg-destructive` behind
 * "⚠️"). Emoji carry their own colours, so the fill fought the glyph, the paired
 * `text-overlay-foreground` styled nothing at all, and five saturated dots in a
 * 320px column read as noise. A tinted tile with a real icon is the recipe the
 * wallet popover next to it already uses, so the two header dropdowns match.
 *
 * `alert` is the only one of these that is genuinely a *state*, so it is the
 * only one that gets a status token. The rest are categories, which is the job
 * the chart ramp is validated for — assigned in fixed order, never cycled.
 */
const NOTIFICATION_STYLES: Record<
  string,
  { icon: LucideIcon; tile: string }
> = {
  alert: { icon: AlertTriangle, tile: "bg-destructive/15 text-destructive-ink" },
  system: { icon: Settings2, tile: "bg-muted text-muted-foreground" },
  investment: { icon: Coins, tile: "bg-chart-1/15 text-chart-1" },
  message: { icon: MessageSquare, tile: "bg-chart-2/15 text-chart-2" },
  user: { icon: UserRound, tile: "bg-chart-3/15 text-chart-3" },
};

const FALLBACK_NOTIFICATION_STYLE = {
  icon: Bell,
  tile: "bg-primary/15 text-primary-ink",
};

const getNotificationStyle = (type: string) =>
  NOTIFICATION_STYLES[type] ?? FALLBACK_NOTIFICATION_STYLE;

interface NotificationBellProps {
  variant?: "default" | "binary";
}

export function NotificationBell({ variant = "default" }: NotificationBellProps) {
  const t = useTranslations("common");
  const tComponents = useTranslations("components");
  const {
    notifications,
    stats,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    soundEnabled,
    toggleSound,
  } = useNotificationsStore();

  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Animate bell when new notifications arrive
  useEffect(() => {
    if (stats.unread > 0) {
      setHasNewNotification(true);
      const timer = setTimeout(() => setHasNewNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [stats.unread]);

  // Get recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5);

  const unreadLabel = stats.unread > 99 ? "99+" : String(stats.unread);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.link) {
      window.open(notification.link, "_blank");
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative transition-all duration-200",
            variant === "binary"
              ? "rounded-none border-r border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              : "rounded-xl border text-muted-foreground hover:text-foreground border-border hover:border-border-strong hover:bg-muted"
          )}
        >
          <m.div
            animate={
              hasNewNotification
                ? {
                    rotate: [0, -10, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }
                : {}
            }
            transition={{ duration: 0.5 }}
          >
            <Bell className="h-4 w-4 text-muted-foreground" />
          </m.div>

          <AnimatePresence>
            {stats.unread > 0 && (
              <m.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={variant === "binary" ? "absolute top-0 right-0" : "absolute -top-1 -right-1"}
              >
                {/*
                  Width has to grow with the digits: the badge clips its own
                  content, so a fixed square silently chops "99+" in half. Keep
                  a min-width so a single digit still reads as a circle.
                */}
                {variant === "binary" ? (
                  <span className="min-w-4 h-4 flex items-center justify-center px-1 text-[8px] leading-none font-bold tabular-nums bg-destructive text-destructive-foreground rounded-full shadow-sm">
                    {unreadLabel}
                  </span>
                ) : (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 px-1 py-0 flex items-center justify-center text-[10px] leading-none font-bold tabular-nums rounded-full bg-destructive text-destructive-foreground border-2 border-background"
                  >
                    {unreadLabel}
                  </Badge>
                )}
              </m.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      {/*
        `border-0` left the panel with no edge at all: `--popover` sits only ~3
        points of lightness off the page ground in dark mode, so the dropdown
        floated as a vague grey cloud with the shadow doing all the work. It
        keeps the primitive's border and takes the item radius (`rounded-xl`)
        so the rows inside no longer read as squarer than their container.

        The framer wrapper that used to live in here animated y:-10 on top of
        Radix's own open animation — two entrances for one panel, and the
        framer half ignores the reduced-motion setting.
      */}
      <PopoverContent
        className={cn(
          "w-[min(360px,calc(100vw-24px))] p-0 overflow-hidden",
          "rounded-xl border border-border bg-popover shadow-2xl"
        )}
        align="end"
        sideOffset={8}
        style={{ zIndex: 100 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {t("notifications")}
            </h3>
            {stats.unread > 0 && (
              // The bell badge caps at 99+ but this one printed the raw count,
              // so the same number read as "99+" and "170" side by side.
              <Badge tone="primary" size="xs" className="tabular-nums">
                {unreadLabel} {t("new")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="2xs"
              iconOnly
              onClick={toggleSound}
              title={soundEnabled ? t("disable_sound") : t("enable_sound")}
              aria-label={soundEnabled ? t("disable_sound") : t("enable_sound")}
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </Button>

            {stats.unread > 0 && (
              <Button
                variant="ghost"
                size="2xs"
                iconOnly
                onClick={handleMarkAllRead}
                title={t("mark_all_read")}
                aria-label={t("mark_all_read")}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/*
          Was a ScrollArea pinned to `h-80`: with one notification the panel
          still reserved 320px, so the empty state sat in a tall grey void and
          the footer floated away from the list. Height is content-driven now
          and only capped.
        */}
        <div className="max-h-[336px] overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <m.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
              />
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-subtle-foreground">
              <Bell className="h-7 w-7 mb-2 opacity-50" />
              <p className="text-sm">{t("no_notifications_yet")}</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {recentNotifications.map((notification) => {
                const { icon: NotificationIcon, tile } = getNotificationStyle(
                  notification.type
                );

                return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }}
                    className={cn(
                      "group relative rounded-lg px-3 py-2.5 cursor-pointer text-left",
                      "transition-colors duration-200 hover:bg-muted",
                      "outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50",
                      !notification.read && [
                        "bg-primary/10",
                        // `border-l-4` painted a SQUARE 4px edge onto a rounded
                        // row, so it poked out past both left corners — and it
                        // shifted the row's content 4px relative to every read
                        // row beside it. An inset pseudo bar cannot reach the
                        // corners and costs no layout.
                        "before:absolute before:left-1 before:top-2.5 before:bottom-2.5",
                        "before:w-0.5 before:rounded-full before:bg-primary",
                        // Deepen the accent tint rather than swapping it for
                        // grey: the base `hover:bg-muted` made an unread row
                        // hover to exactly the same colour as a read one.
                        // twMerge keeps this one — same group, declared later.
                        "hover:bg-primary/15",
                      ]
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Notification Icon */}
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                          tile
                        )}
                      >
                        <NotificationIcon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={cn(
                              "text-sm truncate",
                              notification.read
                                ? "font-medium text-foreground"
                                : "font-semibold text-foreground"
                            )}
                          >
                            {notification.title}
                          </h4>

                          <div
                            className={cn(
                              "flex items-center gap-1 shrink-0 transition-opacity",
                              // Keyboard users never trigger `group-hover`, so
                              // the delete button was unreachable without a
                              // mouse even though it is focusable.
                              "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                            )}
                          >
                            {notification.link && (
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              title={t("delete_notification")}
                              aria-label={t("delete_notification")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>

                        {/* The unread dot that used to sit here said the same
                            thing as the bar on the left edge. */}
                        <span className="block text-[11px] text-subtle-foreground mt-1.5">
                          {notification.createdAt &&
                            formatDistanceToNow(
                              new Date(notification.createdAt),
                              { addSuffix: true }
                            )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — was an <a> wrapping a <button>, which is invalid nesting;
            asChild puts the button styling on the link itself. */}
        <div className="p-2 border-t border-border">
          <Button
            asChild
            variant="ghost"
            tone="primary"
            size="sm"
            fullWidth
            className="justify-center gap-2 text-xs"
          >
            <Link href="/user/notification" onClick={() => setIsOpen(false)}>
              {tComponents("view_all_notifications")}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
