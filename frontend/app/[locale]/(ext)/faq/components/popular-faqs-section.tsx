"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  Eye,
  ThumbsUp,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface PopularFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  views: number;
  helpfulCount: number;
  helpfulPercentage: number;
}

interface PopularFAQsSectionProps {
  faqs: PopularFAQ[];
  isLoading?: boolean;
}

function FAQCard({ faq, index }: { faq: PopularFAQ; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group"
    >
      <Link href={`/faq/${faq.id}`}>
        <div className="relative p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-sky-400/50 dark:hover:border-sky-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/10 h-full">
          {/* Rank Badge for top 3 */}
          {index < 3 && (
            <div className="absolute -top-2 -left-2 z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ${
                  index === 0
                    ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                    : index === 1
                      ? "bg-gradient-to-br from-zinc-300 to-zinc-400 text-zinc-700"
                      : "bg-gradient-to-br from-amber-600 to-amber-700"
                }`}
              >
                {index + 1}
              </div>
            </div>
          )}

          {/* Category Badge */}
          {faq.category && (
            <Badge
              variant="outline"
              className="mb-3 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
            >
              {faq.category}
            </Badge>
          )}

          {/* Question */}
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-2 line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
            {faq.question}
          </h3>

          {/* Answer Preview */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
            {faq.answer}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {faq.views.toLocaleString()}
              </span>
              {faq.helpfulCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {faq.helpfulCount}
                </span>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
      <div className="h-5 w-full bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
      <div className="h-5 w-4/5 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-4 w-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="w-4 h-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
}

export default function PopularFAQsSection({
  faqs,
  isLoading,
}: PopularFAQsSectionProps) {
  const t = useTranslations("ext_faq");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  if (!isLoading && (!faqs || faqs.length === 0)) {
    return null;
  }

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12"
        >
          <div>
            <Badge
              variant="outline"
              className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-sky-500/20"
            >
              <TrendingUp className="w-4 h-4 text-sky-500 mr-2" />
              <span className="text-sm font-medium text-sky-600 dark:text-sky-400">
                {tExt("most_viewed") || "Most Viewed"}
              </span>
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              {tCommon("popular") || "Popular"}{" "}
              <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                {t("questions") || "Questions"}
              </span>
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
              {t("answers_that_helped_thousands") ||
                "Answers that have helped thousands of users"}
            </p>
          </div>

          <Link href="/faq">
            <Button
              variant="outline"
              className="rounded-xl group border-2 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/5 dark:hover:bg-sky-600/10 font-semibold transition-all duration-300"
            >
              {tCommon("view_all") || "View All"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>

        {/* FAQs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading
            ? [...Array(6)].map((_, i) => <LoadingCard key={i} />)
            : faqs.slice(0, 6).map((faq, index) => (
                <FAQCard key={faq.id} faq={faq} index={index} />
              ))}
        </div>
      </div>
    </section>
  );
}
