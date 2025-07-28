"use client";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useBlogStore } from "@/store/blog/user";
import { BlogCard } from "../../components/blog-card";
import { Pagination } from "../../components/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TagIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
export function TagDetailClient() {
  const t = useTranslations("blog");
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
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-12 w-1/3 mb-8" />
        <Skeleton className="h-6 w-1/4 mb-12" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {" "}
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}{" "}
        </div>
      </div>
    );
  }
  if (!tag || tag.posts?.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Link
          href="/blog/tag"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-8 transition-colors duration-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("back_to_all_tags")}{" "}
        </Link>
        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-8 text-center max-w-2xl mx-auto border border-zinc-100 dark:border-zinc-700">
          <div className="bg-red-50 dark:bg-red-950/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <TagIcon className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-zinc-100">
            {" "}
            {t("tag_not_found")}{" "}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 mb-6">
            {" "}
            {t("we_couldnt_find_the_tag")} {slug} .{" "}
            {t("it_may_have_been_removed_or_doesnt_exist")}.{" "}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/blog/tag">
              <Button
                variant="outline"
                className="w-full sm:w-auto dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {" "}
                {t("browse_all_tags")}{" "}
              </Button>
            </Link>
            <Link href="/blog">
              <Button className="w-full sm:w-auto">
                {" "}
                {t("explore_blog_posts")}{" "}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <Link
          href="/blog/tag"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-4 transition-colors duration-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t("all_tags")}{" "}
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center"
        >
          <div className="bg-indigo-100 dark:bg-indigo-950/30 p-3 rounded-full mr-4">
            <TagIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">
              {" "}
              {tag.name}{" "}
            </h1>{" "}
            {tag?.posts.length > 0 && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {" "}
                {t("Showing")} {tag?.posts.length} {t("of")}{" "}
                {pagination.totalItems} {t("posts")}{" "}
              </div>
            )}{" "}
          </div>
        </motion.div>
      </div>{" "}
      {error ? (
        <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded-lg border border-red-100 dark:border-red-900/50">
          {" "}
          {error}{" "}
        </div>
      ) : tag?.posts.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
          <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {" "}
            {t("no_posts_found")}{" "}
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">
            {" "}
            {t("there_are_no_posts_with_this_tag_yet")}.{" "}
          </p>
          <Link href="/blog">
            <Button>{t("browse_all_posts")}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {" "}
            {tag?.posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <BlogCard post={post} />
              </motion.div>
            ))}{" "}
          </div>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            baseUrl={`/blog/tag/${slug}`}
          />
        </div>
      )}{" "}
    </div>
  );
}
