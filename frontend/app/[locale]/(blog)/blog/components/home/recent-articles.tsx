"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { BlogCard } from "../blog-card";
import { EmptyState } from "./empty-state";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

interface RecentArticlesProps {
  posts: Post[];
}

export function RecentArticles({ posts }: RecentArticlesProps) {
  const t = useTranslations("blog");
  const { settings } = useConfigStore();
  const postsPerPage = settings?.postsPerPage
    ? Number(settings.postsPerPage)
    : 6;
  const recentPosts = posts.slice(0, Math.min(postsPerPage, 6)); // Show up to 6 posts max for home page

  return (
    <div className="mb-20">
      <div className="mb-8 flex items-center justify-between">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          {t("recent_articles")}
        </motion.h2>
      </div>

      {recentPosts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {recentPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <BlogCard post={post} />
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Recent Articles Yet"
          description="We're working on creating new content. Check back soon for the latest articles!"
          icon={FileText}
        />
      )}
    </div>
  );
}
