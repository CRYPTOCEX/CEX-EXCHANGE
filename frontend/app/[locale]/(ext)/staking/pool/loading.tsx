import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function PoolListLoading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Header Skeleton */}
      <div className="relative overflow-hidden border-b border-zinc-200/50 dark:border-zinc-700/50 pt-28 pb-12">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="container mx-auto relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-10 w-48 rounded-lg" />
              <Skeleton className="h-5 w-72 rounded-lg" />
            </div>
            <div className="text-center px-6 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-8 w-12 mx-auto rounded-lg mb-1" />
              <Skeleton className="h-4 w-20 mx-auto rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section Skeleton */}
      <div className="container mx-auto py-8">
        <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Quick filters skeleton */}
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-24 rounded-xl" />
              ))}
            </div>

            {/* Search and sort skeleton */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Skeleton className="h-11 w-56 rounded-xl" />
              <Skeleton className="h-11 w-44 rounded-xl" />
              <Skeleton className="h-11 w-20 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Results count skeleton */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-5 w-32 rounded-lg" />
        </div>

        {/* Pool Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border border-zinc-200/80 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-28 rounded-lg" />
                    <Skeleton className="h-4 w-16 rounded-lg" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* APR box skeleton */}
                <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-700/30">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24 rounded-lg" />
                    <Skeleton className="h-7 w-16 rounded-lg" />
                  </div>
                </div>

                {/* Details grid skeleton */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                    <Skeleton className="h-3 w-16 rounded-lg mb-2" />
                    <Skeleton className="h-5 w-20 rounded-lg" />
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
                    <Skeleton className="h-3 w-16 rounded-lg mb-2" />
                    <Skeleton className="h-5 w-20 rounded-lg" />
                  </div>
                </div>

                {/* Pool capacity skeleton */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20 rounded-lg" />
                    <Skeleton className="h-4 w-28 rounded-lg" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 rounded-lg" />
                    <Skeleton className="h-3 w-24 rounded-lg" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Skeleton className="h-11 w-full rounded-xl" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
