"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { useBlogStore } from "@/store/blog/user";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { m } from "framer-motion";
import {
  ArrowRight,
  Layers,
  AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHero } from "../components/page-hero";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function CategoriesClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { categories, isLoading, fetchCategories, error } = useBlogStore();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  /**
   * The 70-line pending COPY of this page is gone; the page below renders in
   * both states and only the cards wait.
   * ==========================================================================
   *
   * That copy had drifted from the layout it stood in for in four measurable
   * ways, which is exactly the failure mode SKELETONS.md describes — a second
   * tree has no mechanism keeping it in sync:
   *
   *   - It dropped `FloatingShapes` and `InteractivePattern` entirely, so the
   *     background changed character the moment the data landed.
   *   - Its hero was four grey boxes (`h-8 w-32`, `h-14 w-96`, two `h-6`)
   *     standing in for `PageHero`, whose badge, two-part title and
   *     description are ALL `t()` strings already in hand. Nothing there was
   *     ever waiting on the network.
   *   - The featured tiles were `rounded-2xl`; the real ones are `rounded-lg`.
   *   - The "all categories" tiles were `bg-muted` with a `border-border-strong`
   *     bottom half and `rounded-t-xl`/`rounded-b-xl` corners, against real
   *     cards that are `bg-card`, `border-border` and `rounded-lg` throughout —
   *     and its 24px content block (`h-5` + two `h-4` + `h-4`, plus margins)
   *     came to 118px against the real card's `p-6` + two-line `line-clamp-2`
   *     description + link row, so each row of three settled upward on arrival.
   *
   * The pending tiles below are built out of the REAL card shells, so none of
   * that can happen again.
   */
  const isPending = isLoading && categories.length === 0;

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-card pt-24">
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%)`,
          }}
        />
        <FloatingShapes
          count={6}
          interactive={true}
          theme={{ primary: "indigo", secondary: "purple" }}
        />
        <div className="relative z-10 container mx-auto px-4 pb-16">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mb-8 inline-flex items-center justify-center p-8 bg-destructive/10 rounded-3xl border border-destructive/50">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-foreground">
              {tCommon("categories")}
            </h1>
            <div className="bg-card text-destructive p-6 rounded-lg inline-block border border-destructive/50">
              {error}
            </div>
          </m.div>
        </div>
      </div>
    );
  }

  // Function to get a gradient based on category index
  const getCategoryGradient = (index: number) => {
    const gradients = [
      "bg-primary",
      "bg-primary",
      "bg-success",
      "bg-warning",
      "bg-destructive",
    ];
    return gradients[index % gradients.length];
  };
  return (
    <div className="min-h-screen relative overflow-hidden bg-card">
      {/* Premium Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.03) 10%, hsl(var(--chart-4) / 0.02) 30%, transparent 60%)`,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%)`,
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

      {/* Hero Section */}
      <PageHero
        badge={{ icon: <Layers className="h-3.5 w-3.5" />, text: tCommon("categories") }}
        title={[
          { text: "Browse by " },
          { text: "Category", gradient: "bg-primary" },
        ]}
        description={`${t("explore_our_content_organized_by_topics")}. ${t("discover_articles_tutorials_of_interest")}.`}
      />

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Featured Categories */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {t("featured_categories")}
            </h2>
            <Link
              href="/blog"
              className="text-primary hover:text-primary flex items-center"
            >
              {t("view_all_posts")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pending featured tiles: the REAL `h-80 rounded-lg` shell with
                the REAL tint layers, so only the name, the blurb and the two
                pills are actually waiting. Three is the count this row always
                renders (`slice(0, 3)`), so here the count does not even
                settle. */}
            {isPending &&
              [0, 1, 2].map((i) => (
                <div
                  key={`pending-featured-${i}`}
                  className="relative h-80 overflow-hidden rounded-lg"
                >
                  <div className="absolute inset-0 bg-linear-to-br from-overlay/60 to-overlay/40 z-10" />
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${getCategoryGradient(i)} opacity-70 z-0`}
                  />
                  <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-3xl font-bold text-overlay-foreground mb-2">
                        <SkeletonText placeholder="Category" />
                      </h3>
                      <p className="text-overlay-foreground/80 line-clamp-3">
                        <SkeletonText chars={64} />
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded-full bg-card/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-overlay-foreground">
                        <SkeletonText placeholder="00 posts" />
                      </span>
                      <span className="inline-flex items-center rounded-full bg-card/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-overlay-foreground">
                        {t("explore")}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            {categories.slice(0, 3).map((category, index) => {
              return (
                <m.div
                  key={`featured-${category.id}`}
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
                  className="relative h-80 overflow-hidden rounded-lg"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <div className="absolute inset-0 bg-linear-to-br from-overlay/60 to-overlay/40 z-10"></div>
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${getCategoryGradient(index)} opacity-70 z-0 transition-opacity duration-300 ${hoveredIndex === index ? "opacity-90" : "opacity-70"}`}
                  ></div>

                  {category.image && (
                    <Image
                      src={category.image || "/placeholder.svg"}
                      alt={category.name}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover z-0 transition-transform duration-700 scale-105"
                      style={{
                        transform:
                          hoveredIndex === index ? "scale(1.1)" : "scale(1.05)",
                      }}
                    />
                  )}

                  <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-3xl font-bold text-overlay-foreground mb-2">
                        {category.name}
                      </h3>
                      <p className="text-overlay-foreground/80 line-clamp-3">
                        {category.description ||
                          t("explore_posts_in_this_category")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      {category.postCount !== undefined && (
                        <span className="inline-flex items-center rounded-full bg-card/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-overlay-foreground">
                          {category.postCount}{" "}
                          {category.postCount === 1 ? "post" : "posts"}
                        </span>
                      )}

                      <Link
                        href={`/blog/category/${category.slug}`}
                        className="inline-flex items-center rounded-full bg-card/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-overlay-foreground hover:bg-card/30 transition-colors duration-300"
                      >
                        {t("explore")}
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </m.div>
              );
            })}
          </div>
        </div>

        {/* All Categories Grid */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-8">
            {tCommon("all_categories")}
          </h2>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Six pending cards in the REAL grid with the REAL breakpoints.
                A category list has no knowable length, so the count settles —
                what must not settle is the container or the card, and both are
                the real ones here. The image band is the only part with no
                text metrics, so it is the only `SkeletonBlock`, sized with the
                same `h-48 w-full` the real image carries. */}
            {isPending &&
              [0, 1, 2, 3, 4, 5].map((i) => (
                <div key={`pending-all-${i}`} className="group h-full">
                  <div className="flex flex-col h-full overflow-hidden rounded-lg bg-card border border-border">
                    <div className="relative h-48 w-full overflow-hidden">
                      <SkeletonBlock className="absolute inset-0 h-48 w-full rounded-none" />
                      <div className="absolute inset-0 bg-linear-to-t from-overlay/70 via-overlay/40 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-overlay-foreground drop-shadow-sm">
                          <SkeletonText placeholder="Category" />
                        </h2>
                        <span className="inline-flex items-center rounded-full bg-card/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-overlay-foreground">
                          <SkeletonText placeholder="00 posts" />
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        <SkeletonText chars={54} />
                      </p>
                      <div className="flex items-center text-primary text-sm font-medium">
                        {t("browse_posts")}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            {categories.map((category, index) => {
              return (
                <m.div
                  key={category.id}
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
                    delay: index * 0.05,
                  }}
                  whileHover={{
                    y: -5,
                  }}
                  className="group h-full"
                >
                  <Link
                    href={`/blog/category/${category.slug}`}
                    className="flex flex-col h-full overflow-hidden rounded-lg bg-card hover:border-border-strong transition-colors duration-300 border border-border"
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      <Image
                        src={category.image || "/placeholder.svg"}
                        alt={category.name}
                        fill
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        // The first row of this grid is above the fold, and on
                        // an install whose categories carry no image the
                        // placeholder here IS the Largest Contentful Paint —
                        // which Next reports as a console warning on every
                        // load, so the frontend live driver read the page as
                        // broken. `blog/author/client.tsx` already primes its
                        // first three for the same reason.
                        priority={index < 3}
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-overlay/70 via-overlay/40 to-transparent"></div>

                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-overlay-foreground drop-shadow-sm">
                          {category.name}
                        </h2>
                        {category.postCount !== undefined && (
                          <span className="inline-flex items-center rounded-full bg-card/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-overlay-foreground">
                            {category.postCount}{" "}
                            {category.postCount === 1 ? "post" : "posts"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {category.description ||
                          t("explore_posts_in_this_category")}
                      </p>

                      <div className="flex items-center text-primary text-sm font-medium group-hover:text-primary">
                        {t("browse_posts")}
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                </m.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
