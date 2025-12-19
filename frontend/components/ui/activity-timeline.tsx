"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Edit,
  Trash2,
  Plus,
  Settings,
  Power,
  PowerOff,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Timeline event types
export type TimelineEventType =
  | "created"
  | "updated"
  | "deleted"
  | "enabled"
  | "disabled"
  | "approved"
  | "rejected"
  | "custom";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: string | Date;
  icon?: LucideIcon;
  color?: string;
  user?: {
    name: string;
    avatar?: string;
  };
  badge?: string;
  details?: Record<string, string>;
  important?: boolean;
}

interface ActivityTimelineProps {
  events: TimelineEvent[];
  title?: string;
  titleIcon?: LucideIcon;
  description?: string;
  emptyMessage?: string;
  className?: string;
  showExpand?: boolean;
}

const defaultEventConfig: Record<
  TimelineEventType,
  { icon: LucideIcon; color: string; title: string }
> = {
  created: {
    icon: Plus,
    color: "bg-green-500",
    title: "Created",
  },
  updated: {
    icon: Edit,
    color: "bg-blue-500",
    title: "Updated",
  },
  deleted: {
    icon: Trash2,
    color: "bg-red-500",
    title: "Deleted",
  },
  enabled: {
    icon: Power,
    color: "bg-green-500",
    title: "Enabled",
  },
  disabled: {
    icon: PowerOff,
    color: "bg-orange-500",
    title: "Disabled",
  },
  approved: {
    icon: CheckCircle,
    color: "bg-green-500",
    title: "Approved",
  },
  rejected: {
    icon: AlertTriangle,
    color: "bg-red-500",
    title: "Rejected",
  },
  custom: {
    icon: Settings,
    color: "bg-slate-500",
    title: "Event",
  },
};

const getBadgeClasses = (type: TimelineEventType) => {
  const classes: Record<TimelineEventType, string> = {
    created: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    updated: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    deleted: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    enabled: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    disabled: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    approved: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    custom: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800",
  };
  return classes[type];
};

export function ActivityTimeline({
  events,
  title = "Activity Timeline",
  titleIcon: TitleIcon = Clock,
  description,
  emptyMessage = "No activity recorded yet.",
  className,
  showExpand = true,
}: ActivityTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  const formatDate = (dateInput: string | Date) => {
    try {
      const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      return format(date, "PPP 'at' p");
    } catch {
      return "Invalid date";
    }
  };

  const formatRelativeTime = (dateInput: string | Date) => {
    try {
      const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const getEventConfig = (event: TimelineEvent) => {
    const defaultConfig = defaultEventConfig[event.type];
    return {
      icon: event.icon || defaultConfig.icon,
      color: event.color || defaultConfig.color,
      title: event.title || defaultConfig.title,
    };
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
            <TitleIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-0">
          <AnimatePresence>
            {events.map((event, index) => {
              const config = getEventConfig(event);
              const Icon = config.icon;
              const hasDetails = event.details && Object.keys(event.details).length > 0;
              const isExpandable = showExpand && (hasDetails || event.description);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="relative"
                >
                  <div className="flex gap-4 py-4 relative">
                    {/* Connector line */}
                    {index < events.length - 1 && (
                      <div className="absolute top-14 bottom-0 left-5 w-0.5 bg-border" />
                    )}

                    {/* Icon */}
                    <div className="relative z-10">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full shadow-sm",
                          config.color
                        )}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-2",
                          isExpandable && "cursor-pointer"
                        )}
                        onClick={() => isExpandable && toggleEventExpanded(event.id)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{config.title}</h4>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", getBadgeClasses(event.type))}
                          >
                            {event.badge || event.type}
                          </Badge>
                          {event.important && (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 text-xs"
                            >
                              Important
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(event.timestamp)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {formatDate(event.timestamp)}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {isExpandable && (
                            expandedEvents[event.id] ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {event.user && (
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={event.user.avatar || "/img/placeholder.svg"}
                              alt={event.user.name}
                            />
                            <AvatarFallback>
                              {event.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {event.user.name}
                          </span>
                        </div>
                      )}

                      {/* Expanded details */}
                      <AnimatePresence>
                        {expandedEvents[event.id] && hasDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 space-y-4"
                          >
                            <div className="rounded-md bg-muted/50 p-3">
                              <div className="text-xs text-muted-foreground mb-2">
                                Details:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(event.details!).map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="text-xs bg-muted rounded px-2 py-1"
                                  >
                                    {key}: {value}
                                  </div>
                                ))}
                                <div className="text-xs bg-muted rounded px-2 py-1">
                                  Time: {formatDate(event.timestamp)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No Activity</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {emptyMessage}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      {events.length > 0 && (
        <div className="border-t bg-muted/50 flex justify-between p-2 px-4">
          <div className="text-xs text-muted-foreground">
            Showing {events.length} event{events.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </Card>
  );
}
