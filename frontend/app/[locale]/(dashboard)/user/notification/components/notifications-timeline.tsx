"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  DollarSign,
  MessageSquare,
  User,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Check,
  EyeOff,
  Trash,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNotificationsStore } from "@/store/notification-store";
import { useTranslations } from "next-intl";

interface NotificationsTimelineProps {
  notifications: notificationAttributes[];
  isLoading: boolean;
}
export function NotificationsTimeline({
  notifications,
  isLoading,
}: NotificationsTimelineProps) {
  const t = useTranslations("dashboard");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const { markAsRead, markAsUnread, deleteNotification } =
    useNotificationsStore();
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };
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
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case "investment":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "message":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "user":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "alert":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "system":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };
  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy");
  };
  const getTimeAgo = (dateString: string | number | Date) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
    });
  };
  if (isLoading) {
    return (
      <div className="space-y-8 relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-muted-foreground/20"></div>
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-full max-w-[200px]" />
                <Skeleton className="h-4 w-full max-w-[300px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            </div>
          ))}
      </div>
    );
  }

  // Sort notifications by date
  const sortedNotifications = [...notifications].sort(
    (a, b) =>
      (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
      (a.createdAt ? new Date(a.createdAt).getTime() : 0)
  );

  // Group notifications by date
  const groupedByDate: Record<string, notificationAttributes[]> = {};
  sortedNotifications.forEach((notification) => {
    const date = notification.createdAt
      ? formatDate(notification.createdAt)
      : formatDate(new Date());
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(notification);
  });
  return (
    <div className="space-y-12 relative">
      {/* Timeline line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary/20 dark:bg-primary/10"></div>

      {Object.entries(groupedByDate).map(
        ([date, dateNotifications], groupIndex) => (
          <motion.div
            key={date}
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.4,
              delay: groupIndex * 0.1,
            }}
            className="relative"
          >
            {/* Date marker */}
            <div className="sticky top-16 z-10 mb-6 flex items-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center z-10">
                <span className="text-sm font-medium">{date}</span>
              </div>
              <div className="h-0.5 flex-1 bg-primary/10 ml-4"></div>
            </div>

            {/* Notifications for this date */}
            <div className="space-y-8 ml-8 pl-8">
              {dateNotifications.map((notification, index) => {
                const isExpanded = expandedIds.includes(notification.id);
                return (
                  <motion.div
                    key={notification.id}
                    initial={{
                      opacity: 0,
                      x: -20,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.05 + groupIndex * 0.1,
                    }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-12 top-4 h-4 w-4 rounded-full bg-primary"></div>

                    {/* Timeline connector */}
                    <div className="absolute -left-10 top-4 h-0.5 w-10 bg-primary/20"></div>

                    <Card
                      className={cn(
                        "relative overflow-hidden transition-all duration-200",
                        !notification.read && "border-l-4 border-l-primary"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "p-3 rounded-full",
                              getTypeColor(notification.type)
                            )}
                          >
                            {getIcon(notification.type)}
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4
                                  className={cn(
                                    "text-base",
                                    !notification.read && "font-medium"
                                  )}
                                >
                                  {notification.title || notification.message}
                                </h4>

                                <div className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {getTimeAgo(
                                      notification.createdAt || Date.now()
                                    )}
                                  </span>
                                </div>
                              </div>

                              <Badge
                                variant="outline"
                                className={getTypeColor(notification.type)}
                              >
                                {notification.type}
                              </Badge>
                            </div>

                            <AnimatePresence>
                              {isExpanded && notification.details && (
                                <motion.div
                                  initial={{
                                    height: 0,
                                    opacity: 0,
                                  }}
                                  animate={{
                                    height: "auto",
                                    opacity: 1,
                                  }}
                                  exit={{
                                    height: 0,
                                    opacity: 0,
                                  }}
                                  transition={{
                                    duration: 0.3,
                                  }}
                                  className="overflow-hidden"
                                >
                                  <p className="text-sm mt-2 border-t pt-2">
                                    {notification.details}
                                  </p>

                                  {notification.actions && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {notification.actions.map(
                                        (action, actionIndex) => (
                                          <Button
                                            key={actionIndex}
                                            variant={
                                              action.primary
                                                ? "default"
                                                : "outline"
                                            }
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (action.onClick)
                                                action.onClick();
                                              if (action.link)
                                                window.open(
                                                  action.link,
                                                  "_blank"
                                                );
                                            }}
                                          >
                                            {action.label}
                                          </Button>
                                        )
                                      )}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(notification.id)}
                                className="text-xs"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                    {t("show_less")}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    {t("show_more")}
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  notification.read
                                    ? markAsUnread(notification.id)
                                    : markAsRead(notification.id)
                                }
                              >
                                {notification.read ? (
                                  <>
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    {t("mark_unread")}
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    {t("mark_read")}
                                  </>
                                )}
                              </Button>

                              {notification.link && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() =>
                                    window.open(notification.link, "_blank")
                                  }
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  {t("Open")}
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-destructive hover:text-destructive"
                                onClick={() =>
                                  deleteNotification(notification.id)
                                }
                              >
                                <Trash className="h-3 w-3 mr-1" />
                                {t("Delete")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )
      )}
    </div>
  );
}
