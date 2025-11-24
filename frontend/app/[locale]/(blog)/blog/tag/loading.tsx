import { Skeleton } from "@/components/ui/skeleton";

export default function TagsLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <Skeleton className="h-12 w-1/3 mx-auto mb-4" />
        <Skeleton className="h-6 w-1/4 mx-auto" />
      </div>

      <div className="space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
