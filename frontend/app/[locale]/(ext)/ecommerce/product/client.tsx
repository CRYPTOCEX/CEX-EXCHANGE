"use client";

import { useEffect, useState, useRef } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import ProductCard from "../components/product-card";
import { Search, Filter, X, Grid3X3, List } from "lucide-react";
import { useConfigStore } from "@/store/config";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const categories = [
  { id: "all", name: "All" },
  { id: "electronics", name: "Electronics" },
  { id: "clothing", name: "Clothing" },
  { id: "books", name: "Books" },
];

export default function ProductsClient() {
  const t = useTranslations("ext");
  const { products, fetchProducts } = useEcommerceStore();
  const { settings } = useConfigStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [productsPerPage, setProductsPerPage] = useState(
    settings?.ecommerceProductsPerPage ?? 12
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<ecommerceProduct[]>(
    []
  );
  const [sortOption, setSortOption] = useState("featured");
  const [viewMode, setViewMode] = useState("grid");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedFilters, setSelectedFilters] = useState({
    inStock: false,
    onSale: false,
  });
  const [activeCategory, setActiveCategory] = useState("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const initialSearchQuery = searchParams.get("search") || "";
    setSearchQuery(initialSearchQuery);
  }, [searchParams]);

  useEffect(() => {
    const initializeData = async () => {
      await fetchProducts();
      setIsInitialized(true);
    };

    initializeData();
  }, [fetchProducts]);

  useEffect(() => {
    if (settings?.ecommerceProductsPerPage) {
      setProductsPerPage(settings.ecommerceProductsPerPage);
    }
  }, [settings?.ecommerceProductsPerPage]);

  useEffect(() => {
    if (products.length > 0) {
      let filtered = [...products];

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

      // Apply category filter
      if (activeCategory !== "all") {
        filtered = filtered.filter(
          (product) => product.category?.id === activeCategory
        );
      }

      // Apply price filter
      filtered = filtered.filter(
        (product) =>
          product.price >= priceRange[0] && product.price <= priceRange[1]
      );

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
          // Assume featured products are already sorted
          break;
      }

      setFilteredProducts(filtered);
    }
  }, [
    products,
    searchQuery,
    sortOption,
    priceRange,
    selectedFilters,
    activeCategory,
  ]);

  const clearSearch = () => {
    setSearchQuery("");
    searchRef.current?.focus();
  };

  const resetFilters = () => {
    setPriceRange([0, 1000]);
    setSelectedFilters({ inStock: false, onSale: false });
    setSearchQuery("");
    setActiveCategory("all");
    setSortOption("featured");
  };

  // Pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-grow max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-zinc-500" />
            </div>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
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
                <option value="price-high">{t("price_high_to_low")}</option>
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
                    {t("Categories")}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          activeCategory === category.id
                            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
                            : "bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

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

                <div className="flex items-center justify-end">
                  <button
                    onClick={resetFilters}
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

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          {t("Showing")}
          {filteredProducts.length > 0 ? indexOfFirstProduct + 1 : 0}-
          {Math.min(indexOfLastProduct, filteredProducts.length)}
          {t("of")} {filteredProducts.length}
          {t("products")}
        </p>
      </div>

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
          {currentProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
