import { Skeleton } from "@/components/ui/skeleton";

export default function AuthorGuidelinesLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
        <Skeleton className="h-6 w-1/2 mx-auto" />
      </div>

      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    </div>
  );
}
