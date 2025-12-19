"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  Tag,
  Clock,
  Percent,
  Sparkles,
  Flame,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface Deal {
  product: {
    id: string;
    name: string;
    slug: string;
    image: string;
    price: number;
    currency: string;
  };
  discount: {
    code: string;
    percentage: number;
    validUntil: string;
  };
  originalPrice: number;
  discountedPrice: number;
}

interface ActiveDealsSectionProps {
  deals: Deal[];
  isLoading?: boolean;
}

function DealCard({ deal, index }: { deal: Deal; index: number }) {
  const validUntil = new Date(deal.discount.validUntil);
  const now = new Date();
  const daysLeft = Math.ceil(
    (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group"
    >
      <Link href={`/ecommerce/product/${deal.product.slug}`}>
        <div className="relative p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-amber-200/50 dark:border-amber-800/30 hover:border-amber-400/50 dark:hover:border-amber-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
          {/* Discount Badge */}
          <div className="absolute -top-3 -right-3 z-10">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 text-white text-sm font-bold shadow-lg">
              <Percent className="w-3.5 h-3.5" />
              {deal.discount.percentage}% OFF
            </div>
          </div>

          {/* Product Image */}
          <div className="relative aspect-square rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-4">
            <Image
              src={deal.product.image || "/placeholder.svg?height=200&width=200"}
              alt={deal.product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 200px"
            />
          </div>

          {/* Product Info */}
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-2 line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
            {deal.product.name}
          </h3>

          {/* Price */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {deal.product.currency} {deal.discountedPrice.toFixed(2)}
            </span>
            <span className="text-sm text-zinc-400 line-through">
              {deal.product.currency} {deal.originalPrice.toFixed(2)}
            </span>
          </div>

          {/* Discount Code */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 mb-3">
            <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              Use code:
            </span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {deal.discount.code}
            </span>
          </div>

          {/* Time Left */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {daysLeft > 0
                ? `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`
                : "Expires today!"}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="aspect-square rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-4" />
      <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
      <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-3" />
      <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
    </div>
  );
}

export default function ActiveDealsSection({
  deals,
  isLoading,
}: ActiveDealsSectionProps) {
  const t = useTranslations("ext_ecommerce");
  const tExt = useTranslations("ext");

  if (!isLoading && (!deals || deals.length === 0)) {
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
              className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border-amber-500/20"
            >
              <Flame className="w-4 h-4 text-amber-500 mr-2" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {t("hot_deals") || "Hot Deals"}
              </span>
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
              {t("limited_time") || "Limited Time"}{" "}
              <span className="bg-gradient-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent">
                {tExt("offers") || "Offers"}
              </span>
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
              {t("grab_these_deals_before_they_expire") ||
                "Grab these amazing deals before they expire"}
            </p>
          </div>

          <Link href="/ecommerce/product">
            <Button
              variant="outline"
              className="rounded-xl group border-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/5 dark:hover:bg-amber-600/10 font-semibold transition-all duration-300"
            >
              {t("view_all_deals") || "View All Deals"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>

        {/* Deals Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoading
            ? [...Array(4)].map((_, i) => <LoadingCard key={i} />)
            : deals.slice(0, 4).map((deal, index) => (
                <DealCard key={deal.product.id} deal={deal} index={index} />
              ))}
        </div>
      </div>
    </section>
  );
}
