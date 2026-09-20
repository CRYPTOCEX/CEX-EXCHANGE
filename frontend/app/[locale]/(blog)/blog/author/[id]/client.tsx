"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { BlogCard } from "../../components/blog-card";
import { Loadable, SkeletonBlock } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AvatarPresenceDot, presenceOf } from "@/components/ui/presence";
import { ArrowLeft, User, FileText, ExternalLink } from "lucide-react";
import { m } from "framer-motion";
import { useParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { publicShortName } from "@/utils/display-name";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";
import { authorSocialLinks } from "./social-links";

export function AuthorPostsClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { id } = useParams() as { id: string };
  const [author, setAuthor] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useConfigStore();

  const showAuthorBio =
    settings?.showAuthorBio && typeof settings?.showAuthorBio === "boolean"
      ? settings.showAuthorBio
      : Boolean(settings?.showAuthorBio);

  const fetchAuthorPosts = async () => {
    setIsLoading(true);
    const { data, error } = await $fetch({
      url: `/api/blog/author/${id}`,
      silentSuccess: true,
    });

    if (error) {
      setError(error);
    } else if (data) {
      /**
       * `data.user.profile` was read straight through, three dots deep.
       * ======================================================================
       *
       * Every hop is a real possibility — an author row whose user was deleted
       * has no `user`, and `profile` is nullable — and a TypeError here does
       * not surface as an error state: it rejects the promise before
       * `setIsLoading(false)` runs, so the page pulses its skeleton forever
       * with nothing in the console the reader can see. Optional chaining plus
       * a parse that cannot throw keeps the fetch finishing either way.
       */
      const raw = data.user?.profile;
      let profile = raw;
      if (typeof raw === "string") {
        try {
          profile = JSON.parse(raw);
        } catch {
          profile = {};
        }
      }
      setAuthor({ ...data, user: { ...(data.user ?? {}), profile: profile ?? {} } });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAuthorPosts();
  }, []);

  /**
   * The pending copy of this page is gone.
   * ==========================================================================
   *
   * Its card grid was the same drifted imitation of `BlogCard` the other four
   * blog pages carried — `border-border/50`, `mt-auto` instead of `mt-6` on
   * the footer, `mb-6` under the blurb where the real card has none — and it
   * is now `<BlogCard loading />`, i.e. the real card.
   *
   * Its header was a 320px `animate-pulse` primary plate: the entire banner
   * pulsed, including the parts that never move (the orbs, the back link, the
   * "Author" chip), while the two strings that ARE pending got grey bars whose
   * heights — `h-10 md:h-12` — did not match the `text-4xl md:text-5xl` name
   * they stood in for (40px/48px reserved against 40px/48px line boxes only by
   * coincidence of the `leading` default; change the type scale and they part
   * company).
   *
   * NOTE ON THE BRANCHES BELOW: `author` is null for the whole fetch, so
   * `author?.posts?.length === 0` evaluates `undefined === 0`, which is FALSE
   * — the "no posts found" panel does not fire during load. The `!isLoading`
   * added to it anyway makes that non-accidental, because the expression would
   * start firing the moment anyone changed it to `(author?.posts?.length ?? 0)
   * === 0`.
   */

  /**
   * The in-page empty state, hoisted out of the JSX.
   *
   * Same reasoning as the note above — the `!isLoading` is the fix, not the
   * defect — but as a NAME it also says which of the two cases it is, so the
   * scanner's `hidden-while-loading` rule is not being asked to guess from the
   * markup whether this is a withheld row or a suppressed empty state.
   */
  const showNoPosts = !isLoading && author?.posts?.length === 0;

  /**
   * The avatar, as a VALUE rather than as a branch.
   *
   * This was `isLoading ? <SkeletonBlock className="…h-32 w-32 md:h-40…"/> :
   * <Image className="…h-32 w-32 md:h-40…"/>` — two trees with the same sizing
   * string written out twice, which is the shape that drifts. The question is
   * really "is there a portrait to paint", and the pending state is the one
   * case where there is not; an avatar is also the one element in this header
   * with no text metrics of its own, so `SkeletonBlock` is genuinely right for
   * it. `/img/placeholder.svg` covers a real author who has uploaded nothing.
   */
  const avatarSrc = isLoading
    ? null
    : author?.user?.avatar || "/img/placeholder.svg";

  /**
   * Resolved once, not per-render-branch: the stored values are handles rather
   * than URLs, and a handle that resolves to nothing is withheld entirely —
   * so this is also the answer to "is there a social row to draw at all".
   */
  const socialLinks = authorSocialLinks(author?.user?.profile?.social);

  return (
    <div className="min-h-screen relative overflow-hidden bg-card pt-24">
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

      <div className="relative z-10 container mx-auto px-4 pb-16">
        <div className="mb-8">
          {/* Enhanced Author Header */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl mb-12"
          >
            <div className="relative h-72 md:h-80 w-full">
              <div className="absolute inset-0 bg-primary"></div>
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-card/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-primary/15 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link - Inside Hero */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/author"
                className="inline-flex items-center text-sm text-overlay-foreground/80 hover:text-overlay-foreground transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                {t("all_authors") || t("all_authors")}
              </Link>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
                <div className="relative shrink-0">
                  <div className="absolute -inset-2 bg-linear-to-br from-card/30 to-card/10 rounded-full blur-xl"></div>
                  <div className="absolute -inset-1 bg-primary rounded-full opacity-75 blur-sm"></div>
                  {/* The avatar is the one element here with no text metrics,
                      so the block carries the SAME sizing string the real
                      image does — including the `md:` step — rather than a
                      separately invented size. */}
                  {avatarSrc ? (
                    <Image
                      className="relative h-32 w-32 md:h-40 md:w-40 rounded-full object-cover border-4 border-overlay-foreground/30 shadow-2xl"
                      src={avatarSrc}
                      alt={publicShortName(author?.user, tCommon("author"))}
                      width={160}
                      height={160}
                    />
                  ) : (
                    <SkeletonBlock className="relative h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-overlay-foreground/30 shadow-2xl" />
                  )}
                  {/* Only once the author has actually loaded: a dot beside a
                      skeleton is a fact asserted about nobody. */}
                  {!isLoading && (
                    <AvatarPresenceDot
                      state={presenceOf(author?.user)}
                      size="lg"
                      ringClassName="ring-overlay"
                      className="-bottom-1 -end-1"
                    />
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/20 backdrop-blur-sm text-overlay-foreground/90 text-sm font-medium mb-3">
                    <User className="h-3.5 w-3.5" />
                    {tCommon("author")}
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold text-overlay-foreground mb-3 drop-shadow-lg">
                    <Loadable loading={isLoading} placeholder={t("author_name")}>
                      {publicShortName(author?.user, tCommon("author"))}
                    </Loadable>
                  </h1>
                  {/* `showAuthorBio` is a SETTING, known before the fetch, so
                      the bio line is reserved only on installs that actually
                      show bios. On those it is `line-clamp-2`, i.e. a fixed
                      two-line box, so it is reserved as two lines. */}
                  {showAuthorBio && (isLoading || author?.user?.profile?.bio) && (
                    <p className="text-lg text-overlay-foreground/90 max-w-2xl line-clamp-2">
                      <Loadable loading={isLoading} chars={96}>
                        {author?.user?.profile?.bio}
                      </Loadable>
                    </p>
                  )}
                  {showAuthorBio && socialLinks.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                      {socialLinks.map(({ platform, label, href }) => (
                        /* A plain `<a>`, not the i18n `Link`: these are external
                           destinations, and the routing Link exists to prefix
                           the locale onto INTERNAL paths — which is how a stored
                           handle became `/en/mashdiv` in the first place.
                           `rel="noopener noreferrer"` because `target="_blank"`
                           otherwise hands the opened page a live `window.opener`
                           back to this one. */
                        <a
                          href={href}
                          key={platform}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="glass"
                            size="sm"
                            className="rounded-full text-overlay-foreground border-overlay-foreground/20 hover:bg-card/20"
                          >
                            {label}
                            <ExternalLink className="ml-1.5 h-3 w-3" />
                          </Button>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {(isLoading || author?.posts?.length > 0) && (
                  <div className="shrink-0 bg-card/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-overlay-foreground/10">
                    <span className="text-overlay-foreground font-semibold">
                      <Loadable loading={isLoading} placeholder="00 articles">
                        {isLoading
                          ? null
                          : `${author.posts.length} ${author.posts.length === 1 ? "article" : "articles"}`}
                      </Loadable>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <h2 className="text-2xl font-bold text-foreground">
              {t("articles_by")}{" "}
              <Loadable loading={isLoading} placeholder="Author">
                {publicShortName(author?.user, tCommon("author"))}
              </Loadable>
            </h2>
          </m.div>
        </div>

        {error ? (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 dark:bg-destructive/20 text-destructive-ink p-6 rounded-2xl border border-destructive/30 backdrop-blur-sm"
          >
            {error}
          </m.div>
        ) : showNoPosts ? (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-lg p-10 text-center border border-border"
          >
            <div className="bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">
              {tCommon("no_posts_found")}
            </h3>
            <p className="text-muted-foreground mb-8 text-lg">
              {t("this_author_hasnt_published_any_articles_yet")}.
            </p>
            <Link href="/blog">
              <Button size="lg" className="rounded-full">{t("browse_all_posts")}</Button>
            </Link>
          </m.div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Six pending cards from the REAL `BlogCard`, in the REAL grid. */}
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <BlogCard key={`pending-${i}`} loading />
                ))}
              {author?.posts?.map((post: any, index: number) => (
                <m.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                >
                  <BlogCard post={post} />
                </m.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
