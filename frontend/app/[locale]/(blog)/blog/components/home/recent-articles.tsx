"use client";

import { m } from "framer-motion";
import { FileText, Clock, ArrowRight } from "lucide-react";
import { BlogCard } from "../blog-card";
import { EmptyState } from "./empty-state";
import { useConfigStore } from "@/store/config";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

interface RecentArticlesProps {
  posts: Post[];
  /** True until the post request settles. `posts` is `[]` for the whole of it. */
  loading?: boolean;
}

export function RecentArticles({ posts, loading = false }: RecentArticlesProps) {
  const t = useTranslations("blog_blog");
  const { settings } = useConfigStore();
  const postsPerPage = settings?.postsPerPage
    ? Number(settings.postsPerPage)
    : 6;
  /**
   * The page size is KNOWN before the posts are — it comes from config, not
   * from the response — so it is also the honest number of pending cards to
   * reserve. Capped at 6 for the home page, same as the settled slice.
   */
  const pageSize = Math.min(postsPerPage, 6);
  const recentPosts = posts.slice(0, pageSize); // Show up to 6 posts max for home page

  /**
   * `recentPosts.length > 0` was doing the work of two questions.
   * ==========================================================================
   *
   * The grid was `recentPosts.length > 0 ? <grid> : <EmptyState/>`, and during
   * the fetch `recentPosts` is `[]` — so the pending page showed "No recent
   * articles yet", a confident statement about data nobody had looked at, and
   * then replaced it with up to 6 cards. `EmptyState` is 268px tall
   * (`py-12` + a 80px disc + `mb-6` + two text blocks); two rows of `BlogCard`
   * at the `lg` breakpoint are about 1,000px. That difference, plus the
   * "View all articles" button below being withheld on the same test, is
   * roughly 800px of the page's shortfall on its own.
   *
   * Split into the two questions it was conflating. Empty is a real settled
   * state and still gets its real message — it just cannot be reached until
   * the request has actually answered.
   */
  const isEmpty = !loading && recentPosts.length === 0;

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
          className="mb-4 px-4 py-2 rounded-full bg-success/10 border-success text-success-ink"
        >
          <Clock className="w-4 h-4 mr-2" />
          {t("recent_articles")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          {t("recent_articles").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="text-success-ink">
            {t("recent_articles").split(" ").slice(-1)[0]}
          </span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("fresh_insights_and_articles_from_our_community")}
        </p>
      </m.div>

      {isEmpty ? (
        <EmptyState
          title={t("no_recent_articles_yet")}
          description={t("were_working_on_creating_new_content")}
          icon={FileText}
        />
      ) : (
        /*
          THE REAL GRID, WITH THE REAL BREAKPOINT CLASSES, IN BOTH STATES.
          ---------------------------------------------------------------
          `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` is a FIXED track count,
          not `auto-fit`, so the pending count cannot flip a column — but it
          does decide the row count, and a row of `BlogCard` is ~470px
          (a 208px `h-52` image + `p-6` + a two-line `text-xl` title + a
          two-line `text-sm` blurb + the 41px `mt-6 pt-4 border-t` footer).
          `pageSize` is 6 by default: exactly 2 rows at `lg`, 3 at `md`, 6 at
          base — the same shape the settled grid takes when the blog is full.
          A blog with fewer posts settles UPWARD by whole rows, which is the
          residual the contract accepts; going from 268px of empty state to
          1,000px of grid is not.

          The pending card is `BlogCard`'s own `loading` mode, not a second
          card. That prop exists precisely so this tree stops hand-building
          grey imitations that drift from it.
        */
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: pageSize }).map((_, i) => (
              <div key={`pending-post-${i}`}>
                <BlogCard loading />
              </div>
            ))}
          {recentPosts.map((post, index) => (
            <m.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <BlogCard post={post} />
            </m.div>
          ))}
        </div>
      )}

      {/* View All Button. Gated on `!isEmpty`, not on `recentPosts.length`:
          the button is 48px plus `mt-12`, i.e. 96px that used to appear along
          with the posts. `!loading` in a guard would be the scanner's
          `hidden-while-loading` defect; `!isEmpty` renders it while pending
          and suppresses it only when the blog genuinely has nothing. */}
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
              className="rounded-full bg-success hover:bg-success text-success-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t("view_all_articles")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </m.div>
      )}
    </section>
  );
}
