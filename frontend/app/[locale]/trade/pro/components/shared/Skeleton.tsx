"use client";

import React from "react";
import { cn } from "../../utils/cn";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn("tp-skeleton rounded", className)}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
    />
  );
}

export function PanelSkeleton() {
  return (
    <div className="h-full w-full bg-[var(--tp-bg-secondary)] animate-pulse" />
  );
}

export function HeaderSkeleton() {
  return (
    <div className="h-12 w-full bg-[var(--tp-bg-tertiary)] animate-pulse" />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
