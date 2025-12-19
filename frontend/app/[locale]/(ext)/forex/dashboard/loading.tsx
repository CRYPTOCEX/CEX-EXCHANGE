import { Loader2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function DashboardLoading() {
  const t = useTranslations("ext");
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Decorative background glows */}
      <div
        className={`absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none`}
      />
      <div
        className={`absolute top-1/2 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none`}
      />

      {/* Premium Hero Header Skeleton */}
      <div className="relative pt-24 pb-8">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4 flex-1">
              {/* Badge skeleton */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600/10 border border-emerald-600/20`}
              >
                <Sparkles
                  className={`h-3.5 w-3.5 text-emerald-600`}
                />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* Title skeleton */}
              <Skeleton className="h-12 w-80" />
              <Skeleton className="h-5 w-96" />
            </div>

            {/* Action buttons skeleton */}
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-12 w-48" />
            </div>
          </div>
        </div>
      </div>

      <main className="pb-24">
        <div className="container mx-auto py-8">
          <div className="space-y-8">
            {/* Welcome Card Skeleton */}
            <div
              className={`relative overflow-hidden rounded-2xl bg-linear-to-r from-emerald-600/20 via-teal-500/20 to-emerald-700/20 p-8 border border-emerald-600/20`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-6 w-full max-w-lg" />
                </div>
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="w-12 h-12 rounded-xl" />
                  </div>
                  <Skeleton className="h-8 w-28 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>

            {/* MT5 Accounts Section Skeleton */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-32" />
                          <Skeleton className="h-4 w-24 rounded-full" />
                        </div>
                        <Skeleton className="w-10 h-10 rounded-full" />
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-6 w-24" />
                        </div>
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-10 rounded-lg" />
                        <Skeleton className="h-10 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Loading indicator */}
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2
          className={`h-12 w-12 animate-spin text-emerald-600 dark:text-emerald-400 mb-4`}
        />
        <p className="text-gray-600 dark:text-zinc-400 text-lg">
          {t("loading_dashboard_ellipsis")}
        </p>
      </div>
    </div>
  );
}
