import { Loader2, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CartLoading() {
  const t = useTranslations("ext_ecommerce");
  return (
    <div className={`bg-linear-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-zinc-800 min-h-screen pb-12 pt-24`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container">
        {/* Breadcrumb skeleton */}
        <nav className="pb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <div className="h-4 w-12 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
            </li>
            <li>
              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-zinc-600" />
            </li>
            <li>
              <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" />
            </li>
          </ol>
        </nav>

        {/* Title skeleton */}
        <div className="h-12 w-64 bg-linear-to-r from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 rounded-lg animate-pulse mb-8" />

        <div className="mt-8 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start xl:gap-x-16">
          {/* Cart Items Skeleton */}
          <div className="lg:col-span-7">
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700 p-6`}>
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 py-6 border-b border-gray-200 dark:border-zinc-700 last:border-0">
                    {/* Image skeleton */}
                    <div className="w-24 h-24 bg-zinc-200 dark:bg-zinc-700 rounded-md animate-pulse shrink-0" />

                    {/* Content skeleton */}
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse" />
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 animate-pulse" />
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                          <div className="w-8 h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                          <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                        </div>
                        <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons skeleton */}
              <div className="mt-6 flex justify-between">
                <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-8 w-36 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              </div>
            </div>

            {/* Trust badges skeleton */}
            <div className={`mt-8 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200 dark:border-amber-700 p-6`}>
              <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-40 animate-pulse mb-6" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary Skeleton */}
          <div className="mt-16 lg:mt-0 lg:col-span-5">
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700 px-6 py-8`}>
              <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-32 animate-pulse mb-6" />

              {/* Coupon skeleton */}
              <div className="space-y-3 mb-6">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-28 animate-pulse" />
                <div className="flex gap-2">
                  <div className="flex-1 h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="w-20 h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
              </div>

              {/* Price breakdown skeleton */}
              <div className="space-y-4 mt-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-20 animate-pulse" />
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-24 animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Payment methods skeleton */}
              <div className="mt-6">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-32 animate-pulse mb-3" />
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-10 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Checkout button skeleton */}
              <div className="mt-6">
                <div className="h-14 bg-linear-to-r from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 rounded-xl animate-pulse" />
              </div>

              {/* Secure notice skeleton */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-3 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-16 mt-8">
          <Loader2 className={`h-12 w-12 animate-spin text-amber-500 dark:text-amber-400 mb-4`} />
          <p className="text-gray-600 dark:text-zinc-400 text-lg">{t("loading_your_cart_ellipsis")}</p>
        </div>
      </div>
    </div>
  );
}
