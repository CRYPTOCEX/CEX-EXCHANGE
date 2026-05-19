"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/routing";
import { useBlogStore } from "@/store/blog/user";
import { Skeleton } from "@/components/ui/skeleton";

export function TagList() {
  const { tags, tagsLoading, fetchTags } = useBlogStore();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  if (tagsLoading && tags.length === 0) {
    return (
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {tags.map((tag) => (
        <Link
          key={tag.id}
          href={`/blog/tag/${tag.slug}`}
          className="inline-flex items-center rounded-full bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 transition-all duration-300 hover:from-indigo-100 hover:to-indigo-50 dark:hover:from-indigo-900/40 dark:hover:to-indigo-950/60 hover:text-indigo-800 dark:hover:text-indigo-300 hover:shadow-sm"
        >
          {tag.name}
          {tag.postCount !== undefined && (
            <span className="ml-2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 text-xs text-indigo-800 dark:text-indigo-300">
              {tag.postCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
