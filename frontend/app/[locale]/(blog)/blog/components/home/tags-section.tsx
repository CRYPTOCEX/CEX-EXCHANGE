"use client";

import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlogStore } from "@/store/blog/user";
import { useTranslations } from "next-intl";

export function TagsSection() {
  const t = useTranslations("blog");
  const { tags, tagsLoading } = useBlogStore();

  if (tagsLoading && tags.length === 0) {
    return (
      <div className="mb-20">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-8">
          {t("popular_tags")}
        </h2>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="mb-20">
      <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-8">
        {t("popular_tags")}
      </h2>
      <div className="flex flex-wrap gap-3">
        {tags.slice(0, 15).map((tag, index) => (
          <motion.div
            key={tag.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Link
              href={`/blog/tag/${tag.slug}`}
              className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-950/40 px-4 py-2 text-sm font-medium text-indigo-800 dark:text-indigo-300 transition-colors hover:bg-indigo-200 dark:hover:bg-indigo-900/60"
            >
              {tag.name}
              {tag.postCount && (
                <span className="ml-2 rounded-full bg-indigo-200 dark:bg-indigo-800/60 px-2 py-0.5 text-xs">
                  {tag.postCount}
                </span>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
      {tags.length > 15 && (
        <div className="mt-8 text-center">
          <Link
            href="/blog/tag"
            className="inline-block rounded-md bg-indigo-600 dark:bg-indigo-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:hover:bg-indigo-600"
          >
            {t("view_all_tags")}
          </Link>
        </div>
      )}
    </div>
  );
}
