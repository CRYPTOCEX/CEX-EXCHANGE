"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import CategoryCard from "../category-card";
import { useAnimateOnScroll } from "../../hooks/use-animate-on-scroll";
import { useTranslations } from "next-intl";

interface CategoriesSectionProps {
  categories: any[];
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

export default function CategoriesSection({
  categories,
  isLoading,
}: CategoriesSectionProps) {
  const t = useTranslations("ext");
  const categoriesSection = useAnimateOnScroll();

  return (
    <motion.div
      className="bg-white dark:bg-zinc-950 py-20"
      ref={categoriesSection.ref}
      initial="hidden"
      animate={categoriesSection.controls}
      variants={categoriesSection.variants}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <motion.div variants={itemFadeIn}>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-zinc-100">
              {t("shop_by_category")}
            </h2>
            <p className="mt-2 text-lg text-gray-600 dark:text-zinc-400">
              {t("find_exactly_what_youre_looking_for")}
            </p>
          </motion.div>
          <motion.div variants={itemFadeIn}>
            <Link
              href="/ecommerce/category"
              className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              {t("view_all_categories")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="bg-gray-100 dark:bg-zinc-800 rounded-2xl h-80 animate-pulse"
              ></div>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                variants={itemFadeIn}
                custom={index}
                whileHover={{
                  scale: 1.03,
                  transition: { duration: 0.2 },
                }}
              >
                <CategoryCard category={category} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
