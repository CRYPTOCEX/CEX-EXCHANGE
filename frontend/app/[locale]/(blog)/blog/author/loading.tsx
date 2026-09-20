"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";

import { PageHero } from "../components/page-hero";

/**
 * Pending state for /blog/author.
 *
 * WHAT DRIFTED — the whole blog frame was missing
 * -----------------------------------------------
 * WAS `container mx-auto px-4 py-12` and nothing else. Every page under
 * `(blog)/blog` is
 * `min-h-screen relative overflow-hidden bg-card pt-24` → decorative layers →
 * `<PageHero>` → `relative z-10 container mx-auto px-4 py-12`. So this file:
 *
 *  - had NO top clearance where the page has `pt-24` (6rem). That is the
 *    largest mismatch in this tree: the whole document sat 96px high and
 *    dropped the moment the route resolved.
 *  - had no `bg-card` ground, so the pending state painted `--background` and
 *    the page paints the card ground — a full-viewport colour change on every
 *    navigation.
 *  - reserved nothing for `PageHero` — roughly 300px of badge, `text-4xl
 *    md:text-5xl lg:text-6xl` title and description, every string of which is
 *    a literal or a `t()` call needing no network. This file drew it as two
 *    grey bars INSIDE the container instead, so the hero appeared above them
 *    and pushed everything down twice.
 *
 * `PageHero` is a component, so it is IMPORTED and mounted rather than
 * re-described; clearance, orb geometry and title typography are then the same
 * code in both states.
 *
 * The six pending cards are `client.tsx`'s own `isPending` markup, so the
 * route-level pending state and the in-page one are the same picture: the
 * `t()` chip and button caption render for real, and the avatar — the only
 * thing here with no text metrics — is the only `SkeletonBlock`.
 *
 * EXTRACTION CANDIDATE: the root string and the ambient gradient layer are
 * re-typed inline in eight `(blog)/blog` clients. They belong beside
 * `PageHero` in `blog/components/` — see the report.
 */
export default function AllAuthorsLoading() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-screen relative overflow-hidden bg-card pt-24">
      {/* The page's ambient wash. `fixed` and `pointer-events-none`, so it
          contributes no layout — it is here only so the pending state is the
          same colour as the page. `FloatingShapes` / `InteractivePattern` are
          deliberately omitted: both are equally layout-free, and mounting two
          mouse-tracking canvases for a state discarded on the next frame buys
          nothing. */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--primary) / 0.08) 0%, transparent 50%)`,
        }}
      />

      <PageHero
        badge={{ icon: <Users className="h-3.5 w-3.5" />, text: t("authors") }}
        title={[{ text: "Our " }, { text: "Authors", gradient: "bg-primary" }]}
        description={t("meet_the_talented_writers_behind_our_blog")}
      />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`pending-author-${i}`}
              className="group overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="relative h-52 w-full overflow-hidden">
                <SkeletonBlock className="absolute inset-0 h-full w-full rounded-none" />
                <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/20 backdrop-blur-sm text-overlay-foreground/90 text-xs font-medium">
                    <Users className="h-3 w-3" />
                    {tCommon("author")}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground mb-2">
                  <SkeletonText placeholder={t("author_name")} />
                </h2>
                <p className="text-muted-foreground mb-5 line-clamp-2 text-sm">
                  <SkeletonText chars={72} />
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full rounded-xl border-border-strong text-muted-foreground"
                >
                  {t("view_articles")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
