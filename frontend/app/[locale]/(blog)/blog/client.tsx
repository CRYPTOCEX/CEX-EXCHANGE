"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlogStore } from "@/store/blog/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Import our components
import { HeroSection } from "./components/home/hero-section";
import { CategoriesSection } from "./components/home/categories-section";
import { FeaturedArticles } from "./components/home/featured-articles";
import { RecentArticles } from "./components/home/recent-articles";
import { TagsSection } from "./components/home/tags-section";
import { AuthorsSection } from "./components/home/authors-section";
import { CTASection } from "./components/home/cta-section";
import { useTranslations } from "next-intl";

export default function BlogClient() {
  const t = useTranslations("blog");
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const featuredPostsRef = useRef<HTMLDivElement>(null);

  const { posts, postsLoading, error, fetchPosts, fetchCategories, fetchTags } =
    useBlogStore();

  useEffect(() => {
    fetchPosts();
    fetchCategories();
    fetchTags();
  }, []);

  // Show loading state during initial load
  if (postsLoading && posts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <Skeleton className="h-[600px] w-full rounded-xl mb-4" />
          <Skeleton className="h-10 w-2/3 mb-2" />
          <Skeleton className="h-6 w-1/2" />
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-8">
          {t("loading_content")}
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            {t("error_loading_blog")}
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md"
          >
            {t("try_again")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <HeroSection posts={posts} isLoading={postsLoading} />

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

        {/* Call to Action */}
        <CTASection />
      </div>
    </div>
  );
}
