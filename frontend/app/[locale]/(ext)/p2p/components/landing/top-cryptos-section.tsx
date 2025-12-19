"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowRight,
  Coins,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface TopCrypto {
  currency: string;
  totalVolume: number;
  tradeCount: number;
  avgPrice: number;
}

interface TopCryptosSectionProps {
  cryptos: TopCrypto[];
  isLoading?: boolean;
}

// Crypto colors mapping
const cryptoColors: Record<string, { bg: string; text: string; border: string }> = {
  BTC: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/20" },
  ETH: { bg: "bg-indigo-500/10", text: "text-indigo-500", border: "border-indigo-500/20" },
  USDT: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20" },
  USDC: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
  BNB: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/20" },
  XRP: { bg: "bg-cyan-500/10", text: "text-cyan-500", border: "border-cyan-500/20" },
  SOL: { bg: "bg-violet-500/10", text: "text-violet-500", border: "border-violet-500/20" },
  DOGE: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
  LTC: { bg: "bg-zinc-500/10", text: "text-zinc-500", border: "border-zinc-500/20" },
};

function CryptoCard({ crypto, index, maxVolume }: { crypto: TopCrypto; index: number; maxVolume: number }) {
  const colors = cryptoColors[crypto.currency] || {
    bg: "bg-blue-500/10",
    text: "text-blue-500",
    border: "border-blue-500/20",
  };
  const volumePercentage = maxVolume > 0 ? (crypto.totalVolume / maxVolume) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`group relative overflow-hidden rounded-xl bg-white/80 dark:bg-zinc-900/80 border ${colors.border} hover:border-blue-500/30 transition-all duration-300 p-5`}
    >
      {/* Rank badge */}
      <div className="absolute top-3 right-3">
        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
          #{index + 1}
        </span>
      </div>

      {/* Currency */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}
        >
          <span className={`text-lg font-bold ${colors.text}`}>
            {crypto.currency.slice(0, 2)}
          </span>
        </div>
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-white">
            {crypto.currency}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {crypto.tradeCount.toLocaleString()} trades
          </p>
        </div>
      </div>

      {/* Volume bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Volume</span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
            ${crypto.totalVolume.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${volumePercentage}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            className={`h-full rounded-full ${colors.bg.replace("/10", "")}`}
            style={{ backgroundColor: colors.text.replace("text-", "").includes("orange") ? "#f97316" : undefined }}
          />
        </div>
      </div>

      {/* Avg Price */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Avg Price</span>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          ${crypto.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Trade button */}
      <Link href={`/p2p/offer?currency=${crypto.currency}`}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 rounded-lg group/btn hover:bg-blue-500/10"
        >
          Trade {crypto.currency}
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
        </Button>
      </Link>
    </motion.div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div>
          <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
          <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
      <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-3" />
      <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
    </div>
  );
}

export default function TopCryptosSection({
  cryptos,
  isLoading,
}: TopCryptosSectionProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const gradient = { from: "#3b82f6", to: "#8b5cf6" };

  if (!isLoading && (!cryptos || cryptos.length === 0)) {
    return null;
  }

  const maxVolume = Math.max(...cryptos.map((c) => c.totalVolume), 1);
  const totalVolume = cryptos.reduce((sum, c) => sum + c.totalVolume, 0);

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
            <BarChart3 className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {t("market_overview") || "Market Overview"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {tCommon("top") || "Top"}{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
              }}
            >
              {tExt("cryptocurrencies") || "Cryptocurrencies"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("most_traded_currencies") ||
              "Most traded currencies on our P2P platform by volume"}
          </p>
        </motion.div>

        {/* Total Volume */}
        {!isLoading && cryptos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mb-10"
          >
            <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-700/50">
              <Coins className="w-5 h-5 text-blue-500" />
              <span className="text-zinc-600 dark:text-zinc-400">
                Total Volume:{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  ${totalVolume.toLocaleString()}
                </span>
              </span>
            </div>
          </motion.div>
        )}

        {/* Cryptos Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
          <AnimatePresence mode="popLayout">
            {isLoading
              ? [...Array(6)].map((_, i) => <LoadingCard key={i} />)
              : cryptos.slice(0, 6).map((crypto, index) => (
                  <CryptoCard
                    key={crypto.currency}
                    crypto={crypto}
                    index={index}
                    maxVolume={maxVolume}
                  />
                ))}
          </AnimatePresence>
        </div>

        {/* View All CTA */}
        {!isLoading && cryptos.length > 0 && (
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
                View All Markets
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
