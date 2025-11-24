import { Skeleton } from "@/components/ui/skeleton";

export default function AuthorDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Skeleton className="h-6 w-32 mb-8" /> {/* Back link */}
      <div className="mb-8">
        <Skeleton className="h-64 w-full rounded-xl mb-8" />{" "}
        {/* Author profile */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" /> {/* Title */}
          <Skeleton className="h-6 w-32" /> {/* Post count */}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[350px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
