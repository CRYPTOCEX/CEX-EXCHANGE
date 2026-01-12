import { Skeleton } from "@/components/ui/skeleton";

export default function AffiliateRewardsLoading() {
  return (
    <div className="container mx-auto px-4 py-6 pt-20 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-8 w-56 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>

      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
