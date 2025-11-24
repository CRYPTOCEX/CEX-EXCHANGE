"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronLeft,
  Calendar,
  Clock,
  MessageSquare,
  Tag,
  ArrowRight,
} from "lucide-react";
import { useBlogStore } from "@/store/blog/user";
import { CommentList } from "../components/comment-list";
import { CommentForm } from "../components/comment-form";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import PostLoading from "./loading";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";

export default function PostClient() {
  const t = useTranslations("blog");
  const { slug } = useParams() as {
    slug: string;
  };
  const { post, fetchPost, isLoading, error } = useBlogStore();
  const [readingTime, setReadingTime] = useState("5 min");
  const { settings } = useConfigStore();
  const enableComments =
    settings?.enableComments && typeof settings?.enableComments === "boolean"
      ? settings.enableComments
      : Boolean(settings?.enableComments);
  const showRelatedPosts =
    settings?.showRelatedPosts &&
    typeof settings?.showRelatedPosts === "boolean"
      ? settings.showRelatedPosts
      : Boolean(settings?.showRelatedPosts);
  const showAuthorBio =
    settings?.showAuthorBio && typeof settings?.showAuthorBio === "boolean"
      ? settings.showAuthorBio
      : Boolean(settings?.showAuthorBio);
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    if (!post || post.slug !== slug) {
      fetchPost(slug);
    }

    // Calculate reading time based on content length
    if (post?.content) {
      // Create a temporary div to parse HTML and get text content
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = post.content;
      const textContent = tempDiv.textContent || tempDiv.innerText;
      const words = textContent.trim().split(/\s+/).length;
      const time = Math.ceil(words / 200); // Assuming 200 words per minute
      setReadingTime(`${time} min read`);
    }
  }, [fetchPost, slug, post]);
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-red-600 dark:text-red-400 mb-2">
            {t("error_loading_post")}
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">{error}</p>
          <Link
            href="/blog"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("back_to_blog")}
          </Link>
        </div>
      </div>
    );
  }
  if (!post || isLoading) {
    return <PostLoading />;
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-indigo-50/10 to-white dark:from-black dark:via-indigo-950/5 dark:to-black pb-12 sm:pb-16 md:pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <article className="mx-auto max-w-4xl">
          {/* Hero Section */}
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
              duration: 0.6,
            }}
            className="relative mb-8 sm:mb-10 md:mb-12 overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl"
          >
            {/* Featured Image */}
            <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[65vh] w-full overflow-hidden">
              <Image
                src={post.image || "/placeholder.svg"}
                alt={post.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 via-indigo-900/50 to-indigo-900/20 dark:from-indigo-950/90 dark:via-indigo-950/50 dark:to-indigo-950/20"></div>

              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden opacity-30">
                <div className="absolute -top-10 sm:-top-20 -right-10 sm:-right-20 h-32 sm:h-60 w-32 sm:w-60 rounded-full bg-purple-500/30 blur-3xl"></div>
                <div className="absolute bottom-10 sm:bottom-20 left-10 sm:left-20 h-24 sm:h-40 w-24 sm:w-40 rounded-full bg-indigo-500/30 blur-3xl"></div>
              </div>
            </div>

            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 lg:p-12">
              <div className="mx-auto max-w-3xl">
                {post.category && (
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/30 transition-colors duration-300 border border-white/10 shadow-lg mb-3 sm:mb-4"
                  >
                    {post.category.name}
                  </Link>
                )}
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4 sm:mb-6 drop-shadow-sm leading-tight">
                  {post.title}
                </h1>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 text-white/90">
                  {post.author?.user && (
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-75 blur-sm"></div>
                        <Image
                          className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-white/30"
                          src={
                            post.author.user.avatar || "/img/placeholder.svg"
                          }
                          alt={post.author.user.firstName || "Author"}
                          width={40}
                          height={40}
                        />
                      </div>
                      <div className="ml-2 sm:ml-3">
                        <p className="text-sm font-medium text-white">
                          {post.author.user.firstName}{" "}
                          {post.author.user.lastName}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                    {post.createdAt && (
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3 sm:h-4 sm:w-4 text-indigo-300" />
                        <time dateTime={post.createdAt.toString()}>
                          {formatDistanceToNow(new Date(post.createdAt), {
                            addSuffix: true,
                          })}
                        </time>
                      </div>
                    )}

                    <div className="flex items-center">
                      <Clock className="mr-1 h-3 w-3 sm:h-4 sm:w-4 text-indigo-300" />
                      <span>{readingTime}</span>
                    </div>

                    {post.comments && (
                      <div className="flex items-center">
                        <MessageSquare className="mr-1 h-3 w-3 sm:h-4 sm:w-4 text-indigo-300" />
                        <span>
                          {post.comments.length} {t("comments")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Post description */}
          {post.description && (
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
                duration: 0.6,
                delay: 0.2,
              }}
              className="mb-8 sm:mb-10"
            >
              <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-300 leading-relaxed border-l-4 border-indigo-500 pl-4 sm:pl-6 py-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-r-lg italic">
                {post.description}
              </p>
            </motion.div>
          )}

          {/* Main content */}
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
              duration: 0.6,
              delay: 0.4,
            }}
            className="relative"
          >
            <div
              className="prose prose-sm sm:prose-base lg:prose-lg prose-indigo dark:prose-invert max-w-none dark:prose-headings:text-zinc-100 dark:prose-a:text-indigo-400 dark:prose-strong:text-zinc-200 dark:prose-code:text-zinc-200 dark:prose-blockquote:text-zinc-300 dark:prose-blockquote:border-indigo-500 prose-img:rounded-lg prose-img:shadow-lg"
              dangerouslySetInnerHTML={{
                __html: post.content,
              }}
            ></div>

            {/* Decorative elements */}
            <div className="absolute -left-8 sm:-left-16 top-1/4 h-24 sm:h-32 w-24 sm:w-32 rounded-full bg-indigo-100 dark:bg-indigo-950/30 opacity-50 blur-3xl -z-10"></div>
            <div className="absolute -right-8 sm:-right-16 top-2/3 h-24 sm:h-32 w-24 sm:w-32 rounded-full bg-purple-100 dark:bg-purple-950/30 opacity-50 blur-3xl -z-10"></div>
          </motion.div>

          {/* Author Bio Section */}
          {showAuthorBio && post.author?.user && (
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
                duration: 0.6,
                delay: 0.5,
              }}
              className="mt-8 sm:mt-10 md:mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8"
            >
              <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-zinc-900/80 p-4 sm:p-6 md:p-8 rounded-xl">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-75 blur-sm"></div>
                    <Image
                      className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover"
                      src={post.author.user.avatar || "/img/placeholder.svg"}
                      alt={post.author.user.firstName || "Author"}
                      width={80}
                      height={80}
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                      {t("About")} {post.author.user.firstName} {post.author.user.lastName}
                    </h3>
                    {post.author.user.profile?.bio && (
                      <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
                        {post.author.user.profile?.bio}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                      <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                        {post.author.user.role?.name || "Author"}
                      </span>
                      <Link
                        href={`/blog/author/${post.author.id}`}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-200 flex items-center gap-1"
                      >
                        {t("view_all_articles")}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tags */}
          {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
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
                duration: 0.6,
                delay: 0.6,
              }}
              className="mt-8 sm:mt-10 md:mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8"
            >
              <div className="flex items-center mb-4">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {t("Tags")}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag: any) => (
                  <Link
                    key={tag.id}
                    href={`/blog/tag/${tag.slug}`}
                    className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/60 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-indigo-800 dark:text-indigo-300 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/60 dark:hover:to-purple-900/60 transition-colors duration-300"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Related Posts Section */}
          {showRelatedPosts &&
            post.relatedPosts &&
            post.relatedPosts.length > 0 && (
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
                  duration: 0.6,
                  delay: 0.8,
                }}
                className="mt-8 sm:mt-10 md:mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 sm:mb-6">
                  {t("related_posts")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {post.relatedPosts.map((relatedPost) => {
                    return (
                      <Link
                        key={relatedPost.id}
                        href={`/blog/${relatedPost.slug}`}
                      >
                        <div className="group overflow-hidden rounded-xl shadow-md transition-all duration-300 hover:shadow-xl bg-white dark:bg-zinc-800 h-full flex flex-col">
                          <div className="relative h-32 sm:h-40 w-full overflow-hidden">
                            <Image
                              src={relatedPost.image || "/placeholder.svg"}
                              alt={relatedPost.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-70 group-hover:opacity-80 transition-opacity duration-300"></div>

                            {relatedPost.category && (
                              <div className="absolute left-2 sm:left-3 top-2 sm:top-3 rounded-full bg-indigo-600/90 backdrop-blur-sm px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                                {relatedPost.category.name}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col p-3 sm:p-4">
                            <h4 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300 line-clamp-2 mb-2">
                              {relatedPost.title}
                            </h4>
                            {relatedPost.description && (
                              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                                {relatedPost.description}
                              </p>
                            )}
                            <div className="mt-auto text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                              {t("read_more_→")}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}

          {/* Comments section */}
          {enableComments && (
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
                duration: 0.6,
                delay: 0.9,
              }}
              className="mt-8 sm:mt-10 md:mt-12 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:pt-8"
            >
              <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 sm:mb-8">
                {t("Comments")}
              </h3>
              <CommentList postId={post.id} />
              <div className="mt-6 sm:mt-8 rounded-xl bg-white dark:bg-zinc-800 p-4 sm:p-6 shadow-sm border border-zinc-100 dark:border-zinc-700">
                <h4 className="text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">
                  {t("leave_a_comment")}
                </h4>
                <CommentForm postId={post.id} userId="user1" />
              </div>
            </motion.div>
          )}
        </article>
      </div>
    </div>
  );
}
