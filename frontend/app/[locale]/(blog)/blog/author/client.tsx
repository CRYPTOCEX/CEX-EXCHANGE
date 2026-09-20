"use client";

import { useEffect } from "react";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { Link } from "@/i18n/routing";
import { useBlogStore } from "@/store/blog/user";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { m } from "framer-motion";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useKycGate } from "@/hooks/use-kyc-gate";
import { useTranslations } from "next-intl";
import { publicShortName } from "@/utils/display-name";
import { Users, AlertCircle, ArrowRight } from "lucide-react";
import { PageHero } from "../components/page-hero";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function AllAuthorsClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { authors, isLoading, fetchAllAuthors, error } = useBlogStore();
  // Gating logic
  const gate = useKycGate("author_blog");
  useEffect(() => {
    fetchAllAuthors();
  }, []);
  if (gate.state === "loading" || gate.state === "anonymous") {
    return null;
  }
  if (!gate.allowed) {
    return (
      <KycRequiredNotice
        feature="author_blog"
        requirement={gate.requirement ?? "verification"}
      />
    );
  }
  /**
   * The pending copy of this page is gone; the page below renders in both
   * states and only the author cards wait.
   * ==========================================================================
   *
   * The copy had drifted in the two ways that cost the most:
   *
   *   - Its card was `rounded-2xl bg-card/80 backdrop-blur-xl shadow-lg
   *     border-border/50`. The real card is `rounded-lg bg-card border-border`
   *     with no blur and no shadow — a different card language, in a grid of
   *     six, replaced all at once.
   *   - Its content block was `h-7 + mb-3` name, two `h-4` bio lines and an
   *     `h-9` button = 121px against the real block's `text-xl leading-tight`
   *     name (28px + 8px), two-line `text-sm line-clamp-2` bio (40px + 20px)
   *     and `size="sm"` button (32px) + `p-6` = 128px, so every row settled
   *     downward as it resolved.
   *
   * The hero was three grey boxes standing in for a badge, a title and a
   * description that are all `t()` strings — nothing there was ever pending.
   */
  const isPending = isLoading && authors.length === 0;

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
              {t("authors")}
            </h1>
            <div className="bg-card/80 dark:bg-surface-2/80 backdrop-blur-xl text-destructive p-6 rounded-2xl inline-block border border-destructive/50 shadow-xl">
              {error}
            </div>
          </m.div>
        </div>
      </div>
    );
  }
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
        badge={{ icon: <Users className="h-3.5 w-3.5" />, text: t("authors") }}
        title={[
          { text: "Our " },
          { text: "Authors", gradient: "bg-primary" },
        ]}
        description={t("meet_the_talented_writers_behind_our_blog")}
      />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Six pending cards built from the REAL card shell — same radius,
              same border, same `h-52` image frame, same `p-6`. The avatar is
              the only thing here with no text metrics, so it is the only
              `SkeletonBlock`; the name, the bio and the button caption are all
              measured by the elements that will hold them. The "Author" chip
              and the "View articles" caption are `t()` strings and render in
              both states. */}
          {isPending &&
            Array.from({ length: 6 }).map((_, i) => (
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
          {authors.map((author, index) => {
            return (
              <m.div
                key={author.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="group overflow-hidden rounded-lg border border-border bg-card transition-colors duration-300 hover:border-border-strong"
              >
                <div className="relative h-52 w-full overflow-hidden">
                  {/*
                    `block absolute inset-0`: next/link renders a plain <a> with
                    position: static, and a `fill` image lays itself out against
                    the nearest POSITIONED ancestor — so without this the avatar
                    was sized against the page rather than this frame.
                  */}
                  <Link
                    href={`/blog/author/${author.id}`}
                    className="block absolute inset-0"
                  >
                    <Image
                      src={author.user?.avatar || "/placeholder.svg"}
                      alt={publicShortName(author.user, tCommon("author"))}
                      fill
                      sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                      // The first row is above the fold and one of these avatars
                      // is the page's Largest Contentful Paint, so leaving them
                      // all lazy delays the metric the page is judged on.
                      priority={index < 3}
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-transparent"></div>

                    {/* Author badge overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/20 backdrop-blur-sm text-overlay-foreground/90 text-xs font-medium">
                        <Users className="h-3 w-3" />
                        {tCommon("author")}
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="p-6">
                  <Link href={`/blog/author/${author.id}`}>
                    <h2 className="text-xl font-semibold leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 mb-2">
                      {publicShortName(author.user, tCommon("author"))}
                    </h2>
                  </Link>
                  <p className="text-muted-foreground mb-5 line-clamp-2 text-sm">
                    {author.user?.profile?.bio || t("no_bio_available")}
                  </p>
                  <Link href={`/blog/author/${author.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl group/btn border-border-strong text-muted-foreground dark:hover:bg-muted"
                    >
                      {t("view_articles")}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </m.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
