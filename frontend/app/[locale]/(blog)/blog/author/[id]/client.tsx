"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { BlogCard } from "../../components/blog-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, FileText, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function AuthorPostsClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { id } = useParams() as { id: string };
  const [author, setAuthor] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useConfigStore();

  const showAuthorBio =
    settings?.showAuthorBio && typeof settings?.showAuthorBio === "boolean"
      ? settings.showAuthorBio
      : Boolean(settings?.showAuthorBio);

  const fetchAuthorPosts = async () => {
    setIsLoading(true);
    const { data, error } = await $fetch({
      url: `/api/blog/author/${id}`,
      silentSuccess: true,
    });

    if (error) {
      setError(error);
    } else {
      const profile =
        typeof data.user.profile === "string"
          ? JSON.parse(data.user.profile)
          : data.user.profile;
      data.user.profile = profile;
      setAuthor(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAuthorPosts();
  }, []);

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
          {/* Author Header Card Skeleton */}
          <div className="relative overflow-hidden rounded-3xl shadow-2xl mb-12">
            <div className="relative h-72 md:h-80 w-full">
              {/* Gradient background skeleton */}
              <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700 animate-pulse"></div>
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-indigo-500/15 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link Skeleton */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Skeleton className="h-5 w-24 rounded-full bg-white/20" />
            </div>

            {/* Author Info Skeleton */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
                {/* Avatar Skeleton */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-2 bg-linear-to-br from-white/30 to-white/10 rounded-full blur-xl"></div>
                  <div className="absolute -inset-1 bg-linear-to-r from-indigo-400 to-purple-400 rounded-full opacity-75 blur-sm"></div>
                  <Skeleton className="relative h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white/30 shadow-2xl bg-white/20" />
                </div>

                {/* Author Name & Bio Skeleton */}
                <div className="flex-1 text-center md:text-left">
                  <Skeleton className="h-6 w-20 rounded-full bg-white/20 mb-3 mx-auto md:mx-0" />
                  <Skeleton className="h-10 md:h-12 w-64 rounded-lg bg-white/20 mb-3 mx-auto md:mx-0" />
                  <Skeleton className="h-6 w-96 max-w-full rounded-lg bg-white/20 mx-auto md:mx-0" />
                </div>

                {/* Article Count Skeleton */}
                <div className="shrink-0">
                  <Skeleton className="h-10 w-28 rounded-full bg-white/20 backdrop-blur-md border border-white/10" />
                </div>
              </div>
            </div>
          </div>

          {/* Section Title Skeleton */}
          <Skeleton className="h-8 w-64 mb-8 rounded-lg" />

          {/* Posts Grid Skeleton */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="group relative h-full overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg"
              >
                {/* Image Skeleton */}
                <div className="relative h-52 w-full overflow-hidden">
                  <Skeleton className="absolute inset-0" />
                  {/* Category Badge Skeleton */}
                  <Skeleton className="absolute left-4 top-4 h-7 w-20 rounded-full" />
                </div>

                {/* Content Skeleton */}
                <div className="relative flex flex-1 flex-col p-6">
                  {/* Title Skeleton */}
                  <Skeleton className="h-6 w-full mb-2 rounded-lg" />
                  <Skeleton className="h-6 w-3/4 mb-3 rounded-lg" />

                  {/* Description Skeleton */}
                  <Skeleton className="h-4 w-full mb-1 rounded-lg" />
                  <Skeleton className="h-4 w-5/6 mb-6 rounded-lg" />

                  {/* Author & Date Skeleton */}
                  <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <Skeleton className="h-4 w-20 rounded-lg" />
                    </div>
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
          {/* Enhanced Author Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl mb-12"
          >
            <div className="relative h-72 md:h-80 w-full">
              <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700"></div>
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-indigo-500/15 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link - Inside Hero */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/author"
                className="inline-flex items-center text-sm text-white/80 hover:text-white transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                {t("all_authors") || "All Authors"}
              </Link>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
                <div className="relative shrink-0">
                  <div className="absolute -inset-2 bg-linear-to-br from-white/30 to-white/10 rounded-full blur-xl"></div>
                  <div className="absolute -inset-1 bg-linear-to-r from-indigo-400 to-purple-400 rounded-full opacity-75 blur-sm"></div>
                  <Image
                    className="relative h-32 w-32 md:h-40 md:w-40 rounded-full object-cover border-4 border-white/30 shadow-2xl"
                    src={author?.user?.avatar || "/img/placeholder.svg"}
                    alt={author?.user?.firstName || "Author"}
                    width={160}
                    height={160}
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-sm font-medium mb-3">
                    <User className="h-3.5 w-3.5" />
                    {tCommon("author")}
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
                    {author?.user?.firstName} {author?.user?.lastName}
                  </h1>
                  {showAuthorBio && author?.user?.profile?.bio && (
                    <p className="text-lg text-white/90 max-w-2xl line-clamp-2">
                      {author?.user?.profile?.bio}
                    </p>
                  )}
                  {showAuthorBio && (
                    <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                      {Object.entries(author?.user?.profile?.social || {})
                        .filter(([, url]) => url)
                        .map(([platform, url]) => (
                          <Link href={url as string} key={platform} target="_blank">
                            <Button
                              variant="glass"
                              size="sm"
                              className="rounded-full text-white border-white/20 hover:bg-white/20"
                            >
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
                {author?.posts?.length > 0 && (
                  <div className="shrink-0 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10">
                    <span className="text-white font-semibold">
                      {author.posts.length} {author.posts.length === 1 ? "article" : "articles"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("articles_by")} {author?.user?.firstName}
            </h2>
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
        ) : author?.posts?.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl p-10 text-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl"
          >
            <div className="bg-linear-to-br from-blue-500/10 to-indigo-500/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <FileText className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              {tCommon("no_posts_found")}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-lg">
              {t("this_author_hasnt_published_any_articles_yet")}.
            </p>
            <Link href="/blog">
              <Button size="lg" className="rounded-full">{t("browse_all_posts")}</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {author?.posts?.map((post: any, index: number) => (
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
          </div>
        )}
      </div>
    </div>
  );
}
