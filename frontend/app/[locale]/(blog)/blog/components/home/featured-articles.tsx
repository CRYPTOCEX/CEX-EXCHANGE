"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, FileText, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
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
  const recentPosts = posts.slice(1); // The first post is used as the hero

  return (
    <div className="mb-20">
      <div className="mb-8 flex items-center justify-between">
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
          className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          Featured Articles
        </motion.h2>
        {category ? (
          <span className="text-lg text-zinc-600 dark:text-zinc-400">
            Showing posts in{" "}
            <span className="font-medium">{category.replace(/-/g, " ")}</span>
          </span>
        ) : tag ? (
          <span className="text-lg text-zinc-600 dark:text-zinc-400">
            Showing posts tagged with{" "}
            <span className="font-medium">{tag.replace(/-/g, " ")}</span>
          </span>
        ) : null}
      </div>

      {/* Featured posts in a more impressive layout */}
      {recentPosts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Large featured post */}
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
            className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute inset-0">
              <Image
                src={recentPosts[0]?.image || "/placeholder.svg"}
                alt={recentPosts[0]?.title || "Featured Post"}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
            </div>
            <div className="relative z-10 flex h-full flex-col justify-end p-8">
              {recentPosts[0]?.category && (
                <div>
                  <Link
                    href={`/blog/category/${recentPosts[0].category.slug}`}
                    className="inline-block rounded-full bg-indigo-600/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-indigo-500 transition-colors duration-300 shadow-md"
                  >
                    {recentPosts[0].category.name}
                  </Link>
                </div>
              )}
              <h3 className="mb-4 text-2xl font-bold text-white">
                <Link
                  href={`/blog/${recentPosts[0]?.slug}`}
                  className="hover:underline"
                >
                  {recentPosts[0]?.title}
                </Link>
              </h3>
              <div className="flex items-center">
                {recentPosts[0]?.author?.user && (
                  <>
                    <Image
                      className="h-8 w-8 rounded-full border border-white/50"
                      src={
                        recentPosts[0].author.user.avatar || "/placeholder.svg"
                      }
                      alt={recentPosts[0].author.user.firstName || "Author"}
                      width={32}
                      height={32}
                    />
                    <span className="ml-2 text-sm text-white">
                      {recentPosts[0].author.user.firstName}
                    </span>
                  </>
                )}
                <span className="mx-2 text-white/60">•</span>
                {recentPosts[0]?.createdAt && (
                  <span className="text-sm text-white/80">
                    {formatDistanceToNow(new Date(recentPosts[0].createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Grid of smaller posts */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {recentPosts.slice(1, 5).map((post, index) => {
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
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  className="group flex flex-col overflow-hidden rounded-xl bg-white dark:bg-zinc-800 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative h-40 w-full overflow-hidden">
                    <Image
                      src={post.image || "/placeholder.svg"}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity duration-300"></div>
                    {post.category && (
                      <div className="absolute top-3 left-3">
                        <Link
                          href={`/blog/category/${post.category.slug}`}
                          className="rounded-full bg-indigo-600/90 backdrop-blur-sm px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 transition-colors duration-300 shadow-sm"
                        >
                          {post.category.name}
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2">
                      <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                    </h3>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <div className="flex items-center">
                        {post.author?.user && (
                          <Image
                            className="h-6 w-6 rounded-full"
                            src={
                              post.author.user.avatar || "/img/placeholder.svg"
                            }
                            alt={post.author.user.firstName || "Author"}
                            width={24}
                            height={24}
                          />
                        )}
                        <span className="ml-2 text-xs text-zinc-600 dark:text-zinc-400">
                          {post.createdAt &&
                            formatDistanceToNow(new Date(post.createdAt), {
                              addSuffix: true,
                            })}
                        </span>
                      </div>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 flex items-center"
                      >
                        Read <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No Featured Articles Yet"
          description="We're working on curating our best content. Check back soon for featured articles!"
          icon={FileText}
          actionText="Become an Author"
          actionLink="/blog/author"
        />
      )}

      {recentPosts.length > 0 && (
        <div className="mt-12 text-center">
          <Link href="/blog/post" className="rounded-full">
            <Button size="lg" variant="outline">
              View More Articles <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
