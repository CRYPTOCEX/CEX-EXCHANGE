import { Skeleton } from "@/components/ui/skeleton";

export default function CreateOfferLoading() {
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
          <div className="space-y-4">
            <Skeleton className="h-6 w-20 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50" />
            <Skeleton className="h-10 w-64 bg-zinc-200/50 dark:bg-zinc-700/50" />
            <Skeleton className="h-5 w-96 bg-zinc-200/50 dark:bg-zinc-700/50" />
          </div>
        </div>
      </section>

      {/* Main Content Skeleton */}
      <main className="container mx-auto py-12">
        <div className="max-w-4xl mx-auto">
          {/* Form Card */}
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-8 border border-zinc-200/50 dark:border-zinc-700/50">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                  {i < 4 && <Skeleton className="h-1 w-16 bg-zinc-200/50 dark:bg-zinc-700/50" />}
                </div>
              ))}
            </div>

            {/* Offer Type Section */}
            <div className="space-y-4 mb-8">
              <Skeleton className="h-6 w-40 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className="h-4 w-64 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="flex gap-4">
                <Skeleton className="h-14 flex-1 rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-14 flex-1 rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
            </div>

            {/* Currency Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28 bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-12 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-12 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
            </div>

            {/* Price Settings */}
            <div className="space-y-4 mb-8">
              <Skeleton className="h-6 w-36 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-12 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-12 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
              </div>
            </div>

            {/* Amount Limits */}
            <div className="space-y-4 mb-8">
              <Skeleton className="h-6 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-12 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-12 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4 mb-8">
              <Skeleton className="h-6 w-40 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className="h-4 w-56 bg-zinc-200/50 dark:bg-zinc-700/50" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-12 w-32 rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
              <Skeleton className={`h-12 flex-1 rounded-xl bg-blue-500/30 dark:bg-blue-500/20`} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
