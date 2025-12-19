"use client";

import { motion } from "framer-motion";
import { FileText, Clock, ArrowRight } from "lucide-react";
import { BlogCard } from "../blog-card";
import { EmptyState } from "./empty-state";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

interface RecentArticlesProps {
  posts: Post[];
}

export function RecentArticles({ posts }: RecentArticlesProps) {
  const t = useTranslations("blog_blog");
  const { settings } = useConfigStore();
  const postsPerPage = settings?.postsPerPage
    ? Number(settings.postsPerPage)
    : 6;
  const recentPosts = posts.slice(0, Math.min(postsPerPage, 6)); // Show up to 6 posts max for home page

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
          className="mb-4 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
        >
          <Clock className="w-4 h-4 mr-2" />
          {t("recent_articles")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
          {t("recent_articles").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="bg-linear-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
            {t("recent_articles").split(" ").slice(-1)[0]}
          </span>
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Fresh insights and articles from our community
        </p>
      </motion.div>

      {recentPosts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {recentPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <BlogCard post={post} />
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("no_recent_articles_yet")}
          description={t("were_working_on_creating_new_content")}
          icon={FileText}
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
              className="rounded-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t("view_all_articles")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      )}
    </section>
  );
}
