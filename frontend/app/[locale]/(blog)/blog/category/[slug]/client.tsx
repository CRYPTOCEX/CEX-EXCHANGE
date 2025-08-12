"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useBlogStore } from "@/store/blog/user";
import { BlogCard } from "../../components/blog-card";
import { Pagination } from "../../components/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen, AlertCircle, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function CategoryDetailClient() {
  const t = useTranslations("blog");
  const { slug } = useParams() as { slug: string };
  const { category, fetchCategory, pagination, error } = useBlogStore();
  const [isLoading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    await fetchCategory(slug);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-1/3 mb-8" />
          <Skeleton className="h-6 w-1/4 mb-12" />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="container mx-auto px-4 py-12">
          <Link
            href="/blog/category"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-8 transition-colors duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("all_categories")}
          </Link>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-8 text-center max-w-2xl mx-auto border border-zinc-100 dark:border-zinc-700">
            <div className="bg-red-50 dark:bg-red-950/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-zinc-100">
              {t("category_not_found")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-300 mb-6">
              {t("we_couldnt_find_the_category")}
              {slug}
              untitled. {t("it_may_have_been_removed_or_doesnt_exist")}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/blog/category">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {t("browse_all_categories")}
                </Button>
              </Link>
              <Link href="/blog">
                <Button className="w-full sm:w-auto">
                  {t("explore_blog_posts")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (category.posts?.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <div className="container mx-auto px-4 py-12">
          <Link
            href="/blog/category"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-8 transition-colors duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("all_categories")}
          </Link>

          {/* Category Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 p-8 mb-12 shadow-lg"
          >
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <h1 className="text-4xl font-bold mb-4 text-white">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-xl text-indigo-100 mb-4">
                  {category.description}
                </p>
              )}
            </div>
          </motion.div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-8 text-center border border-zinc-100 dark:border-zinc-700">
            <div className="bg-blue-50 dark:bg-blue-950/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              {t("no_posts_found")}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6">
              {t("there_are_no_posts_in_this_category_yet")}.{" "}
              {t("be_the_first_to_contribute")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/blog">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {t("browse_all_posts")}
                </Button>
              </Link>
              <Link href="/blog/author">
                <Button className="w-full sm:w-auto">
                  {t("become_an_author")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50/30 to-white dark:from-black dark:via-zinc-900/30 dark:to-black">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/blog/category"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-4 transition-colors duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("all_categories")}
          </Link>

          {/* Enhanced Category Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl shadow-lg mb-8"
          >
            {/* Background Image or Gradient */}
            <div className="relative h-64 w-full">
              {category.image ? (
                <Image
                  src={category.image || "/placeholder.svg"}
                  alt={category.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20"></div>

              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden opacity-20">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white blur-3xl"></div>
              </div>
            </div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-center mb-4">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full mr-4">
                  <FolderOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">
                    {category.name}
                  </h1>
                  {category.description && (
                    <p className="text-xl text-white/90 mb-2">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>

              {category.posts && category.posts.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                    <span className="text-white font-medium">
                      {category.posts.length}
                      {t("of")}
                      {pagination.totalItems}
                      {t("posts")}
                    </span>
                  </div>
                  {category.postCount && (
                    <div className="bg-indigo-500/20 backdrop-blur-sm px-4 py-2 rounded-full">
                      <span className="text-white font-medium">
                        {category.postCount}
                        {t("total")}{" "}
                        {category.postCount === 1 ? "post" : "posts"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {error ? (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-6 rounded-lg mb-8">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">{t("error_loading_category")}</span>
            </div>
            <p className="mt-1">{error}</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {category.posts?.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <BlogCard post={post} />
                </motion.div>
              ))}
            </div>

            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              baseUrl={`/blog/category/${slug}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
