"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { useBlogStore } from "@/store/blog/user";
import { BlogCard } from "../../components/blog-card";
import { Pagination } from "../../components/pagination";
import { Loadable } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen, AlertCircle, FileText } from "lucide-react";
import { m } from "framer-motion";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function CategoryDetailClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { slug } = useParams() as { slug: string };
  const { category, fetchCategory, pagination, error } = useBlogStore();
  const [isLoading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    await fetchCategory(slug);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  /**
   * The pending COPY of this page is gone — including its own imitation of
   * `BlogCard`, which is now that component's `loading` mode.
   * ==========================================================================
   *
   * The copy's card was `border-border/50` against the real `border-border`,
   * and its content block was `p-6 space-y-4` — 16px between every element —
   * against the real card's `mb-3` heading, `line-clamp-2` blurb and
   * `mt-6 pt-4 border-t` footer. That is a 20px shortfall per card, so a
   * three-column grid of six settled up by 40px as the posts arrived, and it
   * did so under a header that had ALSO changed height (the pending header was
   * one flat `Skeleton` over `h-72 md:h-80`, then gained a real image).
   *
   * `!isLoading &&` guards on both the not-found and the no-posts branches
   * below: `category` is null and `category.posts` is empty for the whole of
   * the fetch, so without them this page would answer "Category not found" to
   * every visitor before answering correctly.
   */
  if (!isLoading && !category) {
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
            className="bg-card rounded-lg p-10 text-center max-w-2xl mx-auto border border-border relative"
          >
            <Link
              href="/blog/category"
              className="absolute top-6 left-6 inline-flex items-center text-sm text-primary hover:text-primary transition-colors duration-200 group"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
              {tCommon("all_categories")}
            </Link>
            <div className="bg-destructive/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 mt-6">
              <FolderOpen className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-foreground">
              {tCommon("category_not_found")}
            </h1>
            <p className="text-muted-foreground mb-8 text-lg">
              {t("we_couldnt_find_the_category")} <span className="font-semibold text-primary">{slug}</span>. {t("it_may_have_been_removed_or_doesnt_exist")}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog/category">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full border-border-strong text-muted-foreground dark:hover:bg-muted"
                >
                  {tCommon("browse_all_categories")}
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

  if (!isLoading && category?.posts?.length === 0) {
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
          {/* Category Header */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl mb-12"
          >
            <div className="relative h-64 w-full">
              <div className="absolute inset-0 bg-primary"></div>
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-card/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link - Inside Hero */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/category"
                className="inline-flex items-center text-sm text-overlay-foreground/80 hover:text-overlay-foreground transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                {tCommon("all_categories")}
              </Link>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex items-start gap-5">
                <div className="bg-card/20 backdrop-blur-md p-4 rounded-2xl border border-overlay-foreground/10 shadow-xl">
                  <FolderOpen className="h-8 w-8 text-overlay-foreground" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-overlay-foreground mb-3 drop-shadow-lg">
                    {category.name}
                  </h1>
                  {category.description && (
                    <p className="text-lg md:text-xl text-overlay-foreground/90">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </m.div>

          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-lg p-10 text-center border border-border"
          >
            <div className="bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">
              {tCommon("no_posts_found")}
            </h3>
            <p className="text-muted-foreground mb-8 text-lg">
              {t("there_are_no_posts_in_this_category_yet")}. {t("be_the_first_to_contribute")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/blog">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full border-border-strong text-muted-foreground dark:hover:bg-muted"
                >
                  {t("browse_all_posts")}
                </Button>
              </Link>
              <Link href="/blog/author">
                <Button size="lg" className="w-full sm:w-auto rounded-full">
                  {t("become_an_author")}
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
          {/* Enhanced Category Header */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl shadow-2xl mb-12"
          >
            {/* Background Image or Gradient */}
            {/* The banner is a fixed `h-72 md:h-80` in both states, so nothing
                below it moves; the flat primary fill is what a category with
                no image settles to anyway, which makes it the honest pending
                ground rather than a grey plate. */}
            <div className="relative h-72 md:h-80 w-full">
              {category?.image && (category.image.startsWith('http') || category.image.startsWith('/')) ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-primary"></div>
              )}
              <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-overlay/10"></div>

              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 h-60 w-60 rounded-full bg-card/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-primary/20 blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-primary/15 blur-3xl"></div>
              </div>
            </div>

            {/* Back Link - Inside Hero */}
            <div className="absolute top-6 left-6 md:top-8 md:left-8 z-10">
              <Link
                href="/blog/category"
                className="inline-flex items-center text-sm text-overlay-foreground/80 hover:text-overlay-foreground transition-colors duration-200 group"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                {tCommon("all_categories")}
              </Link>
            </div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex items-start gap-5">
                  <div className="bg-card/20 backdrop-blur-md p-4 rounded-2xl border border-overlay-foreground/10 shadow-xl">
                    <FolderOpen className="h-8 w-8 text-overlay-foreground" />
                  </div>
                  <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-overlay-foreground mb-3 drop-shadow-lg">
                      <Loadable loading={isLoading} placeholder="Category">
                        {category?.name}
                      </Loadable>
                    </h1>
                    {(isLoading || category?.description) && (
                      <p className="text-lg md:text-xl text-overlay-foreground/90 max-w-2xl">
                        <Loadable loading={isLoading} chars={56}>
                          {category?.description}
                        </Loadable>
                      </p>
                    )}
                  </div>
                </div>

                {(isLoading || (category?.posts && category.posts.length > 0)) && (
                  <div className="flex items-center gap-3">
                    <div className="bg-card/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-overlay-foreground/10">
                      <span className="text-overlay-foreground font-semibold">
                        <Loadable loading={isLoading} placeholder="0">
                          {category?.posts?.length}
                        </Loadable>{" "}
                        {tCommon("of")}{" "}
                        <Loadable loading={isLoading} placeholder="00">
                          {pagination.totalItems}
                        </Loadable>{" "}
                        {tCommon("posts")}
                      </span>
                    </div>
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
            className="bg-destructive/10 dark:bg-destructive/20 border border-destructive/30 text-destructive-ink p-6 rounded-2xl mb-8 backdrop-blur-sm"
          >
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">{tCommon("error_loading_category")}</span>
            </div>
            <p className="mt-1">{error}</p>
          </m.div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Six pending cards from the REAL `BlogCard`, in the REAL grid
                  with the REAL breakpoints. Six is a guess at the count and
                  the count is allowed to settle — the container and the card
                  are not. */}
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <BlogCard key={`pending-${i}`} loading />
                ))}
              {category?.posts?.map((post, index) => (
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
              baseUrl={`/blog/category/${slug}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
