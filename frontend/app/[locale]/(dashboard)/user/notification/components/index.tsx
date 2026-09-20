"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonText } from "@/components/ui/skeleton";
import {
  Bell,
  ChevronRight,
  DollarSign,
  MessageSquare,
  AlertCircle,
  Info,
  Check,
  User,
  Shield,
  Calendar,
  FileText,
  BarChart,
  Gift,
  Award,
  Clock,
  MoreVertical,
} from "lucide-react";
import { useNotificationsStore } from "@/store/notification-store";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
import { formatDate } from "@/lib/ico/utils";
import { useTranslations } from "next-intl";

interface NotificationsCardProps {
  filterType?: string; // Optional filter by notification type
}

/**
 * One pending row of the notification list.
 *
 * The list length is unknowable before the fetch resolves, so the card reserves
 * a FIXED SMALL COUNT of these — the same three the old skeleton branch showed —
 * inside the REAL `divide-y` container, and lets the count settle.
 *
 * Every box here is the real row's own markup with the same classes: the same
 * `p-4` padding, the same `p-2 rounded-full` icon tile, the same `text-sm mb-1`
 * heading and `text-sm line-clamp-2 mb-1.5` message. Only the strings are
 * replaced, by `SkeletonText`, which measures itself against the typography it
 * sits inside. The old branch was a single `h-16` grey block per row — a number
 * typed once against a row that is 32px of padding plus a title, a two-line
 * message and a timestamp, and that has been free to change ever since.
 */
function PendingNotificationRow() {
  return (
    <div className="flex items-start gap-3 p-4 relative">
      {/* Icon tile: real chrome, real size. The glyph is the same fallback
          `<Bell>` the row uses for an unknown type — which is precisely what a
          pending row has. */}
      <div className="flex-shrink-0 p-2 rounded-full bg-muted dark:bg-surface-2/20">
        <Bell className="h-4 w-4 text-subtle-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm mb-1">
          <SkeletonText chars={18} />
        </h4>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-1.5">
          <SkeletonText chars={42} />
        </p>
        <div className="flex items-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <SkeletonText placeholder="about 2 hours ago" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** How many rows to reserve while the list is in flight. */
const PENDING_ROWS = [0, 1, 2];

export function NotificationsCard({ filterType }: NotificationsCardProps = {}) {
  const t = useTranslations("common");
  const tDashboardUser = useTranslations("dashboard_user");
  const {
    notifications,
    markAsRead,
    markAsUnread,
    deleteNotification,
    isLoading,
    fetchNotifications,
  } = useNotificationsStore();
  const [visibleCount, setVisibleCount] = useState(3);

  // Fetch notifications once on component mount.
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Filter notifications by type if specified
  const filteredNotifications = filterType
    ? notifications.filter((n) => n.type === filterType)
    : notifications;

  // Get only unread notifications
  const unreadNotifications = filteredNotifications.filter(
    (notification) => !notification.read
  );

  // Get the most recent notifications, prioritizing unread ones
  const recentNotifications = [
    ...unreadNotifications,
    ...filteredNotifications.filter((n) => n.read),
  ].slice(0, visibleCount);
  const getIconForType = (type: string) => {
    switch (type) {
      case "investment":
        return <DollarSign className="h-4 w-4 text-success" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-primary" />;
      case "user":
        return <User className="h-4 w-4 text-primary" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "system":
        return <Shield className="h-4 w-4 text-subtle-foreground" />;
      case "info":
        return <Info className="h-4 w-4 text-primary" />;
      case "event":
        return <Calendar className="h-4 w-4 text-primary" />;
      case "document":
        return <FileText className="h-4 w-4 text-warning" />;
      case "analytics":
        return <BarChart className="h-4 w-4 text-primary" />;
      case "reward":
        return <Gift className="h-4 w-4 text-destructive" />;
      case "achievement":
        return <Award className="h-4 w-4 text-warning" />;
      default:
        return <Bell className="h-4 w-4 text-subtle-foreground" />;
    }
  };
  /*
    The hover wash. Only two of the twelve branches (`message`, `achievement`)
    carried an alpha; the other ten asked for the SOLID token, so hovering most
    notification rows painted a saturated slab under `--foreground` copy while
    the two correct ones barely tinted. `dark:` already used `/30` everywhere,
    which is why the bug was invisible to anyone testing in dark mode. One alpha
    for all of them, and the type is still told apart by its border and glyph.
  */
  const getTypeColor = (type: string) => {
    switch (type) {
      case "investment":
        return "border-success hover:bg-success/10 dark:hover:bg-success/30";
      case "message":
      case "user":
      case "info":
      case "event":
      case "analytics":
        return "border-primary hover:bg-primary/10 dark:hover:bg-primary/30";
      case "alert":
      case "document":
      case "achievement":
        return "border-warning hover:bg-warning/10 dark:hover:bg-warning/30";
      case "reward":
        return "border-destructive hover:bg-destructive/10 dark:hover:bg-destructive/30";
      case "system":
      default:
        return "border-border hover:bg-muted dark:hover:bg-background/30";
    }
  };
  /*
    Same split in the icon tile: nine branches were the SOLID token behind a
    `text-<same-token>` glyph (see getTypeIcon above) — an invisible icon in
    light mode, correct in dark because of the `/20` fork. `message` and
    `achievement` already had `/15`, which is the right answer for all of them.
  */
  const getIconBackground = (type: string) => {
    switch (type) {
      case "investment":
        return "bg-success/15 dark:bg-success/20";
      case "message":
      case "user":
      case "info":
      case "event":
      case "analytics":
        return "bg-primary/15 dark:bg-primary/20";
      case "alert":
      case "document":
      case "achievement":
        return "bg-warning/15 dark:bg-warning/20";
      case "reward":
        return "bg-destructive/15 dark:bg-destructive/20";
      case "system":
      default:
        return "bg-muted dark:bg-surface-2/20";
    }
  };
  const getTimeAgo = (dateString?: string | Date) => {
    if (!dateString) return "Just now";
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
    });
  };
  /*
    ONE CARD, TWO STATES — AND THE OLD SECOND COPY HAD ALREADY DRIFTED.

    What used to be here was `if (isLoading) return <Card>`: a whole second
    header that was not this card's header. It had `pb-3` where the real one has
    `py-3 border-b`, a bare `<Bell className="h-4 w-4 mr-2">` where the real one
    has the glyph inside a `p-1.5 rounded-full bg-primary/10` tile, and it was
    missing the "View all" button entirely — so the header GREW and gained a
    rule the moment the fetch landed, and the body swapped `grid gap-4` for
    `p-0 divide-y`. Nobody wrote that drift deliberately; a duplicate has no
    mechanism keeping it in sync, which is the whole argument for not having one.

    Below there is one header, one body container, and three pending rows inside
    it while the store is fetching.
  */

  /*
    EMPTY IS A CONCLUSION; PENDING IS NOT.

    `recentNotifications.length === 0` is true both when the user has no
    notifications and when we have not asked yet, and only the first of those
    deserves "You have no notifications". Naming the derived boolean keeps the
    two apart and keeps the empty panel from flashing on every mount.
  */
  const showEmptyState = !isLoading && recentNotifications.length === 0;

  return (
    <TooltipProvider>
      <Card className="h-full">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-1.5 rounded-full bg-primary/10 mr-2">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <span>Notifications</span>
              {unreadNotifications.length > 0 && (
                <Badge variant="default" className="ml-2 text-xs">
                  {unreadNotifications.length} new
                </Badge>
              )}
            </div>
            <Link href="/user/notification">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                {t("view_all")}
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {showEmptyState && (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{t("no_notifications_yet")}</p>
              <p className="text-xs mt-1">
                {tDashboardUser("youll_see_your_notifications_here_when_they_arrive")}
              </p>
            </div>
          )}
          {/* The list container renders unconditionally now. It was one arm of
              an empty-vs-list ternary, so the `divide-y` rules and the row
              padding only existed in one of the two states; with nothing in it
              it renders nothing, exactly as the ternary's other arm did. */}
          <div className="divide-y">
            {isLoading &&
              PENDING_ROWS.map((i) => <PendingNotificationRow key={i} />)}
            <AnimatePresence>
                {recentNotifications.map((notification, index) => {
                  return (
                    <m.div
                      key={notification.id}
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.05,
                      }}
                      className={cn(
                        "flex items-start gap-3 p-4 relative group transition-colors",
                        !notification.read && "bg-primary/5",
                        getTypeColor(notification.type)
                      )}
                    >
                      {/* Icon with background */}
                      <div
                        className={cn(
                          "flex-shrink-0 p-2 rounded-full",
                          getIconBackground(notification.type),
                          !notification.read && "ring-2 ring-primary/20"
                        )}
                      >
                        {getIconForType(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        {notification.title && (
                          <h4
                            className={cn(
                              "text-sm mb-1",
                              !notification.read && "font-medium"
                            )}
                          >
                            {notification.title}
                          </h4>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-1.5">
                          {notification.message}
                        </p>

                        <div className="flex items-center text-xs text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {getTimeAgo(notification.createdAt)}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {formatDate(notification.createdAt)}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            notification.read
                              ? markAsUnread(notification.id)
                              : markAsRead(notification.id)
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span className="sr-only">
                            {notification.read
                              ? "Mark as unread"
                              : "Mark as read"}
                          </span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                              <span className="sr-only">More actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() =>
                                notification.read
                                  ? markAsUnread(notification.id)
                                  : markAsRead(notification.id)
                              }
                            >
                              {notification.read
                                ? t("mark_as_unread")
                                : t("mark_as_read")}
                            </DropdownMenuItem>
                            {notification.link && (
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(notification.link, "_blank")
                                }
                              >
                                {t("open_link")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                deleteNotification(notification.id)
                              }
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </m.div>
                  );
                })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
