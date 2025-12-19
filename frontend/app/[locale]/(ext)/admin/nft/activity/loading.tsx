import { Loader2, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function NFTActivityLoading() {
  return (
    <div className=" relative min-h-screen">
      {/* Hero Background */}
      <div className="absolute inset-0 h-[200px] bg-gradient-to-b from-muted/50 via-muted/20 to-transparent">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)] dark:bg-grid-black/10" />
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-[1600px]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Filters */}
            <div className="lg:col-span-3 space-y-6">
              <div className="lg:sticky lg:top-[90px] space-y-4">
                <Skeleton className="h-40 rounded-lg" />
                <Skeleton className="h-40 rounded-lg" />
              </div>
            </div>

            {/* Right Content - Activity Timeline */}
            <div className="lg:col-span-9 space-y-6 w-full">
              <Skeleton className="h-12 w-full rounded-lg" />
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
