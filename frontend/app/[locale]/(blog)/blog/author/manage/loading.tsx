"use client";

import { useTranslations } from "next-intl";
import { PenSquare, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";

/**
 * Pending state for /blog/author/manage.
 *
 * WHAT DRIFTED — the wrong ground, and no clearance
 * -------------------------------------------------
 * WAS `min-h-screen bg-linear-to-b from-card via-primary/30 to-card` wrapping
 * `container mx-auto px-4 py-12`. The page is
 * `min-h-screen relative overflow-hidden bg-card pt-24` → decorative layers →
 * `relative z-10 container mx-auto px-4 pb-16` → a `space-y-8` stack.
 *
 *  - GROUND: a `via-primary/30` vertical gradient against the page's flat
 *    `bg-card`. This is the only file in the blog tree that painted a ground
 *    at all, and it painted the wrong one — a strong accent wash that snapped
 *    to a card surface on resolve.
 *  - No `pt-24`: 6rem of clearance appeared only when the page mounted.
 *  - `py-12` against `pb-16`: 48px of top padding the page does not have and
 *    16px short at the bottom.
 *  - The header is a `rounded-3xl shadow-2xl` banner with a fixed
 *    `h-48 md:h-56` strip carrying a `text-4xl md:text-5xl` heading, its
 *    subtitle and a "New post" button. This file reserved `h-48 rounded-2xl`
 *    — right height, wrong radius, and none of the copy, all of which is
 *    `t()` strings that need no fetch.
 *
 * The heading, the subtitle and the button caption now render for real; only
 * the post rows wait.
 */
export default function PostsLoading() {
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
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-3xl shadow-2xl">
            <div className="relative h-48 md:h-56 w-full">
              <div className="absolute inset-0 bg-primary" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="bg-card/20 backdrop-blur-md p-4 rounded-2xl border border-overlay-foreground/10 shadow-xl">
                    <PenSquare className="h-8 w-8 text-overlay-foreground" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-overlay-foreground mb-2 drop-shadow-lg">
                      {t("my_blog_posts")}
                    </h1>
                    <p className="text-lg text-overlay-foreground/90">
                      {t("manage_and_create_your_blog_content")}
                    </p>
                  </div>
                </div>

                <Button
                  size="lg"
                  variant="glass"
                  disabled
                  className="rounded-full text-overlay-foreground border-overlay-foreground/20"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {t("create_new_post")}
                </Button>
              </div>
            </div>
          </div>

          {/* Six pending rows. A post list has no knowable length, so this
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
    </div>
  );
}
