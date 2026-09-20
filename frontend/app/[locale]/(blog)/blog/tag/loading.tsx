"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Search, Tag as TagIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { SkeletonText } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";

import { PageHero } from "../components/page-hero";

/**
 * Pending state for /blog/tag.
 *
 * WHAT DRIFTED — the blog frame, entirely
 * ---------------------------------------
 * WAS `container mx-auto px-4 py-12`. The page is
 * `min-h-screen relative overflow-hidden bg-card pt-24` → decorative layers →
 * `<PageHero>` (with a search box in its children slot) →
 * `relative z-10 container mx-auto px-4 py-12`.
 *
 *  - No `pt-24`: 6rem of clearance that only appeared on resolve.
 *  - No `bg-card` ground.
 *  - No hero at all, and this route's hero is the TALLEST in the blog tree
 *    because it carries the tag search box beneath the description — roughly
 *    380px reserved by two grey bars in the container.
 *  - The body was `space-y-8` over three `h-64` boxes; the page opens with a
 *    "Popular tags" heading row and a `grid-cols-2 md:grid-cols-4` grid of
 *    eight `h-32` tiles. Both the axis and the tile size were wrong.
 *
 * `PageHero` is mounted rather than described, so the hero's clearance and
 * typography cannot disagree. The badge, heading, "View all posts" link,
 * "Explore" caption and the search placeholder are all `t()` calls and render
 * for real; only each tile's name and count wait.
 */
export default function TagsLoading() {
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

      <PageHero
        badge={{
          icon: <TagIcon className="h-3.5 w-3.5" />,
          text: tCommon("tags"),
        }}
        title={[{ text: "Explore by " }, { text: "Tag", gradient: "bg-primary" }]}
        /* The page interpolates `tags.length` into this sentence. The count is
           the only unknown part and it sits mid-paragraph, so a zero keeps the
           line box while the sentence settles by one or two characters —
           horizontal only, which moves nothing below it. */
        description={`${t("discover_content_organized_by")}. ${t("browse_our_collection_of")} 0 ${t("tags_to_find_exactly_what_youre_looking_for")}.`}
      >
        {/* The search box lives in the hero's children slot on the page, and
            it is the reason this hero is the tallest in the tree. Real
            control, inert. */}
        <div className="relative max-w-md mx-auto mt-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`${tCommon("search_tags")}…`}
            disabled
            className="pl-10 py-6 rounded-xl border-border"
          />
        </div>
      </PageHero>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {tCommon("popular_tags")}
            </h2>
            <Link
              href="/blog/tag"
              className="text-sm text-primary hover:text-primary inline-flex items-center"
            >
              {t("view_all_posts")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {/* Eight tiles — the count the page renders (`slice(0, 8)`). The
              per-tile hue comes from a local helper in `client.tsx` that
              cannot be imported, so the pending tint is the flat overlay both
              states share. */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={`pending-popular-${i}`}
                className="relative overflow-hidden rounded-xl shadow-md h-32"
              >
                <div className="absolute inset-0 bg-primary" />
                <div className="absolute inset-0 bg-overlay/20" />
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-semibold leading-tight tracking-tight text-overlay-foreground">
                      <SkeletonText placeholder={t("tag_name")} />
                    </h3>
                    <span className="bg-card/20 backdrop-blur-sm text-overlay-foreground px-2 py-1 rounded-full text-xs tabular-nums">
                      <SkeletonText placeholder="00 posts" />
                    </span>
                  </div>
                  <div className="flex items-center text-overlay-foreground/90 text-sm">
                    <span>{t("explore")}</span>
                    <ArrowRight className="ml-1 h-3 w-3" />
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
