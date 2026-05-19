import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function ActiveOffersLoading() {
  return (
    <div className="w-full space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="w-full overflow-hidden border-0 shadow-md">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/3 bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 flex flex-col justify-between relative">
              {/* Badge in top-right corner */}
              <div className="absolute top-4 right-4">
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>

              {/* Left side with icon and name */}
              <div className="flex items-center gap-4 mt-4">
                <div className="bg-primary/10 p-1 rounded-full">
                  <Skeleton className="h-16 w-16 rounded-full" />
                </div>
                <div>
                  <Skeleton className="h-8 w-32 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>

              {/* Price info */}
              <div className="mt-4">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            <div className="md:w-2/3 p-6">
              <div className="space-y-4">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full mb-1" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <Skeleton className="h-3 w-24 mb-2" />
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <Skeleton className="h-3 w-24 mb-2" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <Skeleton className="h-3 w-24 mb-2" />
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <Skeleton className="h-3 w-24 mb-2" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>

                {/* Description */}
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />

                {/* Button */}
                <div className="pt-2">
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
