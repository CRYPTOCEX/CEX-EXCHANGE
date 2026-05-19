"use client";

import { motion } from "framer-motion";
import {
  Search,
  TrendingUp,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface TrendingSearch {
  query: string;
  count: number;
  hasResults: boolean;
}

interface TrendingSearchesSectionProps {
  searches: TrendingSearch[];
  onSearchClick?: (query: string) => void;
  isLoading?: boolean;
}

function SearchTag({
  search,
  index,
  onClick,
}: {
  search: TrendingSearch;
  index: number;
  onClick?: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-sky-400/50 dark:hover:border-sky-600/50 hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-300 text-left"
    >
      <Search className="w-4 h-4 text-sky-500 flex-shrink-0" />
      <span className="font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
        {search.query}
      </span>
      <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
        <Users className="w-3 h-3" />
        {search.count}
      </span>
    </motion.button>
  );
}

function LoadingTag() {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
      <div className="h-4 w-8 bg-zinc-200 dark:bg-zinc-700 rounded" />
    </div>
  );
}

export default function TrendingSearchesSection({
  searches,
  onSearchClick,
  isLoading,
}: TrendingSearchesSectionProps) {
  const t = useTranslations("ext_faq");
  const tExt = useTranslations("ext");

  if (!isLoading && (!searches || searches.length === 0)) {
    return null;
  }

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background line */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />

      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-sky-500/20"
          >
            <TrendingUp className="w-4 h-4 text-sky-500 mr-2" />
            <span className="text-sm font-medium text-sky-600 dark:text-sky-400">
              {tExt("trending_now") || "Trending Now"}
            </span>
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-3">
            {t("what_others_are_searching") || "What Others Are Searching"}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            {t("popular_searches_this_week") ||
              "Popular searches from our community this week"}
          </p>
        </motion.div>

        {/* Search Tags */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3"
        >
          {isLoading
            ? [...Array(8)].map((_, i) => <LoadingTag key={i} />)
            : searches.slice(0, 10).map((search, index) => (
                <SearchTag
                  key={search.query}
                  search={search}
                  index={index}
                  onClick={() => onSearchClick?.(search.query)}
                />
              ))}
        </motion.div>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-8"
        >
          <Sparkles className="w-4 h-4 inline-block mr-1 text-sky-500" />
          {t("click_to_search") || "Click any topic to search instantly"}
        </motion.p>
      </div>
    </section>
  );
}
