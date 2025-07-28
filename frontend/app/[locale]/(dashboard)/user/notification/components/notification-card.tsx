"use client";

import { useState, useCallback, memo } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Star,
  Info,
  Shield,
  Calendar,
  FileText,
  BarChart,
  Gift,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface NotificationCardProps {
  notification: notificationAttributes;
  onMarkAsRead: () => void;
  onMarkAsUnread: () => void;
  onDelete: () => void;
  index?: number;
}

const NotificationCardComponent = ({
  notification,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  index = 0,
}: NotificationCardProps) => {
  const t = useTranslations("dashboard");
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
      default:
        return "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20";
    }
  };

  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkAsRead();
    }
    setIsExpanded(!isExpanded);
  }, [notification.read, isExpanded, onMarkAsRead]);

  const formatDate = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy");
  };

  const getTimeAgo = (dateString: string | number | Date) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        className="h-full"
      >
        <Card
          className={cn(
            "group relative h-full overflow-hidden transition-all duration-200",
            "hover:shadow-lg",
            !notification.read && "border-l-[3px]",
            getTypeColor(notification.type),
            isHovered && "-translate-y-0.5"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
        >
          {/* Unread indicator */}
          {!notification.read && (
            <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}

          <CardContent className="p-5 space-y-4">
            {/* Icon with background */}
            <div className="flex justify-center mb-4">
              <div
                className={cn(
                  "p-4 rounded-full transition-transform duration-300",
                  "shadow-sm group-hover:scale-110",
                  getIconBackground(notification.type),
                  !notification.read && "ring-2 ring-primary/20"
                )}
              >
                {getIcon(notification.type)}
              </div>
            </div>

            {/* Type badge */}
            <div className="flex justify-center">
              <Badge variant="outline" className="font-medium">
                <span className="flex items-center gap-1">
                  {getIcon(notification.type)}
                  {getTypeLabel(notification.type)}
                </span>
              </Badge>
            </div>

            {/* Title and message */}
            <div className="text-center space-y-2">
              {notification.title && (
                <h3
                  className={cn(
                    "text-base",
                    !notification.read && "font-semibold"
                  )}
                >
                  {notification.title}
                </h3>
              )}
              <p className="text-sm text-muted-foreground line-clamp-3">
                {notification.message}
              </p>
            </div>

            {/* Timestamp */}
            <div className="flex items-center justify-center text-xs text-muted-foreground gap-1 mt-auto">
              <Clock className="h-3 w-3" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {getTimeAgo(notification.createdAt || Date.now())}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {formatDate(notification.createdAt || Date.now())}
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>

          {/* Action buttons */}
          <CardFooter className="p-3 border-t flex justify-between gap-2 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                notification.read ? onMarkAsUnread() : onMarkAsRead();
              }}
            >
              {notification.read ? (
                <EyeOff className="h-4 w-4 mr-1" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              {notification.read ? "Unread" : "Read"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="flex-1">
                  <MoreVertical className="h-4 w-4 mr-1" />
                  {t("Actions")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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

                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Star className="mr-2 h-4 w-4" />
                  {t("Star")}
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

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardFooter>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};

export const NotificationCard = memo(NotificationCardComponent);
