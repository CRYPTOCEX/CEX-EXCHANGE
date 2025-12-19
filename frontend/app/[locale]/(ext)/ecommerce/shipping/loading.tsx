import { Loader2, Truck, Package } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ShippingLoading() {
  const t = useTranslations("ext_ecommerce");
  return (
    <div className={`bg-linear-to-b from-amber-50/30 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen pb-12 pt-24`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container">
        {/* Premium Hero Section Skeleton */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 mb-6`}>
            <Truck className={`h-4 w-4 text-amber-600 dark:text-amber-400`} />
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="h-14 w-96 bg-gradient-to-r from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 rounded-lg animate-pulse mx-auto mb-4" />
          <div className="h-6 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mx-auto mb-4" />
          <div className="flex items-center justify-center">
            <Package className="h-4 w-4 text-zinc-400 mr-1" />
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Shipping Cards Skeleton */}
        <div className="mt-8 space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-amber-500/10 rounded-3xl overflow-hidden shadow-2xl`}
            >
              {/* Header */}
              <div className={`bg-linear-to-r from-amber-500/5 to-emerald-500/5 px-6 py-4 border-b border-amber-500/10 dark:border-zinc-700`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Products skeleton */}
                <div className="mb-6">
                  <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-3" />
                  <div className="space-y-3">
                    {[1, 2].map((j) => (
                      <div key={j} className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse" />
                          <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Details Grid Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-zinc-700/50 p-4 rounded-md">
                    <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-3" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((k) => (
                        <div key={k} className="flex justify-between">
                          <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                          <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-700/50 p-4 rounded-md">
                    <div className="h-5 w-40 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-3" />
                    <div className="space-y-2">
                      {[1, 2, 3].map((k) => (
                        <div key={k} className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className={`h-12 w-12 animate-spin text-amber-600 dark:text-amber-400 mb-4`} />
          <p className="text-gray-600 dark:text-zinc-400 text-lg">{t("loading_shipping_information_ellipsis")}</p>
        </div>
      </div>
    </div>
  );
}
