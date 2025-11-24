"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useBlogStore } from "@/store/blog/user";
import { BlogCard } from "./blog-card";
import { Pagination } from "./pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export function BlogList() {
  const t = useTranslations("blog");
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const page = Number.parseInt(searchParams.get("page") || "1");

  const { posts, pagination, isLoading, fetchPosts } = useBlogStore();

  useEffect(() => {
    fetchPosts({
      page,
      limit: 9,
      category: category || undefined,
      tag: tag || undefined,
    });
  }, [fetchPosts, page, category, tag]);

  if (isLoading && posts.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-lg shadow dark:shadow-zinc-800"
          >
            <Skeleton className="h-48 w-full" />
            <div className="flex flex-1 flex-col justify-between bg-white dark:bg-zinc-800 p-6">
              <div className="flex-1">
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-6 w-full mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="mt-6 flex items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="ml-3">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0 && !isLoading) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          {t("no_posts_found")}
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400">
          {category
            ? `No posts found in this category.`
            : tag
              ? `No posts found with this tag.`
              : `There are no blog posts yet.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        baseUrl={`/blog${category ? `?category=${category}` : tag ? `?tag=${tag}` : ""}`}
      />
    </div>
  );
}
