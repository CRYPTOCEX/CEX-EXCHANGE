import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CompoundCellSkeleton } from "./compound-cell";

interface CellSkeletonProps {
  column: ColumnDefinition;
  width: number;
}

export function CellSkeleton({ column, width }: CellSkeletonProps) {
  // Determine the skeleton width based on the column type and provided width
  const getSkeletonWidth = () => {
    if (column.key === "select") return 16;
    if (column.key === "actions") return 32;
    if (column.type === "image" || column.key === "avatar") return 40;
    if (column.type === "boolean" || column.key === "emailVerified") return 64;
    if (column.render?.type === "badge" || column.key === "status") return 96;
    if (column.type === "date") return 140;
    return width;
  };

  const skeletonWidth = getSkeletonWidth();

  if (column.key === "select") {
    return <Skeleton className="h-5 w-5 rounded" />;
  }

  if (column.key === "actions") {
    return <Skeleton className="h-8 w-8 rounded-md" />;
  }

  if (column.type === "image" || column.key === "avatar") {
    return <Skeleton className="w-10 h-10 rounded-full" />;
  }

  if (column.type === "boolean" || column.key === "emailVerified") {
    return (
      <div className="flex items-center">
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    );
  }

  if (column.type === "date") {
    return <Skeleton className="h-5" style={{ width: `${skeletonWidth}px` }} />;
  }

  if (column.render?.type === "badge" || column.key === "status") {
    return <Skeleton className="h-6 w-24 rounded-full" />;
  }

  if (column.render?.type === "compound") {
    // If you have a skeleton for compound cells:
    return <CompoundCellSkeleton config={column.render.config} />;
  }

  if (column.type === "tags" || column.key === "tags") {
    return (
      <div className="flex items-center gap-1 overflow-hidden">
        {[1, 2, 3].map((_, i: number) => (
          <Skeleton
            key={i}
            className="h-6 rounded-full"
            style={{ width: `${skeletonWidth / 4}px` }}
          />
        ))}
      </div>
    );
  }

  // Default text skeleton with dynamic width
  if (column.key === "id") {
    return <Skeleton className="h-5" style={{ width: `${skeletonWidth}px` }} />;
  }

  return <Skeleton className="h-5" style={{ width: `${skeletonWidth}px` }} />;
}
