"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { timeframes } from "./timeframe-options";
import { TimeframeButton } from "./timeframe-button";

interface TimeframeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");

  return (
    <div className="w-full sm:w-auto">
      <div
        className={cn(
          "rounded-lg bg-muted p-1",
          "grid grid-cols-6 sm:grid-cols-none sm:flex gap-1"
        )}
      >
        {timeframes.map((timeframe) => (
          <TimeframeButton
            key={timeframe.value}
            timeframe={timeframe}
            isActive={value === timeframe.value}
            isDesktop={isDesktop}
            onClick={() => onChange(timeframe.value)}
          />
        ))}
      </div>
    </div>
  );
}
