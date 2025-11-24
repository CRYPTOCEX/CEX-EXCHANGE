"use client";

import { Link } from "@/i18n/routing";
import Image from "next/image";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlogStore } from "@/store/blog/user";
import { useTranslations } from "next-intl";

export function CategoriesSection() {
  const t = useTranslations("blog");
  const { categories, categoriesLoading } = useBlogStore();

  if (categoriesLoading && categories.length === 0) {
    return (
      <div className="mb-20">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-8">
          {t("Categories")}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="mb-20">
      <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-8">
        {t("Categories")}
      </h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.slice(0, 6).map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link
              href={`/blog/category/${category.slug}`}
              className="group relative block h-40 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800"
            >
              {category.image ? (
                <Image
                  src={category.image || "/placeholder.svg"}
                  alt={category.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600" />
              )}
              <div className="absolute inset-0 bg-black/70 bg-opacity-40 transition-opacity duration-300 group-hover:bg-opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <h3 className="text-2xl font-bold text-white text-center">
                  {category.name}
                </h3>
              </div>
              {category.postCount && (
                <div className="absolute bottom-3 right-3 rounded-full bg-black bg-opacity-60 px-3 py-1 text-sm text-white">
                  {category.postCount}{" "}
                  {category.postCount === 1 ? "post" : "posts"}
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
      {categories.length > 6 && (
        <div className="mt-8 text-center">
          <Link
            href="/blog/category"
            className="inline-block rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            {t("view_all_categories")}
          </Link>
        </div>
      )}
    </div>
  );
}
