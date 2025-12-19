import { Package } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function ShippingEmptyState() {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
  return (
    <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700 p-12 text-center`}>
      <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-br from-amber-600/10 to-emerald-600/10 dark:from-amber-600/30 dark:to-emerald-600/30 mb-6`}>
        <Package className={`h-10 w-10 text-amber-600 dark:text-amber-400`} />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-3">
        {t("no_shipments_found")}
      </h3>
      <p className="text-gray-600 dark:text-zinc-400 max-w-md mx-auto mb-8">
        {t("you_dont_have_any_physical_products")}
      </p>
      <Link
        href="/ecommerce/product"
        className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 transition-all duration-200`}
      >
        {tCommon("browse_products")}
      </Link>
    </div>
  );
}
