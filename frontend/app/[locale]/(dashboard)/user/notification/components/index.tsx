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
import { motion, AnimatePresence } from "framer-motion";
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
export function NotificationsCard() {
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

  // Get only unread notifications
  const unreadNotifications = notifications.filter(
    (notification) => !notification.read
  );

  // Get the most recent notifications, prioritizing unread ones
  const recentNotifications = [
    ...unreadNotifications,
    ...notifications.filter((n) => n.read),
  ].slice(0, visibleCount);
  const getIconForType = (type: string) => {
    switch (type) {
      case "investment":
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case "message":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "user":
        return <User className="h-4 w-4 text-purple-500" />;
      case "alert":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "system":
        return <Shield className="h-4 w-4 text-gray-500" />;
      case "info":
        return <Info className="h-4 w-4 text-sky-500" />;
      case "event":
        return <Calendar className="h-4 w-4 text-indigo-500" />;
      case "document":
        return <FileText className="h-4 w-4 text-orange-500" />;
      case "analytics":
        return <BarChart className="h-4 w-4 text-violet-500" />;
      case "reward":
        return <Gift className="h-4 w-4 text-pink-500" />;
      case "achievement":
        return <Award className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
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
      case "info":
        return "border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30";
      case "event":
        return "border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30";
      case "document":
        return "border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30";
      case "analytics":
        return "border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30";
      case "reward":
        return "border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/30";
      case "achievement":
        return "border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30";
      default:
        return "border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-950/30";
    }
  };
  const getIconBackground = (type: string) => {
    switch (type) {
      case "investment":
        return "bg-green-100 dark:bg-green-900/20";
      case "message":
        return "bg-blue-100 dark:bg-blue-900/20";
      case "user":
        return "bg-purple-100 dark:bg-purple-900/20";
      case "alert":
        return "bg-yellow-100 dark:bg-yellow-900/20";
      case "system":
        return "bg-gray-100 dark:bg-gray-900/20";
      case "info":
        return "bg-sky-100 dark:bg-sky-900/20";
      case "event":
        return "bg-indigo-100 dark:bg-indigo-900/20";
      case "document":
        return "bg-orange-100 dark:bg-orange-900/20";
      case "analytics":
        return "bg-violet-100 dark:bg-violet-900/20";
      case "reward":
        return "bg-pink-100 dark:bg-pink-900/20";
      case "achievement":
        return "bg-amber-100 dark:bg-amber-900/20";
      default:
        return "bg-gray-100 dark:bg-gray-900/20";
    }
  };
  const getTimeAgo = (dateString?: string | Date) => {
    if (!dateString) return "Just now";
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
    });
  };
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
            <Badge variant="outline" className="ml-2 bg-primary/10 text-xs">
              Loading...
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="h-16 bg-muted/40 animate-pulse rounded-md"
              ></div>
            ))}
        </CardContent>
      </Card>
    );
  }
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
                View all
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentNotifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">
                You'll see your notifications here when they arrive
              </p>
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence>
                {recentNotifications.map((notification, index) => {
                  return (
                    <motion.div
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
                                ? "Mark as unread"
                                : "Mark as read"}
                            </DropdownMenuItem>
                            {notification.link && (
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(notification.link, "_blank")
                                }
                              >
                                Open link
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
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
