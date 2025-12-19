import { Loader2, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ProductDetailLoading() {
  const t = useTranslations("ext_ecommerce");
  return (
    <div className={`bg-linear-to-b from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-800 min-h-screen pb-16 pt-24`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container">
        {/* Breadcrumb skeleton */}
        <nav className="flex py-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li><div className="h-4 w-12 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" /></li>
            <li><ChevronRight className="h-4 w-4 text-gray-300 dark:text-zinc-600" /></li>
            <li><div className="h-4 w-16 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" /></li>
            <li><ChevronRight className="h-4 w-4 text-gray-300 dark:text-zinc-600" /></li>
            <li><div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse" /></li>
          </ol>
        </nav>

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          {/* Product image skeleton */}
          <div className="flex flex-col space-y-4">
            <div className={`overflow-hidden rounded-3xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-amber-200 dark:border-amber-700 shadow-2xl p-6`}>
              <div className="relative h-[400px] w-full rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            </div>

            {/* Product badges skeleton */}
            <div className="flex space-x-2">
              <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
              <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Product details skeleton */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <div className="space-y-6">
              {/* Title skeleton */}
              <div className="h-12 bg-linear-to-r from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700 rounded-lg animate-pulse w-3/4" />

              {/* Price skeleton */}
              <div className="flex items-end space-x-2">
                <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded w-32 animate-pulse" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-20 animate-pulse mb-2" />
              </div>

              {/* Description skeleton */}
              <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-6 rounded-2xl border border-amber-200 dark:border-amber-700 shadow-lg`}>
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full animate-pulse" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6 animate-pulse" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-4/6 animate-pulse" />
                </div>
              </div>

              {/* Features skeleton */}
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center p-4 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-lg"
                  >
                    <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-2" />
                    <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                  </div>
                ))}
              </div>

              {/* Quantity and buttons skeleton */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-gray-100 dark:border-zinc-700">
                  <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-3" />
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-l-md animate-pulse" />
                    <div className="w-14 h-10 bg-zinc-100 dark:bg-zinc-700 animate-pulse" />
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-r-md animate-pulse" />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <div className="flex-1 h-12 bg-linear-to-r from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 rounded-xl animate-pulse" />
                  <div className="flex-1 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-md animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="mt-16">
          <div className="border-b border-gray-200 dark:border-zinc-700">
            <div className="flex space-x-8">
              <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="py-6">
            <div className="space-y-3">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full animate-pulse" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-4/6 animate-pulse" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/6 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className={`h-12 w-12 animate-spin text-amber-600 dark:text-amber-400 mb-4`} />
          <p className="text-gray-600 dark:text-zinc-400 text-lg">{t("loading_product_details_ellipsis")}</p>
        </div>
      </div>
    </div>
  );
}
