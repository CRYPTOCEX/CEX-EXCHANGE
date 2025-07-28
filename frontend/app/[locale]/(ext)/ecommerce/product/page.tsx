import ProductsClient from "./client";
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Products | E-commerce",
  description: "Browse our products",
};

export default function Page() {
  const t = useTranslations("ext");
  return (
    <div className="bg-white dark:bg-zinc-900 dark:text-zinc-100 min-h-screen">
      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/30 dark:to-zinc-900 pb-16">
        <div className="absolute inset-0 opacity-50 dark:opacity-20">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-200 dark:bg-indigo-900/30 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-24 w-80 h-80 bg-purple-200 dark:bg-purple-900/30 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto pt-20 pb-16 px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 mb-4">
            {t("shop_now")}
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-100 sm:text-6xl max-w-3xl mx-auto">
            {t("discover_our")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              {t("Products")}
            </span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-500 dark:text-zinc-400">
            {t("browse_our_selection_payment_methods")}.
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 -mt-16 sm:px-6 lg:px-8 relative z-10">
        <ProductsClient />
      </div>
    </div>
  );
}
