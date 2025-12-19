import { Loader2, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CheckoutLoading() {
  const t = useTranslations("ext_ecommerce");
  return (
    <div className="bg-white dark:bg-zinc-900 dark:text-zinc-100 pt-20">
      <div className="container px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4 text-zinc-400" />
            <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          {/* Forms Skeleton */}
          <div className="lg:col-span-7">
            <div className="space-y-6">
              {/* Tabs skeleton */}
              <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                <div className="flex-1 h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="flex-1 h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              </div>

              {/* Form content skeleton */}
              <div className="space-y-4">
                <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Skeleton */}
          <div className="mt-16 lg:mt-0 lg:col-span-5">
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg px-4 py-6 sm:p-6 lg:p-8">
              <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-6" />

              {/* Items skeleton */}
              <div className="space-y-4 mb-6">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals skeleton */}
              <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Button skeleton */}
              <div className="mt-6">
                <div className="h-12 bg-linear-to-r from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 rounded-md animate-pulse" />
              </div>

              {/* Security notice skeleton */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className={`h-12 w-12 animate-spin text-amber-600 dark:text-amber-400 mb-4`} />
          <p className="text-gray-600 dark:text-zinc-400 text-lg">{t("loading_checkout_ellipsis")}</p>
        </div>
      </div>
    </div>
  );
}
