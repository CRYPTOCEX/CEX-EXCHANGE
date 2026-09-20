import { Skeleton } from "@/components/ui/skeleton";

export function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section Skeleton */}
      <section className="relative pt-24 pb-12 overflow-hidden border-b border-zinc-200/50 dark:border-zinc-800/50">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ backgroundColor: "#3b82f6" }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-15"
            style={{ backgroundColor: "#8b5cf6" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl opacity-10"
            style={{ backgroundColor: "#6366f1" }}
          />
        </div>

        <div className="container mx-auto relative z-10">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64 bg-zinc-200/50 dark:bg-zinc-700/50" />
            <Skeleton className="h-5 w-80 bg-zinc-200/50 dark:bg-zinc-700/50" />
          </div>
        </div>
      </section>

      {/* Main Content Skeleton */}
      <main className="container mx-auto py-12 space-y-6">
        {/* Trade Status Card */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className="h-5 w-32 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-4 w-16 mb-2 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className="h-6 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
            </div>
            <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-4 w-16 mb-2 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className="h-6 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
            </div>
            <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-4 w-16 mb-2 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className="h-6 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
            </div>
          </div>
        </div>

        {/* Trade Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Trade Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-6 w-40 mb-6 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-zinc-200/50 dark:border-zinc-700/50 last:border-0">
                    <Skeleton className="h-4 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
                    <Skeleton className="h-4 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Section */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-6 w-32 mb-6 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="space-y-4 mb-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'} rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50`} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-12 flex-1 rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-12 w-12 rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
            </div>
          </div>

          {/* Right Column - Counterparty & Actions */}
          <div className="space-y-6">
            {/* Counterparty Card */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-5 w-28 mb-4 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-4 w-16 bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-200/50 dark:border-zinc-700/50">
                    <Skeleton className="h-3 w-12 mb-1 bg-zinc-200/50 dark:bg-zinc-700/50" />
                    <Skeleton className="h-5 w-16 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-5 w-20 mb-4 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="space-y-3">
                <Skeleton className="h-11 w-full rounded-xl bg-primary/30 dark:bg-primary/20" />
                <Skeleton className="h-11 w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-11 w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Loading;
