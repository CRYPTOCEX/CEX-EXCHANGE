import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Header Skeleton */}
      <div className="relative overflow-hidden border-b border-zinc-200/50 dark:border-zinc-700/50 pt-28 pb-12">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="container mx-auto relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-10 w-64 rounded-lg" />
              <Skeleton className="h-5 w-80 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-36 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8">
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <Skeleton className="w-12 h-12 rounded-xl mb-3" />
                <Skeleton className="h-5 w-28 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-24 rounded-lg mb-2" />
                <Skeleton className="h-4 w-36 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="mt-6">
          <Skeleton className="h-12 w-full max-w-md rounded-xl mb-8" />

          {/* Position Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-2xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-28 rounded-lg" />
                      <Skeleton className="h-4 w-16 rounded-lg" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20 rounded-lg" />
                      <Skeleton className="h-7 w-16 rounded-lg" />
                    </div>
                  </div>
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
                  <Skeleton className="h-11 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
