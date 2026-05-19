import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CompoundConfig } from "../../../types/table";
import { cn } from "@/lib/utils";

interface CompoundCellSkeletonProps {
  config: CompoundConfig;
}

// Skeleton styles with animation
const skeletonClass = "animate-pulse";

export function CompoundCellSkeleton({ config }: CompoundCellSkeletonProps) {
  const hasMetadata = config.metadata && config.metadata.length > 0;
  const isGateway = config.image?.size === "gateway";

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      {config.image && (
        <div className="shrink-0">
          {isGateway ? (
            <Skeleton className={cn("w-30 h-18 rounded", skeletonClass)} />
          ) : (
            <div className="min-w-12 min-h-12">
              <Skeleton className={cn("h-12 w-12 rounded-full", skeletonClass)} />
            </div>
          )}
        </div>
      )}
      <div className="flex-1">
        {/* Primary info - matches font-medium style with proper line height */}
        <div className="flex items-center gap-1 h-6">
          {config.primary?.icon && <Skeleton className={cn("h-4 w-4 rounded", skeletonClass)} />}
          <Skeleton className={cn("h-4 w-32 rounded", skeletonClass)} />
        </div>

        {/* Secondary info - matches text-sm text-muted style with proper line height */}
        {config.secondary && (
          <div className="flex items-center gap-1 h-5">
            {config.secondary.icon && <Skeleton className={cn("h-3.5 w-3.5 rounded", skeletonClass)} />}
            <Skeleton className={cn("h-3.5 w-40 rounded", skeletonClass)} />
          </div>
        )}

        {/* Metadata - single row matching actual layout with proper line height */}
        {hasMetadata && (
          <div className="flex items-center gap-2 mt-1 h-4">
            {config.metadata?.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-center gap-1",
                  index > 0 && "border-l border-border/50 pl-2"
                )}
              >
                {item.icon && <Skeleton className={cn("h-3 w-3 rounded", skeletonClass)} />}
                <Skeleton className={cn("h-3 w-16 rounded", skeletonClass)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
