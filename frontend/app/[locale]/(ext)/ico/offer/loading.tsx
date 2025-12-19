import { Loader2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function OffersLoading() {
  const t = useTranslations("ext_ico");
  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Decorative background glows */}
      <div className={"absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"} />
      <div className={"absolute top-1/2 left-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none"} />

      {/* Hero Section Skeleton */}
      <div className="relative pt-24 pb-12">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            {/* Left content */}
            <div className="flex-1 space-y-4">
              <div className={"inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20"}>
                <Sparkles className={"h-3.5 w-3.5 text-teal-500"} />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-12 w-96" />
              <Skeleton className="h-6 w-full max-w-lg" />
            </div>

            {/* Right content */}
            <div className="space-y-6">
              {/* Stats skeleton */}
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </div>
                ))}
              </div>

              {/* Tabs skeleton */}
              <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offerings Content */}
      <div className="container mx-auto py-8">
        <div className="relative space-y-6">
          {/* Filter and Search Section Skeleton */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="flex-1 h-12 rounded-xl" />
              <Skeleton className="w-full md:w-40 h-12 rounded-xl" />
              <Skeleton className="w-full md:w-32 h-12 rounded-xl" />
            </div>
          </div>

          {/* Offerings Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
              >
                {/* Image skeleton */}
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-700 animate-pulse" />

                {/* Content skeleton */}
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>

                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>

                  {/* Progress bar skeleton */}
                  <div className="space-y-2">
                    <Skeleton className="h-2 w-full rounded-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>

                  {/* Stats grid skeleton */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>

                  {/* Button skeleton */}
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="flex justify-center items-center gap-2 pt-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-10 h-10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className={"h-12 w-12 animate-spin text-teal-600 dark:text-teal-400 mb-4"} />
        <p className="text-gray-600 dark:text-zinc-400 text-lg">{t("loading_token_offerings_ellipsis")}</p>
      </div>
    </div>
  );
}
