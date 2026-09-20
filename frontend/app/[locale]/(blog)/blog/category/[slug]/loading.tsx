"use client";

import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

/**
 * Pending state for /blog/category/[slug].
 *
 * WHAT DRIFTED — the blog frame, entirely
 * ---------------------------------------
 * WAS `container mx-auto px-4 py-12`. The page is
 * `min-h-screen relative overflow-hidden bg-card pt-24` → decorative layers →
 * `relative z-10 container mx-auto px-4 pb-16`.
 *
 *  - No `pt-24`: 6rem of clearance appeared only on resolve, dropping the
 *    document 96px.
 *  - No `bg-card` ground.
 *  - `py-12` against `pb-16`: 48px of top padding the page does not have and
 *    16px short at the bottom.
 *  - The category banner is a `rounded-3xl shadow-2xl mb-12` card with a fixed
 *    `h-72 md:h-80` strip carrying the title, the description and the post
 *    count. This file replaced it with three loose bars at the top of the
 *    container — roughly 290px of missing height, then everything below it
 *    dropped by that much.
 *
 * The banner's `bg-primary` fill is what a category with no image settles to,
 * so it is the honest pending ground; `client.tsx` says the same about its own
 * pending branch.
 */
export default function CategoryDetailLoading() {
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
              <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-overlay/10" />
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-card/10 blur-3xl" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl" />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <h1 className="text-4xl md:text-5xl font-bold text-overlay-foreground mb-2">
                <SkeletonText placeholder="Category" />
              </h1>
              <p className="text-overlay-foreground/80 max-w-2xl mb-4">
                <SkeletonText chars={96} />
              </p>
              <span className="inline-flex items-center rounded-full bg-card/20 backdrop-blur-sm px-3 py-1 text-sm font-medium text-overlay-foreground tabular-nums">
                <SkeletonText placeholder="00 posts" />
              </span>
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
