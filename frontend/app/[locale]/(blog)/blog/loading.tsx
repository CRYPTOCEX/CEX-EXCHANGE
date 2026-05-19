import { Skeleton } from "@/components/ui/skeleton";

export default function BlogLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero section skeleton */}
      <div className="mb-12">
        <Skeleton className="h-[600px] w-full rounded-xl mb-4" />
        <Skeleton className="h-10 w-2/3 mb-2" />
        <Skeleton className="h-6 w-1/2" />
      </div>

      {/* Stats section skeleton */}
      <div className="mb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Categories section skeleton */}
      <div className="mb-20">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>

      {/* Featured posts section skeleton */}
      <div className="mb-20">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
