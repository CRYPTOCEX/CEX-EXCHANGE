"use client";

import { useEffect, useMemo } from "react";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { Link } from "@/i18n/routing";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronLeft,
  Calendar,
  Clock,
  MessageSquare,
  Tag,
  ArrowRight,
} from "lucide-react";
import { useBlogStore } from "@/store/blog/user";
import { CommentList } from "../components/comment-list";
import { CommentForm } from "../components/comment-form";
import { m } from "framer-motion";
import { useParams } from "next/navigation";
import PostLoading from "./loading";
import { useConfigStore } from "@/store/config";
import { settingIsTrue } from "@/lib/settings-bool";
import { useTranslations } from "next-intl";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";
import { Button } from "@/components/ui/button";
import { AvatarPresenceDot, presenceOf } from "@/components/ui/presence";
import { AlertCircle } from "lucide-react";
import { SafeHtml } from "@/app/[locale]/(dashboard)/admin/builder/components/shared/safe-html";
import { publicShortName, publicHandle } from "@/utils/display-name";

export default function PostClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { slug } = useParams() as {
    slug: string;
  };
  const { post, fetchPost, isLoading, error } = useBlogStore();
  const { settings } = useConfigStore();

  /* Reading time is DERIVED from the content, not stored in state and written
     from an effect. The effect version seeded state with the literal "5 min"
     and only overwrote it once the post had loaded — and it overwrote it with a
     differently-shaped string ("3 min read"), so the meta row rendered a wrong
     number in one format and then swapped to another. It also ran on every
     change to `post`, which is in that effect's dependency list.

     `content` is an HTML string, so the word count has to come from its TEXT.
     Parsing it with DOMParser rather than assigning to a live element's
     innerHTML matters: innerHTML on a real <div> makes the browser fetch every
     <img> in the article a second time just to count words. DOMParser builds an
     inert document that loads nothing. */
  const readingMinutes = useMemo(() => {
    if (!post?.content) return null;
    const text = new DOMParser().parseFromString(post.content, "text/html").body
      .textContent;
    const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200)); // 200 wpm
  }, [post?.content]);
  // Settings arrive as stored text, so an off switch is the string "false" — and
  // `Boolean("false")` is true. Read as booleans these three could only ever be
  // on: comments, related posts and the author bio could not be turned off.
  const enableComments = settingIsTrue(settings?.enableComments, true);
  const showRelatedPosts = settingIsTrue(settings?.showRelatedPosts, true);
  const showAuthorBio = settingIsTrue(settings?.showAuthorBio, true);
  /* Scroll-to-top belongs to the ROUTE, not to the post object. It used to
     share an effect that listed `post` as a dependency, so it re-ran on every
     store update for the article you were already reading — including the one
     that arrives when a comment is posted, which yanked the reader back to the
     top of the page mid-thread. Keyed on `slug`, it fires once per article. */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!post || post.slug !== slug) {
      fetchPost(slug);
    }
  }, [fetchPost, slug, post]);
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
            className="text-center max-w-2xl mx-auto"
          >
            <div className="mb-8 inline-flex items-center justify-center p-8 bg-destructive/10 rounded-3xl border border-destructive/50">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {t("error_loading_post")}
            </h3>
            <p className="text-muted-foreground mb-8 text-lg">{error}</p>
            <Link href="/blog">
              <Button variant="outline" size="lg" className="rounded-full">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t("back_to_blog")}
              </Button>
            </Link>
          </m.div>
        </div>
      </div>
    );
  }
  /**
   * LOADING AND NOT-FOUND ARE NOW DIFFERENT STATES.
   * ==========================================================================
   *
   * This was `if (!post || isLoading) return <PostLoading />`, and the `!post`
   * half is the bug: the store sets `post` to null and `isLoading` to false for
   * a slug that does not exist, so a 404 rendered the PENDING ARTICLE FOREVER.
   * A visitor following a stale link saw a pulsing skeleton of a post that will
   * never arrive, with no message, no status code and nothing to click. It is
   * the same `loading || empty` conflation the blog hero carried, in its most
   * expensive form, because here the "empty" case is the one a search engine
   * and every old link land on.
   *
   * The pending tree is deliberately still `./loading.tsx` rather than a copy
   * inlined here. That file IS this route's Suspense boundary — Next renders it
   * during navigation whether or not this component does — so importing it is
   * what keeps the route to ONE pending layout instead of two that drift.
   * Making that layout faithful to the article is a change to `loading.tsx`,
   * which this pass does not own.
   *
   * The two are written as ONE branch on "is there an article", with a named
   * predicate deciding which of the two no-article answers is right. Spelled
   * as `if (isLoading) return <PostLoading/>` followed by `if (!post) return
   * <NotFound/>` they read as two unrelated bail-outs and invite exactly the
   * merge that caused the original bug; spelled this way the question is asked
   * once and answered twice, and the fact that BOTH answers are "no article"
   * is on the page rather than in a reader's head.
   */
  const showPostNotFound = !isLoading && !post;

  if (!post) {
    return showPostNotFound ? (
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
            className="text-center max-w-2xl mx-auto"
          >
            <div className="mb-8 inline-flex items-center justify-center p-8 bg-destructive/10 rounded-3xl border border-destructive/50">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {tCommon("no_posts_found")}
            </h3>
            <p className="text-muted-foreground mb-8 text-lg">
              {t("error_loading_post")}
            </p>
            <Link href="/blog">
              <Button variant="outline" size="lg" className="rounded-full">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t("back_to_blog")}
              </Button>
            </Link>
          </m.div>
        </div>
      </div>
    ) : (
      <PostLoading />
    );
  }
  return (
    <div className="min-h-screen relative overflow-hidden bg-card pt-24 pb-16">
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
        count={6}
        interactive={true}
        theme={{ primary: "indigo", secondary: "purple" }}
      />
      <InteractivePattern
        config={{
          enabled: true,
          variant: "crosses",
          opacity: 0.01,
          size: 40,
          interactive: true,
        }}
      />

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <article className="mx-auto max-w-4xl">
          {/* Hero Section */}
          <m.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
            className="relative mb-8 sm:mb-10 md:mb-12 overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl"
          >
            {/* Featured Image */}
            <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[65vh] w-full overflow-hidden">
              <Image
                src={post.image || "/placeholder.svg"}
                alt={post.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
              {/* A scrim exists to make the overlaid title legible, so it has
                  to DARKEN the photograph — which is what `--overlay` is for
                  (it stays dark in both schemes, unlike `--primary`). This was
                  `from-primary/90 via-primary/50 to-primary/20`: a 90% wash of
                  the brand colour over the author's featured image, which on
                  the shipped palette left the artwork an unreadable orange
                  field. Keeping a light primary tint at the top preserves the
                  brand accent without repainting the subject. */}
              <div className="absolute inset-0 bg-linear-to-t from-overlay/90 via-overlay/55 to-overlay/15"></div>
              <div className="absolute inset-0 bg-linear-to-t from-primary/25 to-transparent mix-blend-overlay"></div>

              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden opacity-30">
                <div className="absolute -top-10 sm:-top-20 -right-10 sm:-right-20 h-32 sm:h-60 w-32 sm:w-60 rounded-full bg-primary/30 blur-3xl"></div>
                <div className="absolute bottom-10 sm:bottom-20 left-10 sm:left-20 h-24 sm:h-40 w-24 sm:w-40 rounded-full bg-primary/30 blur-3xl"></div>
              </div>
            </div>

            {/* Content overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 lg:p-12">
              <div className="mx-auto max-w-3xl">
                {post.category && (
                  <Link
                    href={`/blog/category/${post.category.slug}`}
                    className="inline-block rounded-full bg-card/20 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-semibold uppercase tracking-wider text-overlay-foreground hover:bg-card/30 transition-colors duration-300 border border-overlay-foreground/10 shadow-lg mb-3 sm:mb-4"
                  >
                    {post.category.name}
                  </Link>
                )}
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-overlay-foreground mb-4 sm:mb-6 drop-shadow-sm leading-tight">
                  {post.title}
                </h1>

                <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 text-overlay-foreground/90">
                  {post.author?.user && (
                    <div className="flex items-center">
                      <div className="relative">
                        <div className="absolute -inset-0.5 bg-primary rounded-full opacity-75 blur-sm"></div>
                        <Image
                          className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 border-overlay-foreground/30"
                          src={
                            post.author.user.avatar || "/img/placeholder.svg"
                          }
                          alt={publicShortName(post.author.user, tCommon("author"))}
                          width={40}
                          height={40}
                        />
                        {/* `ring-overlay`: the hero avatar sits on the post's
                            cover image behind an overlay scrim, not on a card,
                            and a card-coloured ring here is a pale disc. */}
                        <AvatarPresenceDot
                          state={presenceOf(post.author.user)}
                          size="xs"
                          ringClassName="ring-overlay"
                        />
                      </div>
                      <div className="ml-2 sm:ml-3">
                        <p className="text-sm font-medium text-overlay-foreground">
                          {publicShortName(post.author.user, tCommon("author"))}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                    {post.createdAt && (
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        <time dateTime={post.createdAt.toString()}>
                          {formatDistanceToNow(new Date(post.createdAt), {
                            addSuffix: true,
                          })}
                        </time>
                      </div>
                    )}

                    {readingMinutes !== null && (
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        {/* Was the hardcoded English `${n} min read`. This is
                            the only unit on the page, and `common.minutes` is
                            translated in all 90 locale files. */}
                        <span>
                          {readingMinutes} {tCommon("minutes")}
                        </span>
                      </div>
                    )}

                    {post.comments && post.comments.length > 0 && (
                      <div className="flex items-center">
                        <MessageSquare className="mr-1 h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        <span>
                          {post.comments.length} {tCommon("comments")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </m.div>

          {/* Post description */}
          {post.description && (
            <m.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.2,
              }}
              className="mb-8 sm:mb-10"
            >
              {/* `bg-primary/50` put a half-strength brand wash behind
                  `text-muted-foreground`, i.e. a mid grey on a saturated
                  ground. A standfirst is the first thing anyone reads, so it
                  takes a 5-8% tint (a surface, not a fill) and `--foreground`
                  ink — the rule of separation still comes from the 4px left
                  border, which keeps its full-strength primary. */}
              <p className="text-lg sm:text-xl text-foreground/90 leading-relaxed border-l-4 border-primary pl-4 sm:pl-6 py-3 bg-primary/5 dark:bg-primary/10 rounded-r-lg italic">
                {post.description}
              </p>
            </m.div>
          )}

          {/* Main content */}
          <m.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
              delay: 0.4,
            }}
            className="relative"
          >
            {/* `prose-indigo` and the eight `dark:prose-*` overrides are gone
                on purpose. `prose-indigo` hardcoded a link colour that is not
                this site's brand (and would ignore a palette change from the
                admin design panel), and every `dark:` override existed only to
                undo the plugin's hardcoded gray ramp. globals.css now points
                the whole `--tw-prose-*` set at the design tokens, so both
                schemes are correct with no per-call-site patching. */}
            <SafeHtml
              className="prose prose-sm sm:prose-base lg:prose-lg max-w-none prose-headings:scroll-mt-24 prose-img:rounded-lg prose-img:shadow-lg prose-a:font-medium prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-primary/80"
              html={post.content}
            />

            {/* Decorative elements.
                These sit at `-z-10` BEHIND the article text, so in light mode
                `bg-primary` at 50% opacity was a full-strength brand smudge
                directly under body copy. Dark mode already used /30; light mode
                now matches rather than exceeding it. */}
            <div className="absolute -left-8 sm:-left-16 top-1/4 h-24 sm:h-32 w-24 sm:w-32 rounded-full bg-primary/25 dark:bg-primary/30 opacity-50 blur-3xl -z-10"></div>
            <div className="absolute -right-8 sm:-right-16 top-2/3 h-24 sm:h-32 w-24 sm:w-32 rounded-full bg-primary/25 dark:bg-primary/30 opacity-50 blur-3xl -z-10"></div>
          </m.div>

          {/* Author Bio Section */}
          {showAuthorBio && post.author?.user && (
            <m.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.5,
              }}
              className="mt-8 sm:mt-10 md:mt-12 border-t border-border pt-6 sm:pt-8"
            >
              {/* This panel used to be a tint-to-surface gradient (originally a
                  SOLID `--primary` ramp in light mode, which put the heading on
                  a saturated brand fill). The card shell is now the flat Ledger
                  one — a single surface, one border, no gradient — so there is
                  no ink-on-brand hazard left to compensate for. */}
              <div className="bg-surface-2 border border-border p-4 sm:p-6 md:p-8 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  <div className="relative flex-shrink-0 mx-auto sm:mx-0">
                    <Image
                      className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover"
                      src={post.author.user.avatar || "/img/placeholder.svg"}
                      alt={publicShortName(post.author.user, tCommon("author"))}
                      width={80}
                      height={80}
                    />
                    <AvatarPresenceDot
                      state={presenceOf(post.author.user)}
                      size="md"
                      ringClassName="ring-surface-2"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg sm:text-xl font-semibold leading-tight tracking-tight text-foreground mb-2">
                      {tCommon("about")} {publicShortName(post.author.user, tCommon("author"))}
                    </h3>
                    {post.author.user.profile?.bio && (
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                        {post.author.user.profile?.bio}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                      {/* The PLATFORM ROLE used to render here. On a page a
                          signed-out stranger can read, that publishes which
                          account holds super-admin, and on a default install
                          the role string is "Super Admin" -- character for
                          character the operator own first and last name. So
                          the one identity line the bio card had was showing
                          the two things a stranger may not see, and looked
                          like it was showing a third. The handle is what
                          belongs here; an account that never chose one gets
                          the generic label rather than a name. */}
                      <span className="text-sm text-primary-ink font-medium">
                        {publicHandle(post.author.user)
                          ? `@${publicHandle(post.author.user)}`
                          : tCommon("author")}
                      </span>
                      <Link
                        href={`/blog/author/${post.author.id}`}
                        className="text-sm text-primary hover:text-primary/80 transition-colors duration-200 flex items-center gap-1"
                      >
                        {t("view_all_articles")}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </m.div>
          )}

          {/* Tags */}
          {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
            <m.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.6,
              }}
              className="mt-8 sm:mt-10 md:mt-12 border-t border-border pt-6 sm:pt-8"
            >
              <div className="flex items-center mb-4">
                <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-2" />
                <h3 className="text-lg font-medium text-foreground">
                  {tCommon("tags")}
                </h3>
              </div>
              {/* These chips were a solid `from-primary to-primary` gradient
                  carrying `text-primary` — the SAME token for ink and ground,
                  a 1:1 contrast ratio. Measured on this page: all four tags
                  rendered as blank coloured pills with no readable label.
                  Replaced with the tonal-chip recipe the design system
                  documents — a 10% tint of the tone plus the derived `-ink`,
                  which mixes toward --foreground and so clears 4.5:1 against
                  the TINTED ground in both schemes. */}
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag: any) => (
                  <Link
                    key={tag.id}
                    href={`/blog/tag/${tag.slug}`}
                    className="inline-flex items-center rounded-full bg-primary/10 hover:bg-primary/15 border border-primary/25 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-primary-ink transition-colors duration-300"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </m.div>
          )}

          {/* Related Posts Section */}
          {showRelatedPosts &&
            post.relatedPosts &&
            post.relatedPosts.length > 0 && (
              <m.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.8,
                }}
                className="mt-8 sm:mt-10 md:mt-12 border-t border-border pt-6 sm:pt-8"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
                  {t("related_posts")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {post.relatedPosts.map((relatedPost) => {
                    return (
                      <Link
                        key={relatedPost.id}
                        href={`/blog/${relatedPost.slug}`}
                      >
                        <div className="group overflow-hidden rounded-xl shadow-md transition-all duration-300 hover:shadow-xl bg-muted h-full flex flex-col">
                          <div className="relative h-32 sm:h-40 w-full overflow-hidden">
                            <Image
                              src={relatedPost.image || "/placeholder.svg"}
                              alt={relatedPost.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-overlay/60 via-overlay/20 to-transparent opacity-70 group-hover:opacity-80 transition-opacity duration-300"></div>

                            {relatedPost.category && (
                              <div className="absolute left-2 sm:left-3 top-2 sm:top-3 rounded-full bg-primary/90 backdrop-blur-sm px-2 py-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground">
                                {relatedPost.category.name}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col p-3 sm:p-4">
                            <h4 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-2">
                              {relatedPost.title}
                            </h4>
                            {relatedPost.description && (
                              <p className="text-xs sm:text-sm text-subtle-foreground line-clamp-2 mb-3">
                                {relatedPost.description}
                              </p>
                            )}
                            <div className="mt-auto text-xs sm:text-sm text-primary font-medium">
                              {tCommon("read_more")} →
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </m.div>
            )}

          {/* Comments section */}
          {enableComments && (
            <m.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                delay: 0.9,
              }}
              className="mt-8 sm:mt-10 md:mt-12 border-t border-border pt-6 sm:pt-8"
            >
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-6 sm:mb-8">
                {tCommon("comments")}
              </h3>
              <CommentList postId={post.id} />
              <div className="mt-6 sm:mt-8 rounded-xl bg-muted p-4 sm:p-6 shadow-sm border border-border-strong">
                <h4 className="text-base sm:text-lg font-medium text-foreground mb-4">
                  {t("leave_a_comment")}
                </h4>
                <CommentForm postId={post.id} userId="user1" />
              </div>
            </m.div>
          )}
        </article>
      </div>
    </div>
  );
}
