import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const KpiCardSkeleton: React.FC = () => {
  return (
    <Card className="bg-background relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold tracking-tight">
            <Skeleton className="h-6 w-32 animate-pulse" />
          </h3>
          <Skeleton className="h-5 w-5 rounded animate-pulse" />
        </div>
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="text-2xl sm:text-3xl font-bold">
            <Skeleton className="h-9 w-24 animate-pulse" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-4 w-4 animate-pulse" />
            <Skeleton className="h-5 w-12 animate-pulse" />
          </div>
        </div>
        {/* Sparkline chart */}
        <div className="absolute bottom-0 left-0 right-0">
          <Skeleton className="h-[45px] w-full rounded-none animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
};
