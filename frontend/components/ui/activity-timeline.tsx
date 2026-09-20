"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { m, AnimatePresence } from "framer-motion";
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
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loadable } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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
  /**
   * Render the timeline's own chrome with its ROWS pending.
   *
   * Additive and defaulted off, so the existing call sites are untouched. It
   * exists because the alternative every caller reached for was to swap the
   * whole component out — `admin-audit-panel.tsx` replaced it with a `<Card>`
   * holding three `<Skeleton className="h-16 w-full"/>`, which is a 64px guess
   * standing in for a row that measures ~113px once its title, badge,
   * description and 24px avatar line are laid out. Three of those is ~150px of
   * settle, and it threw away a header the caller already had in hand: the
   * 40px icon tile, the title and the description are all literals at the call
   * site, knowable before the request is sent.
   */
  loading?: boolean;
  /** How many pending rows to reserve. Defaults to 3. */
  pendingRows?: number;
}

/**
 * The shape of a waiting row.
 *
 * Every field exists so the pending row is laid out by the SAME code path as a
 * real one — this is not a second tree, it is the same `.map` over stand-in
 * data with `Loadable` at each value. `description` is present because an audit
 * row almost always carries the operator's reason, and a pending row without
 * one is a line shorter than the row it becomes. `user` is present for the same
 * reason: that avatar line is 24px plus its `mt-1`.
 *
 * `type: "custom"` is deliberate — it is the only type whose tone is `neutral`,
 * so a pending badge cannot flash green or red and assert an outcome before one
 * is known.
 */
function pendingEvents(count: number): TimelineEvent[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    id: `pending-${i}`,
    type: "custom" as const,
    title: "",
    description: "",
    timestamp: new Date(),
    user: { name: "" },
  }));
}

const defaultEventConfig: Record<
  TimelineEventType,
  { icon: LucideIcon; color: string; title: string }
> = {
  created: {
    icon: Plus,
    color: "bg-success text-success-foreground",
    title: "Created",
  },
  updated: {
    icon: Edit,
    color: "bg-info text-info-foreground",
    title: "Updated",
  },
  deleted: {
    icon: Trash2,
    color: "bg-destructive text-destructive-foreground",
    title: "Deleted",
  },
  enabled: {
    icon: Power,
    color: "bg-success text-success-foreground",
    title: "Enabled",
  },
  disabled: {
    icon: PowerOff,
    color: "bg-warning text-warning-foreground",
    title: "Disabled",
  },
  approved: {
    icon: CheckCircle,
    color: "bg-success text-success-foreground",
    title: "Approved",
  },
  rejected: {
    icon: AlertTriangle,
    color: "bg-destructive text-destructive-foreground",
    title: "Rejected",
  },
  custom: {
    icon: Settings,
    color: "bg-muted-foreground text-background",
    title: "Event",
  },
};

/**
 * Tone per event type.
 *
 * This used to be a class map hand-rolling the tonal chip as
 * `bg-{tone}/15 text-{tone} border-{tone}/30` — the exact shape Phase 11a
 * promoted onto `<Badge tone appearance>`, at drifted values (fill /15 and
 * border /30 against the canonical /10 and /20) and painting `text-{tone}`
 * rather than the derived `--{tone}-ink`, which is what actually clears 4.5:1
 * on a tinted ground. Only the tones are decided here now; the primitive paints
 * them.
 *
 * NOT routed through `lib/status-tone.ts`: these are audit-event VERBS, not
 * states. `created`, `updated` and `custom` have no entry in that table and
 * would silently collapse to `neutral`, which would flatten three of eight
 * branches into the same grey chip.
 */
const EVENT_TONE: Record<TimelineEventType, BadgeTone> = {
  created: "success",
  updated: "info",
  deleted: "destructive",
  enabled: "success",
  disabled: "warning",
  approved: "success",
  rejected: "destructive",
  custom: "neutral",
};

export function ActivityTimeline({
  events,
  title = "Activity Timeline",
  titleIcon: TitleIcon = Clock,
  description,
  emptyMessage = "No activity recorded yet.",
  className,
  showExpand = true,
  loading = false,
  pendingRows = 3,
}: ActivityTimelineProps) {
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  /* One list, two states. The container, the connector line, the 40px event
     medallion and the row rhythm are written once and only the VALUES wait. */
  const rows = loading ? pendingEvents(pendingRows) : events;

  /**
   * "No Activity" is an EMPTY state, and it must not fire during the fetch.
   *
   * `events.length === 0` is true before the first response as well as when
   * there genuinely is no history, so ungated this panel tells an operator that
   * nothing has ever been done to a record while its audit trail is still on
   * the wire — on a screen whose entire purpose is to be believed. `!loading`
   * here is the fix rather than the `hidden-while-loading` defect, which is why
   * it is a name.
   */
  const showEmptyState = !loading && events.length === 0;

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
          <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
            <TitleIcon className="w-5 h-5 text-primary" />
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
            {rows.map((event, index) => {
              const config = getEventConfig(event);
              const Icon = config.icon;
              const hasDetails = event.details && Object.keys(event.details).length > 0;
              const isExpandable = showExpand && (hasDetails || event.description);

              return (
                <m.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="relative"
                >
                  <div className="flex gap-4 py-4 relative">
                    {/* Connector line */}
                    {index < rows.length - 1 && (
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
                        <Icon className="h-5 w-5" />
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
                          {/* Placeholders inside the REAL typography elements,
                              so the h4's line box and the badge's padding are
                              produced by the same layout in both states. */}
                          <h4 className="font-medium">
                            <Loadable loading={loading} placeholder={t("updated_record")}>
                              {config.title}
                            </Loadable>
                          </h4>
                          <Badge tone={EVENT_TONE[event.type]} appearance="soft">
                            <Loadable loading={loading} placeholder="system">
                              {event.badge || event.type}
                            </Loadable>
                          </Badge>
                          {event.important && (
                            <Badge tone="warning" appearance="soft">
                              Important
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground">
                                  <Loadable loading={loading} placeholder="about 2 hours ago">
                                    {formatRelativeTime(event.timestamp)}
                                  </Loadable>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {formatDate(event.timestamp)}
                              </TooltipContent>
                            </Tooltip>
                          {isExpandable && (
                            expandedEvents[event.id] ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </div>

                      {/* `loading ||` and not just truthiness: a pending row
                          carries `""` for its description, which is falsy, so
                          the plain test would drop this `<p>` and leave every
                          waiting row one 20px line shorter than the row it is
                          about to become. Resolved rows keep the original
                          truthiness test exactly — a real event with no
                          description still renders no paragraph. */}
                      {(loading || event.description) && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          <Loadable loading={loading} chars={64}>
                            {event.description}
                          </Loadable>
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
                            <Loadable loading={loading} placeholder={tCommon("jane_doe")}>
                              {event.user.name}
                            </Loadable>
                          </span>
                        </div>
                      )}

                      {/* Expanded details */}
                      <AnimatePresence>
                        {expandedEvents[event.id] && hasDetails && (
                          <m.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 space-y-4"
                          >
                            <div className="rounded-md bg-muted/50 p-3">
                              <div className="text-xs text-muted-foreground mb-2">
                                {tCommon("details")}:
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
                                  {tCommon("time")}: {formatDate(event.timestamp)}
                                </div>
                              </div>
                            </div>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </m.div>
              );
            })}
          </AnimatePresence>

          {/* See `showEmptyState`: gated on `!loading` on purpose. */}
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{t("no_activity")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {emptyMessage}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      {/* The footer rail renders whenever there are rows to count — pending
          ones included — because it is a 37px bar at the bottom of the card and
          withholding it made the card grow by exactly that much on arrival.
          Only the COUNT waits; the word "event"/"events" is pluralised off the
          pending row count, which is a reservation and not a claim, so the
          figure beside it is the placeholder. */}
      {rows.length > 0 && (
        <div className="border-t bg-muted/50 flex justify-between p-2 px-4">
          <div className="text-xs text-muted-foreground">
            Showing{" "}
            <Loadable loading={loading} chars={2}>
              {events.length}
            </Loadable>{" "}
            event{events.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </Card>
  );
}
