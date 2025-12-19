"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { ArrowRight, Grid3x3, Sparkles } from "lucide-react";
import CategoryCard from "../category-card";
import { useAnimateOnScroll } from "../../hooks/use-animate-on-scroll";
import { Button } from "@/components/ui/button";
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

export default function CategoriesSection({
  categories,
  isLoading,
}: CategoriesSectionProps) {
  const t = useTranslations("ext_ecommerce");
  const tCommon = useTranslations("common");
  const categoriesSection = useAnimateOnScroll();

  return (
    <motion.div
      className="relative py-24 overflow-hidden"
      ref={categoriesSection.ref}
      initial="hidden"
      animate={categoriesSection.controls}
      variants={categoriesSection.variants}
    >
      <div className="container relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-6">
          <motion.div variants={itemFadeIn} className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-emerald-500/10 to-amber-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-semibold mb-4`}
            >
              <Grid3x3 className="w-4 h-4" />
              {t("browse_categories")}
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-4">
              {t("shop_by")}{" "}
              <span className={`bg-clip-text text-transparent bg-linear-to-r from-amber-600 to-emerald-600 dark:from-amber-400 dark:to-emerald-400`}>
                Category
              </span>
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              {t("find_exactly_what_youre_looking_for_1")}
            </p>
          </motion.div>

          <motion.div variants={itemFadeIn}>
            <Link href="/ecommerce/category">
              <Button
                variant="outline"
                className={`border-2 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:border-emerald-500/40 dark:hover:border-emerald-500/60 rounded-xl font-semibold`}
              >
                {tCommon("view_all_categories")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm rounded-2xl h-80 animate-pulse border border-zinc-200/50 dark:border-zinc-700/50"
              >
                <div className="h-48 bg-zinc-200 dark:bg-zinc-700 rounded-t-2xl" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-full" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-4/5" />
                </div>
              </div>
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
                  y: -8,
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
                className="relative group"
              >
                {index === 0 && (
                  <div className={`absolute -top-3 -left-3 z-10 bg-linear-to-br from-amber-600 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1`}>
                    <Sparkles className="w-3 h-3" />
                    Popular
                  </div>
                )}
                <CategoryCard category={category} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
