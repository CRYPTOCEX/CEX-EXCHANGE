import { Loader2, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function WishlistLoading() {
  const tExt = useTranslations("ext");
  return (
    <div className={`bg-linear-to-b from-amber-50/30 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen pb-12 pt-20`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container">
        {/* Breadcrumb skeleton */}
        <nav className="flex py-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li><div className="h-4 w-12 bg-zinc-300 dark:bg-zinc-700 rounded animate-pulse" /></li>
            <li><ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-500" /></li>
            <li><div className="h-4 w-16 bg-zinc-300 dark:bg-zinc-700 rounded animate-pulse" /></li>
          </ol>
        </nav>

        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <div className="h-12 w-64 bg-gradient-to-r from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 rounded-lg animate-pulse mb-2" />
            <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>

        {/* Products Grid Skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              {/* Image skeleton */}
              <div className="aspect-square bg-zinc-200 dark:bg-zinc-700 animate-pulse" />

              {/* Content skeleton */}
              <div className="p-4 space-y-3">
                <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 animate-pulse" />
                <div className="flex items-center justify-between">
                  <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="flex-1 h-9 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  <div className="w-9 h-9 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Shopping Section Skeleton */}
        <div className="mt-16">
          <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700 p-8 text-center`}>
            <div className="h-7 w-48 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mx-auto mb-4" />
            <div className="h-5 w-64 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mx-auto mb-6" />
            <div className="h-12 w-56 bg-linear-to-r from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 rounded-xl animate-pulse mx-auto" />
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className={`h-12 w-12 animate-spin text-amber-500 dark:text-amber-400 mb-4`} />
          <p className="text-gray-600 dark:text-zinc-400 text-lg">{tExt("loading_wishlist_ellipsis")}</p>
        </div>
      </div>
    </div>
  );
}
