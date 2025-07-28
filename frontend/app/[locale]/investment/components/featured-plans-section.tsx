"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import {
  TrendingUp,
  Clock,
  DollarSign,
  ArrowRight,
  Star,
  Target,
  Zap,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface FeaturedPlansSectionProps {
  trendingPlans: investmentPlanAttributes[];
}
export function FeaturedPlansSection({
  trendingPlans,
}: FeaturedPlansSectionProps) {
  const t = useTranslations("investment/components/featured-plans-section");
  // Show up to 3 trending plans, or create mock data if none available
  const displayPlans =
    trendingPlans.length > 0
      ? trendingPlans.slice(0, 3)
      : [
          {
            id: "1",
            title: "Growth Portfolio",
            description:
              "Balanced investment strategy focusing on long-term capital appreciation with moderate risk.",
            image: "/img/investment/growth-portfolio.jpg",
            minAmount: 1000,
            maxAmount: 50000,
            profitPercentage: 15.5,
            currency: "USD",
            walletType: "FIAT",
            trending: true,
          },
          {
            id: "2",
            title: "Conservative Income",
            description:
              "Low-risk investment plan designed for steady income generation and capital preservation.",
            image: "/img/investment/conservative-income.jpg",
            minAmount: 500,
            maxAmount: 25000,
            profitPercentage: 8.2,
            currency: "USD",
            walletType: "FIAT",
            trending: true,
          },
          {
            id: "3",
            title: "Aggressive Growth",
            description:
              "High-potential investment strategy for experienced investors seeking maximum returns.",
            image: "/img/investment/aggressive-growth.jpg",
            minAmount: 2000,
            maxAmount: 100000,
            profitPercentage: 22.8,
            currency: "USD",
            walletType: "FIAT",
            trending: true,
          },
        ];
  const formatCurrency = (amount: number, currency: string) => {
    // List of valid ISO 4217 currency codes that Intl.NumberFormat supports
    const validCurrencyCodes = [
      "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "SEK", "NZD",
      "MXN", "SGD", "HKD", "NOK", "TRY", "ZAR", "BRL", "INR", "KRW", "RUB"
    ];

    // Check if the currency is a valid ISO currency code
    const isValidCurrency = validCurrencyCodes.includes(currency?.toUpperCase());

    if (isValidCurrency) {
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: currency || "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch (error) {
        // Fallback if there's still an error
        return `${currency || "USD"} ${amount.toFixed(0)}`;
      }
    } else {
      // For cryptocurrencies and other non-ISO currencies, format manually
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8, // Cryptocurrencies often have more decimal places
      }).format(amount);
      
      return `${formattedValue} ${currency || "USD"}`;
    }
  };
  const getPlanIcon = (index: number) => {
    const icons = [Target, Shield, Zap];
    return icons[index % icons.length];
  };
  const getPlanGradient = (index: number) => {
    const gradients = [
      "from-blue-500 to-cyan-500",
      "from-green-500 to-emerald-500",
      "from-purple-500 to-pink-500",
    ];
    return gradients[index % gradients.length];
  };
  const getPlanBgGradient = (index: number) => {
    const gradients = [
      "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
      "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
      "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
    ];
    return gradients[index % gradients.length];
  };
  return (
    <section className="py-24 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{
              opacity: 0,
              y: 30,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.8,
            }}
            viewport={{
              once: true,
            }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.8,
              }}
              whileInView={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: 0.6,
              }}
              viewport={{
                once: true,
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-950/50 dark:to-red-950/50 border border-orange-200 dark:border-orange-800 rounded-full px-4 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 mb-6"
            >
              <Star className="w-4 h-4" />
              {t("trending_investment_plans")}
            </motion.div>

            <h2 className="text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
              {t("start_your")}{" "}
              <span className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
                {t("investment_journey")}
              </span>
            </h2>

            <p className="text-xl text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto leading-relaxed">
              {t("choose_from_our_risk_effectively")}
            </p>
          </motion.div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {displayPlans.map((plan, index) => {
              const IconComponent = getPlanIcon(index);
              const gradient = getPlanGradient(index);
              const bgGradient = getPlanBgGradient(index);
              return (
                <motion.div
                  key={plan.id}
                  initial={{
                    opacity: 0,
                    y: 30,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.2,
                  }}
                  viewport={{
                    once: true,
                  }}
                  whileHover={{
                    y: -10,
                  }}
                  className="group relative"
                >
                  <div
                    className={`relative bg-gradient-to-br ${bgGradient} rounded-3xl p-8 border border-white/20 dark:border-zinc-700/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden`}
                  >
                    {/* Background decoration */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent dark:from-zinc-800/30 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Trending badge */}
                    {plan.trending && (
                      <div className="absolute top-6 right-6">
                        <Badge
                          className={`bg-gradient-to-r ${gradient} text-white border-0 shadow-lg`}
                        >
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {t("Trending")}
                        </Badge>
                      </div>
                    )}

                    <div className="relative z-10">
                      {/* Plan Icon */}
                      <div
                        className={`w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                      >
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>

                      {/* Plan Title */}
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                        {plan.title}
                      </h3>

                      {/* Plan Description */}
                      <p className="text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed">
                        {plan.description}
                      </p>

                      {/* Plan Stats */}
                      <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {t("expected_return")}
                          </span>
                          <span
                            className={`text-lg font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
                          >
                            {plan.profitPercentage}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {t("minimum_investment")}
                          </span>
                          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(plan.minAmount, plan.currency)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {t("maximum_investment")}
                          </span>
                          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(plan.maxAmount, plan.currency)}
                          </span>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Link href={`/investment/plan/${plan.id}`}>
                        <Button
                          className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-300 group/btn`}
                          size="lg"
                        >
                          {t("invest_now")}
                          <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>

                    {/* Hover effect decoration */}
                    <div
                      className={`absolute -inset-0.5 bg-gradient-to-br ${gradient} rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 -z-10`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* View All Plans CTA */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
            viewport={{
              once: true,
            }}
            className="text-center"
          >
            <Link href="/investment/plan">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-300 group"
              >
                {t("view_all_investment_plans")}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
