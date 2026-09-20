"use client";

import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import { Clock, ArrowUpRight } from "lucide-react";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { publicShortName } from "@/utils/display-name";

interface BlogCardProps {
  /** Omitted only while `loading` is true. */
  post?: Post;
  /**
   * Render the card's own shell with placeholders instead of the post.
   *
   * THIS PROP EXISTS SO THE (blog) TREE STOPS HAND-BUILDING ITS PENDING CARDS.
   * ==========================================================================
   * Five pages under `/blog` each carried their own grey-box imitation of this
   * card — category/[slug], tag/[slug], author/[id], post/ and the admin list —
   * and no two of them agreed with each other OR with this file. Measured
   * against the real card at the default breakpoint, the copies were:
   *
   *   - `border-border/50` instead of `border-border` (three of them),
   *   - a `space-y-4` content block against this one's `p-6` + `mb-3` +
   *     `mt-6 pt-4` rhythm, which came out 12-20px short per card, so every
   *     row of three settled downward as the posts landed,
   *   - missing the author/date footer's `border-t` entirely in two of them,
   *     which is another 1px + 16px per card.
   *
   * A copy has no mechanism keeping it in sync with the original, so all five
   * had drifted. There is now one card, and the pending state is that card.
   */
  loading?: boolean;
}

export function BlogCard({ post, loading = false }: BlogCardProps) {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  /* Where the card links. While pending there is no slug, so every link
     collapses to a non-navigating span rather than pointing at
     `/blog/undefined` — which is what a template literal over a missing slug
     produces, and it is a real 404 if the user is quick with a click. */
  const postHref = post?.slug ? `/blog/${post.slug}` : undefined;

  /**
   * The artwork, as a VALUE rather than as a branch.
   *
   * This used to be `loading || !postHref ? <div>…skeleton…</div> : <Link>…
   * <Image/>…</Link>`, i.e. two whole trees with different roots, which is
   * what the scanner's `divergent-branch` rule names. The two trees happened
   * to agree — both `block absolute inset-0` inside the same `h-52` frame, so
   * the box really was identical — but nothing kept them agreeing, and that is
   * the failure mode the whole contract is about. The gradient scrim was
   * written out twice; so was the positioning class.
   *
   * Reduced to one question with one answer: is there artwork to paint? The
   * pending state is the one case where there is not, and `SkeletonBlock` is
   * the right primitive for it — an image genuinely has no text metrics, so
   * this is the one place on the card that legitimately takes a hand-sized
   * block, and it takes the SAME `absolute inset-0` box the real `fill` image
   * occupies rather than a separately invented height.
   *
   * The `<Link>`/`<div>` split is gone too: `LinkOrSpan` already existed below
   * for the content block and does exactly this. One wrapper, one scrim, one
   * set of positioning classes.
   */
  const artworkSrc = loading ? null : post?.image || "/placeholder.svg";

  return (
    <div className="group relative h-full overflow-hidden rounded-lg bg-card border border-border transition-colors duration-300 hover:border-border-strong">
      {/* Image Section */}
      <div className="relative h-52 w-full overflow-hidden">
        {/*
          `block absolute inset-0`: a `fill` image is positioned against its
          NEAREST positioned ancestor, and next/link renders a plain <a> whose
          position is static — so the image was being laid out against the page,
          not this 13rem-tall frame. Next warns about exactly this
          ("has 'fill' and parent element with invalid 'position'").
        */}
        <LinkOrSpan href={postHref} className="block absolute inset-0">
          {artworkSrc ? (
            <Image
              src={artworkSrc}
              alt={post?.title ?? ""}
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <SkeletonBlock className="absolute inset-0 rounded-none" />
          )}
          {/* The scrim renders over either one — it is what the category chip
              and the hover arrow are read against, so it is chrome, not
              content. */}
          <div className="absolute inset-0 bg-linear-to-t from-overlay/70 via-overlay/30 to-transparent" />
        </LinkOrSpan>

        {/* Category Badge. Rendered while loading too: it is absolutely
            positioned, so it costs nothing to reserve, and a chip that appears
            over the image a beat later is the most obviously "unfinished"
            thing on the card. */}
        {loading ? (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-card/90 dark:bg-surface-2/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-primary border border-border">
            <SkeletonText placeholder="Category" />
          </span>
        ) : (
          post?.category && (
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-card/90 dark:bg-surface-2/90 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-primary hover:bg-card dark:hover:bg-muted transition-colors duration-300 border border-border"
            >
              {post.category.name}
            </Link>
          )
        )}

        {/* Hover arrow */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <div className="w-9 h-9 rounded-full bg-card/90 dark:bg-surface-2/90 backdrop-blur-sm flex items-center justify-center border border-border">
            <ArrowUpRight className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="relative flex flex-1 flex-col p-6 z-10">
        {/*
          The heading and the blurb keep their own elements in both states, so
          `line-clamp-2` and `text-xl`/`text-sm` produce the pending height the
          same way they produce the settled one. The placeholders are two-line
          strings on purpose: `line-clamp-2` caps at two lines, so a one-line
          placeholder under a two-line title is a 28px shift per card.
        */}
        <LinkOrSpan href={loading ? undefined : postHref} className="block flex-1">
          <h3 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-3">
            <Loadable
              loading={loading}
              placeholder={t("a_two_line_post_headline_that_wraps")}
            >
              {post?.title}
            </Loadable>
          </h3>
          {(loading || post?.description) && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              <Loadable loading={loading} chars={104}>
                {post?.description}
              </Loadable>
            </p>
          )}
        </LinkOrSpan>

        {/* Author & Date. The whole row renders while loading — it carries the
            `mt-6 pt-4 border-t`, i.e. 41px of the card's height, and
            withholding it made every pending card that much shorter than the
            one replacing it. */}
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          {loading ? (
            <span className="flex items-center gap-3">
              <SkeletonBlock className="h-9 w-9 rounded-full ring-2 ring-card" />
              <span className="text-sm font-semibold text-foreground">
                <SkeletonText placeholder="Author" />
              </span>
            </span>
          ) : (
            post?.author?.user && (
              <Link
                href={`/blog/author/${post.author.id}`}
                className="flex items-center gap-3 group/author"
              >
                <Image
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-card"
                  src={post.author.user.avatar || "/img/placeholder.svg"}
                  alt={publicShortName(post.author.user, tCommon("author"))}
                  width={36}
                  height={36}
                />
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover/author:text-primary transition-colors duration-300">
                    {publicShortName(post.author.user, tCommon("author"))}
                  </p>
                </div>
              </Link>
            )
          )}
          {loading ? (
            <span className="flex items-center gap-1.5 text-[11px] text-subtle-foreground">
              <Clock className="w-3.5 h-3.5" />
              <SkeletonText placeholder="2 days ago" />
            </span>
          ) : (
            post?.createdAt && (
              <div className="flex items-center gap-1.5 text-[11px] text-subtle-foreground">
                <Clock className="w-3.5 h-3.5" />
                <time dateTime={post.createdAt.toString()}>
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                  })}
                </time>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A `<Link>` when there is somewhere to go, a `<div>` with the same classes
 * when there is not.
 *
 * Swapping the ELEMENT rather than dropping the wrapper is what keeps the
 * pending card the same height: the wrapper carries `block flex-1`, so
 * removing it would let the heading and blurb collapse against the footer.
 */
function LinkOrSpan({
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
