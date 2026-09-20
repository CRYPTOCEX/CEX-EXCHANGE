"use client";

import { Tag, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface ErrorStateProps {
  onRetry?: () => void;
  error?: string;
}

export default function ProductDetailErrorState({ onRetry, error }: ErrorStateProps) {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
  return (
    <div className={`bg-linear-to-b from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-800 min-h-screen pb-16 pt-24`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container">
        <div className={`text-center py-16 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700`}>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-br from-amber-600/10 to-emerald-600/10 dark:from-amber-600/30 dark:to-emerald-600/30 mb-6`}>
            <Tag className={`h-10 w-10 text-amber-600 dark:text-amber-400`} />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
            {t("product_not_found")}
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
            {error || "We couldn't find the product you're looking for. It may have been removed or the URL may be incorrect."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 transition-all duration-200`}
              >
                {tCommon("try_again")}
              </button>
            )}
            <Link
              href="/ecommerce/product"
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 transition-all duration-200`}
            >
              {tCommon("browse_all_products")}
            </Link>
            <Link
              href="/ecommerce"
              className="inline-flex items-center px-6 py-3 border-2 border-gray-300 dark:border-zinc-600 rounded-xl shadow-sm text-base font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              {tCommon("back_to_home")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
