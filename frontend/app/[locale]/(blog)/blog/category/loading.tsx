"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Layers } from "lucide-react";

import { Link } from "@/i18n/routing";
import { SkeletonText } from "@/components/ui/skeleton";

import { PageHero } from "../components/page-hero";

/**
 * Pending state for /blog/category.
 *
 * WHAT DRIFTED — the blog frame, entirely
 * ---------------------------------------
 * WAS `container mx-auto px-4 py-12`. The page is
 * `min-h-screen relative overflow-hidden bg-card pt-24` → decorative layers →
 * `<PageHero>` → `relative z-10 container mx-auto px-4 py-12`.
 *
 *  - No `pt-24`: 6rem of clearance appeared only on resolve, dropping the
 *    whole document 96px.
 *  - No `bg-card`: the pending ground was `--background`, a full-viewport
 *    colour change on arrival.
 *  - No hero: ~300px of badge, `text-4xl md:text-5xl lg:text-6xl` title and
 *    description, all of it `t()` strings that need no fetch. Two grey bars
 *    inside the container stood in for it, so the container's own first row
 *    was also in the wrong place.
 *  - The body was a `sm:grid-cols-2 lg:grid-cols-3` grid of six `h-64` boxes;
 *    the page opens with a "Featured categories" heading row and a
 *    `md:grid-cols-3` grid of three `h-80` tiles.
 *
 * `PageHero` is mounted, not restated. The heading, the "View all posts" link
 * and the "Explore" caption are static and render for real; only each tile's
 * name, blurb and count wait, and they wait inside the real typography
 * elements so their heights are computed rather than guessed.
 */
export default function CategoriesLoading() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-screen relative overflow-hidden bg-card pt-24">
      {/* Ambient wash only: `fixed`, `pointer-events-none`, zero layout. The
          `FloatingShapes` / `InteractivePattern` layers the page also mounts
          are equally layout-free and are skipped here on purpose. */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%)`,
        }}
      />

      <PageHero
        badge={{
          icon: <Layers className="h-3.5 w-3.5" />,
          text: tCommon("categories"),
        }}
        title={[
          { text: "Browse by " },
          { text: "Category", gradient: "bg-primary" },
        ]}
        description={`${t("explore_our_content_organized_by_topics")}. ${t("discover_articles_tutorials_of_interest")}.`}
      />

      <div className="relative z-10 container mx-auto px-4 py-12">
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

          {/* Three tiles, and the count does not even settle: the page renders
              `categories.slice(0, 3)` here. The per-tile gradient comes from a
              local helper in `client.tsx` that cannot be imported, so the
              pending tint is the flat overlay both states share. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <div
                key={`pending-featured-${i}`}
                className="relative h-80 overflow-hidden rounded-lg"
              >
                <div className="absolute inset-0 bg-linear-to-br from-overlay/60 to-overlay/40 z-10" />
                <div className="absolute inset-0 bg-primary/70 z-0" />
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
          </div>
        </div>
      </div>
    </div>
  );
}
