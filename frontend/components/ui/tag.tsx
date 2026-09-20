"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/badge";

/**
 * Tag — a pill-shaped Badge.
 *
 * This used to be a THIRD parallel badge implementation: same job as <Badge>
 * and the ~940 hand-rolled tonal badges, but with its own opacity (`/15`, where
 * Badge's soft tone settled on the measured-majority `/10`) and no border. Three
 * implementations of one chip is exactly the drift the design system exists to
 * remove, so Tag is now a thin shape wrapper over Badge and inherits every
 * future change to it — including whatever an admin theme sets.
 *
 * Only the pill radius is Tag's own.
 */

const TONE_BY_VARIANT: Record<
  NonNullable<TagProps["variant"]>,
  Extract<BadgeTone, "info" | "success" | "warning" | "destructive" | "neutral">
> = {
  info: "info",
  success: "success",
  warning: "warning",
  destructive: "destructive",
  default: "neutral",
};

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "info" | "success" | "warning" | "destructive" | "default";
  children: React.ReactNode;
}

export function Tag({ variant = "default", children, className, ...props }: TagProps) {
  return (
    <Badge
      tone={TONE_BY_VARIANT[variant]}
      appearance="soft"
      className={cn("rounded-full px-2 py-1", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}
