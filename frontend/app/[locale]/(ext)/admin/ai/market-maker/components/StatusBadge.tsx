"use client";

import React from "react";

import { cn } from "@/lib/utils";
import type { BadgeTone } from "@/components/ui/badge";
import { StatusBadge as SharedStatusBadge } from "@/components/ui/status-badge";
import { statusTone } from "@/lib/status-tone";
import { useTranslations } from "next-intl";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
}

/** Solid fill for the leading dot, keyed by the shared tone. */
const TONE_DOT: Record<BadgeTone, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

const sizeClasses = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
}) => {
  const t = useTranslations("common");
  /**
   * The hue used to be decided here, in a seventh copy of the status table, and
   * against class names (`success-500`, `danger-500`) that the flat token set
   * never compiled — six of the seven branches rendered unstyled. Both the pill
   * and its dot now read the one table in `lib/status-tone.ts`.
   */
  const tone = statusTone(status);

  return (
    <SharedStatusBadge
      status={status}
      label={status || t("unknown")}
      className={cn("rounded-full gap-1.5 font-medium", sizeClasses[size])}
      icon={
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            TONE_DOT[tone],
            (status === "ACTIVE" || status === "INITIALIZING") && "animate-pulse"
          )}
        />
      }
    />
  );
};

export default StatusBadge;
