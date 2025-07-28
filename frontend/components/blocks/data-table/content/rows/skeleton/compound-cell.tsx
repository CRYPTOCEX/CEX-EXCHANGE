import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CompoundConfig } from "../../../types/table";

interface CompoundCellSkeletonProps {
  config: CompoundConfig;
}

export function CompoundCellSkeleton({ config }: CompoundCellSkeletonProps) {
  const hasMetadata = config.metadata && config.metadata.length > 0;

  return (
    <div className="flex items-center gap-3 min-w-[200px] max-w-[400px]">
      {config.image && <Skeleton className="h-10 w-10 rounded-full shrink-0" />}
      <div className="flex flex-col gap-1.5 flex-1">
        {/* Primary info */}
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          {config.secondary && <Skeleton className="h-3 w-40" />}
        </div>

        {/* Metadata */}
        {hasMetadata && (
          <div className="flex items-center gap-2 mt-0.5">
            {config.metadata?.map((_, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Skeleton className="h-3 w-[1px]" />}
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
