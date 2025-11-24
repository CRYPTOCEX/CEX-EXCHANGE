"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useBlogStore } from "@/store/blog/user";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryList() {
  const { categories, categoriesLoading, fetchCategories } = useBlogStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  if (categoriesLoading && categories.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <Skeleton className="h-32 w-full rounded-xl mb-2" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/blog/category/${category.slug}`}
          className="group relative flex flex-col items-center overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 dark:shadow-zinc-800/50 dark:hover:shadow-zinc-800"
        >
          <div className="relative h-32 w-full overflow-hidden">
            <Image
              src={category.image || "/placeholder.svg"}
              alt={category.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 via-indigo-900/60 to-indigo-900/30 group-hover:from-indigo-800/90 group-hover:via-indigo-800/60 group-hover:to-indigo-800/30 transition-colors duration-300"></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-100 transition-colors duration-300">
              {category.name}
              {category.postCount !== undefined && (
                <span className="ml-2 text-xs bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-white">
                  {category.postCount}
                </span>
              )}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
