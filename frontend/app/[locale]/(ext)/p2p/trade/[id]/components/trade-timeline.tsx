"use client";

import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Ban,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface TimelineEvent {
  title: string;
  description: string;
  time: string;
}

interface TradeTimelineProps {
  events: TimelineEvent[];
}

export function TradeTimeline({ events }: TradeTimelineProps) {
  const t = useTranslations("ext");
  const getEventIcon = (title: string) => {
    if (title.includes("Created")) return ShieldCheck;
    if (title.includes("Payment")) return Clock;
    if (title.includes("Confirmed")) return CheckCircle2;
    if (title.includes("Released") || title.includes("Completed"))
      return CheckCircle2;
    if (title.includes("Dispute")) return AlertCircle;
    if (title.includes("Cancelled")) return Ban;
    return Clock;
  };

  const getEventColor = (title: string) => {
    if (title.includes("Created"))
      return "text-blue-500 bg-blue-100 dark:bg-blue-900/50";
    if (title.includes("Payment") && !title.includes("Confirmed"))
      return "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/50";
    if (title.includes("Confirmed"))
      return "text-purple-500 bg-purple-100 dark:bg-purple-900/50";
    if (title.includes("Released") || title.includes("Completed"))
      return "text-green-500 bg-green-100 dark:bg-green-900/50";
    if (title.includes("Dispute"))
      return "text-red-500 bg-red-100 dark:bg-red-900/50";
    if (title.includes("Cancelled"))
      return "text-gray-500 bg-gray-100 dark:bg-gray-800/50";
    return "text-gray-500 bg-gray-100 dark:bg-gray-800/50";
  };

  return (
    <Card className="p-4 border-primary/10">
      <h3 className="font-medium mb-4">{t("trade_timeline")}</h3>
      <div className="space-y-0">
        {events.map((event, index) => {
          const EventIcon = getEventIcon(event.title);
          const colorClass = getEventColor(event.title);

          return (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center ${colorClass}`}
                >
                  <EventIcon className="h-4 w-4" />
                </div>
                {index < events.length - 1 && (
                  <div className="w-0.5 h-full bg-border" />
                )}
              </div>
              <div className="space-y-1 pb-6">
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.time).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
