"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";

/**
 * Pending state for /blog/tag/[slug].
 *
 * WHAT DRIFTED — the blog frame, entirely
 * ---------------------------------------
 * WAS `container mx-auto px-4 py-12`. The page is
 * `min-h-screen relative overflow-hidden bg-card pt-24` → decorative layers →
 * `relative z-10 container mx-auto px-4 pb-16`.
 *
 *  - No `pt-24`: 6rem of clearance appeared only on resolve.
 *  - No `bg-card` ground.
 *  - `py-12` against `pb-16`: 48px of top padding the page does not have, and
 *    16px short at the bottom.
 *  - The tag banner is a `rounded-3xl shadow-2xl mb-12` card with a fixed
 *    `h-48 md:h-56` strip. This file drew a 48px avatar-and-title row instead
 *    — about 200px short — and placed the back link above the banner where the
 *    page puts it `absolute top-6 left-6` inside it.
 *
 * There is no `PageHero` on this route; the banner IS the hero, so the frame
 * is spelled out. The back-link caption is a `t()` call and renders for real.
 */
export default function TagDetailLoading() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-screen relative overflow-hidden bg-card pt-24">
      {/* Ambient wash only: `fixed`, `pointer-events-none`, zero layout. */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%)`,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 pb-16">
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl mb-12">
            <div className="relative h-48 md:h-56 w-full">
              <div className="absolute inset-0 bg-primary" />
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-card/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
              </div>
            </div>

            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/tag"
                className="inline-flex items-center text-sm text-overlay-foreground/80 hover:text-overlay-foreground transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                {tCommon("all_tags")}
              </Link>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <h1 className="text-4xl md:text-5xl font-bold text-overlay-foreground">
                    <SkeletonText placeholder={t("tag_name")} />
                  </h1>
                </div>
                <span className="inline-flex items-center rounded-full bg-card/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-overlay-foreground tabular-nums">
                  <SkeletonText placeholder="00 posts" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Six pending cards. A post list has no knowable length, so this
            reserves the grid and its breakpoints, not the count. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <SkeletonBlock className="h-48 w-full rounded-none" />
              <div className="p-6">
                <h3 className="text-lg font-semibold leading-tight tracking-tight mb-2">
                  <SkeletonText placeholder={tCommon("post_title_goes_here")} />
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  <SkeletonText chars={72} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
