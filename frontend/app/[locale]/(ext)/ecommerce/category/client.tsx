"use client";

import { useEffect, useState, useRef } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import CategoryCard from "../components/category-card";
import { Loader2, Search, Filter, X } from "lucide-react";
import { useTranslations } from "next-intl";

export default function CategoriesClient() {
  const t = useTranslations("ext");
  const { categories, isLoadingCategories, error, fetchCategories } =
    useEcommerceStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCategories, setFilteredCategories] = useState<
    ecommerceCategoryAttributes[]
  >([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializeData = async () => {
      await fetchCategories();
      setIsInitialized(true);
    };

    initializeData();
  }, [fetchCategories]);

  useEffect(() => {
    if (categories.length > 0) {
      setFilteredCategories(
        categories.filter(
          (category) =>
            category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [categories, searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
    searchRef.current?.focus();
  };

  if (!isInitialized || isLoadingCategories) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] bg-white dark:bg-zinc-800/50 rounded-2xl shadow-xl p-8">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
        <p className="text-gray-500 dark:text-zinc-400 text-lg">
          {t("loading_categories")}.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-white dark:bg-zinc-800/50 rounded-2xl shadow-xl p-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <X className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
          {t("error_loading_categories")}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-zinc-400 max-w-md mx-auto">
          {t("there_was_an_error_loading_the_categories")}.{" "}
          {t("please_try_again_later")}.
        </p>
        <button
          onClick={() => fetchCategories()}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          {t("try_again")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-4 md:p-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
          </div>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 dark:text-zinc-500 hover:text-gray-500 dark:hover:text-zinc-400" />
            </button>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {filteredCategories.length}{" "}
            {filteredCategories.length === 1 ? "category" : "categories"}
            {t("found")}
          </p>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-zinc-400">
            <Filter className="h-4 w-4" />
            <span>{t("sort_by")}</span>
            <select className="bg-transparent border-none focus:ring-0 text-gray-700 dark:text-zinc-300 font-medium">
              <option>{t("Featured")}</option>
              <option>{t("Alphabetical")}</option>
              <option>{t("Newest")}</option>
            </select>
          </div>
        </div>
      </div>

      {filteredCategories.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800/50 rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-700 mb-4">
            <Search className="h-8 w-8 text-gray-500 dark:text-zinc-400" />
          </div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-zinc-100">
            {t("no_categories_found")}
          </h3>
          <p className="mt-2 text-gray-500 dark:text-zinc-400">
            {t("we_couldnt_find_your_search")}.{" "}
            {t("try_different_keywords_or_browse_all_categories")}.
          </p>
          <button
            onClick={clearSearch}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {t("clear_search")}
          </button>
        </div>
      ) : (
        // Replace motion.div with regular div
        <div className="grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
          {filteredCategories.map((category, index) => (
            <div key={category.id}>
              <CategoryCard category={category} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
