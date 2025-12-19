import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "./components/dashboard-header";

export default function TradesLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section - Show actual hero */}
      <DashboardHeader />

      {/* Main Content Skeleton */}
      <main className="container mx-auto py-12 space-y-12">
        {/* Data Table Skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
            <Skeleton className="h-10 w-48 rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
          </div>
          <div className="border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl overflow-hidden">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-200/50 dark:border-zinc-700/50">
              <div className="grid grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                ))}
              </div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 border-b border-zinc-200/50 dark:border-zinc-700/50 last:border-b-0">
                <div className="grid grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <Skeleton key={j} className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section Skeleton */}
        <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-2xl p-8 border border-zinc-200/50 dark:border-zinc-700/50">
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-64 mx-auto bg-zinc-200/50 dark:bg-zinc-700/50" />
            <Skeleton className="h-5 w-full max-w-lg mx-auto bg-zinc-200/50 dark:bg-zinc-700/50" />
            <Skeleton className="h-11 w-40 mx-auto rounded-xl bg-primary/30 dark:bg-primary/20" />
          </div>
        </div>
      </main>
    </div>
  );
}
