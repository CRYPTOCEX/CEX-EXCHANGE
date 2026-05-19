import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PositionsLoading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Header Skeleton */}
      <div className="relative overflow-hidden border-b border-violet-200/50 dark:border-violet-800/50 pt-28 pb-12">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="container mx-auto relative">
          <div className="space-y-4">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-10 w-56 rounded-lg" />
            <Skeleton className="h-5 w-72 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 space-y-8">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <Skeleton className="w-12 h-12 rounded-xl mb-3" />
                <Skeleton className="h-5 w-28 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-32 rounded-lg mb-2" />
                <Skeleton className="h-4 w-40 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs and Filters Skeleton */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Skeleton className="h-12 w-80 rounded-xl" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-40 rounded-xl" />
            </div>
          </div>

          {/* Position Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-24 rounded-lg" />
                        <Skeleton className="h-4 w-16 rounded-lg" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Amount section */}
                  <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-700/30">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20 rounded-lg" />
                      <Skeleton className="h-7 w-24 rounded-lg" />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <Skeleton className="h-3 w-16 rounded-lg mb-2" />
                      <Skeleton className="h-5 w-20 rounded-lg" />
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <Skeleton className="h-3 w-16 rounded-lg mb-2" />
                      <Skeleton className="h-5 w-20 rounded-lg" />
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-20 rounded-lg" />
                      <Skeleton className="h-3 w-12 rounded-lg" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
