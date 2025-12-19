"use client";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useBlogStore } from "@/store/blog/user";
import { BlogCard } from "../../components/blog-card";
import { Pagination } from "../../components/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TagIcon, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function TagDetailClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { slug } = useParams() as { slug: string };
  const [loading, setLoading] = useState(true);
  const { error, tag, pagination, fetchTag } = useBlogStore();

  const fetchData = async () => {
    setLoading(true);
    await fetchTag(slug);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  if (loading) {
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
            {/* Tag Header Skeleton */}
            <div className="relative overflow-hidden rounded-3xl shadow-2xl mb-12">
              <div className="relative h-48 md:h-56 w-full">
                <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 animate-pulse"></div>
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl"></div>
                </div>
              </div>

              {/* Back Link Skeleton */}
              <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
                <Skeleton className="h-5 w-24 rounded-full bg-white/20" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                  <div className="flex items-center gap-5">
                    {/* Tag Icon Skeleton */}
                    <Skeleton className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md" />
                    <div>
                      {/* Tag Label Skeleton */}
                      <Skeleton className="h-4 w-8 mb-2 rounded bg-white/30" />
                      {/* Tag Name Skeleton */}
                      <Skeleton className="h-10 md:h-12 w-32 md:w-40 rounded bg-white/40" />
                    </div>
                  </div>

                  {/* Post Count Skeleton */}
                  <Skeleton className="h-9 w-36 rounded-full bg-white/20 backdrop-blur-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Blog Cards Grid Skeleton */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="group relative h-full overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg"
              >
                {/* Image Section Skeleton */}
                <Skeleton className="h-52 w-full rounded-none" />

                {/* Content Section Skeleton */}
                <div className="relative flex flex-1 flex-col p-6">
                  {/* Title Skeleton */}
                  <Skeleton className="h-6 w-full mb-2 rounded" />
                  <Skeleton className="h-6 w-3/4 mb-3 rounded" />

                  {/* Description Skeleton */}
                  <Skeleton className="h-4 w-full mb-1 rounded" />
                  <Skeleton className="h-4 w-5/6 rounded" />

                  {/* Author & Date Section Skeleton */}
                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar Skeleton */}
                      <Skeleton className="h-9 w-9 rounded-full" />
                      {/* Author Name Skeleton */}
                      <Skeleton className="h-4 w-20 rounded" />
                    </div>
                    {/* Date Skeleton */}
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tag || tag.posts?.length === 0) {
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
              href="/blog/tag"
              className="absolute top-6 left-6 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200 group"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
              {t("back_to_all_tags")}
            </Link>
            <div className="bg-linear-to-br from-red-500/10 to-orange-500/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 mt-6">
              <TagIcon className="h-10 w-10 text-red-500 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
              {t("tag_not_found")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-300 mb-8 text-lg">
              {t("we_couldnt_find_the_tag")} <span className="font-semibold text-indigo-600 dark:text-indigo-400">{slug}</span>. {t("it_may_have_been_removed_or_doesnt_exist")}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog/tag">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {t("browse_all_tags")}
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
          {/* Enhanced Tag Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl mb-12"
          >
            <div className="relative h-48 md:h-56 w-full">
              <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700"></div>
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link - Inside Hero */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/tag"
                className="inline-flex items-center text-sm text-white/80 hover:text-white transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                {t("all_tags")}
              </Link>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
                    <TagIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white/70 mb-1">Tag</div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
                      #{tag.name}
                    </h1>
                  </div>
                </div>

                {tag?.posts.length > 0 && (
                  <div className="bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10">
                    <span className="text-white font-semibold">
                      {tag?.posts.length} {tCommon("of")} {pagination.totalItems} {tCommon("posts")}
                    </span>
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
            className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-6 rounded-2xl border border-red-200 dark:border-red-900/50 backdrop-blur-sm"
          >
            {error}
          </motion.div>
        ) : tag?.posts.length === 0 ? (
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
              {t("there_are_no_posts_with_this_tag_yet")}.
            </p>
            <Link href="/blog">
              <Button size="lg" className="rounded-full">{t("browse_all_posts")}</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {tag?.posts.map((post, index) => (
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
              baseUrl={`/blog/tag/${slug}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
