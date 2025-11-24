"use client";

import { useEffect, useState } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import ProductCard from "../../components/product-card";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import {
  ChevronRight,
  ArrowLeft,
  Tag,
  ShoppingBag,
  Filter,
  Search,
  X,
  Grid3X3,
  List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function CategoryDetailClient() {
  const t = useTranslations("ext");
  const { slug } = useParams() as { slug: string };
  const { selectedCategory, fetchCategoryBySlug, isLoadingCategory, error } =
    useEcommerceStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<ecommerceProduct[]>(
    []
  );
  const [sortOption, setSortOption] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedFilters, setSelectedFilters] = useState({
    inStock: false,
    onSale: false,
  });

  // Fetch category with its products
  useEffect(() => {
    fetchCategoryBySlug(slug);
  }, [slug, fetchCategoryBySlug]);

  // Filter and sort products when category or filters change
  useEffect(() => {
    if (selectedCategory?.products) {
      let filtered = [...selectedCategory.products] as ecommerceProduct[];

      // Apply search filter
      if (searchQuery) {
        filtered = filtered.filter(
          (product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.shortDescription ?? "")
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
        );
      }

      // Apply price filter
      filtered = filtered.filter(
        (product) =>
          product.price >= priceRange[0] && product.price <= priceRange[1]
      );

      // Apply availability filters
      if (selectedFilters.inStock) {
        filtered = filtered.filter((product) => product.inventoryQuantity > 0);
      }

      // Apply sorting
      switch (sortOption) {
        case "price-low":
          filtered.sort((a, b) => a.price - b.price);
          break;
        case "price-high":
          filtered.sort((a, b) => b.price - a.price);
          break;
        case "newest":
          filtered.sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
          );
          break;
        case "featured":
        default:
          // Keep original order for featured
          break;
      }

      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [selectedCategory, searchQuery, sortOption, priceRange, selectedFilters]);

  if (isLoadingCategory) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-500 dark:text-zinc-400">
            {t("loading_category_and_products")}.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-6 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-red-400 dark:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
                {t("error_loading_category")}
              </h3>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
              <div className="mt-4">
                <button
                  onClick={() => fetchCategoryBySlug(slug)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600"
                >
                  {t("try_again")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedCategory) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-xl shadow-xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-700 mb-6">
            <svg
              className="h-10 w-10 text-gray-500 dark:text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-zinc-100">
            {t("category_not_found")}
          </h2>
          <p className="mt-4 text-xl text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
            {t("we_couldnt_find_the_category_youre_looking_for")}.{" "}
            {t("it_may_have_be_incorrect")}.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/ecommerce/category"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              {t("browse_all_categories")}
            </Link>
            <Link
              href="/ecommerce"
              className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm text-base font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              {t("back_to_home")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Breadcrumbs
  const breadcrumbs = (
    <nav className="flex py-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            href="/ecommerce"
            className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
          >
            {t("Home")}
          </Link>
        </li>
        <li className="flex items-center">
          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <Link
            href="/ecommerce/category"
            className="ml-2 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
          >
            {t("Categories")}
          </Link>
        </li>
        <li className="flex items-center">
          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <span className="ml-2 text-gray-900 dark:text-zinc-100 font-medium">
            {selectedCategory.name}
          </span>
        </li>
      </ol>
    </nav>
  );

  return (
    <div className="bg-white dark:bg-zinc-900 dark:text-zinc-100 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {breadcrumbs}

        <div className="relative mb-12">
          <div className="aspect-w-5 aspect-h-2 w-full overflow-hidden rounded-2xl">
            <div className="relative h-80 w-full">
              <Image
                src={selectedCategory.image || "/placeholder.svg"}
                alt={selectedCategory.name}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-gray-900/40"></div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center px-8 md:px-12">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white backdrop-blur-sm mb-4">
                  {selectedCategory.products?.length || 0}
                  {t("Products")}
                </span>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl drop-shadow-sm">
                  {selectedCategory.name}
                </h1>
                <p className="mt-4 text-xl text-white max-w-3xl drop-shadow-sm">
                  {selectedCategory.description}
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative flex-grow max-w-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X className="h-5 w-5 text-gray-400 dark:text-zinc-500 hover:text-gray-500 dark:hover:text-zinc-400" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md ${
                      viewMode === "grid"
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                        : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <Grid3X3 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md ${
                      viewMode === "list"
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                        : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-zinc-700 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {t("Filters")}
                  </button>

                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-zinc-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100"
                  >
                    <option value="featured">{t("Featured")}</option>
                    <option value="price-low">{t("price_low_to_high")}</option>
                    <option value="price-high">
                      {t("price_high_to_low")}
                    </option>
                    <option value="newest">{t("Newest")}</option>
                  </select>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 mt-4 border-t border-gray-200 dark:border-zinc-700 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                        {t("price_range")}
                      </h3>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="1000"
                          value={priceRange[0]}
                          onChange={(e) =>
                            setPriceRange([
                              Number.parseInt(e.target.value),
                              priceRange[1],
                            ])
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                        />
                        <span className="text-sm text-gray-500 dark:text-zinc-400 min-w-[60px]">
                          / $
                          {priceRange[0]}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="1000"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([
                              priceRange[0],
                              Number.parseInt(e.target.value),
                            ])
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                        />
                        <span className="text-sm text-gray-500 dark:text-zinc-400 min-w-[60px]">
                          / $
                          {priceRange[1]}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                        {t("Availability")}
                      </h3>
                      <div className="mt-2 space-y-2">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedFilters.inStock}
                            onChange={() =>
                              setSelectedFilters({
                                ...selectedFilters,
                                inStock: !selectedFilters.inStock,
                              })
                            }
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-zinc-300">
                            {t("in_stock")}
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => {
                          setPriceRange([0, 1000]);
                          setSelectedFilters({ inStock: false, onSale: false });
                          setSearchQuery("");
                        }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700"
                      >
                        {t("reset_filters")}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="pb-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">
              {t("products_in")}
              {selectedCategory.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
              {t("found")}
            </p>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="mt-6 mb-24 bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-700 mb-6">
                <svg
                  className="h-10 w-10 text-gray-400 dark:text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-zinc-100">
                {t("no_products_found")}
              </h3>
              <p className="mt-2 text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                {searchQuery
                  ? "We couldn't find any products matching your search criteria. Try different keywords or filters."
                  : "We don't have any products in this category yet. Please check back later or browse our other categories."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-600 text-sm font-medium rounded-md text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600"
                  >
                    <X className="mr-2 h-4 w-4" />
                    {t("clear_search")}
                  </button>
                )}
                <Link
                  href="/ecommerce/product"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  {t("browse_all_products")}
                </Link>
                <Link
                  href="/ecommerce/category"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-600 text-sm font-medium rounded-md text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-600"
                >
                  <Tag className="mr-2 h-4 w-4" />
                  {t("view_other_categories")}
                </Link>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8"
                  : "space-y-6"
              }
            >
              <AnimatePresence>
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ProductCard product={product} viewMode={viewMode} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
