"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";

/**
 * Pending state for /blog/author/[id].
 *
 * WHAT DRIFTED — the blog frame, entirely
 * ---------------------------------------
 * WAS `container mx-auto px-4 py-12`. The page is
 * `min-h-screen relative overflow-hidden bg-card pt-24` → decorative layers →
 * `relative z-10 container mx-auto px-4 pb-16`.
 *
 *  - No `pt-24`: 6rem of clearance that appeared only on resolve, dropping the
 *    document 96px.
 *  - No `bg-card` ground: a full-viewport colour change on arrival.
 *  - `py-12` against `pb-16`: 48px of top padding the page does not have (the
 *    clearance already covers it) and 16px short at the bottom.
 *  - The author banner is a `rounded-3xl shadow-2xl mb-12` card whose header
 *    strip is a fixed `h-72 md:h-80`; this file reserved `h-64` — 32-64px
 *    short — and put the back link ABOVE it, where the page places it
 *    `absolute top-6 left-6` INSIDE the banner. So the link moved both axes.
 *
 * There is no `PageHero` on this route — the banner is the hero — so the frame
 * is spelled out here. The banner's fill is the same flat `bg-primary` the
 * settled page paints, which makes it the honest pending ground rather than a
 * grey plate, and the back-link caption is a `t()` call that renders for real.
 */
export default function AuthorDetailLoading() {
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
            <div className="relative h-72 md:h-80 w-full">
              <div className="absolute inset-0 bg-primary" />
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-card/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
              </div>
            </div>

            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/author"
                className="inline-flex items-center text-sm text-overlay-foreground/80 hover:text-overlay-foreground transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                {t("all_authors") || t("all_authors")}
              </Link>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
                {/* The avatar is the one thing here with no text metrics. */}
                <SkeletonBlock className="h-32 w-32 rounded-full" />
                <div className="text-center md:text-left">
                  <h1 className="text-3xl md:text-4xl font-bold text-overlay-foreground mb-2">
                    <SkeletonText placeholder={t("author_name")} />
                  </h1>
                  <p className="text-overlay-foreground/80 max-w-2xl">
                    <SkeletonText chars={96} />
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              <SkeletonText placeholder="Articles" />
            </h2>
            <span className="text-muted-foreground tabular-nums">
              <SkeletonText placeholder="00 posts" />
            </span>
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
