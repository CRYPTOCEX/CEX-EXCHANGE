"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  HelpCircle,
  User,
  Shield,
  TrendingUp,
  Wallet,
  PlusCircle,
  MinusCircle,
  CreditCard,
  Headphones,
  CheckCircle,
  Percent,
  Code,
  Smartphone,
  FileText,
  Eye,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface CategoryStats {
  name: string;
  faqCount: number;
  totalViews: number;
  icon: string;
}

interface CategoryCardsSectionProps {
  categories: CategoryStats[];
  onCategoryClick?: (category: string) => void;
  isLoading?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  shield: Shield,
  "trending-up": TrendingUp,
  wallet: Wallet,
  "plus-circle": PlusCircle,
  "minus-circle": MinusCircle,
  "help-circle": HelpCircle,
  "id-card": FileText,
  "credit-card": CreditCard,
  headphones: Headphones,
  "check-circle": CheckCircle,
  percent: Percent,
  code: Code,
  smartphone: Smartphone,
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  account: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20 hover:border-blue-500/40",
  },
  security: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  trading: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-violet-500/20 hover:border-violet-500/40",
  },
  wallet: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20 hover:border-amber-500/40",
  },
  deposit: {
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-500/20 hover:border-green-500/40",
  },
  withdrawal: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/20 hover:border-red-500/40",
  },
  payment: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20 hover:border-cyan-500/40",
  },
  support: {
    bg: "bg-pink-500/10",
    text: "text-pink-600 dark:text-pink-400",
    border: "border-pink-500/20 hover:border-pink-500/40",
  },
  verification: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20 hover:border-indigo-500/40",
  },
  kyc: {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20 hover:border-orange-500/40",
  },
};

const defaultColors = {
  bg: "bg-sky-500/10",
  text: "text-sky-600 dark:text-sky-400",
  border: "border-sky-500/20 hover:border-sky-500/40",
};

function CategoryCard({
  category,
  index,
  onClick,
}: {
  category: CategoryStats;
  index: number;
  onClick?: () => void;
}) {
  const IconComponent = iconMap[category.icon] || HelpCircle;
  const colors = colorMap[category.name.toLowerCase()] || defaultColors;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group"
    >
      <button
        onClick={onClick}
        className={`w-full text-left p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border ${colors.border} transition-all duration-300 hover:shadow-lg`}
      >
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}
        >
          <IconComponent className={`w-6 h-6 ${colors.text}`} />
        </div>

        {/* Category Name */}
        <h3 className={`font-bold text-lg mb-1 ${colors.text}`}>
          {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <Folder className="w-3.5 h-3.5" />
            {category.faqCount} articles
          </span>
          {category.totalViews > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {category.totalViews.toLocaleString()}
            </span>
          )}
        </div>

        {/* Arrow */}
        <div className="mt-3 flex items-center text-sm font-medium text-zinc-400 group-hover:text-sky-500 transition-colors">
          Browse articles
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-4" />
      <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
      <div className="flex items-center gap-4">
        <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="mt-3 h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
    </div>
  );
}

export default function CategoryCardsSection({
  categories,
  onCategoryClick,
  isLoading,
}: CategoryCardsSectionProps) {
  const t = useTranslations("ext_faq");
  const tCommon = useTranslations("common");

  if (!isLoading && (!categories || categories.length === 0)) {
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
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-sky-500/10 to-blue-500/10 border-sky-500/20"
          >
            <Folder className="w-4 h-4 text-sky-500 mr-2" />
            <span className="text-sm font-medium text-sky-600 dark:text-sky-400">
              {t("browse_topics") || "Browse Topics"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("explore_by") || "Explore by"}{" "}
            <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
              {tCommon("category") || "Category"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("find_answers_organized_by_topic") ||
              "Find answers organized by topic for quick navigation"}
          </p>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading
            ? [...Array(8)].map((_, i) => <LoadingCard key={i} />)
            : categories.slice(0, 8).map((category, index) => (
                <CategoryCard
                  key={category.name}
                  category={category}
                  index={index}
                  onClick={() => onCategoryClick?.(category.name)}
                />
              ))}
        </div>
      </div>
    </section>
  );
}
