"use client";

import { useState, useEffect } from "react";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { publicShortName } from "@/utils/display-name";

interface HeroSectionProps {
  posts: Post[];
  isLoading: boolean;
}

export function HeroSection({ posts, isLoading }: HeroSectionProps) {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const [activePostIndex, setActivePostIndex] = useState(0);

  // Auto-rotate featured posts every 5 seconds
  useEffect(() => {
    if (posts.length <= 1) return;

    const interval = setInterval(() => {
      setActivePostIndex((prev) => (prev + 1) % Math.min(3, posts.length));
    }, 5000);

    return () => clearInterval(interval);
  }, [posts.length]);

  const featuredPost = posts[activePostIndex] || posts[0];

  // Scroll to content function
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: "smooth",
    });
  };

  /**
   * ONE hero, three states — and the middle one did not exist before.
   * ==========================================================================
   *
   * WHAT WAS HERE: `if (isLoading || posts.length === 0) return <second copy of
   * the hero built out of eleven hardcoded `Skeleton` boxes>`.
   *
   * Two defects, and the second is the serious one.
   *
   * 1. THE PENDING COPY WAS NOT THIS LAYOUT. It was a `min-h-screen` tree of
   *    its own that had drifted: no `pb-40 sm:pb-0` on the content column (so
   *    the whole stack sat 160px lower on mobile once it resolved), a
   *    `space-y-4` two-line title against a real `<h1>` with none, and
   *    `h-14 sm:h-16 md:h-20 lg:h-24` boxes standing in for
   *    `text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight` — 56px
   *    reserved for a 60px line at the small end and 96px for a 90px line at
   *    the large one. It also replaced `tCommon("scroll_to_explore")`, a
   *    static string already in hand, with an `h-4 w-32` grey bar.
   *
   * 2. `isLoading || posts.length === 0` NEVER RESOLVES FOR AN EMPTY BLOG. A
   *    fresh install with no published posts got the pulsing placeholder hero
   *    forever, which reads as "this page is broken" rather than "there is
   *    nothing here yet". Loading and empty are different states; they are now
   *    separated, and empty gets a real message in the real typography.
   *
   * The pending state is now this same tree with the values swapped, so it
   * cannot drift from it again.
   */
  const isEmpty = !isLoading && posts.length === 0;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-card">
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 dark:bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-20 h-80 w-80 rounded-full bg-primary/10 dark:bg-primary/20 blur-3xl animate-pulse animate-delay-1000" />
        <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-destructive/10 dark:bg-destructive/20 blur-3xl animate-pulse animate-delay-500" />
      </div>

      {/* Grid pattern. Ground is `bg-card`, a THEME surface, not media — so the
          two arms are two inks on the same ground, not a media/scrim pair. The
          dark arm's white is the ink that ground needs, and `--foreground` is
          near-white there, so the rule holds its weight while becoming
          something the design panel can actually move. */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(hsl(var(--foreground)/0.02)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground)/0.02)_1px,transparent_1px)] bg-size-[64px_64px] z-0" />

      {/* Featured post image */}
      {featuredPost?.image && (
        <div className="absolute inset-0 z-10">
          <Image
            src={featuredPost.image}
            alt={featuredPost.title || t("featured_post")}
            fill
            sizes="100vw"
            className="object-cover opacity-20 dark:opacity-40 transition-transform duration-1000 ease-in-out"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-card via-card/80 to-card/60 dark:via-background/80 dark:to-background/60" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 pb-40 sm:pb-0">
        {/*
          `w-full` is a layout-stability fix, not a visual one.

          This column is `flex flex-col items-center`, so a block child with no
          width shrink-wraps: its box is `min(max-content, available)`, i.e. it
          is sized BY THE TEXT INSIDE IT. Measured on the harness, that made the
          hero's content box 962px while pending (the width of the placeholder
          headline at `lg:text-7xl`) and 470px once the real post landed — a
          492px horizontal resize on an element occupying most of the viewport,
          which is where 0.0475 of this route's CLS was coming from. Vertically
          the hero is already exact: h1 90px -> 90px, the lead 32px -> 32px, the
          whole block 332px -> 332px, because the placeholders live inside the
          real typography elements.

          `w-full` pins the box to `max-w-5xl` in both states. Everything in
          here is `text-center` (and the lead is `max-w-3xl mx-auto`), so
          centred content renders identically at either width — the only thing
          that changes is that the box stops breathing with the string length.
          Widening cannot re-wrap anything either: shrink-to-fit was already
          capped at the same 64rem, so any text long enough to wrap was already
          being laid out at this width.
        */}
        <div className="w-full max-w-5xl text-center">
          {/* Category badge. The PILL renders while loading — same
              `rounded-full` chip, same padding, same border and glyph — with
              only the category name pending, so the 36px band above the title
              is occupied from the first frame instead of appearing under it.
              An empty blog has no category to show, so it drops the chip. */}
          {(isLoading || featuredPost?.category) && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                href={
                  featuredPost?.category
                    ? `/blog/category/${featuredPost.category.slug}`
                    : "/blog"
                }
                className="inline-flex items-center gap-2 rounded-full bg-primary/10 backdrop-blur-sm px-5 py-2 text-sm font-medium text-foreground border border-primary/30 shadow-lg hover:bg-primary/15 transition-all duration-300 mb-8"
              >
                <Sparkles className="w-4 h-4 text-warning" />
                <Loadable loading={isLoading} placeholder="Category">
                  {featuredPost?.category?.name}
                </Loadable>
              </Link>
            </m.div>
          )}

          {/* Title. The placeholder lives INSIDE the h1, so it is measured by
              `text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight` at
              whatever breakpoint the visitor is on — the four hardcoded heights
              it replaces could only ever be right at one of them. */}
          <m.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-tight"
          >
            {isEmpty ? (
              tCommon("no_posts_found")
            ) : (
              <Loadable
                loading={isLoading}
                placeholder={t("the_featured_article_headline")}
              >
                {featuredPost?.title}
              </Loadable>
            )}
          </m.h1>

          {/* Description */}
          {(isLoading || isEmpty || featuredPost?.description) && (
            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10"
            >
              {isEmpty ? (
                tCommon("please_check_back_later")
              ) : (
                <Loadable loading={isLoading} chars={110}>
                  {featuredPost?.description}
                </Loadable>
              )}
            </m.p>
          )}

          {/* Author & CTA */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            {isLoading ? (
              /* The author chip is the one thing here with no text metrics of
                 its own — a 48px avatar — so the block gets the SAME sizing
                 classes the real image carries rather than a separately
                 invented approximation. The two lines beside it are text and
                 are measured as text. */
              <div className="flex items-center gap-4 bg-muted dark:bg-card/10 backdrop-blur-sm rounded-full px-5 py-3 border border-border">
                <SkeletonBlock className="h-12 w-12 rounded-full border-2 border-border" />
                <div className="text-left">
                  <p className="text-foreground font-medium">
                    <SkeletonText placeholder="Author" />
                  </p>
                  <p className="text-subtle-foreground text-sm">
                    <SkeletonText placeholder="2 days ago" />
                  </p>
                </div>
              </div>
            ) : (
              featuredPost?.author?.user && (
                <div className="flex items-center gap-4 bg-muted dark:bg-card/10 backdrop-blur-sm rounded-full px-5 py-3 border border-border">
                  <div className="relative">
                    <div className="absolute -inset-0.5 bg-primary rounded-full opacity-75 blur-sm" />
                    <Image
                      className="relative h-12 w-12 rounded-full border-2 border-border"
                      src={featuredPost.author.user.avatar || "/img/placeholder.svg"}
                      alt={publicShortName(featuredPost.author.user, tCommon("author"))}
                      width={48}
                      height={48}
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-foreground font-medium">
                      {publicShortName(featuredPost.author.user, tCommon("author"))}
                    </p>
                    {featuredPost.createdAt && (
                      <p className="text-subtle-foreground text-sm">
                        {formatDistanceToNow(new Date(featuredPost.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )
            )}

            {/* The CTA's caption is a `t()` string and its box is fixed, so it
                renders in every state — it was previously replaced by an
                `h-14 w-48` grey pill for no reason at all. Only the href is
                unknown; while it is, the button points at the blog index
                rather than at `/blog/undefined`, which is what
                `featuredPost?.slug` interpolated to. */}
            {!isEmpty && (
              <Link
                href={featuredPost?.slug ? `/blog/${featuredPost.slug}` : "/blog"}
              >
                <Button
                  size="lg"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl hover:shadow-primary/25 transition-all duration-300 text-lg py-6 h-auto font-semibold"
                >
                  {t("read_article")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </m.div>
        </div>

        {/* Carousel indicators. Absolutely positioned, so their arrival costs
            no reflow — but three inert dots while loading keep the hero from
            looking like a single-post page that then sprouts a carousel. */}
        {(isLoading || posts.length > 1) && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="absolute bottom-32 left-0 right-0 flex justify-center gap-3"
          >
            {(isLoading
              ? [0, 1, 2]
              : posts.slice(0, 3).map((_, i) => i)
            ).map((_, index) => (
              <button
                key={index}
                onClick={() => setActivePostIndex(index)}
                disabled={isLoading}
                className={`relative cursor-pointer h-2.5 transition-all duration-300 rounded-full after:absolute after:-inset-y-4 after:-inset-x-1.5 after:content-[''] ${
                  index === activePostIndex
                    ? "w-12 bg-primary shadow-lg"
                    : "w-2.5 bg-muted dark:bg-card/40 hover:bg-muted dark:hover:bg-card/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </m.div>
        )}

        {/* Scroll indicator */}
        <m.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-subtle-foreground hover:text-foreground transition-colors duration-300 cursor-pointer"
        >
          <span className="text-sm font-medium">{tCommon("scroll_to_explore")}</span>
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </m.button>
      </div>
    </div>
  );
}
