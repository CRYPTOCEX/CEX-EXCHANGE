"use client";

import { useState, useRef, useEffect, useId, forwardRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRight,
  Sparkles,
  X,
  ExternalLink,
  Shield,
  Clock,
  DollarSign,
  User,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOutsideClick } from "@/hooks/use-outside-click";

interface Trader {
  id: string;
  firstName: string;
  avatar?: string;
}

interface FeaturedOffer {
  id: string;
  currency: string;
  priceCurrency: string;
  price: number;
  priceModel: string;
  minAmount: number;
  maxAmount: number;
  availableAmount: number;
  termsOfTrade?: string;
  trader: Trader;
}

interface FeaturedOffersSectionProps {
  buyOffers: FeaturedOffer[];
  sellOffers: FeaturedOffer[];
  isLoading?: boolean;
}

// Expanded Offer Card Component
interface ExpandedOfferCardProps {
  offer: FeaturedOffer;
  type: "buy" | "sell";
  onClose: () => void;
  layoutId: string;
}

const ExpandedOfferCard = forwardRef<HTMLDivElement, ExpandedOfferCardProps>(
  ({ offer, type, onClose, layoutId }, ref) => {
    const tCommon = useTranslations("common");
    const router = useRouter();
    const isBuy = type === "buy";
    const gradient = isBuy
      ? { from: "#22c55e", to: "#10b981" }
      : { from: "#f97316", to: "#ef4444" };

    const handleViewDetails = () => {
      onClose();
      router.push(`/p2p/offer/${offer.id}`);
    };

    const handleStartTrade = () => {
      onClose();
      router.push(`/p2p/offer/${offer.id}`);
    };

    return (
      <motion.div
        layoutId={`offer-card-${offer.id}-${layoutId}`}
        ref={ref}
        className="w-[95vw] sm:w-[90vw] md:w-[600px] max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-zinc-900 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-2xl shadow-black/20 dark:shadow-black/40 rounded-2xl"
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl z-10"
          style={{
            background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
          }}
        />

        {/* Close button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors backdrop-blur-sm cursor-pointer"
        >
          <X className="h-5 w-5" />
        </motion.button>

        {/* Main content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isBuy ? "bg-emerald-500/10" : "bg-orange-500/10"
              }`}
            >
              {isBuy ? (
                <ArrowDownCircle className="w-6 h-6 text-emerald-500" />
              ) : (
                <ArrowUpCircle className="w-6 h-6 text-orange-500" />
              )}
            </div>
            <div>
              <motion.h2
                layoutId={`offer-title-${offer.id}-${layoutId}`}
                className={`text-xl font-bold ${
                  isBuy
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}
              >
                {isBuy ? "Buy" : "Sell"} {offer.currency}
              </motion.h2>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {offer.priceModel} Price
              </span>
            </div>
          </div>

          {/* Price Section */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <span>Price per {offer.currency}</span>
            </div>
            <motion.p
              layoutId={`offer-price-${offer.id}-${layoutId}`}
              className="text-3xl font-bold text-zinc-900 dark:text-white"
            >
              $
              {offer.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </motion.p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Limits */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                <Shield className="w-4 h-4" />
                <span>Trade Limits</span>
              </div>
              <p className="font-semibold text-zinc-900 dark:text-white">
                ${offer.minAmount.toLocaleString()} - $
                {offer.maxAmount.toLocaleString()}
              </p>
            </div>

            {/* Available Amount */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                <Clock className="w-4 h-4" />
                <span>Available</span>
              </div>
              <p className="font-semibold text-zinc-900 dark:text-white">
                {offer.availableAmount.toLocaleString()} {offer.currency}
              </p>
            </div>
          </div>

          {/* Terms of Trade */}
          {offer.termsOfTrade && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                <FileText className="w-4 h-4" />
                <span>Terms of Trade</span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {offer.termsOfTrade}
              </p>
            </div>
          )}

          {/* Trader Info */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-3">
              <User className="w-4 h-4" />
              <span>Trader</span>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={offer.trader.avatar} />
                <AvatarFallback className="text-sm bg-blue-500/10 text-blue-600">
                  {offer.trader.firstName?.charAt(0) || "T"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  {offer.trader.firstName}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Verified Trader
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed footer */}
        <div className="shrink-0 flex items-center gap-3 p-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-sm">
          {/* View Details */}
          <Button
            onClick={handleViewDetails}
            variant="outline"
            className="flex-1 rounded-xl"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {tCommon("view_details") || "View Details"}
          </Button>

          {/* Start Trade */}
          <Button
            onClick={handleStartTrade}
            className={`flex-1 rounded-xl text-white ${
              isBuy
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {isBuy ? "Buy Now" : "Sell Now"}
          </Button>
        </div>
      </motion.div>
    );
  }
);

ExpandedOfferCard.displayName = "ExpandedOfferCard";

// Offer Card Component
function OfferCard({
  offer,
  type,
  index,
  layoutId,
  onExpand,
  isActiveCard,
}: {
  offer: FeaturedOffer;
  type: "buy" | "sell";
  index: number;
  layoutId: string;
  onExpand: () => void;
  isActiveCard: boolean;
}) {
  const isBuy = type === "buy";
  const gradient = isBuy
    ? { from: "#22c55e", to: "#10b981" }
    : { from: "#f97316", to: "#ef4444" };

  const handleClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on the action button
    if ((e.target as HTMLElement).closest("[data-prevent-expand]")) {
      return;
    }
    onExpand();
  };

  return (
    <motion.div
      layoutId={`offer-card-${offer.id}-${layoutId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isActiveCard ? 0 : 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={handleClick}
      className="group relative overflow-hidden rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 cursor-pointer hover:shadow-lg"
    >
      {/* Type badge */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})`,
        }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isBuy ? (
              <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <ArrowUpCircle className="w-5 h-5 text-orange-500" />
            )}
            <motion.span
              layoutId={`offer-title-${offer.id}-${layoutId}`}
              className={`text-sm font-semibold ${
                isBuy
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-orange-600 dark:text-orange-400"
              }`}
            >
              {isBuy ? "Buy" : "Sell"} {offer.currency}
            </motion.span>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {offer.priceModel}
          </span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <motion.div
            layoutId={`offer-price-${offer.id}-${layoutId}`}
            className="text-2xl font-bold text-zinc-900 dark:text-white"
          >
            $
            {offer.price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </motion.div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            per {offer.currency}
          </span>
        </div>

        {/* Amount Range */}
        <div className="flex items-center justify-between text-sm mb-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <span className="text-zinc-500 dark:text-zinc-400">Limits</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            ${offer.minAmount.toLocaleString()} - $
            {offer.maxAmount.toLocaleString()}
          </span>
        </div>

        {/* Terms of Trade */}
        {offer.termsOfTrade && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex flex-wrap gap-1">
              {offer.termsOfTrade
                .split(/[,\s]+/)
                .filter(Boolean)
                .slice(0, 3)
                .map((term, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  >
                    {term}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Trader */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={offer.trader.avatar} />
              <AvatarFallback className="text-xs bg-blue-500/10 text-blue-600">
                {offer.trader.firstName?.charAt(0) || "T"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {offer.trader.firstName}
            </span>
          </div>
          <Link href={`/p2p/offer/${offer.id}`} data-prevent-expand>
            <Button
              size="sm"
              className={`rounded-lg text-white ${
                isBuy
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {isBuy ? "Buy" : "Sell"}
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 p-5 animate-pulse">
      <div className="h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-4" />
      <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
      <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
      <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
      <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
      </div>
    </div>
  );
}

// Offer Grid Component with expandable support
function OfferGrid({
  offers,
  type,
  isLoading,
}: {
  offers: FeaturedOffer[];
  type: "buy" | "sell";
  isLoading?: boolean;
}) {
  const [activeOffer, setActiveOffer] = useState<FeaturedOffer | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const layoutId = useId();
  const expandedRef = useRef<HTMLDivElement>(null);

  // Track mount state for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle escape key to close
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveOffer(null);
      }
    }

    if (activeOffer) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeOffer]);

  // Close when clicking outside
  useOutsideClick(expandedRef, () => setActiveOffer(null));

  // Modal content to be portaled
  const modalContent = (
    <>
      {/* Overlay backdrop */}
      <AnimatePresence>
        {activeOffer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm h-full w-full z-[9999]"
            onClick={() => setActiveOffer(null)}
          />
        )}
      </AnimatePresence>

      {/* Expanded card modal */}
      <AnimatePresence>
        {activeOffer && (
          <div className="fixed inset-0 grid place-items-center z-[10000] p-4 pointer-events-none">
            <div className="pointer-events-auto">
              <ExpandedOfferCard
                ref={expandedRef}
                offer={activeOffer}
                type={type}
                onClose={() => setActiveOffer(null)}
                layoutId={layoutId}
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <>
      {/* Portal modal to body */}
      {isMounted && createPortal(modalContent, document.body)}

      {/* Offer grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {isLoading
            ? [...Array(4)].map((_, i) => <LoadingCard key={i} />)
            : offers.slice(0, 4).map((offer, index) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  type={type}
                  index={index}
                  layoutId={layoutId}
                  onExpand={() => setActiveOffer(offer)}
                  isActiveCard={activeOffer?.id === offer.id}
                />
              ))}
        </AnimatePresence>
      </div>
    </>
  );
}

export default function FeaturedOffersSection({
  buyOffers,
  sellOffers,
  isLoading,
}: FeaturedOffersSectionProps) {
  const t = useTranslations("ext_p2p");
  const gradient = { from: "#3b82f6", to: "#8b5cf6" };

  const hasBuyOffers = !isLoading && buyOffers && buyOffers.length > 0;
  const hasSellOffers = !isLoading && sellOffers && sellOffers.length > 0;

  if (!isLoading && !hasBuyOffers && !hasSellOffers) {
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
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-blue-500/20"
          >
            <Sparkles className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {t("featured_offers") || "Featured Offers"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("best") || "Best"}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              }}
            >
              {t("deals_available") || "Deals Available"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("top_offers_from_verified_traders") ||
              "Top offers from verified traders with the best prices"}
          </p>
        </motion.div>

        {/* Offers Grid */}
        <div className="max-w-6xl mx-auto">
          {/* Buy Offers */}
          <div className="mb-10">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
              {t("buy_crypto") || "Buy Crypto"}
            </h3>
            <OfferGrid offers={buyOffers} type="buy" isLoading={isLoading} />
          </div>

          {/* Sell Offers */}
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-orange-500" />
              {t("sell_crypto") || "Sell Crypto"}
            </h3>
            <OfferGrid offers={sellOffers} type="sell" isLoading={isLoading} />
          </div>
        </div>

        {/* View All CTA */}
        {!isLoading && (hasBuyOffers || hasSellOffers) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex justify-center mt-10"
          >
            <Link href="/p2p/offer">
              <Button
                variant="outline"
                className="rounded-xl border-2 border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500"
              >
                View All Offers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
