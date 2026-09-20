import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function StakingGuideLoading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <div className="container mx-auto py-20">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48 rounded-lg" />
            <Skeleton className="h-5 w-80 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 sticky top-20">
              <Skeleton className="h-6 w-32 rounded-lg mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-4 w-full rounded-lg" />
                ))}
              </div>

              {/* Help Box Skeleton */}
              <div className="mt-8 p-4 bg-violet-50 dark:bg-violet-950/30 rounded-lg border border-violet-200/30 dark:border-violet-700/30">
                <div className="flex items-start gap-2">
                  <Skeleton className="w-5 h-5 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-24 rounded-lg" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                    <Skeleton className="h-4 w-28 rounded-lg mt-2" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-3 space-y-12">
            {/* Section 1: What is Staking */}
            <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-6 w-40 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-72 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded-lg" />

                <Skeleton className="h-6 w-44 rounded-lg mt-6" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />

                <Skeleton className="h-6 w-40 rounded-lg mt-6" />
                <div className="space-y-2 pl-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-4 w-[90%] rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section 2: How to Stake */}
            <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-6 w-32 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-80 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step 1 */}
                <Skeleton className="h-6 w-56 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-10 w-44 rounded-xl mt-2" />

                {/* Step 2 */}
                <Skeleton className="h-6 w-52 rounded-lg mt-6" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <div className="space-y-2 pl-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-4 w-[85%] rounded-lg" />
                  ))}
                </div>

                {/* More steps */}
                <Skeleton className="h-6 w-48 rounded-lg mt-6" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
              </CardContent>
            </Card>

            {/* Section 3: Understanding Rewards */}
            <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-6 w-48 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-96 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-44 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <div className="space-y-2 pl-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-4 w-[80%] rounded-lg" />
                  ))}
                </div>

                {/* Formula box */}
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg mt-4">
                  <Skeleton className="h-5 w-64 rounded-lg" />
                </div>

                <Skeleton className="h-6 w-44 rounded-lg mt-6" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <div className="space-y-2 pl-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-4 w-[85%] rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Risks and Considerations */}
            <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-6 w-52 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-80 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-4">
                {["Market Volatility", "Lock Period", "Smart Contract Risks"].map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <Skeleton className="h-6 w-40 rounded-lg mt-4" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-2/3 rounded-lg" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Section 5: FAQ */}
            <Card className="border border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-6 w-64 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-56 rounded-lg" />
              </CardHeader>
              <CardContent>
                {/* Tabs */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                      <Skeleton className="h-6 w-72 rounded-lg mb-2" />
                      <Skeleton className="h-4 w-full rounded-lg" />
                      <Skeleton className="h-4 w-full rounded-lg" />
                      <Skeleton className="h-4 w-3/4 rounded-lg" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA Banner Skeleton */}
            <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-violet-600 to-indigo-600 p-8 text-center">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-700/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
              <div className="relative space-y-4">
                <Skeleton className="h-8 w-64 mx-auto rounded-lg bg-white/20" />
                <Skeleton className="h-5 w-80 mx-auto rounded-lg bg-white/20" />
                <Skeleton className="h-12 w-48 mx-auto rounded-xl bg-white/30 mt-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
