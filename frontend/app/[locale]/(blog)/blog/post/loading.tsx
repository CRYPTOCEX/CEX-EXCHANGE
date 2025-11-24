import { Skeleton } from "@/components/ui/skeleton";

export default function AllArticlesLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-6 w-32 mb-4" /> {/* Back link */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Skeleton className="h-10 w-48" /> {/* Title */}
          <Skeleton className="h-6 w-40" /> {/* Post count */}
        </div>
      </div>

      {/* Search and filters skeleton */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <Skeleton className="h-12 w-full lg:w-1/3" /> {/* Search input */}
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-12 w-40" /> {/* Filter button */}
            <Skeleton className="h-12 w-40" /> {/* Category filter */}
            <Skeleton className="h-12 w-40" /> {/* Tag filter */}
            <Skeleton className="h-12 w-40" /> {/* Sort order */}
            <Skeleton className="h-12 w-24" /> {/* View mode */}
          </div>
        </div>
      </div>

      {/* Posts grid skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[350px] w-full rounded-xl" />
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="mt-8 flex justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
    </div>
  );
}
