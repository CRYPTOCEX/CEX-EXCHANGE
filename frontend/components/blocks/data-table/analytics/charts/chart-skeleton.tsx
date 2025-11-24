import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ChartSkeleton: React.FC<{ title: string }> = ({ title }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-7 w-[300px]" />
        </CardTitle>
        <Skeleton className="h-5 w-[200px]" /> {/* Description */}
      </CardHeader>
      <CardContent>
        <div className="mt-6 h-[400px] relative">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-center gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
