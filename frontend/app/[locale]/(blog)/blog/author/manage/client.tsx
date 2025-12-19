"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { useBlogStore } from "@/store/blog/user";
import { Button } from "@/components/ui/button";
import { Pagination } from "../../components/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Edit,
  Trash2,
  Eye,
  PenSquare,
  Plus,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { $fetch } from "@/lib/api";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function PostsClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { author, pagination, postsLoading, fetchAuthor } = useBlogStore();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true);
        await fetchAuthor();
        setIsLoadingData(false);
      } catch (err) {
        console.error("Error loading posts:", err);
        setError("Failed to load posts");
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        setIsDeleting(true);
        const { error } = await $fetch({
          url: `/api/admin/blog/author/manage/${id}`,
          method: "DELETE",
        });
        if (error) {
          throw new Error(error);
        }
        await fetchAuthor();
      } catch (err: any) {
        console.error("Error deleting post:", err);
        setError(err.message || "Failed to delete post");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const posts = author?.posts || [];
  const filteredPosts = filter
    ? posts.filter((post) => post.status === filter)
    : posts;
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  if (isLoadingData || postsLoading || isDeleting) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-white dark:bg-zinc-950 pt-24">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%)`,
          }}
        />
        <div className="relative z-10 container mx-auto px-4 pb-16">
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-3xl" />
            <div className="flex justify-between">
              <Skeleton className="h-12 w-64 rounded-xl" />
              <Skeleton className="h-12 w-40 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-80 w-full rounded-2xl" />
              ))}
            </div>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Premium Header */}
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <div className="relative h-48 md:h-56 w-full">
              <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-700 dark:via-purple-700 dark:to-pink-700"></div>
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-indigo-500/15 blur-3xl"></div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl">
                    <PenSquare className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                      {t("my_blog_posts")}
                    </h1>
                    <p className="text-lg text-white/90">
                      {t("manage_and_create_your_blog_content")}
                    </p>
                  </div>
                </div>

                <Link href="/blog/author/manage/new">
                  <Button size="lg" variant="glass" className="rounded-full text-white border-white/20 hover:bg-white/20">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("create_new_post")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Alert variant="destructive" className="rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Filters and controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-5 rounded-2xl shadow-lg border border-zinc-200/50 dark:border-zinc-800/50"
          >
            <div className="flex gap-3">
              <Button
                variant={filter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(null)}
                className="rounded-full"
              >
                All
              </Button>
              <Button
                variant={filter === "PUBLISHED" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("PUBLISHED")}
                className="rounded-full"
              >
                Published
              </Button>
              <Button
                variant={filter === "DRAFT" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("DRAFT")}
                className="rounded-full"
              >
                Drafts
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="rounded-full flex items-center gap-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              {sortOrder === "asc" ? "Oldest first" : "Newest first"}
            </Button>
          </motion.div>

          {/* Posts grid view */}
          {sortedPosts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center py-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-zinc-200/50 dark:border-zinc-800/50"
            >
              <div className="mx-auto w-28 h-28 bg-linear-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center mb-8">
                <PenSquare className="h-12 w-12 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                {tCommon("no_posts_found")}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-lg">
                {t("start_creating_your_first_blog_post_today")}
              </p>
              <Link href="/blog/author/manage/new">
                <Button size="lg" className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("create_your_first_post")}
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {sortedPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-lg hover:shadow-2xl transition-all duration-300 border border-zinc-200/50 dark:border-zinc-800/50"
                >
                  {/* Post image */}
                  <div className="relative h-52 w-full overflow-hidden">
                    <Image
                      src={post.image || "/placeholder.svg"}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent"></div>

                    {/* Status badge */}
                    <div className="absolute top-4 right-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md ${
                          post.status === "PUBLISHED"
                            ? "bg-green-500/20 text-green-100 border border-green-400/30"
                            : "bg-yellow-500/20 text-yellow-100 border border-yellow-400/30"
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>

                    {/* Category badge */}
                    {post.category && (
                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center rounded-full bg-indigo-500/80 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white border border-indigo-400/30">
                          {post.category.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Post content */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2 mb-3">
                      {post.title}
                    </h3>

                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-5">
                      {post.description || post.content.substring(0, 120)}...
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center">
                        {post.createdAt && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-500">
                            {formatDistanceToNow(new Date(post.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                          onClick={() => router.push(`/blog/${post.slug}`)}
                        >
                          <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                          onClick={() =>
                            router.push(`/blog/author/manage/${post.id}/edit`)
                          }
                        >
                          <Edit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            baseUrl="/blog/author/manage"
          />
        </motion.div>
      </div>
    </div>
  );
}
