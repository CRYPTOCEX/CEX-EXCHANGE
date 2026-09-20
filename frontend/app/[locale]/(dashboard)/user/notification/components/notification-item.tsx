"use client";

import type React from "react";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bell,
  DollarSign,
  MessageSquare,
  User,
  AlertCircle,
  MoreVertical,
  Check,
  Trash,
  EyeOff,
  ExternalLink,
  Clock,
  Info,
  Shield,
  Calendar,
  FileText,
  BarChart,
  Gift,
  Award,
  Copy,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title?: string;
    message: string;
    details?: string;
    read: boolean;
    link?: string;
    createdAt?: string | number | Date;
  };
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onDelete: () => void;
  index?: number;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  index = 0,
}: NotificationItemProps) {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset swipe state when not active
  useEffect(() => {
    if (!isSwipeActive && swipeProgress !== 0) {
      setSwipeProgress(0);
    }
  }, [isSwipeActive, swipeProgress]);

  const getIcon = (type: string) => {
    switch (type) {
      case "investment":
        return <DollarSign className="h-5 w-5 text-success" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-primary" />;
      case "user":
        return <User className="h-5 w-5 text-primary" />;
      case "alert":
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case "system":
        return <Shield className="h-5 w-5 text-subtle-foreground" />;
      case "info":
        return <Info className="h-5 w-5 text-primary" />;
      case "event":
        return <Calendar className="h-5 w-5 text-primary" />;
      case "document":
        return <FileText className="h-5 w-5 text-warning" />;
      case "analytics":
        return <BarChart className="h-5 w-5 text-primary" />;
      case "reward":
        return <Gift className="h-5 w-5 text-destructive" />;
      case "achievement":
        return <Award className="h-5 w-5 text-warning" />;
      default:
        return <Bell className="h-5 w-5 text-subtle-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "investment":
        return "Investment";
      case "message":
        return "Message";
      case "user":
        return "User";
      case "alert":
        return "Alert";
      case "system":
        return "System";
      case "info":
        return "Info";
      case "event":
        return "Event";
      case "document":
        return "Document";
      case "analytics":
        return "Analytics";
      case "reward":
        return "Reward";
      case "achievement":
        return "Achievement";
      default:
        return "Notification";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "investment":
        return "border-success/50 hover:border-success";
      case "message":
        return "border-primary/50 hover:border-primary";
      case "user":
        return "border-primary/50 hover:border-primary";
      case "alert":
        return "border-warning/50 hover:border-warning";
      case "system":
        return "border-border/50 hover:border-border";
      default:
        return "border-border/50 hover:border-border";
    }
  };

  /*
    R3: every branch was `bg-gradient-to-br from-X/20 to-X/20` — two IDENTICAL
    stops, which is a flat tint wearing a gradient's clothes. Flattened so the
    tile is one reachable token value instead of a two-stop image.
  */
  const getIconBackground = (type: string) => {
    switch (type) {
      case "investment":
        return "bg-success/20 ring-success/30";
      case "message":
        return "bg-primary/20 ring-primary/30";
      case "user":
        return "bg-primary/20 ring-primary/30";
      case "alert":
        return "bg-warning/20 ring-warning/30";
      case "system":
        return "bg-muted/20 ring-border/30";
      case "info":
        return "bg-primary/20 ring-primary/30";
      case "event":
        return "bg-primary/20 ring-primary/30";
      case "document":
        return "bg-warning/20 ring-warning/30";
      case "analytics":
        return "bg-primary/20 ring-primary/30";
      case "reward":
        return "bg-destructive/20 ring-destructive/30";
      case "achievement":
        return "bg-warning/20 ring-warning/30";
      default:
        return "bg-muted/20 ring-border/30";
    }
  };

  const getExpandedBg = (type: string) => {
    switch (type) {
      case "investment":
        return "bg-success/5";
      case "message":
        return "bg-primary/5";
      case "user":
        return "bg-primary/5";
      case "alert":
        return "bg-warning/5";
      case "system":
        return "bg-muted/5";
      case "info":
        return "bg-primary/5";
      case "event":
        return "bg-primary/5";
      case "document":
        return "bg-warning/5";
      case "analytics":
        return "bg-primary/5";
      case "reward":
        return "bg-destructive/5";
      case "achievement":
        return "bg-warning/5";
      default:
        return "bg-muted/5";
    }
  };

  const handleClick = useCallback(() => {
    if (isSwipeActive) return;

    if (!notification.read) {
      onMarkAsRead();
    }
    setIsExpanded(!isExpanded);
  }, [notification.read, isExpanded, onMarkAsRead, isSwipeActive]);

  const handleDelete = useCallback(() => {
    setShowDeleteDialog(false);
    onDelete();
  }, [onDelete]);

  const copyToClipboard = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const textToCopy = notification.message;
      navigator.clipboard.writeText(textToCopy).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    },
    [notification.message]
  );

  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString);

    if (isToday(date)) {
      return `Today, ${format(date, "h:mm a")}`;
    } else if (isYesterday(date)) {
      return `Yesterday, ${format(date, "h:mm a")}`;
    } else if (date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      return format(date, "EEEE, h:mm a");
    } else {
      return format(date, "MMM d, yyyy, h:mm a");
    }
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwipeActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const currentTouch = e.targetTouches[0].clientX;
    const diff = touchStart - currentTouch;

    if (diff > 0) {
      setSwipeDirection("left");
      const progress = Math.min(Math.abs(diff) / 150, 1) * 100;
      setSwipeProgress(progress);
    } else {
      setSwipeDirection("right");
      const progress = Math.min(Math.abs(diff) / 150, 1) * 100;
      setSwipeProgress(progress);
    }

    setTouchEnd(currentTouch);
  };

  const handleTouchEnd = () => {
    setIsSwipeActive(false);

    if (!touchStart || !touchEnd) return;

    const diff = touchStart - touchEnd;
    const isSwipeLeft = diff > 0;
    const isSwipeRight = diff < 0;

    if (Math.abs(diff) > 100) {
      if (isSwipeLeft) {
        setShowDeleteDialog(true);
      } else if (isSwipeRight) {
        if (notification.read) {
          onMarkAsUnread();
        } else {
          onMarkAsRead();
        }
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
    setSwipeDirection(null);
    setSwipeProgress(0);
  };

  const getSwipeAction = () => {
    if (!swipeDirection) return null;

    if (swipeDirection === "left") {
      return (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-destructive text-destructive-foreground px-4 rounded-r-xl"
          style={{ width: `${swipeProgress}%`, maxWidth: "40%" }}
        >
          <Trash className="mr-2 h-5 w-5" />
          {swipeProgress > 50 && <span>{tCommon("delete")}</span>}
        </m.div>
      );
    } else {
      return (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-y-0 left-0 flex items-center justify-center bg-primary text-primary-foreground px-4 rounded-l-xl"
          style={{ width: `${swipeProgress}%`, maxWidth: "40%" }}
        >
          {notification.read ? (
            <>
              <EyeOff className="mr-2 h-5 w-5" />
              {swipeProgress > 50 && <span>{tCommon("mark_as_unread")}</span>}
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              {swipeProgress > 50 && <span>{tCommon("mark_as_read")}</span>}
            </>
          )}
        </m.div>
      );
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      layout
    >
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("delete_notification")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tCommon("are_you_sure_be_undone")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <m.div
        ref={cardRef}
        className={cn(
          /* `rounded-lg` is the declared card radius — the Ledger shell every
             other surface in the product uses. This row was `rounded-xl`, one
             step above the ramp, and its pending twin in `notifications-list`
             was `rounded-lg sm:rounded-xl`, so the two disagreed below the `sm`
             breakpoint while claiming to be the same shape. */
          "group relative overflow-hidden rounded-lg border transition-all duration-300",
          "bg-card",
          !notification.read && "border-l-4",
          getTypeColor(notification.type),
          isExpanded && "shadow-xl",
          isExpanded && getExpandedBg(notification.type)
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        layout
        transition={{ layout: { duration: 0.3, ease: "easeInOut" } }}
      >
        {getSwipeAction()}

        {/* Main Content - Always visible */}
        <m.div
          className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 cursor-pointer"
          onClick={handleClick}
          layout="position"
        >
          {/* Icon */}
          <m.div
            className={cn(
              "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ring-2",
              getIconBackground(notification.type),
              !notification.read && "ring-primary/30"
            )}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            {getIcon(notification.type)}
          </m.div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="font-medium text-[10px] sm:text-xs shrink-0 px-1.5 sm:px-2"
              >
                {getTypeLabel(notification.type)}
              </Badge>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="hidden xs:inline">
                  {formatDistanceToNow(notification.createdAt || Date.now(), {
                    addSuffix: true,
                  })}
                </span>
                <span className="xs:hidden">
                  {formatDistanceToNow(notification.createdAt || Date.now(), {
                    addSuffix: false,
                  })}
                </span>
              </div>
            </div>

            {notification.title && (
              <h4
                className={cn(
                  "font-medium truncate text-sm sm:text-base",
                  !notification.read && "text-foreground",
                  notification.read && "text-muted-foreground"
                )}
              >
                {notification.title}
              </h4>
            )}
            <p
              className={cn(
                "text-xs sm:text-sm line-clamp-1",
                isExpanded && "line-clamp-none",
                notification.read
                  ? "text-muted-foreground"
                  : "text-muted-foreground/80"
              )}
            >
              {notification.message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <m.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </m.div>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                notification.read ? onMarkAsUnread() : onMarkAsRead();
              }}
            >
              {notification.read ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    notification.read ? onMarkAsUnread() : onMarkAsRead();
                  }}
                >
                  {notification.read ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      {tCommon("mark_as_unread")}
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {tCommon("mark_as_read")}
                    </>
                  )}
                </DropdownMenuItem>

                {notification.link && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(notification.link, "_blank");
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {tCommon("open_link")}
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(e);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {isCopied ? tCommon("copied") : t("copy_text")}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {tCommon("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Unread indicator */}
          {!notification.read && (
            <m.div
              className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </m.div>

        {/* Expanded Content - Inline expansion */}
        <AnimatePresence>
          {isExpanded && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-border/50">
                <m.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="pt-3 sm:pt-4 space-y-3 sm:space-y-4"
                >
                  {/* Full details */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <h4 className="font-semibold text-sm sm:text-base">
                        {notification.title || getTypeLabel(notification.type)}
                      </h4>
                      <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-0.5 sm:py-1 rounded-md w-fit">
                        {notification.createdAt
                          ? formatDate(notification.createdAt)
                          : ""}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {notification.message}
                    </p>
                    {notification.details && (
                      <p className="text-xs sm:text-sm text-muted-foreground/80 bg-muted/50 rounded-lg p-2 sm:p-3 mt-2">
                        {notification.details}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <m.div
                    className="flex flex-wrap gap-2 pt-2"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {notification.link && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(notification.link, "_blank");
                        }}
                        className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                      >
                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        {tCommon("open_link")}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyToClipboard}
                      className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                    >
                      <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {isCopied ? tCommon("copied") : tCommon("copy")}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {tCommon("delete")}
                    </Button>
                  </m.div>
                </m.div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </m.div>
  );
}
