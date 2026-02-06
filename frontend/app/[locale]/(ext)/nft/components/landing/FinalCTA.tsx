"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Rocket,
  Palette,
  Globe,
  Shield,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useInView } from "react-intersection-observer";
import { useNftStore } from "@/store/nft/nft-store";
import { useTranslations } from "next-intl";

export default function FinalCTA() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { marketplaceStats, fetchMarketplaceStats, chainStats, fetchChainStats } = useNftStore();

  useEffect(() => {
    if (inView) {
      fetchMarketplaceStats("all");
      fetchChainStats();
    }
  }, [inView, fetchMarketplaceStats, fetchChainStats]);

  // Calculate real statistics
  const totalUsers = marketplaceStats?.overview?.totalOwners || 0;
  const totalNFTs = marketplaceStats?.overview?.totalTokens || 0;
  const totalVolume = marketplaceStats?.volume?.totalVolume || 0;
  const totalChains = (Array.isArray(chainStats) ? chainStats : []).length;

  const benefits = [
    {
      icon: Sparkles,
      title: "Zero Fees",
      description: "No listing fees for the first 30 days",
    },
    {
      icon: Shield,
      title: "Verified NFTs",
      description: "All collections verified and secure",
    },
    {
      icon: TrendingUp,
      title: "Best Prices",
      description: "Competitive pricing across all chains",
    },
    {
      icon: Globe,
      title: "Multi-Chain",
      description: `Trade on ${totalChains > 0 ? totalChains : "multiple"} blockchain${totalChains !== 1 ? 's' : ''}`,
    },
  ];

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Background Effects */}
      <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-600/5 to-pink-600/5`}>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background:
              "radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
          }}
        />
      </div>

      <div className="container relative z-10">
        {/* Main CTA Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className={`relative bg-gradient-to-br from-primary via-purple-600 to-pink-600 rounded-3xl p-1 shadow-2xl`}
        >
          <div className="bg-background rounded-3xl p-8 md:p-12">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge - only show if 100+ users */}
              {totalUsers >= 100 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-full mb-6`}
                >
                  <Rocket className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    Join {(totalUsers / 1000).toFixed(0)}{t("k_creators_collectors")}
                  </span>
                </motion.div>
              )}

              {/* Headline */}
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight"
              >
                <span className={`bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent`}>
                  {t("start_your_nft_journey")}
                </span>
                <br />
                Today
              </motion.h2>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
              >
                {t("create_buy_and_sell_nfts_on")} {t("zero_upfront_costs_instant_transactions_and")}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap justify-center gap-4"
              >
                <Link href="/nft/create">
                  <Button
                    size="lg"
                    className={`gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg text-lg px-8`}
                  >
                    <Palette className="w-5 h-5" />
                    {t("create_your_first_nft")}
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/nft/marketplace">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 shadow-lg text-lg px-8"
                  >
                    <TrendingUp className="w-5 h-5" />
                    {t("explore_marketplace")}
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12"
        >
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="text-center p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10 flex items-center justify-center mx-auto mb-3`}>
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">{benefit.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </motion.div>

        {/* Social Proof - Real Data */}
        {(totalNFTs > 0 || totalVolume > 0 || totalUsers > 0 || totalChains > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-center mt-12"
          >
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
              {totalNFTs > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>
                    {totalNFTs >= 1000000
                      ? `${(totalNFTs / 1000000).toFixed(1)}M+`
                      : totalNFTs >= 1000
                      ? `${(totalNFTs / 1000).toFixed(0)}K+`
                      : totalNFTs}{" "}
                    NFTs Listed
                  </span>
                </div>
              )}
              {totalVolume > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>
                    {totalVolume >= 1000000
                      ? `$${(totalVolume / 1000000).toFixed(0)}M+`
                      : totalVolume >= 1000
                      ? `$${(totalVolume / 1000).toFixed(0)}K+`
                      : `$${totalVolume}`}{" "}
                    {tCommon("trading_volume")}
                  </span>
                </div>
              )}
              {totalUsers > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>
                    {totalUsers >= 1000
                      ? `${(totalUsers / 1000).toFixed(0)}K+`
                      : totalUsers}{" "}
                    {tCommon("active_users")}
                  </span>
                </div>
              )}
              {totalChains > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>{totalChains} Blockchain{totalChains !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
