import { Skeleton } from "@/components/ui/skeleton";

export default function PostsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-indigo-50/30 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Header with gradient background */}
          <Skeleton className="h-48 w-full rounded-2xl" />

          {/* Filters and controls */}
          <Skeleton className="h-16 w-full rounded-xl" />

          {/* Posts grid view */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[350px] w-full rounded-xl" />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center">
            <Skeleton className="h-10 w-64" />
          </div>
        </div>
      </div>
    </div>
  );
}
