
import { useTranslations } from "next-intl";export default function CategoryDetailLoading() {
  const t = useTranslations("ext_ecommerce");
  return (
    <div className="container px-4 py-16 sm:px-6 lg:px-8 pt-20">
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        <p className="mt-4 text-gray-500 dark:text-zinc-400">
          {t("loading_category_and_products_ellipsis")}
        </p>
      </div>
    </div>
  );
}
