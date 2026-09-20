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
import { m } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
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
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

  /*
    The hover wash. Three of the six branches asked for a SOLID `hover:bg-success`
    / `hover:bg-primary` / `hover:bg-warning` while their peers asked for `/10` —
    so hovering an "alert" card turned it into a saturated amber slab with the
    body copy still in `--foreground`, and hovering a "message" card barely
    tinted. One alpha for all of them.
  */
  const getTypeColor = (type: string) => {
    switch (type) {
      case "investment":
        return "border-success hover:bg-success/10 dark:hover:bg-success/20";
      case "message":
      case "user":
        return "border-primary hover:bg-primary/10 dark:hover:bg-primary/20";
      case "alert":
        return "border-warning hover:bg-warning/10 dark:hover:bg-warning/20";
      case "system":
      default:
        return "border-border hover:bg-muted dark:hover:bg-background/30";
    }
  };

  /*
    R3: every branch here was `bg-gradient-to-br from-X to-X` — two IDENTICAL
    stops, which is a flat fill written as a gradient. Worse, in light mode the
    fill was the token at FULL opacity behind a `text-X` glyph (see getTypeIcon
    above), so each icon was invisible until dark mode dropped it to `/20`.
  */
  const getIconBackground = (type: string) => {
    switch (type) {
      case "investment":
        return "bg-success/15";
      case "message":
      case "user":
        return "bg-primary/15";
      case "alert":
        return "bg-warning/15";
      case "system":
      default:
        return "bg-muted";
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
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        className="h-full"
      >
        <Card
          className={cn(
            "group relative h-full overflow-hidden transition-all duration-200",
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
              {notification.read ? t("unread") : tCommon("read")}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="flex-1">
                  <MoreVertical className="h-4 w-4 mr-1" />
                  {tCommon("actions")}
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
                      {tCommon("mark_as_unread")}
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {tCommon("mark_as_read")}
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Star className="mr-2 h-4 w-4" />
                  {tCommon("star")}
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

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {tCommon("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardFooter>
        </Card>
      </m.div>
  );
};

export const NotificationCard = memo(NotificationCardComponent);
