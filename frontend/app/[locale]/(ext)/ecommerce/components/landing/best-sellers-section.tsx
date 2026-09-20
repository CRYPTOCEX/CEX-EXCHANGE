"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { ArrowRight, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { ProductGrid } from "../product-card";

interface Product {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  totalSold: number;
  inventoryQuantity?: number;
  type?: string;
  category?: { name: string; slug: string };
}

interface BestSellersSectionProps {
  products: Product[];
  isLoading?: boolean;
}

function LoadingCard() {
  return (
    <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="aspect-square rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-4 mt-6" />
      <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
      <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
      <div className="flex items-center gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-4 h-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      </div>
    </div>
  );
}

export default function BestSellersSection({
  products,
  isLoading,
}: BestSellersSectionProps) {
  const t = useTranslations("ext_ecommerce");
  const tExt = useTranslations("ext");

  if (!isLoading && (!products || products.length === 0)) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12"
        >
          <div>
            <Badge
              variant="outline"
              className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border-amber-500/20"
            >
              <Award className="w-4 h-4 text-amber-500 mr-2" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {t("best_sellers") || "Best Sellers"}
              </span>
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              {t("top_selling") || "Top Selling"}{" "}
              <span className="bg-gradient-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent">
                {tExt("products") || "Products"}
              </span>
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
              {t("customers_favorite_products") ||
                "Discover what our customers love the most"}
            </p>
          </div>

          <Link href="/ecommerce/product">
            <Button
              variant="outline"
              className="rounded-xl group border-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/5 dark:hover:bg-amber-600/10 font-semibold transition-all duration-300"
            >
              {tExt("view_all_products") || "View All Products"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        ) : (
          <ProductGrid
            products={products.slice(0, 4)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            showSoldBadge={true}
            showTypeBadge={false}
            showCategory={true}
            showRating={true}
            rankFirst={3}
          />
        )}
      </div>
    </section>
  );
}
