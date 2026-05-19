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
import { ProductGrid } from "../components/product-card";

export default function WishlistClient() {
  const t = useTranslations("ext");
  const tCommon = useTranslations("common");
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
            Home
          </Link>
        </li>
        <li className="flex items-center">
          <ChevronRight className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <span className="ml-2 text-zinc-900 dark:text-zinc-100 font-medium">
            Wishlist
          </span>
        </li>
      </ol>
    </nav>
  );

  if (isLoading) {
    return (
      <div className={`bg-linear-to-b from-amber-50/30 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen pb-12 pt-24`}>
        <div className="container">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className={`h-12 w-12 animate-spin text-amber-500 dark:text-amber-400`} />
            <p className="mt-4 text-gray-600 dark:text-zinc-400">
              {t("loading_wishlist_ellipsis")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className={`bg-linear-to-b from-amber-50/30 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen pb-12 pt-24`}>
        {/* Subtle decorative background glows */}
        <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none`} />
        <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none`} />

        <div className="relative container">
          {breadcrumbs}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-center bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700 mb-24`}
          >
            <div className="relative py-24">
              <div className="relative z-10">
                <div className={`mx-auto w-24 h-24 bg-linear-to-br from-amber-500/20 to-emerald-500/20 dark:from-amber-600/30 dark:to-emerald-600/30 rounded-full flex items-center justify-center mb-6`}>
                  <Heart className={`h-12 w-12 text-amber-600 dark:text-amber-400`} />
                </div>

                <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
                  {tCommon("your_wishlist_is_empty")}
                </h2>
                <p className="text-gray-600 dark:text-zinc-400 max-w-md mx-auto text-lg mb-8">
                  {t("you_havent_added_any_products_to_your_wishlist_yet_1")} {t("browse_our_products_to_add_items_to_your_wishlist")}
                </p>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link href="/ecommerce/product">
                    <Button
                      size="lg"
                      className={`bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white`}
                    >
                      <Package className="mr-2 h-5 w-5" />
                      {tCommon("browse_products")}
                    </Button>
                  </Link>
                  <Link href="/ecommerce">
                    <Button
                      variant="outline"
                      size="lg"
                      className={`border border-amber-600/30 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-600/20`}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {tCommon("back_to_home")}
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
    <div className={`bg-linear-to-b from-amber-50/30 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen pb-12 pt-20`}>
      {/* Subtle decorative background glows */}
      <div className={`absolute top-20 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute top-1/2 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none`} />

      <div className="relative container">
        {breadcrumbs}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4"
        >
          <div>
            <h1 className={`text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-amber-600 to-emerald-600 mb-2`}>
              {tCommon("my_wishlist")}
            </h1>
            <p className="text-gray-600 dark:text-zinc-400">
              {wishlist.length} {wishlist.length === 1 ? "item" : "items"} {tCommon("saved_for_later")}
            </p>
          </div>

          <Button
            onClick={handleClearWishlist}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950 dark:hover:border-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {tCommon("clear_wishlist")}
          </Button>
        </motion.div>

        <ProductGrid
          products={wishlist.map((item) => item.product)}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variant="wishlist"
          showTypeBadge={true}
          showCategory={false}
          showRating={true}
          onRemoveFromWishlist={handleRemoveFromWishlist}
        />

        {/* Continue Shopping Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className={`bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700 p-8`}>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-4">
              {t("continue_shopping")}
            </h3>
            <p className="text-gray-600 dark:text-zinc-400 mb-6">
              {tCommon("discover_more_amazing_products_to_add")}
            </p>
            <Link href="/ecommerce/product">
              <Button
                size="lg"
                className={`bg-linear-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white`}
              >
                <Package className="mr-2 h-5 w-5" />
                {tCommon("browse_all_products")}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
