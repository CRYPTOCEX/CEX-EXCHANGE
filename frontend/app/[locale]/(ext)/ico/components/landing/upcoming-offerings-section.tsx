"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Rocket,
  Calendar,
  ArrowRight,
  Bell,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface UpcomingOffering {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  description: string;
  targetAmount: number;
  startDate: string;
  daysUntilStart: number;
  blockchain: string;
  tokenType: string;
}

interface UpcomingOfferingsSectionProps {
  offerings: UpcomingOffering[];
  isLoading?: boolean;
}

function OfferingCard({
  offering,
  index,
}: {
  offering: UpcomingOffering;
  index: number;
}) {
  const gradient = { from: "#14b8a6", to: "#06b6d4" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group relative overflow-hidden rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-teal-500/30 transition-all duration-300"
    >
      {/* Countdown badge */}
      <div className="absolute top-4 right-4 z-10">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-bold"
          style={{
            background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
          }}
        >
          <Clock className="w-3.5 h-3.5" />
          {offering.daysUntilStart} days
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${gradient.from}20, ${gradient.to}20)`,
            }}
          >
            {offering.icon ? (
              <img
                src={offering.icon}
                alt={offering.name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Rocket
                className="w-7 h-7"
                style={{ color: gradient.from }}
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">
              {offering.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                ${offering.symbol}
              </span>
              <span className="text-zinc-300 dark:text-zinc-600">|</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {offering.blockchain}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4">
          {offering.description || "Exciting new token offering launching soon."}
        </p>

        {/* Target */}
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Target Raise
          </span>
          <span className="text-sm font-bold text-zinc-900 dark:text-white">
            ${offering.targetAmount.toLocaleString()}
          </span>
        </div>

        {/* Launch Date */}
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          <Calendar className="w-4 h-4 text-teal-500" />
          <span>
            Launches{" "}
            {new Date(offering.startDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Action */}
        <Link href={`/ico/offer/${offering.id}`}>
          <Button
            variant="outline"
            className="w-full rounded-xl group/btn border-teal-500/30 hover:border-teal-500 hover:bg-teal-500/5"
          >
            <Bell className="w-4 h-4 mr-2 text-teal-500" />
            Get Notified
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 p-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
          <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
      <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
      <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded" />
    </div>
  );
}

export default function UpcomingOfferingsSection({
  offerings,
  isLoading,
}: UpcomingOfferingsSectionProps) {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  const gradient = { from: "#14b8a6", to: "#06b6d4" };

  if (!isLoading && (!offerings || offerings.length === 0)) {
    return null;
  }

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-500/20"
          >
            <Sparkles className="w-4 h-4 text-teal-500 mr-2" />
            <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
              {tCommon("coming_soon") || "Coming Soon"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tCommon("upcoming") || "Upcoming"}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              }}
            >
              {t("offerings") || "Offerings"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("be_the_first_to_invest") ||
              "Be the first to invest in these exciting new projects. Get notified when they launch."}
          </p>
        </motion.div>

        {/* Offerings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <AnimatePresence mode="popLayout">
            {isLoading
              ? [...Array(4)].map((_, i) => <LoadingCard key={i} />)
              : offerings.slice(0, 4).map((offering, index) => (
                  <OfferingCard
                    key={offering.id}
                    offering={offering}
                    index={index}
                  />
                ))}
          </AnimatePresence>
        </div>

        {/* View All CTA */}
        {!isLoading && offerings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex justify-center mt-10"
          >
            <Link href="/ico/offer?status=UPCOMING">
              <Button
                variant="outline"
                className="rounded-xl border-2 border-zinc-300 dark:border-zinc-700 hover:border-teal-500 dark:hover:border-teal-500"
              >
                View All Upcoming
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
