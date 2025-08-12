"use client";

import type React from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import {
  ShoppingCart,
  Heart,
  Star,
  Eye,
  Tag,
  Zap,
  Download,
  Package,
  Plus,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ProductCardProps {
  product: ecommerceProduct;
  viewMode?: "grid" | "list";
  categoryName?: string;
}

interface QuickViewModalProps {
  product: ProductCardProps["product"];
  isOpen: boolean;
  onClose: () => void;
}

function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const t = useTranslations("ext");
  const { addToCart, addToWishlist, isInWishlist } = useEcommerceStore();
  const [quantity, setQuantity] = useState(1);
  const isInWishlistAlready = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    toast.success(`Added ${quantity} ${product.name} to cart!`);
  };

  const handleAddToWishlist = () => {
    if (isInWishlistAlready) {
      toast.info("Product is already in your wishlist");
    } else {
      addToWishlist(product);
      toast.success("Added to wishlist!");
    }
  };

  const formatCurrency = (price: number, currency: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      AED: "د.إ",
      BTC: "₿",
      USDT: "₮",
      FREEMOON: "🌙",
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${price.toFixed(2)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="aspect-video relative overflow-hidden rounded-t-2xl">
                <Image
                  src={
                    product.image ||
                    "/placeholder.svg?height=400&width=600&query=product"
                  }
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
                      {product.name}
                    </h2>
                    <p className="text-gray-600 dark:text-zinc-400">
                      {product.shortDescription || product.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-900 dark:text-zinc-100">
                      {formatCurrency(product.price, product.currency)}
                    </p>
                    {product.rating && product.rating > 0 && (
                      <div className="flex items-center justify-end mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.round(product.rating!)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300 dark:text-zinc-600"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-sm text-gray-500 dark:text-zinc-400">
                          (
                          {product.reviewsCount || 0}
                          )
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      product.type === "DOWNLOADABLE"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                        : "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                    }`}
                  >
                    {product.type === "DOWNLOADABLE" ? (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        {t("digital_product")}
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-1" />
                        {t("physical_product")}
                      </>
                    )}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-zinc-400">
                    {t("stock")}
                    {product.inventoryQuantity}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 dark:border-zinc-600 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </button>
                    <span className="px-4 py-2 min-w-[60px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() =>
                        setQuantity(
                          Math.min(product.inventoryQuantity, quantity + 1)
                        )
                      }
                      className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    disabled={product.inventoryQuantity === 0}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {t("add_to_cart")}
                  </button>

                  <button
                    onClick={handleAddToWishlist}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      isInWishlistAlready
                        ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                        : "border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <Heart
                      className={`h-5 w-5 ${isInWishlistAlready ? "fill-current" : ""}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ProductCard({
  product,
  viewMode = "grid",
  categoryName,
}: ProductCardProps) {
  const t = useTranslations("ext");
  const [isHovered, setIsHovered] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const { addToCart, addToWishlist, isInWishlist } = useEcommerceStore();

  const isInWishlistAlready = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    toast.success(`Added ${product.name} to cart!`);
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlistAlready) {
      toast.info("Product is already in your wishlist");
    } else {
      addToWishlist(product);
      toast.success("Added to wishlist!");
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const displayDescription =
    product.shortDescription || product.description || "";

  if (viewMode === "list") {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Link
            href={`/ecommerce/product/${product.slug}`}
            className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 dark:text-zinc-100 flex"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="relative h-40 w-40 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800 overflow-hidden">
              <Image
                src={
                  product.image ||
                  "/placeholder.svg?height=160&width=160&query=product"
                }
                alt={product.name}
                fill
                className="object-cover transform group-hover:scale-110 transition-transform duration-700"
                sizes="160px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {categoryName && (
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-800 backdrop-blur-sm dark:bg-black/60 dark:text-white shadow-lg">
                    <Tag className="h-3 w-3 mr-1" />
                    {categoryName}
                  </span>
                </div>
              )}

              {product.type && (
                <div className="absolute top-2 right-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-lg ${
                      product.type === "DOWNLOADABLE"
                        ? "bg-blue-500/90 text-white"
                        : "bg-green-500/90 text-white"
                    }`}
                  >
                    {product.type === "DOWNLOADABLE" ? (
                      <>
                        <Zap className="h-3 w-3 mr-1" />
                        {t("Digital")}
                      </>
                    ) : (
                      <>
                        <Package className="h-3 w-3 mr-1" />
                        {t("Physical")}
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 flex-grow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {product.name}
                  </h3>
                  {product.rating !== undefined && product.rating > 0 && (
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.round(product.rating!)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300 dark:text-zinc-600"
                          }`}
                        />
                      ))}
                      {product.reviewsCount !== undefined &&
                        product.reviewsCount > 0 && (
                          <span className="ml-1 text-sm text-gray-500 dark:text-zinc-400">
                            (
                            {product.reviewsCount}
                            )
                          </span>
                        )}
                    </div>
                  )}
                </div>
                <p className="text-gray-600 dark:text-zinc-400 line-clamp-2 mb-3">
                  {displayDescription}
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      product.inventoryQuantity > 10
                        ? "text-green-600 dark:text-green-400"
                        : product.inventoryQuantity > 0
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {product.inventoryQuantity > 0
                      ? `${product.inventoryQuantity} in stock`
                      : "Out of stock"}
                  </span>
                  {product.inventoryQuantity === 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                      {t("Unavailable")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {product.price} {product.currency}
                </p>
                <div className="flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddToWishlist}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      isInWishlistAlready
                        ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                    }`}
                  >
                    <Heart
                      className={`h-5 w-5 ${isInWishlistAlready ? "fill-current" : ""}`}
                    />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddToCart}
                    disabled={product.inventoryQuantity === 0}
                    className="p-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="h-full"
      >
        <Link
          href={`/ecommerce/product/${product.slug}`}
          className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-zinc-800 dark:to-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 dark:text-zinc-100 h-full flex flex-col"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800">
            <div className="relative h-64 w-full">
              <Image
                src={
                  product.image ||
                  "/placeholder.svg?height=256&width=256&query=product"
                }
                alt={product.name}
                fill
                className="object-cover transform group-hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {categoryName && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-3 left-3"
                >
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-800 backdrop-blur-sm dark:bg-black/60 dark:text-white shadow-lg">
                    <Tag className="h-3 w-3 mr-1" />
                    {categoryName}
                  </span>
                </motion.div>
              )}

              {product.type && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-3 right-3"
                >
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm shadow-lg ${
                      product.type === "DOWNLOADABLE"
                        ? "bg-blue-500/90 text-white"
                        : "bg-green-500/90 text-white"
                    }`}
                  >
                    {product.type === "DOWNLOADABLE" ? (
                      <>
                        <Zap className="h-3 w-3 mr-1" />
                        {t("Digital")}
                      </>
                    ) : (
                      <>
                        <Package className="h-3 w-3 mr-1" />
                        {t("Physical")}
                      </>
                    )}
                  </span>
                </motion.div>
              )}

              {product.inventoryQuantity === 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                    {t("out_of_stock")}
                  </span>
                </div>
              )}

              <AnimatedButtons
                isVisible={isHovered}
                product={product}
                onQuickView={handleQuickView}
                onAddToWishlist={handleAddToWishlist}
                onAddToCart={handleAddToCart}
                isInWishlist={isInWishlistAlready}
              />
            </div>
          </div>

          <div className="p-5 flex-grow flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                {product.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-2 mb-3">
                {displayDescription}
              </p>
              <div
                className={`text-xs font-medium mb-3 ${
                  product.inventoryQuantity > 10
                    ? "text-green-600 dark:text-green-400"
                    : product.inventoryQuantity > 0
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {product.inventoryQuantity > 0
                  ? `${product.inventoryQuantity} in stock`
                  : "Out of stock"}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {product.price} {product.currency}
              </p>
              {product.rating !== undefined && product.rating > 0 && (
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(product.rating!)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300 dark:text-zinc-600"
                      }`}
                    />
                  ))}
                  {product.reviewsCount !== undefined &&
                    product.reviewsCount > 0 && (
                      <span className="ml-1 text-xs text-gray-500 dark:text-zinc-400">
                        (
                        {product.reviewsCount}
                        )
                      </span>
                    )}
                </div>
              )}
            </div>
          </div>
        </Link>
      </motion.div>
      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
}

function AnimatedButtons({
  isVisible,
  product,
  onQuickView,
  onAddToWishlist,
  onAddToCart,
  isInWishlist,
}: {
  isVisible: boolean;
  product: any;
  onQuickView: (e: React.MouseEvent) => void;
  onAddToWishlist: (e: React.MouseEvent) => void;
  onAddToCart: (e: React.MouseEvent) => void;
  isInWishlist: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
      transition={{ duration: 0.3, staggerChildren: 0.1 }}
      className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3"
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onQuickView}
        className="p-3 rounded-full bg-white/95 text-gray-700 hover:bg-white hover:text-indigo-600 backdrop-blur-sm dark:bg-zinc-800/95 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <Eye className="h-5 w-5" />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onAddToWishlist}
        className={`p-3 rounded-full backdrop-blur-sm transition-all duration-200 shadow-lg hover:shadow-xl ${
          isInWishlist
            ? "bg-red-500/95 text-white hover:bg-red-600"
            : "bg-white/95 text-gray-700 hover:bg-white hover:text-red-600 dark:bg-zinc-800/95 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        <Heart className={`h-5 w-5 ${isInWishlist ? "fill-current" : ""}`} />
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onAddToCart}
        disabled={product.inventoryQuantity === 0}
        className="p-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
      >
        {product.inventoryQuantity === 0 ? (
          <X className="h-5 w-5" />
        ) : (
          <ShoppingCart className="h-5 w-5" />
        )}
      </motion.button>
    </motion.div>
  );
}
