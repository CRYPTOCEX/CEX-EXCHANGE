"use client";

import { useEffect, useState } from "react";
import { useEcommerceStore } from "@/store/ecommerce/ecommerce";
import {
  Loader2,
  Heart,
  Trash2,
  ArrowLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

// Local component for wishlist-specific product cards
function WishlistProductCard({
  product,
  onRemoveFromWishlist,
  onAddToCart,
}: {
  product: ecommerceProduct;
  onRemoveFromWishlist: () => void;
  onAddToCart: () => void;
}) {
  const t = useTranslations("ext");
  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Product Image */}
      <div className="aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <img
          src={product.image || "/placeholder.svg?height=300&width=300"}
          alt={product.name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2">
          {product.name}
        </h3>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
          {product.shortDescription || product.description}
        </p>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {product.price} {product.currency}
          </span>
          {product.type === "DOWNLOADABLE" && (
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
              {t("Digital")}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onAddToCart}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            size="sm"
          >
            {t("add_to_cart")}
          </Button>
          <Button
            onClick={onRemoveFromWishlist}
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 dark:hover:border-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WishlistClient() {
  const t = useTranslations("ext");
  const { wishlist, removeFromWishlist, addToCart, clearWishlist } =
    useEcommerceStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading to ensure store is hydrated
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleAddToCart = (productId: string) => {
    const wishlistItem = wishlist.find((item) => item.product.id === productId);
    if (wishlistItem) {
      addToCart(wishlistItem.product, 1);
      toast.success(`${wishlistItem.product.name} added to cart`);
    }
  };

  const handleRemoveFromWishlist = (productId: string) => {
    const wishlistItem = wishlist.find((item) => item.product.id === productId);
    if (wishlistItem) {
      removeFromWishlist(productId);
      toast.success(`${wishlistItem.product.name} removed from wishlist`);
    }
  };

  const handleClearWishlist = () => {
    if (window.confirm("Are you sure you want to clear your wishlist?")) {
      clearWishlist();
      toast.success("Wishlist cleared");
    }
  };

  // Breadcrumbs
  const breadcrumbs = (
    <nav className="flex py-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            href="/ecommerce"
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
          >
            {t("Home")}
          </Link>
        </li>
        <li className="flex items-center">
          <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <span className="ml-2 text-zinc-900 dark:text-zinc-100 font-medium">
            {t("Wishlist")}
          </span>
        </li>
      </ol>
    </nav>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-zinc-600 dark:text-zinc-400" />
            <p className="mt-4 text-zinc-500 dark:text-zinc-400">
              {t("loading_wishlist")}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {breadcrumbs}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 mb-24"
          >
            <div className="relative">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 rounded-2xl opacity-50"></div>

              <div className="relative z-10">
                <div className="mx-auto w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                  <Heart className="h-12 w-12 text-zinc-400 dark:text-zinc-500" />
                </div>

                <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                  {t("your_wishlist_is_empty")}
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto text-lg mb-8">
                  {t("you_havent_added_any_products_to_your_wishlist_yet")}.{" "}
                  {t("browse_our_products_your_wishlist")}.
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/ecommerce/product">
                    <Button
                      size="lg"
                      className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      <Package className="mr-2 h-5 w-5" />
                      {t("browse_products")}
                    </Button>
                  </Link>
                  <Link href="/ecommerce">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t("back_to_home")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {breadcrumbs}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
              {t("my_wishlist")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              {wishlist.length} {wishlist.length === 1 ? "item" : "items"}
              {t("saved_for_later")}
            </p>
          </div>

          <Button
            onClick={handleClearWishlist}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 dark:hover:border-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("clear_wishlist")}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {wishlist.map((item, index) => (
            <motion.div
              key={item.product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <WishlistProductCard
                product={item.product}
                onRemoveFromWishlist={() =>
                  handleRemoveFromWishlist(item.product.id)
                }
                onAddToCart={() => handleAddToCart(item.product.id)}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Continue Shopping Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              {t("continue_shopping")}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {t("discover_more_amazing_your_wishlist")}
            </p>
            <Link href="/ecommerce/product">
              <Button
                size="lg"
                className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Package className="mr-2 h-5 w-5" />
                {t("browse_all_products")}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
