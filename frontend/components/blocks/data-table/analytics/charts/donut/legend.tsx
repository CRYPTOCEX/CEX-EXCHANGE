import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChartData } from "./types";
import { getColor } from "./utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LegendProps {
  data: ChartData[];
  total: number;
  activeSegment: string | null;
  setActiveSegment: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  isFirstLoad: boolean;
}
function LegendImpl({
  data,
  total,
  activeSegment,
  setActiveSegment,
  loading,
  isFirstLoad,
}: LegendProps) {
  return (
    <div className="grid grid-cols-2 w-full mt-auto">
      {data.map((entry: ChartData) => {
        const percentage = ((entry.value / total) * 100).toFixed(1);
        const isActive = activeSegment === entry.id;
        return (
          <div
            key={entry.id}
            className={cn(
              "flex cursor-pointer items-center gap-2 p-2 rounded-lg transition-all duration-200 text-xs",
              isActive ? "bg-muted/50" : "hover:bg-muted/20"
            )}
            onMouseEnter={() => setActiveSegment(entry.id)}
            onMouseLeave={() => setActiveSegment(null)}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{
                backgroundColor: getColor(entry.color),
              }}
            />
            <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
              <span className="tracking-tight truncate">{entry.name}</span>
              <div className="flex items-center gap-1 whitespace-nowrap">
                {loading && !isFirstLoad ? (
                  <>
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-12" />
                  </>
                ) : (
                  <>
                    <span className="font-mono">
                      {entry.value.toLocaleString()}
                    </span>
                    <span className="hidden sm:inline text-muted-foreground">
                      ({percentage}%)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export const Legend = React.memo(LegendImpl);
