import { Skeleton } from "@/components/ui/skeleton";

export default function GatewayDashboardLoading() {
  return (
    <div className="space-y-6 pt-20">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
