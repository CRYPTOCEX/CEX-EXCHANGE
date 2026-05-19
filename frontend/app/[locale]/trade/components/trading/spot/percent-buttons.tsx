"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PercentButtonsProps {
  percentSelected: number | null;
  onPercentClick: (percent: number) => void;
}

export default function PercentButtons({
  percentSelected,
  onPercentClick,
}: PercentButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {[25, 50, 75, 100].map((percent) => (
        <Button
          key={percent}
          variant="outline"
          size="sm"
          className={cn(
            "h-6 text-xs rounded-sm border-input dark:border-zinc-700 bg-muted dark:bg-zinc-800 hover:bg-muted/80 dark:hover:bg-zinc-700",
            percentSelected === percent &&
              "bg-muted/80 dark:bg-zinc-700 border-primary/30 dark:border-zinc-600 ring-1 ring-primary/30 dark:ring-emerald-500/30"
          )}
          onClick={() => onPercentClick(percent)}
        >
          {percent}%
        </Button>
      ))}
    </div>
  );
}
