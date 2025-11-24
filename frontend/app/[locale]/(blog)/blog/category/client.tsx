"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useBlogStore } from "@/store/blog/user";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Layers,
  FolderOpen,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function CategoriesClient() {
  const t = useTranslations("blog");
  const { categories, isLoading, fetchCategories, error } = useBlogStore();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  if (isLoading && categories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-12 w-1/3 mx-auto mb-8" />
        <Skeleton className="h-6 w-1/4 mx-auto mb-12" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({
            length: 6,
          }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
            {t("Categories")}
          </h1>
          <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded-lg inline-block border border-red-100 dark:border-red-900/50">
            <AlertCircle className="h-5 w-5 inline-block mr-2" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  // Function to get a gradient based on category index
  const getCategoryGradient = (index: number) => {
    const gradients = [
      "from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700",
      "from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600",
      "from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600",
      "from-orange-500 to-amber-500 dark:from-orange-600 dark:to-amber-600",
      "from-pink-500 to-rose-500 dark:from-pink-600 dark:to-rose-600",
    ];
    return gradients[index % gradients.length];
  };
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50/50 to-white dark:from-black dark:via-zinc-900/50 dark:to-black">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            duration: 0.6,
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 p-8 md:p-12 mb-16 shadow-xl"
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white blur-3xl"></div>
            <div className="absolute bottom-20 left-20 h-40 w-40 rounded-full bg-white blur-3xl"></div>
          </div>

          {/* Decorative icons */}
          <div className="absolute top-10 right-10 opacity-20 rotate-12">
            <Layers className="h-24 w-24 text-white" />
          </div>
          <div className="absolute bottom-10 left-10 opacity-10 -rotate-12">
            <FolderOpen className="h-16 w-16 text-white" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <motion.h1
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.2,
              }}
              className="text-4xl md:text-5xl font-bold mb-4 text-white"
            >
              {t("browse_by_category")}
            </motion.h1>
            <motion.p
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.3,
              }}
              className="text-xl text-indigo-100 mb-8"
            >
              {t("explore_our_content_organized_by_topics")}.{" "}
              {t("discover_articles_tutorials_of_interest")}.
            </motion.p>

            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.4,
              }}
            >
              <Link href="/blog">
                <Button
                  size="lg"
                  variant="glass"
                  className="rounded-full group"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  {t("explore_all_articles")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Featured Categories */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("featured_categories")}
            </h2>
            <Link
              href="/blog"
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center"
            >
              {t("view_all_posts")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.slice(0, 3).map((category, index) => {
              return (
                <motion.div
                  key={`featured-${category.id}`}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  className="relative h-80 overflow-hidden rounded-2xl shadow-lg"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40 z-10"></div>
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${getCategoryGradient(index)} opacity-70 z-0 transition-opacity duration-300 ${hoveredIndex === index ? "opacity-90" : "opacity-70"}`}
                  ></div>

                  {category.image && (
                    <Image
                      src={category.image || "/placeholder.svg"}
                      alt={category.name}
                      fill
                      className="object-cover z-0 transition-transform duration-700 scale-105"
                      style={{
                        transform:
                          hoveredIndex === index ? "scale(1.1)" : "scale(1.05)",
                      }}
                    />
                  )}

                  <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-2">
                        {category.name}
                      </h3>
                      <p className="text-white/80 line-clamp-3">
                        {category.description ||
                          "Explore posts in this category"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      {category.postCount !== undefined && (
                        <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white">
                          {category.postCount}{" "}
                          {category.postCount === 1 ? "post" : "posts"}
                        </span>
                      )}

                      <Link
                        href={`/blog/category/${category.slug}`}
                        className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors duration-300"
                      >
                        {t("Explore")}
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* All Categories Grid */}
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
            {t("all_categories")}
          </h2>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => {
              return (
                <motion.div
                  key={category.id}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                  }}
                  whileHover={{
                    y: -5,
                  }}
                  className="group h-full"
                >
                  <Link
                    href={`/blog/category/${category.slug}`}
                    className="flex flex-col h-full overflow-hidden rounded-xl bg-white dark:bg-zinc-800 shadow-md hover:shadow-xl dark:shadow-zinc-900/30 dark:hover:shadow-zinc-900/50 transition-all duration-300 border border-zinc-100 dark:border-zinc-700"
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      <Image
                        src={category.image || "/placeholder.svg"}
                        alt={category.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>

                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white drop-shadow-sm">
                          {category.name}
                        </h2>
                        {category.postCount !== undefined && (
                          <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-white">
                            {category.postCount}{" "}
                            {category.postCount === 1 ? "post" : "posts"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <p className="text-zinc-600 dark:text-zinc-300 mb-4 line-clamp-2">
                        {category.description ||
                          "Explore posts in this category"}
                      </p>

                      <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-sm font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                        {t("browse_posts")}
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
