"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function NFTCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Image Skeleton */}
      <Skeleton className="aspect-square w-full" />

      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Collection name */}
        <Skeleton className="h-3 w-24" />

        {/* NFT name */}
        <Skeleton className="h-5 w-full" />

        {/* Price & Stats */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
