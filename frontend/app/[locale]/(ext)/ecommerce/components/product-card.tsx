"use client";

import { useState, useRef, useEffect, useId, forwardRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useRouter } from "@/i18n/routing";
import {
  Trophy,
  ShoppingCart,
  Star,
  TrendingUp,
  Heart,
  Trash2,
  X,
  Zap,
  Package,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useOutsideClick } from "@/hooks/use-outside-click";

interface Product {
  id: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  currency: string;
  rating?: number;
  reviewsCount?: number;
  totalSold?: number;
  inventoryQuantity?: number;
  type?: string;
  category?: { name: string; slug: string };
  shortDescription?: string;
  description?: string;
}

interface ProductCardProps {
  product: Product;
  rank?: number;
  showSoldBadge?: boolean;
  showTypeBadge?: boolean;
  showCategory?: boolean;
  showRating?: boolean;
  showStock?: boolean;
  variant?: "default" | "wishlist";
  onRemoveFromWishlist?: () => void;
  animationIndex?: number;
  // For expandable card pattern
  layoutId?: string;
  onExpand?: () => void;
  isActiveCard?: boolean;
}

// Expanded Product Card Component
interface ExpandedProductCardProps {
  product: Product;
  onClose: () => void;
  layoutId: string;
  variant?: "default" | "wishlist";
  onRemoveFromWishlist?: () => void;
}

const ExpandedProductCard = forwardRef<
  HTMLDivElement,
  ExpandedProductCardProps
>(
  (
    { product, onClose, layoutId, variant = "default", onRemoveFromWishlist },
    ref
  ) => {
    const t = useTranslations("ext");
    const tCommon = useTranslations("common");
    const router = useRouter();
    const { addToCart, addToWishlist, isInWishlist } = useEcommerceStore();
    const [quantity, setQuantity] = useState(1);
    const isInWishlistAlready = isInWishlist(product.id);

    const handleAddToCart = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      addToCart(product as any, quantity);
      toast.success(`Added ${quantity} ${product.name} to cart!`);
    };

    const handleAddToWishlist = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isInWishlistAlready) {
        toast.info("Product is already in your wishlist");
      } else {
        addToWishlist(product as any);
        toast.success("Added to wishlist!");
      }
    };

    const handleViewDetails = () => {
      onClose();
      router.push(`/ecommerce/product/${product.slug}`);
    };

    return (
      <motion.div
        layoutId={`product-card-${product.id}-${layoutId}`}
        ref={ref}
        className="w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[75vw] xl:w-[70vw] max-w-[1000px] max-h-[90vh] flex flex-col overflow-hidden bg-linear-to-br from-white via-white to-white/95 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-2xl shadow-black/20 dark:shadow-black/40 rounded-2xl"
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-amber-500/30 via-amber-500 to-emerald-500/30 rounded-t-2xl z-10" />

        {/* Close button - always visible */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors backdrop-blur-sm cursor-pointer"
        >
          <X className="h-5 w-5" />
        </motion.button>

        {/* Main content - scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Responsive layout: stacked on mobile/tablet, side-by-side on desktop */}
          <div className="flex flex-col md:flex-row">
            {/* Left side - Product Image */}
            <div className="w-full md:w-2/5 lg:w-1/2 shrink-0">
              <motion.div
                layoutId={`product-image-${product.id}-${layoutId}`}
                className="relative w-full aspect-square md:aspect-auto md:h-full md:min-h-[300px] lg:min-h-[400px] overflow-hidden"
              >
                <Image
                  src={product.image || "/placeholder.svg?height=600&width=600"}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 95vw, (max-width: 1024px) 40vw, 50vw"
                />
                {/* Out of Stock Overlay */}
                {(product.inventoryQuantity ?? 1) === 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                      Out of Stock
                    </span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right side - Product Details */}
            <div className="w-full md:w-3/5 lg:w-1/2 p-4 sm:p-5 md:p-6 flex flex-col">
              {/* Product Name */}
              <motion.h2
                layoutId={`product-name-${product.id}-${layoutId}`}
                className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 sm:mb-3 pr-8"
              >
                {product.name}
              </motion.h2>

              {/* Price */}
              <motion.p
                layoutId={`product-price-${product.id}-${layoutId}`}
                className="text-xl sm:text-2xl md:text-3xl font-bold bg-linear-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent mb-2 sm:mb-3"
              >
                {product.currency} {product.price.toFixed(2)}
              </motion.p>

              {/* Rating */}
              {product.rating !== undefined && product.rating > 0 && (
                <div className="flex items-center mb-2 sm:mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(product.rating!)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-zinc-300 dark:text-zinc-600"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    ({product.reviewsCount || 0} reviews)
                  </span>
                </div>
              )}

              {/* Category */}
              {product.category && (
                <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-2 sm:mb-3">
                  Category:{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {product.category.name}
                  </span>
                </div>
              )}

              {/* Description - hidden on very small screens */}
              {(product.shortDescription || product.description) && (
                <p className="hidden sm:block text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-3 md:mb-4 line-clamp-3">
                  {product.shortDescription || product.description}
                </p>
              )}

              {/* Product Info Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                {product.type && (
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/30 dark:border-zinc-700/30">
                    <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5 sm:mb-1">
                      Type
                    </p>
                    <div className="flex items-center">
                      {product.type === "DOWNLOADABLE" ? (
                        <>
                          <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-emerald-500" />
                          <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {t("digital_product")}
                          </span>
                        </>
                      ) : (
                        <>
                          <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-amber-500" />
                          <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {tCommon("physical_product")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/30 dark:border-zinc-700/30">
                  <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5 sm:mb-1">
                    {t("stock")}
                  </p>
                  <p
                    className={`text-xs sm:text-sm font-medium ${
                      (product.inventoryQuantity ?? 0) > 10
                        ? "text-green-600 dark:text-green-400"
                        : (product.inventoryQuantity ?? 0) > 0
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {(product.inventoryQuantity ?? 0) > 0
                      ? `${product.inventoryQuantity} available`
                      : "Out of stock"}
                  </p>
                </div>

                {product.totalSold !== undefined && product.totalSold > 0 && (
                  <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/30 dark:border-zinc-700/30">
                    <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5 sm:mb-1">
                      Sold
                    </p>
                    <div className="flex items-center">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-amber-500" />
                      <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {product.totalSold} units
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Quantity:
                </span>
                <div className="flex items-center border border-zinc-300 dark:border-zinc-600 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors rounded-l-lg font-medium text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 min-w-10 sm:min-w-[50px] text-center font-medium text-sm">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(
                        Math.min(product.inventoryQuantity ?? 99, quantity + 1)
                      )
                    }
                    className="px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors rounded-r-lg font-medium text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Spacer to push actions to bottom on large screens */}
              <div className="hidden md:block flex-1 min-h-0" />

              {/* Action Buttons - Inside right column on large screens */}
              <div className="hidden md:flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-zinc-200 dark:border-zinc-700">
                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={(product.inventoryQuantity ?? 0) === 0}
                  className="flex-1 bg-linear-to-r from-amber-600 to-emerald-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium hover:from-amber-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                >
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                  {tCommon("add_to_cart")}
                </button>

                {/* Wishlist */}
                {variant === "default" && (
                  <button
                    onClick={handleAddToWishlist}
                    className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isInWishlistAlready
                        ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                        : "border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${isInWishlistAlready ? "fill-current" : ""}`}
                    />
                  </button>
                )}

                {/* Remove from Wishlist */}
                {variant === "wishlist" && onRemoveFromWishlist && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemoveFromWishlist();
                      onClose();
                    }}
                    className="p-2.5 sm:p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:hover:border-red-700 transition-all duration-200 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )}

                {/* View Details */}
                <button
                  onClick={handleViewDetails}
                  className="p-2.5 sm:p-3 rounded-xl border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all duration-200 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed footer for small screens only */}
        <div className="md:hidden shrink-0 flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-sm">
          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={(product.inventoryQuantity ?? 0) === 0}
            className="flex-1 bg-linear-to-r from-amber-600 to-emerald-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium hover:from-amber-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            {tCommon("add_to_cart")}
          </button>

          {/* Wishlist */}
          {variant === "default" && (
            <button
              onClick={handleAddToWishlist}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                isInWishlistAlready
                  ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                  : "border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              <Heart
                className={`h-4 w-4 sm:h-5 sm:w-5 ${isInWishlistAlready ? "fill-current" : ""}`}
              />
            </button>
          )}

          {/* Remove from Wishlist */}
          {variant === "wishlist" && onRemoveFromWishlist && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveFromWishlist();
                onClose();
              }}
              className="p-2.5 sm:p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:hover:border-red-700 transition-all duration-200 cursor-pointer"
            >
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}

          {/* View Details */}
          <button
            onClick={handleViewDetails}
            className="p-2.5 sm:p-3 rounded-xl border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all duration-200 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </motion.div>
    );
  }
);

ExpandedProductCard.displayName = "ExpandedProductCard";

// Main ProductCard Component
function ProductCardInner({
  product,
  rank,
  showSoldBadge = false,
  showTypeBadge = true,
  showCategory = true,
  showRating = true,
  showStock = false,
  variant = "default",
  onRemoveFromWishlist,
  animationIndex = 0,
  layoutId,
  onExpand,
  isActiveCard,
}: ProductCardProps) {
  const tCommon = useTranslations("common");
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart, addToWishlist, isInWishlist } = useEcommerceStore();
  const isInWishlistAlready = isInWishlist(product.id);

  // Reset hover state when card becomes active/inactive
  useEffect(() => {
    if (isActiveCard) {
      setIsHovered(false);
    }
  }, [isActiveCard]);

  const getRankBadge = (rankIndex: number) => {
    const badges: Record<number, { bg: string; text: string; icon: string }> = {
      0: {
        bg: "from-yellow-400 to-amber-500",
        text: "text-amber-900",
        icon: "1st",
      },
      1: {
        bg: "from-zinc-300 to-zinc-400",
        text: "text-zinc-700",
        icon: "2nd",
      },
      2: {
        bg: "from-amber-600 to-amber-700",
        text: "text-amber-100",
        icon: "3rd",
      },
    };
    return badges[rankIndex] || null;
  };

  const rankBadge = rank !== undefined ? getRankBadge(rank) : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product as any, 1);
    toast.success(`Added ${product.name} to cart!`);
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlistAlready) {
      toast.info("Product is already in your wishlist");
    } else {
      addToWishlist(product as any);
      toast.success("Added to wishlist!");
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemoveFromWishlist?.();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking interactive elements, don't expand
    const target = e.target as HTMLElement;
    const isInteractive =
      target.closest("[data-prevent-expand]") || target.closest("button");

    if (isInteractive) return;

    // If we have an expand function, use it (works for both default and wishlist variants)
    if (onExpand) {
      e.preventDefault();
      e.stopPropagation();
      onExpand();
    }
  };

  return (
    <motion.div
      layoutId={layoutId ? `product-card-${product.id}-${layoutId}` : undefined}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: animationIndex * 0.1, duration: 0.4 }}
      className={`group ${isActiveCard ? "pointer-events-none opacity-0" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className="relative p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-amber-400/50 dark:hover:border-amber-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer">
        {/* Rank Badge */}
        {rankBadge && (
          <div className="absolute -top-3 -left-3 z-10">
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full bg-linear-to-r ${rankBadge.bg} ${rankBadge.text} text-sm font-bold shadow-lg`}
            >
              <Trophy className="w-3.5 h-3.5" />
              {rankBadge.icon}
            </div>
          </div>
        )}

        {/* Sold Badge / Type Badge */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {showSoldBadge &&
            product.totalSold !== undefined &&
            product.totalSold > 0 && (
              <Badge className="bg-linear-to-r from-amber-500 to-emerald-500 text-white border-0">
                <TrendingUp className="w-3 h-3 mr-1" />
                {product.totalSold} sold
              </Badge>
            )}
          {showTypeBadge && product.type && (
            <Badge
              className={`border-0 text-white ${
                product.type === "DOWNLOADABLE"
                  ? "bg-linear-to-r from-emerald-500 to-green-500"
                  : "bg-linear-to-r from-amber-500 to-yellow-500"
              }`}
            >
              {product.type === "DOWNLOADABLE" ? (
                <>
                  <Zap className="w-3 h-3 mr-1" />
                  Digital
                </>
              ) : (
                <>
                  <Package className="w-3 h-3 mr-1" />
                  Physical
                </>
              )}
            </Badge>
          )}
        </div>

        {/* Product Image */}
        <motion.div
          layoutId={
            layoutId ? `product-image-${product.id}-${layoutId}` : undefined
          }
          className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-4 mt-2"
        >
          <Image
            src={product.image || "/placeholder.svg?height=250&width=250"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 250px"
          />

          {/* Out of Stock Overlay */}
          {(product.inventoryQuantity ?? 1) === 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                Out of Stock
              </span>
            </div>
          )}

          {/* Hover Actions - Wishlist button only (cards expand on click) */}
          {variant === "default" && (
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-4 left-0 right-0 flex justify-center"
                  data-prevent-expand
                >
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleAddToWishlist}
                    className={`p-3 rounded-full backdrop-blur-sm transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer ${
                      isInWishlistAlready
                        ? "bg-red-500/95 text-white hover:bg-red-600"
                        : "bg-white/95 text-zinc-700 hover:bg-white hover:text-red-600 dark:bg-zinc-800/95 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Heart
                      className={`h-5 w-5 ${isInWishlistAlready ? "fill-current" : ""}`}
                    />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Category */}
        {showCategory && product.category && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">
            {product.category.name}
          </span>
        )}

        {/* Product Name */}
        <motion.h3
          layoutId={
            layoutId ? `product-name-${product.id}-${layoutId}` : undefined
          }
          className="font-bold text-lg text-zinc-900 dark:text-white mb-2 line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
        >
          {product.name}
        </motion.h3>

        {/* Rating */}
        {showRating && product.rating !== undefined && product.rating > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(product.rating!)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-zinc-300 dark:text-zinc-600"
                }`}
              />
            ))}
            <span className="text-sm text-zinc-500 dark:text-zinc-400 ml-1">
              ({product.reviewsCount || 0})
            </span>
          </div>
        )}

        {/* Stock */}
        {showStock && (
          <div
            className={`text-xs font-medium mb-3 ${
              (product.inventoryQuantity ?? 0) > 10
                ? "text-green-600 dark:text-green-400"
                : (product.inventoryQuantity ?? 0) > 0
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-red-600 dark:text-red-400"
            }`}
          >
            {(product.inventoryQuantity ?? 0) > 0
              ? `${product.inventoryQuantity} in stock`
              : "Out of stock"}
          </div>
        )}

        {/* Price & Action */}
        <div className="relative flex items-center justify-between">
          <motion.span
            layoutId={
              layoutId ? `product-price-${product.id}-${layoutId}` : undefined
            }
            className="text-xl font-bold bg-linear-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent"
          >
            {product.currency} {product.price.toFixed(2)}
          </motion.span>

          {/* Default variant: Cart button on hover - absolute positioned to prevent layout shift */}
          {variant === "default" && (
            <AnimatePresence>
              {isHovered && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleAddToCart}
                  disabled={(product.inventoryQuantity ?? 1) === 0}
                  data-prevent-expand
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-linear-to-r from-amber-600 to-emerald-600 text-white hover:from-amber-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg hover:shadow-xl"
                >
                  {(product.inventoryQuantity ?? 1) === 0 ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          )}

          {/* Wishlist variant: Show action buttons */}
          {variant === "wishlist" && (
            <div className="flex gap-2" data-prevent-expand>
              <Button
                onClick={handleAddToCart}
                size="sm"
                className="bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white"
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleRemove}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 dark:hover:border-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Product Grid with expandable card support
interface ProductGridProps {
  products: Product[];
  children?: (props: {
    product: Product;
    index: number;
    layoutId: string;
    onExpand: () => void;
    isActiveCard: boolean;
  }) => React.ReactNode;
  className?: string;
  // Pass through to children
  showSoldBadge?: boolean;
  showTypeBadge?: boolean;
  showCategory?: boolean;
  showRating?: boolean;
  showStock?: boolean;
  variant?: "default" | "wishlist";
  onRemoveFromWishlist?: (productId: string) => void;
  rankFirst?: number; // How many to show rank badges for (e.g., 3 for top 3)
}

export function ProductGrid({
  products,
  children,
  className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8",
  showSoldBadge,
  showTypeBadge,
  showCategory,
  showRating,
  showStock,
  variant = "default",
  onRemoveFromWishlist,
  rankFirst = 0,
}: ProductGridProps) {
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const layoutId = useId();
  const expandedRef = useRef<HTMLDivElement>(null);

  // Track mount state for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle escape key to close
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveProduct(null);
      }
    }

    if (activeProduct) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeProduct]);

  // Close when clicking outside
  useOutsideClick(expandedRef, () => setActiveProduct(null));

  // Modal content to be portaled
  const modalContent = (
    <>
      {/* Overlay backdrop */}
      <AnimatePresence>
        {activeProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm h-full w-full z-[9999]"
            onClick={() => setActiveProduct(null)}
          />
        )}
      </AnimatePresence>

      {/* Expanded card modal */}
      <AnimatePresence>
        {activeProduct && (
          <div className="fixed inset-0 grid place-items-center z-[10000] p-4 pointer-events-none">
            <div className="pointer-events-auto">
              <ExpandedProductCard
                ref={expandedRef}
                product={activeProduct}
                onClose={() => setActiveProduct(null)}
                layoutId={layoutId}
                variant={variant}
                onRemoveFromWishlist={
                  onRemoveFromWishlist
                    ? () => onRemoveFromWishlist(activeProduct.id)
                    : undefined
                }
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {/* Portal modal to body to escape any stacking contexts */}
      {isMounted && createPortal(modalContent, document.body)}

      {/* Product grid */}
      <div className={className}>
        {products.map((product, index) =>
          children ? (
            children({
              product,
              index,
              layoutId,
              onExpand: () => setActiveProduct(product),
              isActiveCard: activeProduct?.id === product.id,
            })
          ) : (
            <ProductCardInner
              key={product.id}
              product={product}
              rank={rankFirst > 0 && index < rankFirst ? index : undefined}
              showSoldBadge={showSoldBadge}
              showTypeBadge={showTypeBadge}
              showCategory={showCategory}
              showRating={showRating}
              showStock={showStock}
              variant={variant}
              onRemoveFromWishlist={
                onRemoveFromWishlist
                  ? () => onRemoveFromWishlist(product.id)
                  : undefined
              }
              animationIndex={index}
              layoutId={layoutId}
              onExpand={() => setActiveProduct(product)}
              isActiveCard={activeProduct?.id === product.id}
            />
          )
        )}
      </div>
    </>
  );
}

// Default export for simple usage (legacy support without expand)
export default function ProductCard(props: ProductCardProps) {
  return <ProductCardInner {...props} />;
}

// Named exports
export { ProductCardInner, ExpandedProductCard };
export type { Product, ProductCardProps, ProductGridProps };
