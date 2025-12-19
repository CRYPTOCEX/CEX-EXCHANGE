import { Skeleton } from "@/components/ui/skeleton";
import { GuidedMatchingPage } from "./client";

export default function GuidedMatchingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section - Show actual component but client handles its own loading */}
      <main className="container mx-auto py-12 space-y-8">
        {/* Main Content Card Skeleton */}
        <div className="border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl overflow-hidden">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 border-b border-zinc-200/50 dark:border-zinc-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className={`h-10 w-10 rounded-xl bg-blue-500/20`} />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-4 w-96 bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
              </div>
              <Skeleton className={`h-8 w-32 rounded-full bg-blue-500/20`} />
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Wizard Steps Skeleton */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-5 w-40 bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-12 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
            ))}
            <div className="flex justify-between pt-4">
              <Skeleton className="h-11 w-24 rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className={`h-11 w-32 rounded-xl bg-blue-600/30`} />
            </div>
          </div>
        </div>

        {/* Benefits Section Skeleton */}
        <div className="space-y-8 py-6">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-64 mx-auto bg-zinc-200/50 dark:bg-zinc-700/50" />
            <Skeleton className="h-5 w-full max-w-2xl mx-auto bg-zinc-200/50 dark:bg-zinc-700/50" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl p-6 dark:bg-zinc-900/50"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <Skeleton className={`w-16 h-16 rounded-2xl bg-blue-500/20`} />
                  <Skeleton className="h-6 w-48 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-4 w-5/6 bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
