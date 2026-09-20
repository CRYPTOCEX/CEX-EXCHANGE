import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PoolDetailLoading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Header Skeleton */}
      <div className="relative overflow-hidden border-b border-zinc-200/50 dark:border-zinc-700/50 pt-28 pb-12">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="container mx-auto relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-40 rounded-lg" />
                  <Skeleton className="h-5 w-24 rounded-lg" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center px-6 py-3 rounded-xl bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50">
                <Skeleton className="h-8 w-16 mx-auto rounded-lg mb-1" />
                <Skeleton className="h-4 w-12 mx-auto rounded-lg" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs skeleton */}
            <Skeleton className="h-12 w-full max-w-md rounded-xl" />

            {/* Pool Details Card */}
            <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-32 rounded-lg mb-2" />
                <Skeleton className="h-4 w-48 rounded-lg" />
              </CardHeader>
              <CardContent>
                {/* Stats grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <Skeleton className="h-4 w-20 rounded-lg mb-2" />
                      <Skeleton className="h-8 w-24 rounded-lg" />
                    </div>
                  ))}
                </div>

                {/* Details list */}
                <div className="border-t border-zinc-200/50 dark:border-zinc-700/50 pt-6 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-28 rounded-lg" />
                      <Skeleton className="h-4 w-20 rounded-lg" />
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="border-t border-zinc-200/50 dark:border-zinc-700/50 pt-6 mt-6 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24 rounded-lg" />
                    <Skeleton className="h-4 w-16 rounded-lg" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
              </CardContent>
            </Card>

            {/* Description Card */}
            <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-28 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded-lg" />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Stake Form */}
          <div>
            <div className="sticky top-24">
              <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <Skeleton className="h-6 w-24 rounded-lg" />
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Amount input */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20 rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24 rounded-lg" />
                      <Skeleton className="h-3 w-16 rounded-lg" />
                    </div>
                  </div>

                  {/* Duration selector */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28 rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>

                  {/* Estimated rewards */}
                  <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-700/30 space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-32 rounded-lg" />
                      <Skeleton className="h-5 w-20 rounded-lg" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-28 rounded-lg" />
                      <Skeleton className="h-5 w-16 rounded-lg" />
                    </div>
                  </div>

                  {/* Stake button */}
                  <Skeleton className="h-12 w-full rounded-xl" />

                  {/* Info text */}
                  <Skeleton className="h-3 w-full rounded-lg" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
