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
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function CategoryDetailClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
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
      <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950 pt-24">
        {/* Premium Background */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.03) 10%, rgba(139, 92, 246, 0.02) 30%, transparent 60%)`,
          }}
        />
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
          }}
        />
        <FloatingShapes
          count={8}
          interactive={true}
          theme={{ primary: "indigo", secondary: "purple" }}
        />
        <InteractivePattern
          config={{
            enabled: true,
            variant: "crosses",
            opacity: 0.015,
            size: 40,
            interactive: true,
          }}
        />

        <div className="relative z-10 container mx-auto px-4 pb-16">
          {/* Category Header Skeleton */}
          <div className="mb-12 relative overflow-hidden rounded-3xl shadow-2xl">
            {/* Gradient Background Skeleton */}
            <div className="relative h-72 md:h-80 w-full">
              <Skeleton className="absolute inset-0 rounded-none" />

              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-indigo-500/15 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link Skeleton */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Skeleton className="h-5 w-32 rounded-full" />
            </div>

            {/* Content Overlay Skeleton */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-start gap-5">
                  {/* Icon Skeleton */}
                  <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-3">
                    {/* Title Skeleton */}
                    <Skeleton className="h-10 w-64 rounded-lg" />
                    {/* Description Skeleton */}
                    <Skeleton className="h-6 w-96 rounded-lg" />
                  </div>
                </div>

                {/* Post Count Badge Skeleton */}
                <Skeleton className="h-10 w-40 rounded-full" />
              </div>
            </div>
          </div>

          {/* Blog Cards Grid Skeleton */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg"
              >
                {/* Image Section Skeleton */}
                <div className="relative h-52 w-full">
                  <Skeleton className="h-full w-full rounded-none" />
                  {/* Category Badge Skeleton */}
                  <div className="absolute left-4 top-4">
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                </div>

                {/* Content Section Skeleton */}
                <div className="p-6 space-y-4">
                  {/* Title Skeleton */}
                  <Skeleton className="h-6 w-full rounded-lg" />
                  <Skeleton className="h-6 w-3/4 rounded-lg" />
                  {/* Description Skeleton */}
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-4 w-5/6 rounded-lg" />

                  {/* Author & Date Footer Skeleton */}
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar Skeleton */}
                      <Skeleton className="h-9 w-9 rounded-full" />
                      {/* Author Name Skeleton */}
                      <Skeleton className="h-4 w-20 rounded-lg" />
                    </div>
                    {/* Date Skeleton */}
                    <Skeleton className="h-4 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950 pt-24">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
          }}
        />
        <FloatingShapes
          count={6}
          interactive={true}
          theme={{ primary: "indigo", secondary: "purple" }}
        />
        <div className="relative z-10 container mx-auto px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-10 text-center max-w-2xl mx-auto border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl relative"
          >
            <Link
              href="/blog/category"
              className="absolute top-6 left-6 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200 group"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
              {tCommon("all_categories")}
            </Link>
            <div className="bg-linear-to-br from-red-500/10 to-orange-500/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 mt-6">
              <FolderOpen className="h-10 w-10 text-red-500 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
              {tCommon("category_not_found")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-300 mb-8 text-lg">
              {t("we_couldnt_find_the_category")} <span className="font-semibold text-indigo-600 dark:text-indigo-400">{slug}</span>. {t("it_may_have_been_removed_or_doesnt_exist")}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog/category">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {tCommon("browse_all_categories")}
                </Button>
              </Link>
              <Link href="/blog">
                <Button size="lg" className="w-full sm:w-auto rounded-full">
                  {t("explore_blog_posts")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (category.posts?.length === 0) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950 pt-24">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
          }}
        />
        <FloatingShapes
          count={6}
          interactive={true}
          theme={{ primary: "indigo", secondary: "purple" }}
        />
        <div className="relative z-10 container mx-auto px-4 pb-16">
          {/* Category Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl mb-12"
          >
            <div className="relative h-64 w-full">
              <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700"></div>
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link - Inside Hero */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/category"
                className="inline-flex items-center text-sm text-white/80 hover:text-white transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                {tCommon("all_categories")}
              </Link>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex items-start gap-5">
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
                  <FolderOpen className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
                    {category.name}
                  </h1>
                  {category.description && (
                    <p className="text-lg md:text-xl text-white/90">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-10 text-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl"
          >
            <div className="bg-linear-to-br from-blue-500/10 to-indigo-500/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <FileText className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              {tCommon("no_posts_found")}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-lg">
              {t("there_are_no_posts_in_this_category_yet")}. {t("be_the_first_to_contribute")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t("browse_all_posts")}
                </Button>
              </Link>
              <Link href="/blog/author">
                <Button size="lg" className="w-full sm:w-auto rounded-full">
                  {t("become_an_author")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950 pt-24">
      {/* Premium Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.03) 10%, rgba(139, 92, 246, 0.02) 30%, transparent 60%)`,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
        }}
      />
      <FloatingShapes
        count={8}
        interactive={true}
        theme={{ primary: "indigo", secondary: "purple" }}
      />
      <InteractivePattern
        config={{
          enabled: true,
          variant: "crosses",
          opacity: 0.015,
          size: 40,
          interactive: true,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 pb-16">
        <div className="mb-8">
          {/* Enhanced Category Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl mb-12"
          >
            {/* Background Image or Gradient */}
            <div className="relative h-72 md:h-80 w-full">
              {category.image && (category.image.startsWith('http') || category.image.startsWith('/')) ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700"></div>
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/10"></div>

              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-indigo-500/15 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link - Inside Hero */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/category"
                className="inline-flex items-center text-sm text-white/80 hover:text-white transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                {tCommon("all_categories")}
              </Link>
            </div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
                    <FolderOpen className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
                      {category.name}
                    </h1>
                    {category.description && (
                      <p className="text-lg md:text-xl text-white/90 max-w-2xl">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                {category.posts && category.posts.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10">
                      <span className="text-white font-semibold">
                        {category.posts.length} {tCommon("of")} {pagination.totalItems} {tCommon("posts")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 p-6 rounded-2xl mb-8 backdrop-blur-sm"
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">{tCommon("error_loading_category")}</span>
            </div>
            <p className="mt-1">{error}</p>
          </motion.div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {category.posts?.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
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
