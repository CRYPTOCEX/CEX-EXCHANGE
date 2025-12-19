"use client";

import { useEffect, useState } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import { ProductGrid } from "../../components/product-card";
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
  Sparkles,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import CategoryDetailLoading from "./loading";
import CategoryDetailErrorState from "./error-state";
import { useTranslations } from "next-intl";

export default function CategoryDetailClient() {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
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
    return <CategoryDetailLoading />;
  }

  if (error) {
    return (
      <CategoryDetailErrorState
        onRetry={() => fetchCategoryBySlug(slug)}
        error={error}
      />
    );
  }

  if (!selectedCategory) {
    return (
      <div className="container">
        <div className={`text-center py-16 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200 dark:border-amber-700`}>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-br from-amber-600/10 to-emerald-600/10 dark:from-amber-600/30 dark:to-emerald-600/30 mb-6`}>
            <Tag className={`h-10 w-10 text-amber-600 dark:text-amber-400`} />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-zinc-100">
            {tCommon("category_not_found")}
          </h2>
          <p className="mt-4 text-xl text-gray-600 dark:text-zinc-400 max-w-md mx-auto">
            {t("we_couldnt_find_the_category_youre_looking_for_1")} {t("it_may_have_been_removed_or")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/ecommerce/category"
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 transition-all duration-200`}
            >
              {tCommon("browse_all_categories")}
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
    );
  }

  // Breadcrumbs
  const breadcrumbs = (
    <nav className="flex py-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            href="/ecommerce"
            className={`text-gray-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors`}
          >
            Home
          </Link>
        </li>
        <li className="flex items-center">
          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
          <Link
            href="/ecommerce/category"
            className={`ml-2 text-gray-500 hover:text-amber-600 dark:text-zinc-400 dark:hover:text-amber-400 transition-colors`}
          >
            Categories
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
    <div className={`bg-linear-to-b from-amber-50/30 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen pt-24`}>
      <div className="container">
        {breadcrumbs}

        {/* Premium Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mb-12 overflow-hidden rounded-3xl shadow-2xl"
        >
          <div className="relative h-[400px] w-full">
            <Image
              src={selectedCategory.image || "/placeholder.svg"}
              alt={selectedCategory.name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            {/* Darker gradient overlay for better text contrast */}
            <div className="absolute inset-0 bg-linear-to-r from-zinc-900/90 via-zinc-900/70 to-zinc-900/50"></div>

            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className={`absolute -top-24 -right-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl`} />
              <div className={`absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl`} />
            </div>
          </div>

          <div className="absolute inset-0 flex items-center px-8 md:px-16">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold mb-6">
                  <Sparkles className="w-4 h-4" />
                  {selectedCategory.products?.length || 0} Products
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-lg mb-6">
                  {selectedCategory.name}
                </h1>
                <p className="text-xl text-white/90 max-w-2xl drop-shadow-md leading-relaxed">
                  {selectedCategory.description}
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-12"
        >
          <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-amber-200 dark:border-amber-700`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative grow max-w-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("search_in_this_category_ellipsis")}
                  className={`block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 transition-all duration-200`}
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
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === "grid"
                        ? `bg-amber-600/10 text-amber-600 dark:bg-amber-600/20 dark:text-amber-400 shadow-sm`
                        : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <Grid3X3 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === "list"
                        ? `bg-emerald-600/10 text-emerald-600 dark:bg-emerald-600/20 dark:text-emerald-400 shadow-sm`
                        : "text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 dark:border-zinc-700 shadow-sm text-sm leading-4 font-medium rounded-xl text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-600`}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </button>

                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className={`block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600 sm:text-sm rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100`}
                  >
                    <option value="featured">Featured</option>
                    <option value="price-low">{tExt("price_low_to_high")}</option>
                    <option value="price-high">{tExt("price_high_to_low")}</option>
                    <option value="newest">Newest</option>
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
                      <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-3">
                        {t("price_range_1")}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
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
                          <span className="text-sm text-gray-500 dark:text-zinc-400 min-w-[60px] font-medium">
                            ${priceRange[0]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
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
                          <span className="text-sm text-gray-500 dark:text-zinc-400 min-w-[60px] font-medium">
                            ${priceRange[1]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-3">
                        Availability
                      </h3>
                      <div className="space-y-2">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFilters.inStock}
                            onChange={() =>
                              setSelectedFilters({
                                ...selectedFilters,
                                inStock: !selectedFilters.inStock,
                              })
                            }
                            className={`rounded border-gray-300 text-amber-600 shadow-sm focus:border-amber-600 focus:ring focus:ring-amber-600/30 focus:ring-opacity-50`}
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
                        className="inline-flex items-center px-4 py-2 border-2 border-gray-300 dark:border-zinc-600 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all duration-200"
                      >
                        {tCommon("reset_filters")}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Products Grid */}
        <div className="pb-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-gray-900 to-gray-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
              {t("products_in")} {selectedCategory.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-zinc-400 bg-white/50 dark:bg-zinc-800/50 px-4 py-2 rounded-full border border-gray-200 dark:border-zinc-700">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"}
            </p>
          </div>

          {filteredProducts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`mt-6 mb-24 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border border-amber-200 dark:border-amber-700`}
            >
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-br from-amber-600/10 to-emerald-600/10 dark:from-amber-600/30 dark:to-emerald-600/30 mb-6`}>
                <Package className={`h-12 w-12 text-amber-600 dark:text-amber-400`} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-3">
                {tExt("no_products_found")}
              </h3>
              <p className="text-gray-600 dark:text-zinc-400 max-w-md mx-auto mb-8 text-lg">
                {searchQuery
                  ? "We couldn't find any products matching your search criteria. Try different keywords or filters."
                  : "We don't have any products in this category yet. Please check back later or browse our other categories."}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="inline-flex items-center px-6 py-3 border-2 border-gray-300 dark:border-zinc-600 text-base font-medium rounded-xl text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all duration-200"
                  >
                    <X className="mr-2 h-5 w-5" />
                    {tCommon("clear_search")}
                  </button>
                )}
                <Link
                  href="/ecommerce/product"
                  className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 transition-all duration-200`}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {tCommon("browse_all_products")}
                </Link>
                <Link
                  href="/ecommerce/category"
                  className="inline-flex items-center px-6 py-3 border-2 border-gray-300 dark:border-zinc-600 text-base font-medium rounded-xl text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all duration-200"
                >
                  <Tag className="mr-2 h-5 w-5" />
                  {t("view_other_categories")}
                </Link>
              </div>
            </motion.div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "space-y-6"
              }
              showTypeBadge={true}
              showCategory={false}
              showRating={true}
              showStock={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}
