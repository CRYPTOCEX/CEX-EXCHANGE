"use client";

import { m } from "framer-motion";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, FileText, ArrowUpRight, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { useTranslations } from "next-intl";
import { publicShortName } from "@/utils/display-name";

interface FeaturedArticlesProps {
  posts: Post[];
  category?: string | null;
  tag?: string | null;
  /** True until the post request settles. `posts` is `[]` for the whole of it. */
  loading?: boolean;
}

/**
 * How many small tiles sit beside the lead one.
 *
 * Not a taste call — it is what `recentPosts.slice(1, 5)` yields, and the
 * pending grid has to agree with it or the bento changes shape on arrival. At
 * `lg` the lead tile is `col-span-2 row-span-2`, so the three implicit rows
 * are: lead + small#1, lead + small#2, then small#3 + small#4. Reserve fewer
 * than four and the third row does not exist while pending; reserve more and
 * a fourth row appears that the settled grid never has.
 */
const SMALL_TILE_COUNT = 4;

export function FeaturedArticles({
  posts,
  category,
  tag,
  loading = false,
}: FeaturedArticlesProps) {
  const t = useTranslations("blog_blog");
  const recentPosts = posts.slice(1); // The first post is used as the hero

  /**
   * `recentPosts.length > 0` was answering the wrong question.
   * ==========================================================================
   *
   * The bento was `recentPosts.length > 0 ? <grid> : <EmptyState/>`, and
   * `recentPosts` is `[]` for the whole of the fetch — so while loading this
   * section was a 268px `EmptyState` reading "No featured articles yet", with
   * a "Become an Author" button under it, and then it became a ~1,100px grid.
   * That is ~830px of the page's 4,346px shortfall, and it also told every
   * visitor for the length of a request that the blog had no featured content.
   *
   * Empty is a genuine settled state and keeps its real message. It just
   * cannot be reached before the request has answered.
   */
  const isEmpty = !loading && recentPosts.length === 0;

  return (
    <section className="py-16">
      {/* Premium Section Header. Every string in it is a `t()` literal, known
          before the fetch starts, so the whole 250px block renders in both
          states unchanged. */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <Badge
          variant="outline"
          className="mb-4 px-4 py-2 rounded-full bg-warning/10 border-warning/30 text-warning-ink"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {t("featured_articles")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          {t("featured_articles").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="text-warning-ink">
            {t("featured_articles").split(" ").slice(-1)[0]}
          </span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {category ? (
            <>
              {t("showing_posts_in")}{" "}
              <span className="font-semibold text-warning">{category.replace(/-/g, " ")}</span>
            </>
          ) : tag ? (
            <>
              {t("showing_posts_tagged_with")}{" "}
              <span className="font-semibold text-warning">{tag.replace(/-/g, " ")}</span>
            </>
          ) : (
            t("handpicked_articles_from_our_editorial_team")
          )}
        </p>
      </m.div>

      {/* Premium Bento Grid Layout */}
      {isEmpty ? (
        <EmptyState
          title={t("no_featured_articles_yet")}
          description={`${t("were_working_on_curating_our_best_content")} ${t("check_back_soon_for_featured_articles")}`}
          icon={FileText}
          actionText="Become an Author"
          actionLink="/blog/author"
        />
      ) : (
        /*
          The grid keeps `grid-cols-1 lg:grid-cols-3 gap-6` in both states.
          Every tile in it is height-pinned by a `min-h-*` on the tile itself
          (500px for the lead at `lg`, 240px for the rest) because their
          contents are `absolute inset-0` — so reserving the tiles reserves the
          section's full height exactly, and the placeholders inside them cost
          nothing either way. They are still text-measured: the tile is one
          component rendered in two states, not two components.
        */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large Featured Post - Spans 2 columns */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 lg:row-span-2"
          >
            <LeadTile post={recentPosts[0]} loading={loading} />
          </m.div>

          {/* Smaller Featured Posts */}
          {loading
            ? Array.from({ length: SMALL_TILE_COUNT }).map((_, index) => (
                <div key={`pending-featured-${index}`}>
                  <SmallTile loading />
                </div>
              ))
            : recentPosts.slice(1, 1 + SMALL_TILE_COUNT).map((post, index) => (
                <m.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <SmallTile post={post} />
                </m.div>
              ))}
        </div>
      )}

      {/* View All Button. `!isEmpty` rather than `recentPosts.length > 0`: the
          button plus its `mt-12` is 96px that used to land with the data. It is
          suppressed only in the settled-empty case, which is why this is not
          the scanner's `hidden-while-loading` defect. */}
      {!isEmpty && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link href="/blog/post">
            <Button
              size="lg"
              className="rounded-full bg-warning hover:bg-warning text-warning-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t("view_more_articles")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </m.div>
      )}
    </section>
  );
}

/**
 * The hero tile of the bento — `lg:col-span-2 lg:row-span-2`, 400px tall at
 * base and 500px at `lg`.
 *
 * ONE TILE, TWO STATES. The pending bento used to not exist at all (see
 * `isEmpty` above); the obvious repair was to paste a grey copy of this markup
 * next to it, which is the exact thing that had already gone wrong five times
 * over in `blog-card.tsx`'s history. So the tile takes `loading` instead and
 * there is nothing to keep in sync: same root, same `min-h`, same scrim, same
 * `p-8` content stack.
 */
function LeadTile({ post, loading = false }: { post?: Post; loading?: boolean }) {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  /* `/blog/${post?.slug}` interpolates to the string "/blog/undefined" when
     there is no post — a real 404 for anyone quick with a click. No slug, no
     link. */
  const href = post?.slug ? `/blog/${post.slug}` : undefined;

  /**
   * The artwork as a VALUE, not a branch on `loading` — the same repair
   * `blog-card.tsx` documents.
   *
   * `loading ? <SkeletonBlock/> : <Image/>` is two trees with two roots, and
   * the scanner's `divergent-branch` rule names it: nothing keeps the two
   * agreeing, and here both of them have to stay `absolute inset-0` inside a
   * `min-h-[500px]` frame or the tile's whole content stack detaches. Reduced
   * to one question with one answer — is there artwork to paint? — the
   * positioning class is written once and the scrim below applies to whichever
   * one won.
   */
  const artworkSrc = loading ? null : post?.image || "/placeholder.svg";

  return (
    <LinkOrDiv
      href={href}
      className="group relative block h-full min-h-[400px] lg:min-h-[500px] overflow-hidden rounded-lg bg-card border border-border/50 transition-all duration-500"
    >
      {/* Image. Artwork genuinely has no text metrics, so this is one of the
          few places a hand-sized block is right — and it takes the SAME
          `absolute inset-0` box the `fill` image occupies rather than an
          invented height. */}
      <div className="absolute inset-0">
        {artworkSrc ? (
          <Image
            src={artworkSrc}
            alt={post?.title || t("featured_post")}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <SkeletonBlock className="absolute inset-0 rounded-none" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-overlay/90 via-overlay/50 to-overlay/20" />
      </div>

      {/* Floating orb effect */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-warning/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-8">
        {(loading || post?.category) && (
          <span className="inline-flex items-center self-start gap-1 px-3 py-1 rounded-full bg-warning/90 backdrop-blur-sm text-xs font-semibold text-warning-foreground mb-4 shadow-lg">
            <Sparkles className="w-3 h-3" />
            <Loadable loading={loading} placeholder="Category">
              {post?.category?.name}
            </Loadable>
          </span>
        )}
        <h3 className="text-3xl lg:text-4xl font-bold text-overlay-foreground mb-4 group-hover:text-overlay-foreground/80 transition-colors duration-300">
          <Loadable loading={loading} placeholder={t("the_featured_article_headline")}>
            {post?.title}
          </Loadable>
        </h3>
        {(loading || post?.description) && (
          <p className="text-overlay-foreground/80 text-lg mb-6 line-clamp-2">
            <Loadable loading={loading} chars={110}>
              {post?.description}
            </Loadable>
          </p>
        )}
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="flex items-center gap-3">
              {/* 40px avatar, given the real element's own sizing classes. */}
              <SkeletonBlock className="h-10 w-10 rounded-full border-2 border-overlay-foreground/50" />
              <span className="block">
                <span className="block text-overlay-foreground font-medium">
                  <SkeletonText placeholder="Author" />
                </span>
                <span className="block text-overlay-foreground/60 text-sm">
                  <Clock className="w-3 h-3 inline mr-1" />
                  <SkeletonText placeholder="2 days ago" />
                </span>
              </span>
            </span>
          ) : (
            post?.author?.user && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-warning rounded-full opacity-75 blur-sm" />
                  <Image
                    className="relative h-10 w-10 rounded-full border-2 border-overlay-foreground/50"
                    src={post.author.user.avatar || "/placeholder.svg"}
                    alt={publicShortName(post.author.user, tCommon("author"))}
                    width={40}
                    height={40}
                  />
                </div>
                <div>
                  <p className="text-overlay-foreground font-medium">
                    {publicShortName(post.author.user, tCommon("author"))}
                  </p>
                  {post?.createdAt && (
                    <p className="text-overlay-foreground/60 text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Hover arrow indicator */}
      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
        <div className="w-12 h-12 rounded-full bg-card/20 backdrop-blur-sm flex items-center justify-center border border-overlay-foreground/20">
          <ArrowUpRight className="w-6 h-6 text-overlay-foreground" />
        </div>
      </div>
    </LinkOrDiv>
  );
}

/**
 * The four satellite tiles, `min-h-[240px]` each. Same two-state contract as
 * `LeadTile`.
 */
function SmallTile({ post, loading = false }: { post?: Post; loading?: boolean }) {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const href = post?.slug ? `/blog/${post.slug}` : undefined;
  /* One question, one answer — see `LeadTile` above. */
  const artworkSrc = loading ? null : post?.image || "/placeholder.svg";

  return (
    <LinkOrDiv
      href={href}
      className="group relative block h-full min-h-[240px] overflow-hidden rounded-lg bg-card border border-border/50 transition-all duration-500"
    >
      {/* Image */}
      <div className="absolute inset-0">
        {artworkSrc ? (
          <Image
            src={artworkSrc}
            alt={post?.title ?? ""}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <SkeletonBlock className="absolute inset-0 rounded-none" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        {(loading || post?.category) && (
          <span className="inline-flex items-center self-start gap-1 px-2.5 py-1 rounded-full bg-card/20 backdrop-blur-sm text-xs font-medium text-overlay-foreground mb-3 border border-overlay-foreground/10">
            <Loadable loading={loading} placeholder="Category">
              {post?.category?.name}
            </Loadable>
          </span>
        )}
        <h3 className="text-lg font-bold text-overlay-foreground mb-2 group-hover:text-overlay-foreground/80 transition-colors duration-300 line-clamp-2">
          {/* Two lines on purpose: `line-clamp-2` caps at two, and a one-line
              placeholder under a two-line title is a 28px step per tile. */}
          <Loadable loading={loading} placeholder={t("a_two_line_post_headline_that_wraps")}>
            {post?.title}
          </Loadable>
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {loading ? (
              <SkeletonBlock className="h-6 w-6 rounded-full border border-overlay-foreground/30" />
            ) : (
              post?.author?.user && (
                <Image
                  className="h-6 w-6 rounded-full border border-overlay-foreground/30"
                  src={post.author.user.avatar || "/img/placeholder.svg"}
                  alt={publicShortName(post.author.user, tCommon("author"))}
                  width={24}
                  height={24}
                />
              )
            )}
            <span className="text-xs text-overlay-foreground/70">
              <Loadable loading={loading} placeholder="2 days ago">
                {post?.createdAt &&
                  formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </Loadable>
            </span>
          </div>
          <ArrowUpRight className="w-4 h-4 text-overlay-foreground/70 group-hover:text-overlay-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
        </div>
      </div>
    </LinkOrDiv>
  );
}

/**
 * A `<Link>` when there is somewhere to go, a `<div>` carrying the identical
 * className when there is not.
 *
 * Swapping the ELEMENT rather than dropping the wrapper is what holds the
 * tile's box: the className carries `min-h-[400px] lg:min-h-[500px]` (or
 * `min-h-[240px]`) and `relative`, and the tile's whole content is
 * `absolute inset-0` against it. Lose the wrapper and the tile is 0px tall and
 * its contents are positioned against the page. Same shape as
 * `blog-card.tsx`'s `LinkOrSpan`.
 */
function LinkOrDiv({
  href,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
