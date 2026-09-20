"use client";

import { useTranslations } from "next-intl";
import { Bookmark, FileText, Search, Tag as TagIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";

import { PageHero } from "../components/page-hero";

/**
 * Pending state for /blog/post.
 *
 * WHAT DRIFTED — the blog frame, entirely
 * ---------------------------------------
 * WAS `container mx-auto px-4 py-12`. The page is
 * `min-h-screen relative overflow-hidden bg-card pt-24` → decorative layers →
 * `<PageHero>` → `relative z-10 container mx-auto px-4 pb-16`.
 *
 *  - No `pt-24`: 6rem of clearance that appeared only on resolve, dropping the
 *    document 96px.
 *  - No `bg-card` ground: a full-viewport colour change on arrival.
 *  - No hero: ~300px of badge, `text-4xl md:text-5xl lg:text-6xl` title and
 *    description, every string a `t()` call. This file drew an `h-6 w-32`
 *    "back link" and an `h-10 w-48` title inside the container instead — and
 *    this route has no back link at all.
 *  - `py-12` against `pb-16`: 48px of top padding the page does not have, and
 *    16px short at the bottom.
 *  - The filter row was five `h-12` blocks; the page renders an `h-10` search
 *    box and two `h-10 min-w-[180px]` selects, with the mobile filter toggle
 *    `lg:hidden`. Three controls too many and 2px too tall each.
 *  - Nine cards where the grid settles at the page size.
 *
 * `PageHero` is mounted, not restated. `client.tsx` already states the
 * important part: of everything on this page exactly ONE region is genuinely
 * unknown — the post grid. The search box and the two filters are controls
 * this page owns and that work before any post exists, so they render as the
 * real controls, inert.
 */
export default function AllArticlesLoading() {
  const t = useTranslations("common");
  const tBlogBlog = useTranslations("blog_blog");
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

      <PageHero
        badge={{
          icon: <FileText className="h-3.5 w-3.5" />,
          text: tCommon("articles"),
        }}
        title={[{ text: "All " }, { text: "Articles", gradient: "bg-primary" }]}
        description={tBlogBlog("explore_our_collection_of_articles")}
      />

      <div className="relative z-10 container mx-auto px-4 pb-16">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
              <Input
                placeholder={`${tBlogBlog("search_articles")}…`}
                disabled
                className="pl-10 h-10 rounded-lg border-border text-foreground"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {/* The two filter TRIGGERS' own boxes. A Radix `Select` needs
                  options, and these are the categories and tags still being
                  fetched — so the trigger renders with its default caption and
                  no popper, at the same `h-10 min-w-[180px]`. */}
              <div className="hidden lg:block w-full sm:w-auto">
                <div className="flex h-10 min-w-[180px] items-center gap-2 rounded-lg border border-border-strong px-3 text-sm text-muted-foreground">
                  <Bookmark className="h-4 w-4 text-primary" />
                  {t("all_categories")}
                </div>
              </div>
              <div className="hidden lg:block w-full sm:w-auto">
                <div className="flex h-10 min-w-[180px] items-center gap-2 rounded-lg border border-border-strong px-3 text-sm text-muted-foreground">
                  <TagIcon className="h-4 w-4 text-primary" />
                  {tCommon("all_tags")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Six pending cards. A post list has no knowable length, so this
            reserves the grid and its breakpoints, not the count
            (SKELETONS.md, "Lists and grids"). */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <SkeletonBlock className="h-48 w-full rounded-none" />
              <div className="p-6">
                <h3 className="text-lg font-semibold leading-tight tracking-tight mb-2">
                  <SkeletonText placeholder={t("post_title_goes_here")} />
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
