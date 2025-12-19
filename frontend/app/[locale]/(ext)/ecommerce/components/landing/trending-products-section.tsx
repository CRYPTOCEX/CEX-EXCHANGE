"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { ArrowRight, TrendingUp, Flame } from "lucide-react";
import { ProductGrid } from "../product-card";
import { useAnimateOnScroll } from "../../hooks/use-animate-on-scroll";
import { Button } from "@/components/ui/button";

interface TrendingProductsSectionProps {
  products: any[];
  isLoading: boolean;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemFadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
};

export default function TrendingProductsSection({
  products,
  isLoading,
}: TrendingProductsSectionProps) {
  const trendingSection = useAnimateOnScroll();

  if (!products || products.length === 0) return null;

  return (
    <motion.div
      className="relative py-24 overflow-hidden"
      ref={trendingSection.ref}
      initial="hidden"
      animate={trendingSection.controls}
      variants={trendingSection.variants}
    >
      <div className="container relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-6">
          <motion.div variants={itemFadeIn} className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-semibold mb-4`}
            >
              <Flame className="w-4 h-4" />
              Hot Picks
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-4">
              Trending{" "}
              <span className={`bg-clip-text text-transparent bg-linear-to-r from-amber-600 to-emerald-600 dark:from-amber-400 dark:to-emerald-400`}>
                Products
              </span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              Discover what's popular right now in our marketplace
            </p>
          </motion.div>

          <motion.div variants={itemFadeIn}>
            <Link href="/ecommerce/product">
              <Button
                variant="outline"
                className={`border-2 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/5 dark:border-amber-500/40 dark:hover:border-amber-500/60 rounded-xl font-semibold`}
              >
                View All Products
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl h-96 animate-pulse border border-zinc-200/50 dark:border-zinc-700/50"
              >
                <div className="h-48 bg-zinc-200 dark:bg-zinc-700 rounded-t-2xl" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
                  <div className="h-6 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ProductGrid
            products={products}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            showTypeBadge={true}
            showCategory={true}
            showRating={true}
            rankFirst={3}
          />
        )}
      </div>
    </motion.div>
  );
}
