import { Skeleton } from "@/components/ui/skeleton";

export default function PayoutsLoading() {
  return (
    <div className="space-y-6 container pt-24 pb-12">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
