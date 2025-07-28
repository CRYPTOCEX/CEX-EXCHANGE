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
  Share2,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { motion } from "framer-motion";
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
  const t = useTranslations("dashboard");
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
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case "user":
        return <User className="h-5 w-5 text-purple-500" />;
      case "alert":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "system":
        return <Shield className="h-5 w-5 text-gray-500" />;
      case "info":
        return <Info className="h-5 w-5 text-sky-500" />;
      case "event":
        return <Calendar className="h-5 w-5 text-indigo-500" />;
      case "document":
        return <FileText className="h-5 w-5 text-orange-500" />;
      case "analytics":
        return <BarChart className="h-5 w-5 text-violet-500" />;
      case "reward":
        return <Gift className="h-5 w-5 text-pink-500" />;
      case "achievement":
        return <Award className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
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
        return "border-green-500 hover:bg-green-50 dark:hover:bg-green-950/30";
      case "message":
        return "border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30";
      case "user":
        return "border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30";
      case "alert":
        return "border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950/30";
      case "system":
        return "border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-950/30";
      default:
        return "border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-950/30";
    }
  };

  const getIconBackground = (type: string) => {
    switch (type) {
      case "investment":
        return "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20";
      case "message":
        return "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20";
      case "user":
        return "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20";
      case "alert":
        return "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20";
      case "system":
        return "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20";
      case "info":
        return "bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-900/20 dark:to-sky-800/20";
      case "event":
        return "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20";
      case "document":
        return "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20";
      case "analytics":
        return "bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20";
      case "reward":
        return "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20";
      case "achievement":
        return "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20";
      default:
        return "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20";
    }
  };

  const getBorderGradient = (type: string) => {
    if (!isHovered && !isExpanded) return "";

    switch (type) {
      case "investment":
        return "hover:border-l-green-500 hover:border-b-green-400";
      case "message":
        return "hover:border-l-blue-500 hover:border-b-blue-400";
      case "user":
        return "hover:border-l-purple-500 hover:border-b-purple-400";
      case "alert":
        return "hover:border-l-yellow-500 hover:border-b-yellow-400";
      case "system":
        return "hover:border-l-gray-500 hover:border-b-gray-400";
      case "info":
        return "hover:border-l-sky-500 hover:border-b-sky-400";
      case "event":
        return "hover:border-l-indigo-500 hover:border-b-indigo-400";
      case "document":
        return "hover:border-l-orange-500 hover:border-b-orange-400";
      case "analytics":
        return "hover:border-l-violet-500 hover:border-b-violet-400";
      case "reward":
        return "hover:border-l-pink-500 hover:border-b-pink-400";
      case "achievement":
        return "hover:border-l-amber-500 hover:border-b-amber-400";
      default:
        return "hover:border-l-gray-500 hover:border-b-gray-400";
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

    // Determine swipe direction
    if (diff > 0) {
      setSwipeDirection("left");
      // Calculate progress as a percentage (0-100)
      const progress = Math.min(Math.abs(diff) / 150, 1) * 100;
      setSwipeProgress(progress);
    } else {
      setSwipeDirection("right");
      // Calculate progress as a percentage (0-100)
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

    // If the swipe is significant enough (more than 100px)
    if (Math.abs(diff) > 100) {
      if (isSwipeLeft) {
        // Swiped left - delete
        setShowDeleteDialog(true);
      } else if (isSwipeRight) {
        // Swiped right - mark as read/unread
        if (notification.read) {
          onMarkAsUnread();
        } else {
          onMarkAsRead();
        }
      }
    }

    // Reset touch values
    setTouchStart(null);
    setTouchEnd(null);
    setSwipeDirection(null);
    setSwipeProgress(0);
  };

  // Get action based on swipe direction
  const getSwipeAction = () => {
    if (!swipeDirection) return null;

    if (swipeDirection === "left") {
      return (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white px-4"
          style={{ width: `${swipeProgress}%`, maxWidth: "40%" }}
        >
          <Trash className="mr-2 h-5 w-5" />
          {swipeProgress > 50 && <span>{t("Delete")}</span>}
        </div>
      );
    } else {
      return (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-center bg-blue-500 text-white px-4"
          style={{ width: `${swipeProgress}%`, maxWidth: "40%" }}
        >
          {notification.read ? (
            <>
              <EyeOff className="mr-2 h-5 w-5" />
              {swipeProgress > 50 && <span>{t("mark_as_unread")}</span>}
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              {swipeProgress > 50 && <span>{t("mark_as_read")}</span>}
            </>
          )}
        </div>
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_notification")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("are_you_sure_be_undone")}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-10 bg-black/20"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(false);
          }}
        />
      )}
      <div
        className={cn(
          "group relative flex items-center gap-4 rounded-lg border p-4 transition-all duration-200",
          "hover:shadow-lg cursor-pointer",
          !notification.read && "border-l-4",
          getTypeColor(notification.type),
          getBorderGradient(notification.type),
          isHovered && "-translate-y-0.5",
          isExpanded && "z-20"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        ref={cardRef}
      >
        {getSwipeAction()}
        {/* Icon */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            getIconBackground(notification.type),
            "transition-transform duration-300",
            "group-hover:scale-110",
            !notification.read && "ring-2 ring-primary/20"
          )}
        >
          {getIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-medium">
              {getTypeLabel(notification.type)}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(notification.createdAt || Date.now(), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          {notification.title && (
            <h4 className="font-medium">{notification.title}</h4>
          )}
          <p className="text-sm text-muted-foreground">
            {notification.message}
          </p>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border bg-background p-4 shadow-lg -mx-[1px]">
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  {notification.title || getTypeLabel(notification.type)}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {notification.createdAt
                    ? formatDate(notification.createdAt)
                    : ""}
                </span>
              </div>
              <p className="text-sm">{notification.message}</p>
              {notification.details && (
                <p className="text-sm text-muted-foreground mt-2">
                  {notification.details}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {notification.link && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(notification.link, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("open_link")}
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                {isCopied ? "Copied!" : "Copy"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash className="mr-2 h-4 w-4" />
                {t("Delete")}
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
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
              <Button variant="ghost" size="icon">
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
                    {t("mark_as_unread")}
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t("mark_as_read")}
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
                  {t("open_link")}
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(e);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                {isCopied ? "Copied!" : "Copy text"}
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
                {t("Delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
        )}
      </div>
    </motion.div>
  );
}
