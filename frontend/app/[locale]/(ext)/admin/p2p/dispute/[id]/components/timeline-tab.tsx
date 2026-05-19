"use client";

import { useState } from "react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Play,
  CreditCard,
  Shield,
  Flag,
  FileText,
  X,
  ZoomIn,
  Gavel,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TimelineEvent {
  event: string;
  type?: string;
  timestamp: string;
  details?: string;
  userId?: string;
  adminName?: string;
}

interface TimelineTabProps {
  dispute: any;
}

// Helper to extract images from details
function extractImages(content: string): { text: string; images: string[] } {
  if (!content) return { text: "", images: [] };

  const images: string[] = [];
  let text = content;

  // 1. Extract markdown image format: ![alt](url)
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/gi;
  text = text.replace(markdownImageRegex, (match, alt, url) => {
    images.push(url);
    return "";
  });

  // 2. Extract plain image URLs
  const plainUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg))/gi;
  text = text.replace(plainUrlRegex, (match) => {
    if (!images.includes(match)) images.push(match);
    return "";
  });

  // 3. Extract relative paths
  const relativePathRegex = /(\/uploads\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg))/gi;
  text = text.replace(relativePathRegex, (match) => {
    if (!images.includes(match)) images.push(match);
    return "";
  });

  return { text: text.trim(), images };
}

// Format timestamp nicely
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  } catch {
    return timestamp;
  }
}

function getEventStyle(eventType: string) {
  const type = eventType.toUpperCase().replace(/\s+/g, "_");

  // Dispute-specific events
  if (type.includes("DISPUTE") && (type.includes("FILED") || type.includes("OPENED") || type.includes("CREATED"))) {
    return {
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
    };
  }

  if (type.includes("INVESTIGATION") || type.includes("IN_PROGRESS") || type.includes("REVIEW")) {
    return {
      icon: Clock,
      color: "text-blue-600",
      bgColor: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
    };
  }

  if (type.includes("RESOLVED") || type.includes("CLOSED") || type.includes("COMPLETED")) {
    return {
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
    };
  }

  if (type.includes("BUYER_WINS") || type.includes("SELLER_WINS")) {
    return {
      icon: Gavel,
      color: "text-blue-600",
      bgColor: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
    };
  }

  if (type.includes("CANCELLED") || type.includes("REJECTED") || type.includes("FAILED")) {
    return {
      icon: XCircle,
      color: "text-gray-600",
      bgColor: "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900",
    };
  }

  if (type.includes("EVIDENCE") || type.includes("UPLOAD")) {
    return {
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950",
    };
  }

  if (type.includes("FLAG")) {
    return {
      icon: Flag,
      color: "text-yellow-600",
      bgColor: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
    };
  }

  if (type.includes("ADMIN") || type.includes("MESSAGE")) {
    return {
      icon: Shield,
      color: "text-blue-600",
      bgColor: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
    };
  }

  if (type.includes("NOTE")) {
    return {
      icon: FileText,
      color: "text-slate-600",
      bgColor: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900",
    };
  }

  if (type.includes("PAYMENT")) {
    return {
      icon: CreditCard,
      color: "text-orange-600",
      bgColor: "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950",
    };
  }

  if (type.includes("TRADE") && (type.includes("INITIATED") || type.includes("STARTED"))) {
    return {
      icon: Play,
      color: "text-blue-600",
      bgColor: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
    };
  }

  // Default
  return {
    icon: Clock,
    color: "text-gray-500",
    bgColor: "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900",
  };
}

export function TimelineTab({ dispute }: TimelineTabProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Build timeline from dispute data
  const timeline: TimelineEvent[] = [];

  // Add dispute filed event
  if (dispute?.filedOn) {
    timeline.push({
      event: "Dispute Filed",
      type: "DISPUTE_FILED",
      timestamp: dispute.filedOn,
      details: dispute.reason || "Dispute opened",
    });
  }

  // Add status change if in progress
  if (dispute?.status === "IN_PROGRESS" || dispute?.status === "in-progress") {
    timeline.push({
      event: "Investigation Started",
      type: "IN_PROGRESS",
      timestamp: dispute.updatedAt || dispute.filedOn,
      details: "Admin started investigating the dispute",
    });
  }

  // Add resolution if resolved
  if (dispute?.status === "RESOLVED" || dispute?.status === "resolved") {
    timeline.push({
      event: `Dispute Resolved - ${dispute.resolution?.outcome || "Completed"}`,
      type: "RESOLVED",
      timestamp: dispute.resolvedOn || dispute.updatedAt,
      details: dispute.resolution?.notes || "Dispute has been resolved",
      adminName: dispute.resolution?.adminName,
    });
  }

  // Add timeline events from dispute.timeline if exists
  if (Array.isArray(dispute?.timeline)) {
    dispute.timeline.forEach((event: TimelineEvent) => {
      timeline.push(event);
    });
  }

  // Sort by timestamp (newest first for display, but we'll reverse for proper order)
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dispute_timeline")}</CardTitle>
          <CardDescription>
            {t("chronological_events_for_this_dispute")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center border rounded-lg bg-muted/30">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t("no_timeline_events_available")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("dispute_timeline")}</CardTitle>
          <CardDescription>
            {t("chronological_events_for_this_dispute")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Scrollable container with max height */}
          <div className="max-h-[400px] overflow-y-auto pr-2">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-0">
                {timeline.map((event, index) => {
                  const { icon: Icon, color, bgColor } = getEventStyle(event.type || event.event);
                  const { text, images } = extractImages(event.details || "");
                  const isLast = index === timeline.length - 1;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative flex gap-4 pb-6",
                        isLast && "pb-0"
                      )}
                    >
                      {/* Icon circle */}
                      <div
                        className={cn(
                          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background",
                          bgColor
                        )}
                      >
                        <Icon className={cn("h-5 w-5", color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <h4 className="font-semibold text-sm">{event.event}</h4>
                          <time className="text-xs text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </time>
                        </div>

                        {/* Details text */}
                        {text && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {text}
                          </p>
                        )}

                        {/* Admin info */}
                        {event.adminName && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            By {event.adminName}
                          </p>
                        )}

                        {/* Images */}
                        {images.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {images.map((img, imgIndex) => (
                              <button
                                key={imgIndex}
                                onClick={() => setLightboxImage(img)}
                                className="relative group rounded-lg overflow-hidden border bg-background hover:ring-2 hover:ring-primary transition-all"
                              >
                                <img
                                  src={img}
                                  alt={`Attachment ${imgIndex + 1}`}
                                  className="h-20 w-auto max-w-[150px] object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt={tExt("full_size")}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
