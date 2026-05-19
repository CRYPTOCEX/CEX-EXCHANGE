import { Skeleton } from "@/components/ui/skeleton";

export default function OfferLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section Skeleton */}
      <section className="relative pt-24 pb-16 overflow-hidden border-b border-zinc-200/50 dark:border-zinc-800/50">
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-32 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className="h-10 w-64 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className="h-5 w-48 bg-zinc-200/50 dark:bg-zinc-700/50" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-16 w-24 rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className="h-16 w-24 rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
            </div>
          </div>

          {/* Quick Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50"
              >
                <Skeleton className="h-5 w-20 mb-2 bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-7 w-full bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Skeleton */}
      <main className="container mx-auto py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Offer Details Card */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="space-y-4 mb-6">
                <Skeleton className="h-6 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-4 w-48 bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-10 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-32 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-32 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
              </div>
            </div>

            {/* Seller Information Card */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-6 w-40 mb-6 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
                    <Skeleton className="h-4 w-48 bg-zinc-200/50 dark:bg-zinc-700/50" />
                    <Skeleton className="h-5 w-24 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200/50 dark:border-zinc-700/50"
                    >
                      <Skeleton className="h-4 w-16 mb-2 bg-zinc-200/50 dark:bg-zinc-700/50" />
                      <Skeleton className="h-6 w-20 bg-zinc-200/50 dark:bg-zinc-700/50" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Trade Form Card */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="space-y-4 mb-6">
                <Skeleton className="h-6 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-4 w-48 bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-10 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16 bg-zinc-200/50 dark:bg-zinc-700/50" />
                    <Skeleton className="h-3 w-16 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-10 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>

                <Skeleton className="h-32 w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />

                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-14 w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50"
                      />
                    ))}
                  </div>
                </div>

                <Skeleton className="h-20 w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className={`h-11 w-full rounded-xl bg-blue-500/30 dark:bg-blue-500/20`} />
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
              <Skeleton className="h-5 w-24 mb-4 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-10 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
