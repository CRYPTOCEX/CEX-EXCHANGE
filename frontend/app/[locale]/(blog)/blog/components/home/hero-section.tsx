"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface HeroSectionProps {
  posts: Post[];
  isLoading: boolean;
}

export function HeroSection({ posts, isLoading }: HeroSectionProps) {
  const t = useTranslations("blog_blog");
  const [activePostIndex, setActivePostIndex] = useState(0);

  // Auto-rotate featured posts every 5 seconds
  useEffect(() => {
    if (posts.length <= 1) return;

    const interval = setInterval(() => {
      setActivePostIndex((prev) => (prev + 1) % Math.min(3, posts.length));
    }, 5000);

    return () => clearInterval(interval);
  }, [posts.length]);

  const featuredPost = posts[activePostIndex] || posts[0];

  // Scroll to content function
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: "smooth",
    });
  };

  if (isLoading || posts.length === 0) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 dark:bg-purple-500/20 blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -left-20 h-80 w-80 rounded-full bg-purple-500/10 dark:bg-indigo-500/20 blur-3xl animate-pulse delay-1000" />
          <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-pink-500/10 dark:bg-pink-500/20 blur-3xl animate-pulse delay-500" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[64px_64px] z-0" />

        {/* Content */}
        <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4">
          <div className="max-w-5xl text-center">
            {/* Category badge skeleton */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center mb-8"
            >
              <Skeleton className="h-9 w-40 rounded-full bg-indigo-100/50 dark:bg-white/5 backdrop-blur-sm border border-indigo-200/50 dark:border-white/10 shadow-lg" />
            </motion.div>

            {/* Title skeleton */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-6 space-y-4"
            >
              <Skeleton className="h-14 sm:h-16 md:h-20 lg:h-24 w-full max-w-4xl mx-auto rounded-2xl bg-linear-to-r from-indigo-100/50 via-purple-100/50 to-indigo-100/50 dark:from-white/5 dark:via-white/10 dark:to-white/5" />
              <Skeleton className="h-14 sm:h-16 md:h-20 lg:h-24 w-3/4 mx-auto rounded-2xl bg-linear-to-r from-indigo-100/50 via-purple-100/50 to-indigo-100/50 dark:from-white/5 dark:via-white/10 dark:to-white/5" />
            </motion.div>

            {/* Description skeleton */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="max-w-3xl mx-auto mb-10 space-y-3"
            >
              <Skeleton className="h-7 sm:h-8 w-full rounded-xl bg-zinc-100/80 dark:bg-white/5" />
              <Skeleton className="h-7 sm:h-8 w-5/6 mx-auto rounded-xl bg-zinc-100/80 dark:bg-white/5" />
            </motion.div>

            {/* Author & CTA skeleton */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6"
            >
              {/* Author skeleton */}
              <div className="flex items-center gap-4 bg-zinc-100/50 dark:bg-white/5 backdrop-blur-sm rounded-full px-5 py-3 border border-zinc-200/50 dark:border-white/10">
                <Skeleton className="h-12 w-12 rounded-full bg-linear-to-br from-indigo-200/50 to-purple-200/50 dark:from-white/10 dark:to-white/5" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded-md bg-zinc-200/80 dark:bg-white/10" />
                  <Skeleton className="h-3 w-16 rounded-md bg-zinc-200/60 dark:bg-white/5" />
                </div>
              </div>

              {/* Button skeleton */}
              <Skeleton className="h-14 w-48 rounded-full bg-indigo-200/50 dark:bg-white/10 shadow-2xl" />
            </motion.div>
          </div>

          {/* Scroll indicator skeleton */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <Skeleton className="h-4 w-32 rounded-md bg-zinc-200/50 dark:bg-white/5" />
            <ChevronDown className="w-6 h-6 animate-bounce text-zinc-400 dark:text-white/40" />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-indigo-500/10 dark:bg-purple-500/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-20 h-80 w-80 rounded-full bg-purple-500/10 dark:bg-indigo-500/20 blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-pink-500/10 dark:bg-pink-500/20 blur-3xl animate-pulse delay-500" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[64px_64px] z-0" />

      {/* Featured post image */}
      {featuredPost?.image && (
        <div className="absolute inset-0 z-10">
          <Image
            src={featuredPost.image}
            alt={featuredPost.title || "Featured Post"}
            fill
            className="object-cover opacity-20 dark:opacity-40 transition-transform duration-1000 ease-in-out"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-white via-white/80 to-white/60 dark:from-zinc-950 dark:via-zinc-950/80 dark:to-zinc-950/60" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="max-w-5xl text-center">
          {/* Category badge */}
          {featuredPost?.category && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                href={`/blog/category/${featuredPost.category.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-100 dark:bg-white/10 backdrop-blur-sm px-5 py-2 text-sm font-medium text-indigo-700 dark:text-white border border-indigo-200 dark:border-white/20 shadow-lg hover:bg-indigo-200 dark:hover:bg-white/20 transition-all duration-300 mb-8"
              >
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-300" />
                {featuredPost.category.name}
              </Link>
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6 leading-tight"
          >
            {featuredPost?.title}
          </motion.h1>

          {/* Description */}
          {featuredPost?.description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-xl sm:text-2xl text-zinc-600 dark:text-white/80 max-w-3xl mx-auto mb-10"
            >
              {featuredPost.description}
            </motion.p>
          )}

          {/* Author & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            {featuredPost?.author?.user && (
              <div className="flex items-center gap-4 bg-zinc-100 dark:bg-white/10 backdrop-blur-sm rounded-full px-5 py-3 border border-zinc-200 dark:border-white/20">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-linear-to-r from-indigo-500 to-purple-500 rounded-full opacity-75 blur-sm" />
                  <Image
                    className="relative h-12 w-12 rounded-full border-2 border-white dark:border-white/50"
                    src={featuredPost.author.user.avatar || "/img/placeholder.svg"}
                    alt={featuredPost.author.user.firstName || "Author"}
                    width={48}
                    height={48}
                  />
                </div>
                <div className="text-left">
                  <p className="text-zinc-900 dark:text-white font-medium">
                    {featuredPost.author.user.firstName}
                  </p>
                  {featuredPost.createdAt && (
                    <p className="text-zinc-500 dark:text-white/60 text-sm">
                      {formatDistanceToNow(new Date(featuredPost.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Link href={`/blog/${featuredPost?.slug}`}>
              <Button
                size="lg"
                className="rounded-full bg-indigo-600 dark:bg-white text-white dark:text-indigo-700 hover:bg-indigo-700 dark:hover:bg-white/90 shadow-2xl hover:shadow-indigo-500/25 dark:hover:shadow-white/25 transition-all duration-300 text-lg px-8 py-6 h-auto font-semibold"
              >
                {t("read_article")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Carousel indicators */}
        {posts.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="absolute bottom-32 left-0 right-0 flex justify-center gap-3"
          >
            {posts.slice(0, 3).map((_, index) => (
              <button
                key={index}
                onClick={() => setActivePostIndex(index)}
                className={`cursor-pointer h-2.5 transition-all duration-300 rounded-full ${
                  index === activePostIndex
                    ? "w-12 bg-indigo-600 dark:bg-white shadow-lg"
                    : "w-2.5 bg-zinc-300 dark:bg-white/40 hover:bg-zinc-400 dark:hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </motion.div>
        )}

        {/* Scroll indicator */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-500 dark:text-white/60 hover:text-zinc-700 dark:hover:text-white transition-colors duration-300 cursor-pointer"
        >
          <span className="text-sm font-medium">Scroll to explore</span>
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </motion.button>
      </div>
    </div>
  );
}
