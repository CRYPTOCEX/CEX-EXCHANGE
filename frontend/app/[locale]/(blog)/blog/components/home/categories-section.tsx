"use client";

import { Link } from "@/i18n/routing";
import { ImageWithFallback as Image } from "@/components/ui/image-with-fallback";
import { m } from "framer-motion";
import { useBlogStore } from "@/store/blog/user";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";

interface CategoriesSectionProps {
  /**
   * True until `fetchCategories()` settles. Owned by the page, because the page
   * is what calls it.
   *
   * `categoriesLoading` on its own cannot answer this: the store initialises it
   * to `false` and only flips it INSIDE the request, so it reads "not loading"
   * on the server render and on the first client frame. This section therefore
   * returned `null` in the server HTML — ~786px of heading, lead and two rows
   * of `h-48` tiles that appeared a tick after hydration.
   */
  pending?: boolean;
}

export function CategoriesSection({ pending = false }: CategoriesSectionProps) {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { categories, categoriesLoading } = useBlogStore();

  /**
   * The pending copy of this section is gone.
   * ==========================================================================
   *
   * Its header was three grey bars for a `Badge`, a two-colour
   * `text-4xl md:text-5xl` heading and a `text-lg` lead — every one of them a
   * `t()` string, and `h-8`/`h-12`/`h-6` (104px + margins) against roughly
   * 150px of real copy at the `md` breakpoint, so the tile grid climbed ~46px
   * as the categories landed.
   *
   * `!categories || categories.length === 0` still returns `null`, but gated
   * on `!isPending`: the array is empty for the whole fetch, so on its own it
   * removed the entire section from the page and then reinstated it.
   *
   * The `.length === 0` half is what keeps a REFETCH from stacking six pending
   * tiles on top of the categories already on screen.
   */
  const isPending = (pending || categoriesLoading) && categories.length === 0;

  if (!isPending && (!categories || categories.length === 0)) {
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
          <FolderOpen className="w-4 h-4 mr-2" />
          {tCommon("categories")}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          {t("browse_by")}{" "}
          <span className="text-primary-ink">
            Category
          </span>
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("explore_our_curated_collection_of_articles")}
        </p>
      </m.div>

      {/* Premium Category Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Six pending tiles at the REAL `h-48 rounded-lg` with the REAL
            overlay, so only the name inside them is waiting. The flat primary
            fill is what a category with no image settles to anyway. */}
        {isPending &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`pending-category-${i}`}
              className="relative block h-48 overflow-hidden rounded-lg bg-card border border-border"
            >
              <div className="absolute inset-0 bg-primary opacity-90" />
              <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                <div className="text-center">
                  <h3 className="text-2xl font-semibold tracking-tight text-overlay-foreground mb-2 drop-shadow-lg">
                    <SkeletonText placeholder="Category" />
                  </h3>
                </div>
              </div>
            </div>
          ))}
        {categories.slice(0, 6).map((category, index) => (
          <m.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Link
              href={`/blog/category/${category.slug}`}
              className="group relative block h-48 overflow-hidden rounded-lg bg-card border border-border transition-colors duration-300 hover:border-border-strong"
            >
              {/* Background Image or Gradient */}
              {category.image ? (
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-primary opacity-90" />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/40 to-transparent transition-opacity duration-300 group-hover:from-overlay/70" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                <m.div
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <h3 className="text-2xl font-semibold tracking-tight text-overlay-foreground mb-2 drop-shadow-lg">
                    {category.name}
                  </h3>
                  {category.postCount !== undefined && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-card/20 backdrop-blur-sm text-sm text-overlay-foreground border border-overlay-foreground/10">
                      <Sparkles className="w-3 h-3" />
                      <span className="font-mono tabular-nums">{category.postCount}</span> {category.postCount === 1 ? "article" : "articles"}
                    </span>
                  )}
                </m.div>
              </div>

              {/* Hover arrow indicator */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-card/20 backdrop-blur-sm flex items-center justify-center border border-overlay-foreground/20">
                  <ArrowRight className="w-5 h-5 text-overlay-foreground" />
                </div>
              </div>
            </Link>
          </m.div>
        ))}
      </div>

      {/* View All Button */}
      {categories.length > 6 && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <Link href="/blog/category">
            <Button
              size="lg"
              className="rounded-full bg-primary hover:bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {tCommon("view_all_categories")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </m.div>
      )}
    </section>
  );
}
