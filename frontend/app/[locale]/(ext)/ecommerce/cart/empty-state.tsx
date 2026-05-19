import { ShoppingBag, Home, CreditCard, Truck } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function CartEmptyState() {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
  return (
    <div className={`bg-linear-to-b from-amber-50 to-white dark:from-zinc-900 dark:to-zinc-800 min-h-screen pb-12 pt-24`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container py-16">
        <div className={`text-center py-16 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700`}>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-br from-amber-500/20 to-emerald-500/20 dark:from-amber-600/30 dark:to-emerald-600/30 mb-6`}>
            <ShoppingBag className={`h-10 w-10 text-amber-600 dark:text-amber-400`} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
            {t("your_cart_is_empty")}
          </h2>
          <p className="text-gray-600 dark:text-zinc-400 max-w-md mx-auto text-lg mb-8">
            {t("looks_like_you_havent_added_any")} {t("start_shopping_to_add_items_to_your_cart_1")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/ecommerce/product"
              className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 transition-all duration-200`}
            >
              {tCommon("browse_products")}
            </Link>
            <Link
              href="/ecommerce"
              className={`inline-flex items-center justify-center px-6 py-3 border border-amber-600/30 dark:border-amber-700 text-base font-medium rounded-xl text-amber-700 dark:text-amber-400 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm hover:bg-amber-500/10 dark:hover:bg-amber-600/20 transition-all duration-200`}
            >
              <Home className="mr-2 h-5 w-5" />
              {tCommon("back_to_home")}
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 max-w-3xl mx-auto">
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-700`}>
              <ShoppingBag className={`h-8 w-8 text-amber-600 dark:text-amber-400 mb-4`} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                {t("wide_selection")}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                {t("browse_our_extensive_collection_of_products")}
              </p>
            </div>
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-700`}>
              <CreditCard className={`h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-4`} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                {t("secure_payments")}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                {t("pay_with_confidence_using_our_secure")}
              </p>
            </div>
            <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-amber-200 dark:border-amber-700`}>
              <Truck className={`h-8 w-8 text-amber-600 dark:text-amber-400 mb-4`} />
              <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100">
                {t("fast_delivery")}
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                {t("get_your_products_delivered_quickly_and")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
