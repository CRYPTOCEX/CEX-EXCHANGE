"use client";

import { useEffect, useState } from "react";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { Link } from "@/i18n/routing";
import { ArrowRight, Users, Sparkles, FileText, PenTool } from "lucide-react";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { useBlogStore } from "@/store/blog/user";
import { useConfigStore } from "@/store/config";
import { settingIsTrue } from "@/lib/settings-bool";
import { useTranslations } from "next-intl";
import { publicShortName, publicHandle } from "@/utils/display-name";

export function AuthorsSection() {
  const tCommon = useTranslations("common");
  const t = useTranslations("blog_blog");
  const { topAuthors, topAuthorsLoading, fetchTopAuthors } = useBlogStore();
  const { settings } = useConfigStore();
  // This one was already correct; it reads through the shared helper so all three
  // call sites agree, including on the default when the switch has never been set.
  const enableAuthorApplications = settingIsTrue(
    settings?.enableAuthorApplications,
    true
  );

  /**
   * This section owns its own request, so it latches its own "resolved".
   *
   * `topAuthorsLoading` is `false` in the store's initial state and only flips
   * to `true` once this effect has run — which means on the server render and
   * on the first client frame it reads "not loading", `topAuthors` is `[]`, and
   * the `return null` below removed the whole ~700px section from the server
   * HTML. It then appeared a tick after hydration and shoved the CTA band and
   * the footer down by that much.
   *
   * A one-way latch is the smallest thing that answers "has the request come
   * back yet" without a store change: it is false before the request, false
   * during it, and true forever after — including after a failure, which is
   * what `.finally` rather than `.then` is for. A rejected request must not
   * leave the section pulsing indefinitely.
   */
  const [topAuthorsResolved, setTopAuthorsResolved] = useState(false);

  useEffect(() => {
    fetchTopAuthors().finally(() => setTopAuthorsResolved(true));
  }, [fetchTopAuthors]);

  /**
   * The pending copy of this section is gone.
   * ==========================================================================
   *
   * Three grey bars stood in for a `Badge`, a two-colour `text-4xl md:text-5xl`
   * heading and a `text-lg` lead — all `t()` strings — and the cards were
   * `h-72 rounded-2xl` against real cards that are `rounded-lg` and sized by
   * their CONTENT (a 96px avatar, three text lines, a chip and a hover link,
   * about 340px at `p-6`). So the grid was 288px tall, then ~340px, on a
   * different radius, and the two action buttons below it moved by 52px.
   *
   * It also omitted the action buttons entirely, which is another ~60px.
   *
   * `!topAuthors || topAuthors.length === 0` still returns `null`, gated on
   * `!isPending` so the section does not vanish and reappear mid-scroll.
   *
   * The `.length === 0` half keeps a refetch from stacking four pending cards
   * on top of the authors already on screen.
   */
  const isPending =
    (!topAuthorsResolved || topAuthorsLoading) && topAuthors.length === 0;

  if (!isPending && (!topAuthors || topAuthors.length === 0)) {
    return null;
  }

  return (
    <section className="py-16">
      {/* Premium Section Header */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <Badge
          variant="outline"
          className="mb-4 px-4 py-2 rounded-full bg-destructive/10 border-destructive/30 text-foreground"
        >
          <Users className="w-4 h-4 mr-2 text-destructive" />
          {t("meet_our_authors")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          {t("our_authors").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="text-destructive-ink">
            {t("our_authors").split(" ").slice(-1)[0]}
          </span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("meet_the_talented_writers_behind_our_content")}
        </p>
      </m.div>

      {/* Premium Authors Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Four pending cards from the REAL card shell: same radius, same
            border, same `p-6`, same 96px avatar ring, and the same three text
            lines plus the article-count chip — so the row height is the height
            it settles to. The avatar is the only thing here with no text
            metrics, so it is the only block. */}
        {isPending &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`pending-author-${i}`}
              className="relative block h-full overflow-hidden rounded-lg bg-card border border-border/50"
            >
              <div className="relative flex flex-col items-center text-center p-6">
                <div className="relative mb-4">
                  <SkeletonBlock className="h-24 w-24 rounded-full ring-4 ring-card" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  <SkeletonText placeholder={t("author_name")} />
                </h3>
                <p className="text-sm text-destructive font-medium mb-2">
                  <SkeletonText placeholder="Author" />
                </p>
                <p className="text-sm text-subtle-foreground line-clamp-2 mb-3">
                  <SkeletonText chars={56} />
                </p>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/30">
                  <FileText className="w-3 h-3 text-destructive" />
                  <span className="text-xs font-semibold text-foreground">
                    <SkeletonText placeholder="00 articles" />
                  </span>
                </div>
                {/* The hover link is `opacity-0` until hover, but it OCCUPIES
                    `mt-4` plus a line box at all times — leaving it out would
                    have made every pending card 36px shorter than the one
                    replacing it. */}
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-destructive opacity-0">
                  {t("view_articles")}
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        {topAuthors.slice(0, 4).map((author, index) => (
          <m.div
            key={author.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link
              href={`/blog/author/${author.id}`}
              className="group relative block h-full overflow-hidden rounded-lg bg-card border border-border/50 transition-all duration-500"
            >
              {/* Background gradient */}
              <div className="absolute inset-0 bg-linear-to-br from-destructive/5 via-transparent to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Floating orb effect */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-destructive/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Content */}
              <div className="relative flex flex-col items-center text-center p-6">
                {/* Avatar with glow */}
                <div className="relative mb-4">
                  <div className="absolute -inset-1 bg-destructive rounded-full opacity-0 group-hover:opacity-75 blur-md transition-opacity duration-500" />
                  <div className="relative">
                    <Image
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-card group-hover:scale-105 transition-transform duration-500"
                      src={author.user.avatar || "/img/placeholder.svg"}
                      alt={publicShortName(author.user, tCommon("author"))}
                      width={96}
                      height={96}
                    />
                    {/* Online indicator / badge */}
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-destructive flex items-center justify-center shadow-lg">
                      <PenTool className="w-4 h-4 text-destructive-foreground" />
                    </div>
                  </div>
                </div>

                {/* Author info */}
                <h3 className="text-lg font-bold text-foreground group-hover:text-destructive transition-colors duration-300">
                  {publicShortName(author.user, tCommon("unknown"))}
                </h3>
                {/* Was the platform role. Same reason as the post page bio
                    card: a role name on a signed-out page says which account
                    is the super admin, and on a default install it reads as
                    that person legal name. */}
                <p className="text-sm text-destructive font-medium mb-2">
                  {publicHandle(author.user)
                    ? `@${publicHandle(author.user)}`
                    : tCommon("author")}
                </p>
                <p className="text-sm text-subtle-foreground line-clamp-2 mb-3">
                  {author.user.profile?.bio || t("no_bio_available")}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/30">
                  <FileText className="w-3 h-3 text-destructive" />
                  <span className="text-xs font-semibold text-foreground">
                    {author.postCount} {author.postCount === 1 ? "article" : "articles"}
                  </span>
                </div>

                {/* View link */}
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-destructive opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {t("view_articles")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </Link>
          </m.div>
        ))}
      </div>

      {/* Action Buttons */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <Link href="/blog/author">
          <Button
            size="lg"
            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {t("view_all_authors")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        {enableAuthorApplications && (
          <Link href="/blog/author/apply">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("become_an_author")}
            </Button>
          </Link>
        )}
      </m.div>
    </section>
  );
}
