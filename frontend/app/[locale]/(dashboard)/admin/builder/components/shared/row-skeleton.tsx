"use client";
import { cn } from "@/lib/utils";

interface RowSkeletonProps {
  columns: number[];
  className?: string;
  height?: number;
  gutter?: number;
  showContent?: boolean;
}

export default function RowSkeleton({
  columns,
  className,
  height = 40,
  gutter = 4,
  showContent = false,
}: RowSkeletonProps) {
  // Calculate total width
  const totalWidth = columns.reduce((sum, width) => sum + width, 0);

  return (
    <div
      className={cn(
        "w-full bg-zinc-50 dark:bg-zinc-900 rounded-md overflow-hidden flex",
        className
      )}
      style={{ height: `${height}px` }}
    >
      {columns.map((width, index) => {
        const percentage = (width / totalWidth) * 100;

        return (
          <div
            key={index}
            className="h-full relative"
            style={{
              width: `${percentage}%`,
              paddingLeft: index > 0 ? `${gutter / 2}px` : 0,
              paddingRight: index < columns.length - 1 ? `${gutter / 2}px` : 0,
            }}
          >
            <div className="bg-white dark:bg-zinc-800 h-full w-full rounded-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm">
              {showContent && (
                <div className="flex flex-col items-center justify-center space-y-1 p-1 w-full">
                  {/* Header line */}
                  <div className="w-3/4 h-1 bg-zinc-200 dark:bg-zinc-600 rounded-full"></div>

                  {/* Content lines */}
                  <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-600 rounded-full"></div>
                  <div className="w-5/6 h-1 bg-zinc-200 dark:bg-zinc-600 rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
