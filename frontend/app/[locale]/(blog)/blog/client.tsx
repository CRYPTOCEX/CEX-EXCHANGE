"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useBlogStore } from "@/store/blog/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import {
  InteractivePattern,
  FloatingShapes,
} from "@/components/sections/shared";

// Import our components
import { HeroSection } from "./components/home/hero-section";
import { CategoriesSection } from "./components/home/categories-section";
import { FeaturedArticles } from "./components/home/featured-articles";
import { RecentArticles } from "./components/home/recent-articles";
import { TagsSection } from "./components/home/tags-section";
import { AuthorsSection } from "./components/home/authors-section";
import { CTASection } from "./components/home/cta-section";
import { useTranslations } from "next-intl";

// Blog theme - dark/neutral colors
const gradient = { from: "#27272a", to: "#18181b" };

export default function BlogClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const featuredPostsRef = useRef<HTMLDivElement>(null);

  const {
    posts,
    postsLoading,
    error,
    fetchPosts,
    fetchCategories,
    fetchTags,
    fetchAllAuthors,
  } = useBlogStore();

  useEffect(() => {
    fetchPosts();
    fetchCategories();
    fetchTags();
    fetchAllAuthors();
  }, []);

  // Show premium loading state during initial load
  // Let HeroSection handle its own loading skeleton which matches the actual design
  if (postsLoading && posts.length === 0) {
    return (
      <div className="flex flex-col overflow-hidden relative bg-white dark:bg-zinc-950">
        {/* Interactive pattern background - continuous */}
        <InteractivePattern
          config={{
            enabled: true,
            variant: "crosses",
            opacity: 0.015,
            size: 40,
            interactive: true,
            parallaxStrength: 50,
            animate: true,
          }}
          theme={{ primary: "zinc", secondary: "neutral" }}
        />

        {/* Floating geometric shapes */}
        <FloatingShapes
          theme={{ primary: "zinc", secondary: "neutral" }}
          count={10}
          interactive={true}
        />

        {/* Main Content - Let HeroSection show its loading skeleton */}
        <div className="relative z-10">
          <HeroSection posts={[]} isLoading={true} />
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex flex-col overflow-hidden relative bg-white dark:bg-zinc-950 min-h-screen items-center justify-center">
        {/* Interactive pattern background */}
        <InteractivePattern
          config={{
            enabled: true,
            variant: "crosses",
            opacity: 0.015,
            size: 40,
            interactive: false,
          }}
          theme={{ primary: "zinc", secondary: "neutral" }}
        />

        {/* Floating geometric shapes */}
        <FloatingShapes
          theme={{ primary: "zinc", secondary: "neutral" }}
          count={6}
          interactive={false}
        />

        <div className="container mx-auto px-4 py-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="text-center py-12 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                {t("error_loading_blog")}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                {tCommon("try_again")}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden relative bg-white dark:bg-zinc-950">
      {/* Interactive pattern background - continuous through all sections */}
      <InteractivePattern
        config={{
          enabled: true,
          variant: "crosses",
          opacity: 0.015,
          size: 40,
          interactive: true,
          parallaxStrength: 50,
          animate: true,
        }}
        theme={{ primary: "zinc", secondary: "neutral" }}
      />

      {/* Floating geometric shapes */}
      <FloatingShapes
        theme={{ primary: "zinc", secondary: "neutral" }}
        count={10}
        interactive={true}
      />

      {/* Unified continuous background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg,
              transparent 0%,
              ${gradient.from}05 10%,
              ${gradient.from}08 25%,
              ${gradient.to}10 40%,
              ${gradient.from}12 55%,
              ${gradient.to}10 70%,
              ${gradient.from}08 85%,
              transparent 100%
            )`,
          }}
        />
        {/* Subtle dark orbs for depth */}
        <div
          className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 dark:opacity-30"
          style={{ background: gradient.from }}
        />
        <div
          className="absolute top-[40%] -right-[10%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-15 dark:opacity-25"
          style={{ background: gradient.to }}
        />
        <div
          className="absolute top-[60%] left-[20%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 dark:opacity-20"
          style={{ background: gradient.from }}
        />
        <div
          className="absolute top-[80%] right-[30%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-15 dark:opacity-25"
          style={{ background: gradient.to }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section - Full Width/Height */}
        <HeroSection posts={posts} isLoading={postsLoading} />

        {/* Content Sections */}
        <div className="container mx-auto px-4 space-y-16 py-16">
          {/* Categories Section - Fetches its own data */}
          <CategoriesSection />

          {/* Featured Articles Section */}
          <div ref={featuredPostsRef}>
            <FeaturedArticles posts={posts} category={category} tag={tag} />
          </div>

          {/* Recent Articles */}
          <RecentArticles posts={posts} />

          {/* Tags Section - Fetches its own data */}
          <TagsSection />

          {/* Featured Authors Section - Fetches its own data */}
          <AuthorsSection />
        </div>

        {/* Call to Action - Full Width Section */}
        <CTASection />
      </div>
    </div>
  );
}
