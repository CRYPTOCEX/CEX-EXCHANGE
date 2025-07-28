"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useBlogStore } from "@/store/blog/user";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { TagIcon, Search, ArrowRight, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function TagsClient() {
  const t = useTranslations("blog");
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
        setError("Failed to load tags");
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
      "from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600",
      "from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600",
      "from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600",
      "from-orange-500 to-amber-500 dark:from-orange-600 dark:to-amber-600",
      "from-pink-500 to-rose-500 dark:from-pink-600 dark:to-rose-600",
    ];

    // Use the sum of character codes to determine the color
    const charSum = tagName
      .split("untitled")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };
  if (isLoading && (!tags || tags.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="h-12 w-1/3 mx-auto mb-8" />
        <Skeleton className="h-10 w-full max-w-md mx-auto mb-12" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {Array.from({
            length: 2,
          }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({
            length: 12,
          }).map((_, i) => (
            <Skeleton key={`tag-${i}`} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
            {t("Tags")}
          </h1>
          <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 p-4 rounded-lg inline-block border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50/50 to-white dark:from-black dark:via-zinc-900/50 dark:to-black">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            duration: 0.6,
          }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 p-8 md:p-12 mb-12 shadow-xl"
        >
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white blur-3xl"></div>
            <div className="absolute bottom-20 left-20 h-40 w-40 rounded-full bg-white blur-3xl"></div>
          </div>

          {/* Decorative tags */}
          <div className="absolute top-10 right-10 opacity-20 rotate-12">
            <TagIcon className="h-24 w-24 text-white" />
          </div>
          <div className="absolute bottom-10 left-10 opacity-10 -rotate-12">
            <Hash className="h-16 w-16 text-white" />
          </div>

          <div className="relative z-10 max-w-3xl">
            <motion.h1
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
                delay: 0.1,
              }}
              className="text-4xl md:text-5xl font-bold mb-4 text-white"
            >
              {t("explore_topics_by_tag")}
            </motion.h1>
            <motion.p
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
              className="text-xl text-indigo-100 mb-8"
            >
              {t("discover_content_organized_by")}.{" "}
              {t("browse_our_collection_of")} {tags.length}{" "}
              {t("tags_to_find_exactly_what_youre_looking_for")}.
            </motion.p>

            <motion.div
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 py-6 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-indigo-200 rounded-xl focus:ring-2 focus:ring-white/50 focus:border-transparent w-full md:w-96"
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Featured Tags Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {t("popular_tags")}
            </h2>
            <Link
              href="/blog/tag"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 inline-flex items-center"
            >
              {t("view_all_posts")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredTags.slice(0, 8).map((tag, index) => {
              return (
                <motion.div
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
                    className={`absolute inset-0 bg-gradient-to-br ${getTagColor(tag.name)}`}
                  ></div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>

                  <Link
                    href={`/blog/tag/${tag.slug}`}
                    className="absolute inset-0 p-6 flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-white">
                        {tag.name}
                      </h3>
                      {tag.postCount !== undefined && (
                        <span className="bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs">
                          {tag.postCount} {t("posts")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-white/90 text-sm">
                      <span>{t("Explore")}</span>
                      <ArrowRight className="ml-1 h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Alphabetical Tags Section */}
        <div className="space-y-12">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            {t("all_tags")}
          </h2>

          {/* Alphabet navigation */}
          <div className="flex flex-wrap gap-2 mb-8 sticky top-20 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            {sortedKeys.map((letter) => (
              <Button
                key={letter}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full w-8 h-8 p-0 font-bold",
                  activeIndex === sortedKeys.indexOf(letter)
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                    : "text-zinc-700 dark:text-zinc-300"
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

          {sortedKeys.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700">
              <TagIcon className="h-12 w-12 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
              <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                {t("no_tags_found")}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400">
                {searchQuery
                  ? `No tags match your search for "${searchQuery}"`
                  : "There are no tags available yet."}
              </p>
            </div>
          ) : (
            sortedKeys.map((letter, sectionIndex) => (
              <motion.div
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
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-600 dark:to-purple-600 text-white font-bold text-xl shadow-md">
                    {letter}
                  </div>
                  <div className="ml-4 h-px flex-1 bg-gradient-to-r from-indigo-200 to-transparent dark:from-indigo-800"></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {groupedTags[letter].map((tag, index) => (
                    <motion.div
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
                        className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md dark:hover:shadow-zinc-900/30 transition-all duration-300"
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full bg-gradient-to-r ${getTagColor(tag.name)} mr-3`}
                          ></div>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300">
                            {tag.name}
                          </span>
                        </div>
                        {tag.postCount !== undefined && (
                          <span className="text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300">
                            {tag.postCount}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
