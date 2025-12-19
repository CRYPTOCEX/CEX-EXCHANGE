import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-20 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* System Status Banner Skeleton */}
      <div className="p-4 rounded-lg border border-border bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-muted rounded-lg">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>

        {/* Tab Content Skeleton */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-10 w-full rounded-md" />
                <Skeleton className="h-4 w-64" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
