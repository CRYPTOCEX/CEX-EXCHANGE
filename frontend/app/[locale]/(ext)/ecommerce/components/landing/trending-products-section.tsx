"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import ProductCard from "../product-card";
import { useAnimateOnScroll } from "../../hooks/use-animate-on-scroll";
import { useTranslations } from "next-intl";

interface TrendingProductsSectionProps {
  products: any[];
  isLoading: boolean;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemFadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function TrendingProductsSection({
  products,
  isLoading,
}: TrendingProductsSectionProps) {
  const t = useTranslations("ext");
  const trendingSection = useAnimateOnScroll();

  if (!products || products.length === 0) return null;

  return (
    <motion.div
      className="bg-white dark:bg-zinc-950 py-16"
      ref={trendingSection.ref}
      initial="hidden"
      animate={trendingSection.controls}
      variants={trendingSection.variants}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h2
              className="text-3xl font-bold text-gray-900 dark:text-zinc-100"
              variants={itemFadeIn}
            >
              {t("trending_products")}
            </motion.h2>
            <motion.p
              className="mt-2 text-lg text-gray-600 dark:text-zinc-400"
              variants={itemFadeIn}
            >
              {t("discover_whats_popular_right_now")}
            </motion.p>
          </div>
          <motion.div variants={itemFadeIn}>
            <Link
              href="/ecommerce/product"
              className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              {t("view_all")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="bg-gray-100 dark:bg-zinc-800 rounded-2xl h-96 animate-pulse"
              ></div>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                variants={itemFadeIn}
                custom={index}
                whileHover={{
                  y: -10,
                  transition: { duration: 0.2 },
                }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
