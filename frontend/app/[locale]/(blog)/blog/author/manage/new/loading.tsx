import { Skeleton } from "@/components/ui/skeleton";

export default function NewPostLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-10 w-64 mb-8" /> {/* Title */}
      <div className="space-y-6">
        <Skeleton className="h-12 w-full mb-6" /> {/* Title input */}
        <Skeleton className="h-32 w-full mb-6" /> {/* Description textarea */}
        <Skeleton className="h-64 w-full mb-6" /> {/* Content editor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-12 w-full" /> {/* Category select */}
          <Skeleton className="h-12 w-full" /> {/* Status select */}
        </div>
        <Skeleton className="h-64 w-full" /> {/* Featured image */}
        <div className="flex justify-between pt-4 border-t">
          <Skeleton className="h-10 w-32" /> {/* Back button */}
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" /> {/* Preview button */}
            <Skeleton className="h-10 w-32" /> {/* Save button */}
          </div>
        </div>
      </div>
    </div>
  );
}
