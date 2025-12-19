import { Loader2, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function OrderDetailLoading() {
  const t = useTranslations("ext_ecommerce");
  return (
    <div className="container mx-auto px-4 pt-20 pb-8">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <div className="flex items-center mb-2">
            <ArrowLeft className="mr-2 h-4 w-4 text-zinc-400" />
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="h-9 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2">
          {/* Tabs skeleton */}
          <div className="flex gap-2 mb-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            ))}
          </div>

          {/* Content Card Skeleton */}
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-6" />

            {/* Items skeleton */}
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
                      <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
                    </div>
                    <div className="flex justify-between">
                      <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                      <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="my-6 border-t border-zinc-200 dark:border-zinc-700" />

            {/* Totals skeleton */}
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-6" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className={`h-12 w-12 animate-spin text-amber-600 dark:text-amber-400 mb-4`} />
        <p className="text-gray-600 dark:text-zinc-400 text-lg">{t("loading_order_details_ellipsis")}</p>
      </div>
    </div>
  );
}
