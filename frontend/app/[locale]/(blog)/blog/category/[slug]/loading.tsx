import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Skeleton className="h-6 w-32 mb-8" /> {/* Back link */}
      <div className="mb-8">
        <Skeleton className="h-12 w-1/3 mb-2" /> {/* Title */}
        <Skeleton className="h-6 w-1/2 mb-4" /> {/* Description */}
        <Skeleton className="h-5 w-40" /> {/* Post count */}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[350px] w-full rounded-xl" />
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Skeleton className="h-10 w-64" /> {/* Pagination */}
      </div>
    </div>
  );
}
