"use client";

import { Link } from "@/i18n/routing";
import { m } from "framer-motion";
import { useBlogStore } from "@/store/blog/user";
import { useTranslations } from "next-intl";
import { Hash, ArrowRight, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";

interface TagsSectionProps {
  /**
   * True until `fetchTags()` settles. Owned by the page, which is what calls it.
   *
   * `tagsLoading` initialises to `false` and only flips inside the request, so
   * it reads "not loading" on the server render and on the first client frame —
   * and this section returned `null` for both of them, then expanded to ~422px
   * a tick after hydration.
   */
  pending?: boolean;
}

export function TagsSection({ pending = false }: TagsSectionProps) {
  const t = useTranslations("common");
  const tBlogBlog = useTranslations("blog_blog");
  const { tags, tagsLoading } = useBlogStore();

  /**
   * The pending copy of this section is gone.
   * ==========================================================================
   *
   * Its header was two grey bars — `h-8 w-32` and `h-12 w-72` — standing in for
   * a `Badge`, a `text-4xl md:text-5xl` two-colour heading AND a `text-lg` lead
   * paragraph it omitted entirely. All three are `t()` strings, so 28px of
   * copy appeared out of nowhere and pushed the tag row down by that much on
   * the blog home page.
   *
   * `!tags || tags.length === 0` still returns `null` — a topic rail with no
   * topics is genuinely nothing — but it is now gated on `!isPending`, because
   * `tags` is `[]` for the whole fetch and the section would otherwise collapse
   * to zero height and then expand to roughly 350px mid-scroll.
   *
   * The `.length === 0` half keeps a refetch from stacking twelve pending chips
   * on top of the tags already on screen.
   */
  const isPending = (pending || tagsLoading) && tags.length === 0;

  if (!isPending && (!tags || tags.length === 0)) {
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
          className="mb-4 px-4 py-2 rounded-full bg-primary/10 border-primary/30 text-foreground"
        >
          <Tag className="w-4 h-4 mr-2" />
          {t("popular_tags")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          {t("explore_by")}{" "}
          <span className="bg-linear-to-r from-primary-ink to-primary-ink/70 bg-clip-text text-transparent">
            Topic
          </span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("find_articles_that_match_your_interests")}
        </p>
      </m.div>

      {/* Premium Tags Grid */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-wrap justify-center gap-3"
      >
        {/* Twelve pending chips in the REAL wrap container at the REAL chip
            geometry (`px-5 py-2.5 rounded-full` around a 16px glyph and a
            label), so the rail wraps to the same number of rows it settles to. */}
        {isPending &&
          Array.from({ length: 12 }).map((_, i) => (
            <span
              key={`pending-tag-${i}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border/50 shadow-sm"
            >
              <Hash className="w-4 h-4 text-primary" />
              <span className="font-medium text-muted-foreground">
                <SkeletonText placeholder="tag-name" />
              </span>
            </span>
          ))}
        {tags.slice(0, 15).map((tag, index) => (
          <m.div
            key={tag.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
          >
            <Link
              href={`/blog/tag/${tag.slug}`}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary hover:bg-primary/10"
            >
              <Hash className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
              <span className="font-medium text-muted-foreground group-hover:text-primary transition-colors duration-300">
                {tag.name}
              </span>
              {tag.postCount !== undefined && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground font-semibold">
                  {tag.postCount}
                </span>
              )}
            </Link>
          </m.div>
        ))}
      </m.div>

      {/* View All Button */}
      {tags.length > 15 && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link href="/blog/tag">
            <Button
              size="lg"
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {tBlogBlog("view_all_tags")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </m.div>
      )}
    </section>
  );
}
