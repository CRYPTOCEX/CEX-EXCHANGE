"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ArrowRight, Users, Sparkles, FileText, PenTool } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBlogStore } from "@/store/blog/user";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

export function AuthorsSection() {
  const t = useTranslations("blog_blog");
  const { topAuthors, topAuthorsLoading, fetchTopAuthors } = useBlogStore();
  const { settings } = useConfigStore();
  const enableAuthorApplications =
    settings?.enableAuthorApplications === "true" ||
    settings?.enableAuthorApplications === true;

  useEffect(() => {
    fetchTopAuthors();
  }, [fetchTopAuthors]);

  if (topAuthorsLoading && topAuthors.length === 0) {
    return (
      <section className="py-16">
        {/* Section Header Skeleton */}
        <div className="text-center mb-12">
          <div className="h-8 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 animate-pulse" />
          <div className="h-12 w-80 bg-zinc-200 dark:bg-zinc-800 rounded-lg mx-auto mb-4 animate-pulse" />
          <div className="h-6 w-96 bg-zinc-200 dark:bg-zinc-800 rounded-lg mx-auto animate-pulse" />
        </div>
        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative h-72 rounded-2xl bg-zinc-200 dark:bg-zinc-800 overflow-hidden animate-pulse">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!topAuthors || topAuthors.length === 0) {
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
          className="mb-4 px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
        >
          <Users className="w-4 h-4 mr-2" />
          {t("meet_our_authors")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
          {t("our_authors").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="bg-linear-to-r from-rose-600 to-pink-600 dark:from-rose-400 dark:to-pink-400 bg-clip-text text-transparent">
            {t("our_authors").split(" ").slice(-1)[0]}
          </span>
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Meet the talented writers behind our content
        </p>
      </motion.div>

      {/* Premium Authors Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {topAuthors.slice(0, 4).map((author, index) => (
          <motion.div
            key={author.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link
              href={`/blog/author/${author.id}`}
              className="group relative block h-full overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-linear-to-br from-rose-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Floating orb effect */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content */}
              <div className="relative flex flex-col items-center text-center p-6">
                {/* Avatar with glow */}
                <div className="relative mb-4">
                  <div className="absolute -inset-1 bg-linear-to-r from-rose-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-75 blur-md transition-opacity duration-500" />
                  <div className="relative">
                    <Image
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-white dark:ring-zinc-900 group-hover:scale-105 transition-transform duration-500"
                      src={author.user.avatar || "/img/placeholder.svg"}
                      alt={author.user.firstName || "Author"}
                      width={96}
                      height={96}
                    />
                    {/* Online indicator / badge */}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-linear-to-r from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <PenTool className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>

                {/* Author info */}
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors duration-300">
                  {author.user.firstName || "Unknown"} {author.user.lastName || ""}
                </h3>
                <p className="text-sm text-rose-600 dark:text-rose-400 font-medium mb-2">
                  {author.user.role?.name || "Author"}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                  {author.user.profile?.bio || "No bio available"}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <FileText className="w-3 h-3 text-rose-500" />
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                    {author.postCount} {author.postCount === 1 ? "article" : "articles"}
                  </span>
                </div>

                {/* View link */}
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-rose-600 dark:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {t("view_articles")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <Link href="/blog/author">
          <Button
            size="lg"
            className="rounded-full bg-linear-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {t("view_all_authors")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        {enableAuthorApplications && (
          <Link href="/blog/author/apply">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all duration-300"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("become_an_author")}
            </Button>
          </Link>
        )}
      </motion.div>
    </section>
  );
}
