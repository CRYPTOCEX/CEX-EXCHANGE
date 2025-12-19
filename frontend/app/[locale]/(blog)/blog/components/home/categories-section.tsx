"use client";

import { Link } from "@/i18n/routing";
import Image from "next/image";
import { motion } from "framer-motion";
import { useBlogStore } from "@/store/blog/user";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CategoriesSection() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { categories, categoriesLoading } = useBlogStore();

  if (categoriesLoading && categories.length === 0) {
    return (
      <section className="py-16">
        {/* Section Header Skeleton */}
        <div className="text-center mb-12">
          <div className="h-8 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 animate-pulse" />
          <div className="h-12 w-80 bg-zinc-200 dark:bg-zinc-800 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-96 bg-zinc-200 dark:bg-zinc-800 rounded-lg mx-auto animate-pulse" />
        </div>
        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="relative h-48 rounded-2xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16">
      {/* Premium Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <Badge
          variant="outline"
          className="mb-4 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          {t("categories")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
          Browse by{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
            Category
          </span>
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Explore our curated collection of articles organized by topic
        </p>
      </motion.div>

      {/* Premium Category Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.slice(0, 6).map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link
              href={`/blog/category/${category.slug}`}
              className="group relative block h-48 overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              {/* Background Image or Gradient */}
              {category.image ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 opacity-90" />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 group-hover:from-black/70" />

              {/* Floating orb effect */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                    {category.name}
                  </h3>
                  {category.postCount !== undefined && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm text-white border border-white/10">
                      <Sparkles className="w-3 h-3" />
                      {category.postCount} {category.postCount === 1 ? "article" : "articles"}
                    </span>
                  )}
                </motion.div>
              </div>

              {/* Hover arrow indicator */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* View All Button */}
      {categories.length > 6 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <Link href="/blog/category">
            <Button
              size="lg"
              className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {tCommon("view_all_categories")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}
    </section>
  );
}
