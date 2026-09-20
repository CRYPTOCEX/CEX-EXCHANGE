"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { evalCondition } from "./utils";
import type { ViewStatConfig } from "../types/table";

interface DetailStatsProps {
  stats: ViewStatConfig[];
  row: any;
}

/** Ink tones, resolved from semantic tokens so a retheme moves them. */
const TONE_INK: Record<NonNullable<ViewStatConfig["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
  primary: "text-primary",
};

/**
 * The headline strip under the dialog header — the two or three figures that
 * answer "what is this record" before any field is read (an order's total, a
 * position's PnL, a user's balance).
 */
export function DetailStats({ stats, row }: DetailStatsProps) {
  const visible = stats.filter((stat) => evalCondition(stat.condition, row));
  if (!visible.length) return null;

  return (
    <div
      className={cn(
        "grid gap-2",
        visible.length === 1 && "grid-cols-1",
        visible.length === 2 && "grid-cols-2",
        visible.length === 3 && "grid-cols-3",
        visible.length >= 4 && "grid-cols-2 sm:grid-cols-4"
      )}
    >
      {visible.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={`${stat.label}-${index}`}
            /* A nested tile carries no border: inside a card that already has
               one, a second hairline reads as a table cell rather than a
               grouped figure. Same rule the shared MetricTile follows. */
            className="rounded-lg bg-muted/60 p-3 min-w-0"
          >
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
              {Icon && <Icon className="h-3 w-3" />}
              <span className="truncate">{stat.label}</span>
            </p>
            <div
              className={cn(
                "text-base font-semibold truncate",
                TONE_INK[stat.tone ?? "default"]
              )}
            >
              {stat.value(row)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
