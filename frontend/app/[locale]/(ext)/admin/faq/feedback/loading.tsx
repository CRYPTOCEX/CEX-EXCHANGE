import { Skeleton } from "@/components/ui/skeleton";

export default function AdminFeedbackLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
