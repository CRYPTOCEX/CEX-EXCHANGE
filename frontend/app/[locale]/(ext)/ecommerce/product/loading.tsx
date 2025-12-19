import { Loader2, ShoppingBag, Search, Filter, Grid3X3 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProductsLoading() {
  const t = useTranslations("ext_ecommerce");
  return (
    <div className={`bg-linear-to-b from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-800 min-h-screen pb-12 pt-24`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container mx-auto space-y-8">
        {/* Premium Hero Section Skeleton */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 mb-6`}>
            <ShoppingBag className={`h-4 w-4 text-amber-600 dark:text-amber-400`} />
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="h-14 w-96 bg-linear-to-r from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 rounded-lg animate-pulse mx-auto mb-4" />
          <div className="h-6 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mx-auto" />
        </div>

        {/* Search & Filter Card Skeleton */}
        <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 border border-amber-200 dark:border-amber-700`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search bar skeleton */}
            <div className="relative grow max-w-lg">
              <div className="h-14 bg-zinc-200 dark:bg-zinc-700 rounded-2xl animate-pulse" />
            </div>

            {/* View and filter controls skeleton */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
                <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-xl animate-pulse" />
                <div className="w-36 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Results count skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700 overflow-hidden`}
            >
              {/* Image skeleton */}
              <div className="aspect-square bg-zinc-200 dark:bg-zinc-700 animate-pulse" />

              {/* Content skeleton */}
              <div className="p-6 space-y-3">
                <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse" />
                <div className="flex items-center justify-between mt-4">
                  <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
                </div>
                <div className="h-10 bg-linear-to-r from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className={`h-12 w-12 animate-spin text-amber-600 dark:text-amber-400 mb-4`} />
          <p className="text-gray-600 dark:text-zinc-400 text-lg">{t("loading_products_ellipsis")}</p>
        </div>
      </div>
    </div>
  );
}
