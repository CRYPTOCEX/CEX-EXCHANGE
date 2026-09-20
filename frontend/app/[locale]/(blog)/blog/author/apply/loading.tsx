"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { SkeletonText } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PageHero } from "../../components/page-hero";

/**
 * Pending state for /blog/author/apply.
 *
 * WHAT DRIFTED — the blog frame, entirely
 * ---------------------------------------
 * WAS `container mx-auto px-4 py-12` with a centred pair of grey bars and one
 * `h-[600px]` box. The page renders a `PremiumWrapper` —
 * `min-h-screen relative overflow-hidden bg-card pt-24` plus the ambient
 * layers, closing on `relative z-10 pb-16` — then `<PageHero>` and
 * `container mx-auto px-4 pb-16`.
 *
 *  - No `pt-24`: 6rem of clearance that only appeared on resolve.
 *  - No `bg-card` ground.
 *  - No hero: ~300px of badge, title and description, all `t()` strings.
 *  - `py-12` (48px top AND bottom) against the page's `pb-16` (64px bottom,
 *    none at top — the hero already spent it). So the container's first row
 *    started 48px low and its last row ended 16px short.
 *  - The `h-[600px]` box stood in for a three-tab panel whose tab labels are
 *    `t()` calls sitting in the same file.
 *
 * `PageHero` is mounted rather than restated. The three tab labels and the
 * panel's card shell render for real; only the guideline copy waits.
 */
export default function AuthorGuidelinesLoading() {
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

      <div className="relative z-10 pb-16">
        <PageHero
          badge={{
            icon: <Sparkles className="h-3.5 w-3.5" />,
            text: t("become_an_author"),
          }}
          title={[
            { text: "Become an " },
            { text: "Author", gradient: "bg-primary" },
          ]}
          description={t("share_your_knowledge_our_community")}
        />

        <div className="container mx-auto px-4 pb-16">
          <div className="mx-auto max-w-4xl">
            <Tabs
              defaultValue="guidelines"
              className="bg-card rounded-lg border border-border overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-3 p-2 bg-muted/50 dark:bg-surface-2/50">
                <TabsTrigger value="guidelines" className="rounded-lg">
                  {t("guidelines")}
                </TabsTrigger>
                <TabsTrigger value="rules" className="rounded-lg">
                  {t("rules")}
                </TabsTrigger>
                <TabsTrigger value="apply" className="rounded-lg">
                  {tCommon("apply")}
                </TabsTrigger>
              </TabsList>

              {/* The opening panel's own padding and rhythm, with three
                  guideline rows. Each row's icon tile is a fixed box and only
                  the heading and body copy are pending. */}
              <div className="p-6 space-y-8">
                <div className="space-y-6">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="bg-primary/15 text-primary-ink rounded-sm p-3 flex-shrink-0 h-12 w-12" />
                      <div>
                        <h3 className="text-lg font-medium text-foreground">
                          <SkeletonText placeholder={t("content_guidelines")} />
                        </h3>
                        <p className="mt-2 text-muted-foreground">
                          <SkeletonText chars={140} />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
