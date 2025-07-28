"use client";

import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

interface TimelineEvent {
  event: string;
  timestamp: string;
  details?: string;
}

interface TradeTimelineViewProps {
  timeline: TimelineEvent[];
}

export function TradeTimelineView({ timeline }: TradeTimelineViewProps) {
  const t = useTranslations("ext");
  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">
          {t("no_timeline_events_available")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeline.map((event, index) => (
        <div key={index} className="relative pl-6">
          {index < timeline.length - 1 && (
            <div className="absolute left-2.5 top-6 h-full w-px bg-border" />
          )}
          <div className="flex items-start">
            <div className="absolute left-0 top-1 rounded-full bg-background">
              {getEventIcon(event.event)}
            </div>
            <div>
              <p className="font-medium">{event.event}</p>
              <p className="text-sm text-muted-foreground">{event.timestamp}</p>
              {event.details && <p className="mt-1 text-sm">{event.details}</p>}
            </div>
          </div>
          {index < timeline.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </div>
  );
}

function getEventIcon(event: string) {
  if (event.includes("Created") || event.includes("Initiated")) {
    return <Clock className="h-5 w-5 text-blue-500" />;
  } else if (
    event.includes("Completed") ||
    event.includes("Confirmed") ||
    event.includes("Released")
  ) {
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  } else if (event.includes("Disputed") || event.includes("Flagged")) {
    return <AlertTriangle className="h-5 w-5 text-orange-500" />;
  } else if (event.includes("Cancelled") || event.includes("Rejected")) {
    return <XCircle className="h-5 w-5 text-red-500" />;
  } else if (event.includes("Message")) {
    return <MessageSquare className="h-5 w-5 text-purple-500" />;
  } else {
    return <Clock className="h-5 w-5 text-gray-500" />;
  }
}
