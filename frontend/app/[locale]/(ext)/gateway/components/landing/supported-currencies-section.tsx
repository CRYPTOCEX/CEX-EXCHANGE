"use client";

import { motion } from "framer-motion";
import { Wallet, CreditCard, Coins, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface SupportedPayments {
  fiat: string[];
  crypto: string[];
  walletTypes: string[];
}

interface SupportedCurrenciesSectionProps {
  payments: SupportedPayments;
  isLoading?: boolean;
}

const cryptoIcons: Record<string, { bg: string; text: string }> = {
  BTC: { bg: "bg-orange-500/10", text: "text-orange-500" },
  ETH: { bg: "bg-indigo-500/10", text: "text-indigo-500" },
  USDT: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  USDC: { bg: "bg-blue-500/10", text: "text-blue-500" },
  LTC: { bg: "bg-zinc-500/10", text: "text-zinc-500" },
  XRP: { bg: "bg-cyan-500/10", text: "text-cyan-500" },
  BNB: { bg: "bg-yellow-500/10", text: "text-yellow-500" },
  SOL: { bg: "bg-violet-500/10", text: "text-violet-500" },
  DOGE: { bg: "bg-amber-500/10", text: "text-amber-500" },
};

const fiatIcons: Record<string, { flag: string }> = {
  USD: { flag: "US" },
  EUR: { flag: "EU" },
  GBP: { flag: "GB" },
  CAD: { flag: "CA" },
  AUD: { flag: "AU" },
  JPY: { flag: "JP" },
  CHF: { flag: "CH" },
};

function CurrencyBadge({
  currency,
  type,
  index,
}: {
  currency: string;
  type: "crypto" | "fiat";
  index: number;
}) {
  const isCrypto = type === "crypto";
  const colors = isCrypto
    ? cryptoIcons[currency] || { bg: "bg-zinc-500/10", text: "text-zinc-500" }
    : { bg: "bg-blue-500/10", text: "text-blue-500" };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-full ${colors.bg} border border-transparent hover:border-indigo-500/30 transition-all duration-300`}
    >
      <span className={`font-bold ${colors.text}`}>{currency}</span>
    </motion.div>
  );
}

function LoadingBadge() {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse">
      <div className="w-12 h-4 bg-zinc-300 dark:bg-zinc-700 rounded" />
    </div>
  );
}

function WalletTypeCard({
  type,
  index,
}: {
  type: string;
  index: number;
}) {
  const config: Record<string, { icon: any; title: string; description: string; color: string }> = {
    FIAT: {
      icon: CreditCard,
      title: "Fiat Currency",
      description: "Traditional currencies like USD, EUR, GBP",
      color: "indigo",
    },
    SPOT: {
      icon: Coins,
      title: "Cryptocurrency",
      description: "Major cryptocurrencies like BTC, ETH, USDT",
      color: "cyan",
    },
    ECO: {
      icon: Wallet,
      title: "Ecosystem Tokens",
      description: "Platform-native tokens and assets",
      color: "emerald",
    },
  };

  const { icon: Icon, title, description, color } = config[type] || config.SPOT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`p-5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-${color}-500/20 hover:border-${color}-500/40 transition-all duration-300 hover:shadow-lg`}
    >
      <div
        className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center mb-4`}
      >
        <Icon className={`w-6 h-6 text-${color}-500`} />
      </div>
      <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
    </motion.div>
  );
}

export default function SupportedCurrenciesSection({
  payments,
  isLoading,
}: SupportedCurrenciesSectionProps) {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");

  const totalCurrencies =
    (payments?.fiat?.length || 0) + (payments?.crypto?.length || 0);

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
            className="px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border-indigo-500/20"
          >
            <Globe className="w-4 h-4 text-indigo-500 mr-2" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {t("multi_currency_support") || "Multi-Currency Support"}
            </span>
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            {t("accept") || "Accept"}{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              {totalCurrencies}+ {tCommon("currencies") || "Currencies"}
            </span>
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            {t("support_for_major_cryptocurrencies") ||
              "Support for major cryptocurrencies and fiat currencies worldwide"}
          </p>
        </motion.div>

        {/* Wallet Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {isLoading
            ? [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-700/50 animate-pulse"
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 mb-4" />
                  <div className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                  <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              ))
            : payments?.walletTypes?.map((type, index) => (
                <WalletTypeCard key={type} type={type} index={index} />
              ))}
        </div>

        {/* Cryptocurrencies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-cyan-500" />
            {tExt("cryptocurrencies") || "Cryptocurrencies"}
          </h3>
          <div className="flex flex-wrap gap-3">
            {isLoading
              ? [...Array(6)].map((_, i) => <LoadingBadge key={i} />)
              : payments?.crypto?.map((currency, index) => (
                  <CurrencyBadge
                    key={currency}
                    currency={currency}
                    type="crypto"
                    index={index}
                  />
                ))}
          </div>
        </motion.div>

        {/* Fiat Currencies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            {t("fiat_currencies") || "Fiat Currencies"}
          </h3>
          <div className="flex flex-wrap gap-3">
            {isLoading
              ? [...Array(5)].map((_, i) => <LoadingBadge key={i} />)
              : payments?.fiat?.map((currency, index) => (
                  <CurrencyBadge
                    key={currency}
                    currency={currency}
                    type="fiat"
                    index={index}
                  />
                ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
