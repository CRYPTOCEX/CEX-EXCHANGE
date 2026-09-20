"use client";

import { useEffect, useState, useRef } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import CategoryCard from "../components/category-card";
import { Search, Filter, X, Grid3X3 } from "lucide-react";
import CategoryLoading from "./loading";
import CategoryErrorState from "./error-state";
import { motion } from "framer-motion";
import { ecommerceCategoryAttributes } from "@/types/ecommerce/category";
import { useTranslations } from "next-intl";

export default function CategoriesClient() {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
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
    return <CategoryLoading />;
  }

  if (error) {
    return (
      <CategoryErrorState
        onRetry={() => fetchCategories()}
        message="There was an error loading the categories. Please try again later."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`bg-linear-to-b from-amber-50/30 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen`}
    >
      <div className="relative pt-20 pb-12">
        {/* Subtle decorative background glows */}
        <div className={`absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
        <div className={`absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

        <div className="relative container mx-auto space-y-8">
          {/* Premium Hero Section */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 mb-6`}
            >
              <Grid3X3 className={`h-4 w-4 text-amber-600 dark:text-amber-400`} />
              <span className={`text-sm font-medium text-amber-700 dark:text-amber-400`}>
                {t("explore_categories")}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold mb-4"
            >
              <span className={`bg-clip-text text-transparent bg-linear-to-r from-amber-600 to-emerald-600`}>
                {t("browse_categories")}
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg md:text-xl text-gray-600 dark:text-zinc-400 max-w-2xl mx-auto"
            >
              {t("discover_our_premium_collection_organized_by")}
            </motion.p>
          </div>

          {/* Premium Search & Filter Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 border border-amber-200 dark:border-amber-700`}
          >
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-gray-400 dark:text-zinc-500" />
              </div>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tCommon("search_categories_ellipsis")}
                className={`block w-full pl-14 pr-12 py-4 border border-gray-200 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all duration-200 text-lg`}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center hover:scale-110 transition-transform"
                >
                  <X className="h-5 w-5 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300" />
                </button>
              )}
            </div>
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                <span className="font-semibold text-gray-900 dark:text-zinc-100">
                  {filteredCategories.length}
                </span>{" "}
                {filteredCategories.length === 1 ? "category" : "categories"} found
              </p>
              <div className="flex items-center gap-3 text-sm">
                <Filter className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                <span className="text-gray-600 dark:text-zinc-400">
                  {tCommon("sort_by")}
                </span>
                <select className={`bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-gray-700 dark:text-zinc-300 font-medium focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all`}>
                  <option>Featured</option>
                  <option>Alphabetical</option>
                  <option>Newest</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Categories Grid or Empty State */}
          {filteredCategories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl p-12 text-center border border-amber-200 dark:border-amber-700`}
            >
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-br from-amber-500/20 to-emerald-500/20 dark:from-amber-600/30 dark:to-emerald-600/30 mb-6`}>
                <Search className={`h-10 w-10 text-amber-600 dark:text-amber-400`} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-3">
                {tCommon("no_categories_found")}
              </h3>
              <p className="text-gray-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                {t("we_couldnt_find_any_categories_matching")} {t("try_different_keywords_or_browse_all_categories_1")}
              </p>
              <button
                onClick={clearSearch}
                className={`inline-flex items-center px-6 py-3 border border-amber-500 dark:border-amber-700 rounded-xl shadow-sm text-sm font-medium text-amber-700 dark:text-amber-400 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm hover:bg-amber-500/10 dark:hover:bg-amber-600/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600/50 transition-all duration-200`}
              >
                {tCommon("clear_search")}
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:gap-10">
              {filteredCategories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <CategoryCard category={category} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
