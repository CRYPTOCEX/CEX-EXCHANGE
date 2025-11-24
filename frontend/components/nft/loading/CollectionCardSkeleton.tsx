"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionCardSkeleton() {
  return (
    <div className="w-80 bg-card border border-border rounded-2xl overflow-hidden">
      {/* Banner Skeleton */}
      <Skeleton className="h-32 w-full" />

      {/* Logo Overlap */}
      <div className="px-6 -mt-10">
        <Skeleton className="w-20 h-20 rounded-xl" />
      </div>

      {/* Content Skeleton */}
      <div className="p-6 pt-4 space-y-4">
        {/* Name */}
        <Skeleton className="h-6 w-32" />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>

        {/* 24h Change */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}
