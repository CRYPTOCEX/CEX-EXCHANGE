import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CronLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Health indicator skeleton */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-2 w-24 rounded-full" />
              </div>
            </div>
          </div>

          {/* Timeline skeleton */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>
                <Skeleton className="h-6 w-24" />
              </CardTitle>
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex">
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between mb-4">
                <CardTitle>
                  <Skeleton className="h-6 w-24" />
                </CardTitle>
                <Skeleton className="h-9 w-48 rounded-md" />
              </div>

              {/* Status tabs skeleton */}
              <div className="h-12 bg-muted/80 rounded-md p-1 grid grid-cols-5 gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-md animate-pulse" />
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Tabs skeleton */}
              <div className="mb-4">
                <div className="flex gap-2 mb-2">
                  <Skeleton className="h-8 w-24 rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              </div>

              {/* Grid view skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="border-l-4 border-l-gray-300">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-full mt-2" />
                      <Skeleton className="h-4 w-3/4 mt-1" />
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <div className="flex items-center">
                          <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <div className="flex items-center">
                          <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
