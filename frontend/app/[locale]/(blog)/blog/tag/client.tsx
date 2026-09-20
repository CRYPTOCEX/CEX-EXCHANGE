"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useBlogStore } from "@/store/blog/user";
import { SkeletonText } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { m } from "framer-motion";
import { TagIcon, Search, ArrowRight, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { PageHero } from "../components/page-hero";
import { FloatingShapes, InteractivePattern } from "@/components/sections/shared";

export function TagsClient() {
  const t = useTranslations("blog_blog");
  const tCommon = useTranslations("common");
  const { tags, isLoading, fetchTags } = useBlogStore();
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTags, setFilteredTags] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchTags();
      } catch (err) {
        console.error("Error loading tags:", err);
        setError(t("failed_to_load_tags"));
      }
    };
    loadData();
  }, [fetchTags]);

  // Filter tags based on search query
  useEffect(() => {
    if (!tags) return;
    if (searchQuery.trim() === "") {
      setFilteredTags(tags);
    } else {
      const filtered = tags.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTags(filtered);
    }
  }, [searchQuery, tags]);

  // Group tags by first letter for alphabetical display
  const groupedTags = filteredTags.reduce((acc: Record<string, any[]>, tag) => {
    const firstLetter = tag.name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(tag);
    return acc;
  }, {});

  // Sort the keys alphabetically
  const sortedKeys = Object.keys(groupedTags).sort();

  // Generate a random color from a predefined palette based on tag name
  const getTagColor = (tagName: string) => {
    const colors = [
      "bg-primary",
      "bg-primary",
      "bg-success",
      "bg-warning",
      "bg-destructive",
    ];

    // Use the sum of character codes to determine the color
    const charSum = tagName
      .split("untitled")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };
  /**
   * The 100-line pending copy of this page is gone.
   * ==========================================================================
   *
   * It reproduced the hero as four grey boxes — badge, title, description,
   * search field — every one of which is either a `t()` string or a live
   * `<Input>` this component owns. The search box in particular was a
   * `Skeleton h-12`: the control was fully functional and was being hidden
   * from the user for the duration of a fetch it does not depend on.
   *
   * It also invented an alphabet rail of 26 pills. The real rail renders one
   * pill per letter that actually has tags — typically eight to twelve — so
   * the sticky bar was 2 rows tall while pending and 1 row tall after, and
   * everything below it moved by ~44px. The rail is now simply absent until
   * its letters are known, which is honest: its length is data.
   *
   * What is reserved instead is the part with a knowable shape: eight popular
   * tag tiles in the real `grid-cols-2 md:grid-cols-4` at the real `h-32`, and
   * two letter groups of ten tiles in the real
   * `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`.
   */
  const isPending = isLoading && (!tags || tags.length === 0);

  /**
   * The sticky A-Z rail, withheld while pending — deliberately.
   *
   * Its length is the number of DISTINCT FIRST LETTERS in the data, which is
   * not knowable and is usually about ten; the pending copy this replaced
   * guessed 26. At this width 26 pills wrap to two rows and ten fit on one, so
   * a reserved rail settles by a full 40px row height and takes the whole tag
   * index up with it. A rail that simply arrives moves the page once, by its
   * own height, at the same instant the sections below it appear — which is
   * the moment the reader is already watching.
   *
   * `sortedKeys.length > 0` is the other half: an install with no tags at all
   * would otherwise render an empty sticky bar with its border and 16px
   * padding above the "No tags found" panel.
   */
  const showAlphabetRail = !isPending && sortedKeys.length > 0;

  /** Resolved, and there is genuinely nothing to index. */
  const showNoTags = !isPending && sortedKeys.length === 0;

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
            className="text-center"
          >
            <div className="mb-8 inline-flex items-center justify-center p-8 bg-destructive/10 rounded-3xl border border-destructive/50">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-foreground">
              {tCommon("tags")}
            </h1>
            <div className="bg-card/80 dark:bg-surface-2/80 backdrop-blur-xl text-destructive p-6 rounded-2xl inline-block border border-destructive/50 shadow-xl">
              {error}
            </div>
          </m.div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen relative overflow-hidden bg-card">
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
      {/* Hero Section */}
      <PageHero
        badge={{ icon: <TagIcon className="h-3.5 w-3.5" />, text: tCommon("tags") }}
        title={[
          { text: "Explore by " },
          { text: "Tag", gradient: "bg-primary" },
        ]}
        description={`${t("discover_content_organized_by")}. ${t("browse_our_collection_of")} ${tags.length} ${t("tags_to_find_exactly_what_youre_looking_for")}.`}
      >
        {/* Search input */}
        <div className="relative max-w-md mx-auto mt-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`${tCommon("search_tags")}…`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 py-6 rounded-xl border-border"
          />
        </div>
      </PageHero>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Featured Tags Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {tCommon("popular_tags")}
            </h2>
            <Link
              href="/blog/tag"
              className="text-sm text-primary hover:text-primary inline-flex items-center"
            >
              {t("view_all_posts")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Pending popular tiles: the REAL `h-32 rounded-xl` shell with its
                tint layers and its static "Explore" row. Only the tag name and
                the post count are unknown. */}
            {isPending &&
              [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={`pending-popular-${i}`}
                  className="relative overflow-hidden rounded-xl shadow-md h-32"
                >
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${getTagColor(String(i))}`}
                  />
                  <div className="absolute inset-0 bg-overlay/20" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-semibold leading-tight tracking-tight text-overlay-foreground">
                        <SkeletonText placeholder={t("tag_name")} />
                      </h3>
                      <span className="bg-card/20 backdrop-blur-sm text-overlay-foreground px-2 py-1 rounded-full text-xs tabular-nums">
                        <SkeletonText placeholder="00 posts" />
                      </span>
                    </div>
                    <div className="flex items-center text-overlay-foreground/90 text-sm">
                      <span>{t("explore")}</span>
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                  </div>
                </div>
              ))}
            {filteredTags.slice(0, 8).map((tag, index) => {
              return (
                <m.div
                  key={tag.id}
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.05,
                  }}
                  whileHover={{
                    y: -5,
                    scale: 1.02,
                  }}
                  className="relative overflow-hidden rounded-xl shadow-md h-32 group"
                >
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${getTagColor(tag.name)}`}
                  ></div>
                  <div className="absolute inset-0 bg-overlay/20 group-hover:bg-overlay/10 transition-colors duration-300"></div>

                  <Link
                    href={`/blog/tag/${tag.slug}`}
                    className="absolute inset-0 p-6 flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-semibold leading-tight tracking-tight text-overlay-foreground">
                        {tag.name}
                      </h3>
                      {tag.postCount !== undefined && (
                        <span className="bg-card/20 backdrop-blur-sm text-overlay-foreground px-2 py-1 rounded-full text-xs tabular-nums">
                          {tag.postCount} {tCommon("posts")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-overlay-foreground/90 text-sm">
                      <span>{t("explore")}</span>
                      <ArrowRight className="ml-1 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </Link>
                </m.div>
              );
            })}
          </div>
        </div>

        {/* Alphabetical Tags Section */}
        <div className="space-y-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {tCommon("all_tags")}
          </h2>

          {/* See `showAlphabetRail` above for why this one is withheld. */}
          {showAlphabetRail && (
          <div className="flex flex-wrap gap-2 mb-8 sticky top-20 z-10 bg-card/80 dark:bg-surface-2/80 backdrop-blur-sm p-4 rounded-xl border border-border">
            {sortedKeys.map((letter) => (
              <Button
                key={letter}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full w-8 h-8 p-0 font-bold",
                  activeIndex === sortedKeys.indexOf(letter)
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() => {
                  setActiveIndex(sortedKeys.indexOf(letter));
                  document.getElementById(`section-${letter}`)?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
              >
                {letter}
              </Button>
            ))}
          </div>
          )}

          {/* Pending letter groups: two sections of ten tiles in the REAL
              five-column grid, each with the real `p-4 rounded-xl border`
              chrome. The letter medallion is a fixed 48px circle, so it keeps
              its box and only loses its glyph. */}
          {isPending &&
            [0, 1].map((sectionIndex) => (
              <div key={`pending-section-${sectionIndex}`} className="relative">
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl shadow-md">
                    <SkeletonText placeholder="A" />
                  </div>
                  <div className="ml-4 h-px flex-1 bg-linear-to-r from-primary to-transparent" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={`pending-tag-${sectionIndex}-${i}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-border-strong bg-muted"
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-border-strong mr-3" />
                        <span className="font-medium text-foreground">
                          <SkeletonText placeholder="tag-name" />
                        </span>
                      </div>
                      <span className="text-xs font-mono tabular-nums bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        <SkeletonText placeholder="00" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {/* Loading and empty are different states — see `showNoTags`. */}
          {showNoTags ? (
            <div className="text-center py-12 bg-muted dark:bg-muted/50 rounded-xl border border-border-strong">
              <TagIcon className="h-12 w-12 mx-auto text-subtle-foreground mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">
                {tCommon("no_tags_found")}
              </h3>
              <p className="text-subtle-foreground">
                {searchQuery
                  ? t("no_tags_match_your_search_for", { searchQuery: String(searchQuery) })
                  : t("there_are_no_tags_available_yet")}
              </p>
            </div>
          ) : (
            sortedKeys.map((letter, sectionIndex) => (
              <m.div
                id={`section-${letter}`}
                key={letter}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: sectionIndex * 0.1,
                }}
                className="relative"
              >
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl shadow-md">
                    {letter}
                  </div>
                  <div className="ml-4 h-px flex-1 bg-linear-to-r from-primary to-transparent"></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {groupedTags[letter].map((tag, index) => (
                    <m.div
                      key={tag.id}
                      initial={{
                        opacity: 0,
                        scale: 0.95,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.03,
                      }}
                      whileHover={{
                        scale: 1.03,
                      }}
                      className="group"
                    >
                      <Link
                        href={`/blog/tag/${tag.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl border border-border-strong bg-muted hover:border-primary hover:shadow-md dark:hover:shadow-surface-2/30 transition-all duration-300"
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full bg-linear-to-r ${getTagColor(tag.name)} mr-3`}
                          ></div>
                          <span className="font-medium text-foreground text-foreground group-hover:text-primary transition-colors duration-300">
                            {tag.name}
                          </span>
                        </div>
                        {tag.postCount !== undefined && (
                          <span className="text-xs font-mono tabular-nums bg-muted text-muted-foreground px-2 py-1 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                            {tag.postCount}
                          </span>
                        )}
                      </Link>
                    </m.div>
                  ))}
                </div>
              </m.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
