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
export function PostsClient() {
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

        // Use the admin API endpoint for deleting posts
        // In a real app, you would create a user-specific endpoint
        const { error } = await $fetch({
          url: `/api/admin/blog/author/manage/${id}`,
          method: "DELETE",
        });
        if (error) {
          throw new Error(error);
        }

        // Refresh the posts list
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
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-indigo-50/30 to-white dark:from-black dark:via-indigo-950/5 dark:to-black">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="space-y-8"
        >
          {/* Header with gradient background */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800 p-8 shadow-lg">
            <div className="absolute inset-0 overflow-hidden opacity-20">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white blur-3xl"></div>
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">My Blog Posts</h1>
                <p className="mt-2 text-indigo-100">
                  Manage and create your blog content
                </p>
              </div>
              <Link
                href="/blog/author/manage/new"
                className="mt-4 md:mt-0 group"
              >
                <Button size="lg" variant={"glass"} rounded={"full"}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Post
                </Button>
              </Link>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Filters and controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700">
            <div className="flex gap-2">
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
              className="rounded-full flex items-center gap-1 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              {sortOrder === "asc" ? "Oldest first" : "Newest first"}
            </Button>
          </div>

          {/* Posts grid view */}
          {sortedPosts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700">
              <div className="mx-auto w-24 h-24 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center mb-6">
                <PenSquare className="h-10 w-10 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                No posts found
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                Start creating your first blog post today!
              </p>
              <Link href="/blog/author/manage/new" className="rounded-full">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedPosts.map((post, index) => {
                return (
                  <motion.div
                    key={post.id}
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.1,
                    }}
                    className="group relative overflow-hidden rounded-xl bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md transition-all duration-300 border border-zinc-100 dark:border-zinc-700"
                  >
                    {/* Post image */}
                    <div className="relative h-48 w-full overflow-hidden">
                      <Image
                        src={post.image || "/placeholder.svg"}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>

                      {/* Status badge */}
                      <div className="absolute top-3 right-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${post.status === "PUBLISHED" ? "bg-green-100 text-green-800 border border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900/50" : "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900/50"}`}
                        >
                          {post.status}
                        </span>
                      </div>

                      {/* Category badge */}
                      {post.category && (
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center rounded-full bg-indigo-600/90 dark:bg-indigo-700/90 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-white">
                            {post.category.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Post content */}
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2 mb-2">
                        {post.title}
                      </h3>

                      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4">
                        {post.description || post.content.substring(0, 120)}...
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {post.createdAt && (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
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
                            className="h-8 w-8 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-950/30 dark:text-zinc-300"
                            onClick={() => router.push(`/blog/${post.slug}`)}
                          >
                            <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-950/30 dark:text-zinc-300"
                            onClick={() =>
                              router.push(`/blog/author/manage/${post.id}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-zinc-300"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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
