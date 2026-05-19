import { Star } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface SkeletonMarketsProps {
  count?: number;
}

export function SkeletonMarkets({ count = 10 }: SkeletonMarketsProps) {
  return (
    <>
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            key={`skeleton-${index}`}
            className="flex items-center justify-between py-1.5 px-2 border-b border-zinc-200/70 dark:border-zinc-900"
          >
            <div className="flex items-center">
              <div className="mr-2 h-3 w-3 opacity-30">
                <Star className="h-3 w-3 text-muted-foreground/40 dark:text-zinc-600" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center h-4">
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <div className="h-3 mt-0.5">
                  <Skeleton className="h-2.5 w-12" />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="h-4">
                <Skeleton className="h-3.5 w-14" />
              </div>
              <div className="h-3 mt-0.5">
                <Skeleton className="h-2.5 w-10" />
              </div>
            </div>
          </div>
        ))}
    </>
  );
}
