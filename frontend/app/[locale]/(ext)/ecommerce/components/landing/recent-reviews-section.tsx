"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  Star,
  MessageSquare,
  Quote,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";

interface Review {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    image: string;
  };
  user: {
    firstName: string;
    avatar?: string;
  };
  rating: number;
  comment: string;
  timeAgo: string;
}

interface RecentReviewsSectionProps {
  reviews: Review[];
  isLoading?: boolean;
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const initials = review.user.firstName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group"
    >
      <div className="relative p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-emerald-400/50 dark:hover:border-emerald-600/50 transition-all duration-300 hover:shadow-lg">
        {/* Quote Icon */}
        <Quote className="absolute top-4 right-4 w-8 h-8 text-emerald-500/20 dark:text-emerald-400/20" />

        {/* Rating */}
        <div className="flex items-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-zinc-300 dark:text-zinc-600"
              }`}
            />
          ))}
          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
            {review.timeAgo}
          </span>
        </div>

        {/* Comment */}
        <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed mb-4 line-clamp-3">
          "{review.comment}"
        </p>

        {/* User & Product */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
          {/* User */}
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-2 ring-emerald-500/20">
              <AvatarImage src={review.user.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-emerald-500 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm text-zinc-900 dark:text-white">
                  {review.user.firstName}
                </span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Verified Buyer
              </span>
            </div>
          </div>

          {/* Product */}
          <Link
            href={`/ecommerce/product/${review.product.slug}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              <Image
                src={
                  review.product.image ||
                  "/placeholder.svg?height=40&width=40"
                }
                alt={review.product.name}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse">
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-4 h-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
        ))}
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-4/5" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/5" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          <div>
            <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
            <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
      </div>
    </div>
  );
}

export default function RecentReviewsSection({
  reviews,
  isLoading,
}: RecentReviewsSectionProps) {
  const t = useTranslations("ext_ecommerce");

  if (!isLoading && (!reviews || reviews.length === 0)) {
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
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-emerald-500/10 to-amber-500/10 border-emerald-500/20"
          >
            <MessageSquare className="w-4 h-4 text-emerald-500 mr-2" />
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t("customer_reviews") || "Customer Reviews"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("what_our_customers") || "What Our Customers"}{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">
              {t("are_saying") || "Are Saying"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("real_reviews_from_verified_customers") ||
              "Real reviews from verified customers who love our products"}
          </p>
        </motion.div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {isLoading
            ? [...Array(6)].map((_, i) => <LoadingCard key={i} />)
            : reviews.slice(0, 6).map((review, index) => (
                <ReviewCard key={review.id} review={review} index={index} />
              ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link href="/ecommerce/product">
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-6 rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group"
            >
              {t("view_all_reviews") || "View All Reviews"}
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
