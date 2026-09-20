"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBlogStore } from "@/store/blog/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { m } from "framer-motion";
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
/**
 * Ambient page wash.
 *
 * Was two hardcoded zinc hexes fed into inline `style` props, so the class-based
 * ratchet could not see them and the blog kept a neutral-grey ground while the
 * rest of the app moved to the blue-biased surface ramp.
 *
 * `alpha()` rather than plain string values because the call sites build stops
 * by appending hex alpha (`${gradient.from}05`). That only ever worked for
 * 6-digit hex — appending to a token yields `hsl(var(--surface-2))05`, which no
 * browser parses. Same trap as the nav accent in Phase 3.
 */
const gradient = {
  from: "hsl(var(--surface-2))",
  to: "hsl(var(--surface-3))",
  /** Surface tint at a given opacity, 0–1. */
  alpha: (which: "from" | "to", a: number) =>
    `hsl(var(--surface-${which === "from" ? "2" : "3"}) / ${a})`,
};

export default function BlogClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const featuredPostsRef = useRef<HTMLDivElement>(null);

  const {
    posts,
    error,
    fetchPosts,
    fetchCategories,
    fetchTags,
    fetchAllAuthors,
  } = useBlogStore();

  /**
   * THE 4,346-PIXEL EARLY RETURN.
   * ==========================================================================
   *
   * What stood here was:
   *
   *     if (postsLoading && posts.length === 0) {
   *       return <div>…<HeroSection posts={[]} isLoading /></div>;
   *     }
   *
   * A hero and nothing else. The settled page is a hero PLUS six sections —
   * categories, the featured bento, the recent grid, the tag rail, the authors
   * row and the CTA band — so the pending page was one viewport tall and the
   * settled one was one viewport plus 4,346px. The harness caught it as
   * thirty-one FOOTER nodes ("Get Started", "Follow Us", "Trading", "Spot
   * Trading", "Products") each displaced by exactly +4346, which is the
   * signature of a page that grew underneath a footer rather than one whose
   * skeleton was mis-sized.
   *
   * CLS was 0.0054 for it — near zero, because every one of those pixels moved
   * BELOW the fold and CLS weights by viewport impact. This is the case the
   * metric is worst at: the page still visibly heaves the moment you scroll to
   * it. The height delta is the number that matters here, not the CLS.
   *
   * There is now one tree. Every section renders in both states; only the
   * values inside them wait.
   *
   * WHY A LATCH AND NOT `postsLoading`
   * ----------------------------------
   * `postsLoading` initialises to `false` in the store and only flips to `true`
   * inside the effect below — so it is FALSE on the server render and on the
   * first client render. Handing it straight to the sections gave a three-step
   * page: empty states (frame 0) -> placeholders (after hydration) -> content.
   * The first step is the one that lies, because `posts.length === 0` at that
   * moment means "not asked yet", not "no posts", and the empty branches read
   * it as the latter and print "No featured articles yet" for a frame.
   *
   * `postsResolved` starts false and is set once, when the request settles, so
   * "pending" is true from the very first byte of server HTML through to the
   * data landing — which also means the server-rendered markup is already the
   * right HEIGHT, before any JS runs.
   */
  const [postsResolved, setPostsResolved] = useState(false);
  const [categoriesResolved, setCategoriesResolved] = useState(false);
  const [tagsResolved, setTagsResolved] = useState(false);

  useEffect(() => {
    fetchPosts().finally(() => setPostsResolved(true));
    fetchCategories().finally(() => setCategoriesResolved(true));
    fetchTags().finally(() => setTagsResolved(true));
    fetchAllAuthors();
  }, []);

  const postsPending = !postsResolved;

  /*
    Loading and error are DIFFERENT states, and this branch is a full-page swap
    — so it has to be unreachable while the first request is in flight or it
    becomes the same defect in a different costume. `error` happens to be reset
    to `null` at the top of every store action today, which made the old bare
    `if (error)` safe by accident; `postsResolved` makes it safe on purpose.
  */
  if (error && postsResolved) {
    return (
      <div className="flex flex-col overflow-hidden relative bg-card min-h-screen items-center justify-center">
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
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="text-center py-12 bg-card/80 dark:bg-surface-2/80 backdrop-blur-xl rounded-3xl border border-border/50">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">
                {t("error_loading_blog")}
              </h3>
              <p className="text-subtle-foreground mb-8">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-surface-2 hover:bg-muted text-foreground rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                {tCommon("try_again")}
              </button>
            </div>
          </m.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden relative bg-card">
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
              ${gradient.alpha("from", 0.02)} 10%,
              ${gradient.alpha("from", 0.03)} 25%,
              ${gradient.alpha("to", 0.06)} 40%,
              ${gradient.alpha("from", 0.07)} 55%,
              ${gradient.alpha("to", 0.06)} 70%,
              ${gradient.alpha("from", 0.03)} 85%,
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
        <HeroSection posts={posts} isLoading={postsPending} />

        {/*
          Content Sections. All six render in both states — this container's
          `space-y-16 py-16` is 128px of chrome on its own, and it used to
          arrive with the data.

          Every section takes an explicit pending flag rather than reading
          `xLoading` off the store, for the same reason `postsResolved` exists:
          those flags are `false` on the server render and on the first client
          frame, so a section keyed off them alone renders NOTHING in the
          server HTML and then expands after hydration. Measured, that was
          ~1,900px of categories + tags + authors arriving one tick late — the
          same defect as the 4,346px one, just inside the hydration window
          rather than the fetch window. `AuthorsSection` owns its own request
          and latches it locally.
        */}
        <div className="container mx-auto px-4 space-y-16 py-16">
          {/* Categories Section - Fetches its own data */}
          <CategoriesSection pending={!categoriesResolved} />

          {/* Featured Articles Section */}
          <div ref={featuredPostsRef}>
            <FeaturedArticles
              posts={posts}
              category={category}
              tag={tag}
              loading={postsPending}
            />
          </div>

          {/* Recent Articles */}
          <RecentArticles posts={posts} loading={postsPending} />

          {/* Tags Section - Fetches its own data */}
          <TagsSection pending={!tagsResolved} />

          {/* Featured Authors Section - Fetches its own data */}
          <AuthorsSection />
        </div>

        {/* Call to Action - Full Width Section */}
        <CTASection />
      </div>
    </div>
  );
}
