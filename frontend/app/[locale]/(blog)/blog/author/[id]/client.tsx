"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { BlogCard } from "../../components/blog-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

export function AuthorPostsClient() {
  const t = useTranslations("blog");
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
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-12 w-1/3 mb-8" />
        <Skeleton className="h-6 w-1/4 mb-12" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-4 transition-colors duration-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back_to_blog")}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-white dark:bg-zinc-800 p-8 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700 mb-8"
        >
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-75 blur-sm"></div>
            <Image
              className="relative h-32 w-32 rounded-full object-cover border-2 border-white dark:border-zinc-800"
              src={author?.user?.avatar || "/img/placeholder.svg"}
              alt={author?.user?.firstName || "Author"}
              width={128}
              height={128}
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
              {author?.user?.firstName} {author?.user?.lastName}
            </h1>
            <p className="text-indigo-600 dark:text-indigo-400 mb-4">
              {t("Author")}
            </p>
            {showAuthorBio && (
              <>
                <p className="text-zinc-600 dark:text-zinc-300 mb-4">
                  {author?.user?.profile?.bio}
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  {Object.entries(author?.user?.profile?.social || {})
                    .filter(([platform, url]) => url)
                    .map(([platform, url]) => (
                      <Link href={url as string} key={platform}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        >
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </Button>
                      </Link>
                    ))}
                </div>
              </>
            )}
          </div>
        </motion.div>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {t("articles_by")} {author?.user?.firstName}{" "}
            {author?.user?.lastName}
          </h2>
          {author.posts?.length > 0 && (
            <p className="text-zinc-500 dark:text-zinc-400">
              {t("Showing")} {author.posts?.length}{" "}
              {author.posts?.length === 1 ? "article" : "articles"}
            </p>
          )}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded-lg border border-red-100 dark:border-red-900/50">
          {error}
        </div>
      ) : author.posts?.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
          <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {t("no_posts_found")}
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            {t("this_author_hasnt_published_any_articles_yet")}.
          </p>
          <Link href="/blog">
            <Button>{t("browse_all_posts")}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {author.posts?.map((post, index) => (
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
        </div>
      )}
    </div>
  );
}
