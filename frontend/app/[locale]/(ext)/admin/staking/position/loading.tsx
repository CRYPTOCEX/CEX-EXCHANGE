import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function StakingPositionsLoading() {
  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <Skeleton className="h-10 w-full" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center p-4 border-b">
            <div className="w-1/2 font-medium">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="w-1/6 font-medium text-right">
              <Skeleton className="h-5 w-16 ml-auto" />
            </div>
            <div className="w-1/6 font-medium text-right">
              <Skeleton className="h-5 w-16 ml-auto" />
            </div>
            <div className="w-1/6 font-medium text-right">
              <Skeleton className="h-5 w-16 ml-auto" />
            </div>
          </div>

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center p-4 border-b last:border-b-0"
            >
              <div className="w-1/2 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-40 mt-1" />
                </div>
              </div>
              <div className="w-1/6 text-right">
                <Skeleton className="h-5 w-16 ml-auto" />
              </div>
              <div className="w-1/6 text-right">
                <Skeleton className="h-5 w-16 ml-auto" />
              </div>
              <div className="w-1/6 text-right">
                <Skeleton className="h-6 w-20 ml-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
