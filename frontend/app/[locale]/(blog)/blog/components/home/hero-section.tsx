"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface HeroSectionProps {
  posts: Post[];
  isLoading: boolean;
}

export function HeroSection({ posts, isLoading }: HeroSectionProps) {
  const t = useTranslations("blog");
  const [activePostIndex, setActivePostIndex] = useState(0);

  // Auto-rotate featured posts every 5 seconds
  useEffect(() => {
    if (posts.length <= 1) return;

    const interval = setInterval(() => {
      setActivePostIndex((prev) => (prev + 1) % Math.min(3, posts.length));
    }, 5000);

    return () => clearInterval(interval);
  }, [posts.length]);

  const featuredPost = posts[activePostIndex] || posts[0]; // Use the active post as the featured post

  if (isLoading || posts.length === 0) {
    return (
      <div className="relative mb-24 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-800 dark:from-indigo-950 dark:via-purple-950 dark:to-indigo-950 shadow-2xl">
        {/* Similar enhanced styling for the empty state */}
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-500/40 blur-3xl animate-pulse"></div>
          <div
            className="absolute top-60 -left-20 h-60 w-60 rounded-full bg-indigo-500/40 blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute bottom-20 right-20 h-40 w-40 rounded-full bg-pink-500/40 blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        {/* Geometric patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 border-2 border-white/30 rounded-lg rotate-12"></div>
          <div className="absolute top-40 right-20 w-16 h-16 border-2 border-white/30 rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 border-2 border-white/30 rounded-lg -rotate-12"></div>
          <div className="absolute top-1/3 right-1/3 w-12 h-12 border-2 border-white/30 rotate-45"></div>
        </div>

        <div className="relative z-10 px-8 py-24 sm:px-16 sm:py-32 lg:py-40 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white border border-white/10 shadow-lg">
              {t("coming_soon")}
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              <span className="inline-block bg-gradient-to-r from-white via-indigo-100 to-white bg-clip-text text-transparent pb-2">
                {t("welcome_to_our_blog")}
              </span>
            </h1>
            <p className="mt-6 text-xl text-indigo-100 max-w-2xl mx-auto">
              {t("were_working_on_amazing_content_for_you")}.{" "}
              {t("check_back_soon_and_tutorials")}.
            </p>
            <div className="mt-10">
              <Link
                href="/blog/author"
                className="rounded-full bg-white text-indigo-700 hover:bg-indigo-50 dark:bg-zinc-100 dark:text-indigo-800 dark:hover:bg-zinc-200 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <Button size="lg">
                  {t("become_an_author")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-24 overflow-hidden rounded-3xl shadow-2xl">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 dark:from-indigo-950 dark:via-purple-950 dark:to-indigo-950 z-0">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden opacity-20">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-500/40 blur-3xl animate-pulse"></div>
          <div
            className="absolute top-60 -left-20 h-60 w-60 rounded-full bg-indigo-500/40 blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute bottom-20 right-20 h-40 w-40 rounded-full bg-pink-500/40 blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        {/* Geometric patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 border-2 border-white/30 rounded-lg rotate-12"></div>
          <div className="absolute top-40 right-20 w-16 h-16 border-2 border-white/30 rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-24 h-24 border-2 border-white/30 rounded-lg -rotate-12"></div>
          <div className="absolute top-1/3 right-1/3 w-12 h-12 border-2 border-white/30 rotate-45"></div>
        </div>
      </div>

      {/* Featured post image with enhanced overlay */}
      {featuredPost?.image && (
        <div className="absolute inset-0 z-10">
          <Image
            src={featuredPost?.image || "/placeholder.svg"}
            alt={featuredPost?.title || "Featured Post"}
            fill
            className="object-cover mix-blend-overlay opacity-80 transition-transform duration-1000 ease-in-out scale-105 hover:scale-110"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 via-indigo-900/50 to-indigo-900/30 dark:from-indigo-950/90 dark:via-indigo-950/50 dark:to-indigo-950/30"></div>

          {/* Animated overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-indigo-900/30 dark:from-purple-950/30 dark:to-indigo-950/30 animate-gradient-x"></div>
        </div>
      )}

      {/* Content with enhanced styling */}
      <div className="relative z-20 px-8 py-24 sm:px-16 sm:py-32 lg:py-40">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-center"
        >
          {featuredPost?.category && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                href={`/blog/category/${featuredPost.category.slug}`}
                className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/30 transition-colors duration-300 border border-white/10 shadow-lg"
              >
                {featuredPost.category.name}
              </Link>
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-md"
          >
            <span className="inline-block bg-gradient-to-r from-white via-indigo-100 to-white bg-clip-text text-transparent pb-2">
              {featuredPost?.title}
            </span>
          </motion.h1>

          {featuredPost?.description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-6 text-xl text-indigo-100 max-w-2xl mx-auto drop-shadow-sm"
            >
              {featuredPost.description}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-10 flex flex-col items-center sm:flex-row sm:justify-center"
          >
            {featuredPost?.author?.user && (
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10 shadow-lg hover:bg-white/15 transition-all duration-300">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-75 blur-sm"></div>
                  <Image
                    className="relative h-12 w-12 rounded-full border-2 border-indigo-300"
                    src={
                      featuredPost.author.user.avatar || "/img/placeholder.svg"
                    }
                    alt={featuredPost.author.user.firstName || "Author"}
                    width={48}
                    height={48}
                  />
                </div>
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-white">
                    {featuredPost.author.user.firstName}
                  </p>
                  {featuredPost.createdAt && (
                    <p className="text-xs text-indigo-200">
                      {formatDistanceToNow(new Date(featuredPost.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 sm:ml-6 sm:mt-0">
              <Link
                href={`/blog/${featuredPost?.slug}`}
                className="transition-all duration-300 group"
              >
                <Button size="lg" rounded="full" variant="glass">
                  {t("read_article")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Enhanced post carousel indicators */}
      {posts.length > 1 && (
        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center space-x-3">
          {posts.slice(0, 3).map((_, index) => (
            <button
              key={index}
              onClick={() => setActivePostIndex(index)}
              className={`cursor-pointer h-2.5 transition-all duration-300 rounded-full ${
                index === activePostIndex
                  ? "w-10 bg-white shadow-lg"
                  : "w-2.5 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
