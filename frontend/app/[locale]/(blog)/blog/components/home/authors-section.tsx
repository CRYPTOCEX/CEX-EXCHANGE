"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useBlogStore } from "@/store/blog/user";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfigStore } from "@/store/config";
export function AuthorsSection() {
  const { topAuthors, topAuthorsLoading, fetchTopAuthors } = useBlogStore();
  const { settings } = useConfigStore();
  const enableAuthorApplications =
    settings?.enableAuthorApplications === "true" ||
    settings?.enableAuthorApplications === true;
  useEffect(() => {
    // Always fetch top authors to show existing authors
    fetchTopAuthors();
  }, [fetchTopAuthors]);

  // Always show authors section, but conditionally show "Become an Author" button

  if (topAuthorsLoading) {
    return (
      <div className="mb-20">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="bg-indigo-50 dark:bg-indigo-950/20 p-8 rounded-xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mb-20">
      <motion.h2
        initial={{
          opacity: 0,
          x: -20,
        }}
        animate={{
          opacity: 1,
          x: 0,
        }}
        transition={{
          duration: 0.5,
        }}
        className="mb-8 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
      >
        Meet Our Authors
      </motion.h2>
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
        className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900/80 p-8 rounded-xl"
      >
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {topAuthors.length > 0 ? (
            topAuthors.map((author, index) => {
              return (
                <motion.div
                  key={author.id}
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
                    delay: index * 0.1,
                  }}
                  className="group flex flex-col items-center text-center bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 border border-indigo-50 dark:border-zinc-700"
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-75 blur-sm group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Image
                      className="relative h-32 w-32 rounded-full object-cover group-hover:scale-105 transition-transform duration-300"
                      src={author.user.avatar || "/img/placeholder.svg"}
                      alt={author.user.firstName || "Author"}
                      width={128}
                      height={128}
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {author.user.firstName || "Unknown"}{" "}
                    {author.user.lastName || ""}
                  </h3>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">
                    {author.user.role?.name || "Author"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {author.user.profile?.bio || "No bio available"}
                  </p>
                  <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    {author.postCount} articles
                  </div>
                  <Link
                    href={`/blog/author/${author.id}`}
                    className="mt-2 group flex items-center text-indigo-600 dark:text-indigo-400"
                  >
                    View articles
                    <ArrowRight className="ml-1 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-4 text-center py-8">
              <p className="text-zinc-500 dark:text-zinc-400">
                No authors found. Be the first to contribute!
              </p>
            </div>
          )}
        </div>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/blog/author" className="rounded-full">
            <Button variant="default">
              View All Authors <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          {enableAuthorApplications && (
            <Link href="/blog/author" className="rounded-full">
              <Button variant="outline">
                Become an Author <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}
