import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CompoundCellSkeleton } from "./compound-cell";
import { cn } from "@/lib/utils";

interface CellSkeletonProps {
  column: ColumnDefinition;
  width: number;
}

// Skeleton animation class
const skeletonClass = "animate-pulse";

export function CellSkeleton({ column, width }: CellSkeletonProps) {
  // Select checkbox skeleton
  if (column.key === "select") {
    return <Skeleton className={cn("h-4 w-4 rounded", skeletonClass)} />;
  }

  // Actions button skeleton - matches the actual 3-dot button
  if (column.key === "actions") {
    return <Skeleton className={cn("h-8 w-8 rounded-lg", skeletonClass)} />;
  }

  // Image/avatar skeleton
  if (column.type === "image" || column.key === "avatar") {
    return <Skeleton className={cn("w-11 h-11 rounded-full", skeletonClass)} />;
  }

  // Boolean toggle skeleton - matches the actual Switch/toggle size
  if (column.type === "boolean" || column.key === "emailVerified" || column.type === "toggle") {
    return (
      <div className="flex items-center">
        <Skeleton className={cn("h-5 w-9 rounded-full", skeletonClass)} />
      </div>
    );
  }

  // Date skeleton
  if (column.type === "date") {
    return <Skeleton className={cn("h-4 w-20 rounded", skeletonClass)} />;
  }

  // Badge skeleton - matches actual badge size
  if (column.render?.type === "badge" || column.key === "status" || column.key === "type") {
    return <Skeleton className={cn("h-6 w-16 rounded-full", skeletonClass)} />;
  }

  // Compound cell skeleton
  if (column.render?.type === "compound") {
    return <CompoundCellSkeleton config={column.render.config} />;
  }

  // Tags skeleton
  if (column.type === "tags" || column.key === "tags") {
    return (
      <div className="flex items-center gap-1.5 overflow-hidden">
        {[1, 2].map((_, i: number) => (
          <Skeleton
            key={i}
            className={cn("h-5 rounded-full", i === 0 ? "w-14" : "w-12", skeletonClass)}
          />
        ))}
      </div>
    );
  }

  // Number/currency skeleton - shorter width
  if (column.type === "number" || column.key === "balance" || column.key === "amount") {
    return <Skeleton className={cn("h-4 w-16 rounded", skeletonClass)} />;
  }

  // Default text skeleton - reasonable width based on content type
  return <Skeleton className={cn("h-4 w-20 rounded", skeletonClass)} />;
}
