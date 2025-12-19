"use client";

import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { useBlogStore } from "@/store/blog/user";
import { useTranslations } from "next-intl";
import { Hash, ArrowRight, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function TagsSection() {
  const t = useTranslations("common");
  const tBlogBlog = useTranslations("blog_blog");
  const { tags, tagsLoading } = useBlogStore();

  if (tagsLoading && tags.length === 0) {
    return (
      <section className="py-16">
        {/* Section Header Skeleton */}
        <div className="text-center mb-12">
          <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 animate-pulse" />
          <div className="h-12 w-72 bg-zinc-200 dark:bg-zinc-800 rounded-lg mx-auto mb-4 animate-pulse" />
        </div>
        {/* Tags Skeleton */}
        <div className="flex flex-wrap justify-center gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-10 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!tags || tags.length === 0) {
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
          className="mb-4 px-4 py-2 rounded-full bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
        >
          <Tag className="w-4 h-4 mr-2" />
          {t("popular_tags")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
          Explore by{" "}
          <span className="bg-linear-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Topic
          </span>
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Find articles that match your interests
        </p>
      </motion.div>

      {/* Premium Tags Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-wrap justify-center gap-3"
      >
        {tags.slice(0, 15).map((tag, index) => (
          <motion.div
            key={tag.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
          >
            <Link
              href={`/blog/tag/${tag.slug}`}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            >
              <Hash className="w-4 h-4 text-purple-500 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300">
                {tag.name}
              </span>
              {tag.postCount !== undefined && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 font-semibold">
                  {tag.postCount}
                </span>
              )}
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* View All Button */}
      {tags.length > 15 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link href="/blog/tag">
            <Button
              size="lg"
              className="rounded-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {tBlogBlog("view_all_tags")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}
    </section>
  );
}
