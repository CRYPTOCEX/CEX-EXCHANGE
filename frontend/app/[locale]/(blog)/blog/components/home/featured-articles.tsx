"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, FileText, ArrowUpRight, Sparkles, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./empty-state";
import { useTranslations } from "next-intl";

interface FeaturedArticlesProps {
  posts: Post[];
  category?: string | null;
  tag?: string | null;
}

export function FeaturedArticles({
  posts,
  category,
  tag,
}: FeaturedArticlesProps) {
  const t = useTranslations("blog_blog");
  const recentPosts = posts.slice(1); // The first post is used as the hero

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
          className="mb-4 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {t("featured_articles")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
          {t("featured_articles").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
            {t("featured_articles").split(" ").slice(-1)[0]}
          </span>
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          {category ? (
            <>
              {t("showing_posts_in")}{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">{category.replace(/-/g, " ")}</span>
            </>
          ) : tag ? (
            <>
              {t("showing_posts_tagged_with")}{" "}
              <span className="font-semibold text-amber-600 dark:text-amber-400">{tag.replace(/-/g, " ")}</span>
            </>
          ) : (
            "Handpicked articles from our editorial team"
          )}
        </p>
      </motion.div>

      {/* Premium Bento Grid Layout */}
      {recentPosts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large Featured Post - Spans 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 lg:row-span-2"
          >
            <Link
              href={`/blog/${recentPosts[0]?.slug}`}
              className="group relative block h-full min-h-[400px] lg:min-h-[500px] overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              {/* Image */}
              <div className="absolute inset-0">
                <Image
                  src={recentPosts[0]?.image || "/placeholder.svg"}
                  alt={recentPosts[0]?.title || "Featured Post"}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
              </div>

              {/* Floating orb effect */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                {recentPosts[0]?.category && (
                  <span className="inline-flex items-center self-start gap-1 px-3 py-1 rounded-full bg-amber-500/90 backdrop-blur-sm text-xs font-semibold text-white mb-4 shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    {recentPosts[0].category.name}
                  </span>
                )}
                <h3 className="text-3xl lg:text-4xl font-bold text-white mb-4 group-hover:text-amber-100 transition-colors duration-300">
                  {recentPosts[0]?.title}
                </h3>
                {recentPosts[0]?.description && (
                  <p className="text-white/80 text-lg mb-6 line-clamp-2">
                    {recentPosts[0].description}
                  </p>
                )}
                <div className="flex items-center gap-4">
                  {recentPosts[0]?.author?.user && (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full opacity-75 blur-sm" />
                        <Image
                          className="relative h-10 w-10 rounded-full border-2 border-white/50"
                          src={recentPosts[0].author.user.avatar || "/placeholder.svg"}
                          alt={recentPosts[0].author.user.firstName || "Author"}
                          width={40}
                          height={40}
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {recentPosts[0].author.user.firstName}
                        </p>
                        {recentPosts[0]?.createdAt && (
                          <p className="text-white/60 text-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(recentPosts[0].createdAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hover arrow indicator */}
              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <ArrowUpRight className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Smaller Featured Posts */}
          {recentPosts.slice(1, 5).map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group relative block h-full min-h-[240px] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg hover:shadow-xl transition-all duration-500"
              >
                {/* Image */}
                <div className="absolute inset-0">
                  <Image
                    src={post.image || "/placeholder.svg"}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  {post.category && (
                    <span className="inline-flex items-center self-start gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium text-white mb-3 border border-white/10">
                      {post.category.name}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-100 transition-colors duration-300 line-clamp-2">
                    {post.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {post.author?.user && (
                        <Image
                          className="h-6 w-6 rounded-full border border-white/30"
                          src={post.author.user.avatar || "/img/placeholder.svg"}
                          alt={post.author.user.firstName || "Author"}
                          width={24}
                          height={24}
                        />
                      )}
                      <span className="text-xs text-white/70">
                        {post.createdAt && formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("no_featured_articles_yet")}
          description={`${t("were_working_on_curating_our_best_content")} ${t("check_back_soon_for_featured_articles")}`}
          icon={FileText}
          actionText="Become an Author"
          actionLink="/blog/author"
        />
      )}

      {/* View All Button */}
      {recentPosts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link href="/blog/post">
            <Button
              size="lg"
              className="rounded-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t("view_more_articles")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}
    </section>
  );
}
