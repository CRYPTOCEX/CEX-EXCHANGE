"use client";

import { Link } from "@/i18n/routing";
import { Home, Search, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("ext");
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50">
      <div className="text-center px-4 sm:px-6 lg:px-8 max-w-md">
        <h1 className="text-9xl font-extrabold text-gray-200">404</h1>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t("page_not_found")}
        </h2>
        <p className="mt-6 text-base leading-7 text-gray-600">
          {t("sorry_we_couldnt_find_the_page_youre_looking_for")}{" "}
          {t("it_might_have_temporarily_unavailable")}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/ecommerce"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 flex items-center"
          >
            <Home className="mr-2 h-4 w-4" />
            {t("back_to_home")}
          </Link>
          <Link
                          href="/ecommerce/product"
            className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center"
          >
            <Search className="mr-2 h-4 w-4" />
            {t("browse_products")}
          </Link>
        </div>
        <div className="mt-6">
          <button
            onClick={() => window.history.back()}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center justify-center mx-auto"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("go_back")}
          </button>
        </div>
      </div>
    </div>
  );
}
