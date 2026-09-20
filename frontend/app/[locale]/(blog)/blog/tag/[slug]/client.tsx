"use client";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useBlogStore } from "@/store/blog/user";
import { BlogCard } from "../../components/blog-card";
import { Pagination } from "../../components/pagination";
import { Loadable } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TagIcon, FileText } from "lucide-react";
import { m } from "framer-motion";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function TagDetailClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { slug } = useParams() as { slug: string };
  const [loading, setLoading] = useState(true);
  const { error, tag, pagination, fetchTag } = useBlogStore();

  const fetchData = async () => {
    setLoading(true);
    await fetchTag(slug);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  /**
   * The pending copy of this page is gone; the header and grid below render in
   * both states.
   * ==========================================================================
   *
   * The copy's card was `border-border/50` where the real `BlogCard` is
   * `border-border`, and its description block had no `line-clamp-2` element
   * to be measured by — two `h-4` bars with `mb-1`, i.e. 37px, against a real
   * two-line `text-sm` blurb at 40px. Small per card, six cards to a screen,
   * and every one of them moved. It is now `<BlogCard loading />`, which IS the
   * real card.
   *
   * The header banner was already a fixed `h-48 md:h-56` primary fill in both
   * copies — the only difference was an `animate-pulse` on the fill, which
   * pulsed the whole 224px band rather than the two strings that were actually
   * pending. Those two now carry their own placeholders.
   *
   * `!loading &&` on the branch below is load-bearing: `tag` is null and
   * `tag.posts` empty for the whole fetch, so without it this page would greet
   * every visitor with "Tag not found".
   *
   * IT IS NOW A NAMED PREDICATE, and that is not cosmetic. The scanner's
   * resolved-guard escape hatch is spelled `!isLoading`/`!isPending` — its
   * regex needs at least two characters before the `Loading`, so the bare
   * `!loading` this file happens to use did not match it and the guard was
   * still being reported as a full-viewport swap. Hoisting states the intent
   * in the one place a reader looks for it ("show the not-found page", not
   * "hide something while loading") and takes the token out of the JSX, which
   * is the resolution the contract prescribes for exactly this case.
   *
   * `!error` is part of it too: `fetchTag` leaves `tag` null when the request
   * fails, so a 500 fell into this branch and told the user the tag does not
   * exist. The error banner further down could never render, because control
   * never reached it. A failed request and a deleted tag are different facts.
   */
  const showTagNotFound = !loading && !error && (!tag || tag.posts?.length === 0);

  /**
   * The in-page empty state, hoisted for the same reason and reachable for the
   * first time.
   *
   * `showTagNotFound` above returns for `posts.length === 0`, so this branch —
   * which tests the same thing — was unreachable in every case except a failed
   * request, where `error` now keeps control here instead of diverting it to
   * "Tag not found". Which means the "no posts with this tag yet" card only
   * renders when the tag EXISTS and the error banner is not showing. That is
   * the state it was written for.
   */
  const showNoPosts = !loading && !error && tag?.posts.length === 0;

  if (showTagNotFound) {
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
            className="bg-card/80 dark:bg-surface-2/80 backdrop-blur-xl rounded-3xl p-10 text-center max-w-2xl mx-auto border border-border/50 shadow-2xl relative"
          >
            <Link
              href="/blog/tag"
              className="absolute top-6 left-6 inline-flex items-center text-sm text-primary hover:text-primary transition-colors duration-200 group"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
              {t("back_to_all_tags")}
            </Link>
            <div className="bg-destructive/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 mt-6">
              <TagIcon className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-foreground">
              {t("tag_not_found")}
            </h1>
            <p className="text-muted-foreground mb-8 text-lg">
              {t("we_couldnt_find_the_tag")} <span className="font-semibold text-primary">{slug}</span>. {t("it_may_have_been_removed_or_doesnt_exist")}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog/tag">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full border-border-strong text-muted-foreground dark:hover:bg-muted"
                >
                  {t("browse_all_tags")}
                </Button>
              </Link>
              <Link href="/blog">
                <Button size="lg" className="w-full sm:w-auto rounded-full">
                  {t("explore_blog_posts")}
                </Button>
              </Link>
            </div>
          </m.div>
        </div>
      </div>
    );
  }

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
          {/* Enhanced Tag Header */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl mb-12"
          >
            <div className="relative h-48 md:h-56 w-full">
              <div className="absolute inset-0 bg-primary"></div>
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-card/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link - Inside Hero */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/tag"
                className="inline-flex items-center text-sm text-overlay-foreground/80 hover:text-overlay-foreground transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                {tCommon("all_tags")}
              </Link>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="bg-card/20 backdrop-blur-md p-4 rounded-2xl border border-overlay-foreground/10 shadow-xl">
                    <TagIcon className="h-8 w-8 text-overlay-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-overlay-foreground/70 mb-1">Tag</div>
                    <h1 className="text-4xl md:text-5xl font-bold text-overlay-foreground drop-shadow-lg">
                      #
                      <Loadable loading={loading} placeholder="tag-name">
                        {tag?.name}
                      </Loadable>
                    </h1>
                  </div>
                </div>

                {(loading || (tag?.posts?.length ?? 0) > 0) && (
                  <div className="bg-card/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-overlay-foreground/10">
                    <span className="text-overlay-foreground font-semibold">
                      <Loadable loading={loading} placeholder="0">
                        {tag?.posts.length}
                      </Loadable>{" "}
                      {tCommon("of")}{" "}
                      <Loadable loading={loading} placeholder="00">
                        {pagination.totalItems}
                      </Loadable>{" "}
                      {tCommon("posts")}
                    </span>
                  </div>
                )}
              </div>
            </div>
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
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg p-10 text-center border border-border"
          >
            <div className="bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold leading-tight tracking-tight text-foreground mb-3">
              {tCommon("no_posts_found")}
            </h3>
            <p className="text-muted-foreground mb-8 text-lg">
              {t("there_are_no_posts_with_this_tag_yet")}.
            </p>
            <Link href="/blog">
              <Button size="lg" className="rounded-full">{t("browse_all_posts")}</Button>
            </Link>
          </m.div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Six pending cards from the REAL `BlogCard`, in the REAL grid. */}
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <BlogCard key={`pending-${i}`} loading />
                ))}
              {tag?.posts.map((post, index) => (
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
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              baseUrl={`/blog/tag/${slug}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
