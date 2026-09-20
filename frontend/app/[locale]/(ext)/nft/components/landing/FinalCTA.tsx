"use client";

import { useEffect } from "react";
import { m } from "framer-motion";
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
import { Loadable } from "@/components/ui/skeleton";
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

  /**
   * THE SOCIAL-PROOF ROW WAS THE WHOLE OF `/en/nft`'s LAYOUT SHIFT.
   * ==========================================================================
   *
   * `marketplaceStats` is null until the fetch resolves, so all four figures
   * derived from it were 0 and the row's own gate — `totalNFTs > 0 ||
   * totalVolume > 0 || …` — was false. It did not exist, and then it did:
   * `mt-12` (48px) plus one 20px line of 14px type = **68px**, appearing at the
   * very bottom of the page.
   *
   * The harness measured `/en/nft` at exactly **+68px** page height with 55
   * elements moved, every one of them in the footer and every one by exactly
   * that 68. This is the shape SKELETONS.md calls the subtlest: there is no
   * skeleton to get wrong, the movement comes entirely from what the pending
   * state OMITS.
   *
   * The row is reserved during the fetch and its four figures wait as
   * `SkeletonText`. `isPending` is `!marketplaceStats` and not a separate flag
   * because the store has no loading boolean — null IS the pending state here.
   */
  const isPending = !marketplaceStats;
  const hasSocialProof =
    totalNFTs > 0 || totalVolume > 0 || totalUsers > 0 || totalChains > 0;
  /* Named, because the scanner cannot tell a reserved row from a withheld one
     and this is where that gets said: reserved while the answer is unknown,
     suppressed once the answer is genuinely "no marketplace activity" — a row
     of confident zeroes under a "start your NFT journey" CTA is worse than no
     row. */
  const showSocialProof = isPending || hasSocialProof;

  const benefits = [
    {
      icon: Sparkles,
      title: t("zero_fees"),
      description: t("no_listing_fees_for_the_first_30_days"),
    },
    {
      icon: Shield,
      title: t("verified_nfts"),
      description: t("all_collections_verified_and_secure"),
    },
    {
      icon: TrendingUp,
      title: t("best_prices"),
      description: t("competitive_pricing_across_all_chains"),
    },
    {
      icon: Globe,
      title: tCommon("multi_chain"),
      description: `Trade on ${totalChains > 0 ? totalChains : "multiple"} blockchain${totalChains !== 1 ? 's' : ''}`,
    },
  ];

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Background Effects */}
      <div className={`absolute inset-0 bg-primary/5`}>
        <m.div
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
              "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.1) 0%, transparent 50%)",
          }}
        />
      </div>

      <div className="container relative z-10">
        {/* Main CTA Box */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className={`relative bg-primary rounded-3xl p-1 shadow-2xl`}
        >
          <div className="bg-background rounded-3xl p-8 md:p-12">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge - only show if 100+ users */}
              {totalUsers >= 100 && (
                <m.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-6`}
                >
                  <Rocket className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    Join {(totalUsers / 1000).toFixed(0)}{t("k_creators_collectors")}
                  </span>
                </m.div>
              )}

              {/* Headline */}
              <m.h2
                initial={{ opacity: 0, y: -20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight"
              >
                <span className={`text-primary-ink`}>
                  {t("start_your_nft_journey")}
                </span>
                <br />
                Today
              </m.h2>

              {/* Description */}
              <m.p
                initial={{ opacity: 0, y: -20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
              >
                {t("create_buy_and_sell_nfts_on")} {t("zero_upfront_costs_instant_transactions_and")}
              </m.p>

              {/* CTA Buttons */}
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-wrap justify-center gap-4"
              >
                <Link href="/nft/create">
                  <Button
                    size="lg"
                    className={`gap-2 bg-primary hover:opacity-90 shadow-lg text-lg`}
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
                    className="gap-2 shadow-lg text-lg"
                  >
                    <TrendingUp className="w-5 h-5" />
                    {t("explore_marketplace")}
                  </Button>
                </Link>
              </m.div>
            </div>
          </div>
        </m.div>

        {/* Benefits Grid */}
        <m.div
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
                className="text-center p-6 rounded-lg bg-card border border-border hover:border-primary/50 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3`}>
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-1">{benefit.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </m.div>

        {/* Social Proof - Real Data.

            One flex line either way. The four items are individually gated on
            their own figure being non-zero in the RESOLVED state — an install
            with no sales should not claim "$0 trading volume" — and all four
            are reserved during the fetch, because the row is one wrapped line
            of 14px type whose height does not depend on how many chips sit on
            it. The tick icon and the label after each figure are literals. */}
        {showSocialProof && (
          <m.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-center mt-12"
          >
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
              {(isPending || totalNFTs > 0) && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>
                    <Loadable loading={isPending} placeholder="000K+">
                      {isPending
                        ? null
                        : totalNFTs >= 1000000
                          ? `${(totalNFTs / 1000000).toFixed(1)}M+`
                          : totalNFTs >= 1000
                            ? `${(totalNFTs / 1000).toFixed(0)}K+`
                            : totalNFTs}
                    </Loadable>{" "}
                    {t("nfts_listed")}
                  </span>
                </div>
              )}
              {(isPending || totalVolume > 0) && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>
                    {/*
                      NO `$`. This reads `marketplaceStats.volume.totalVolume`,
                      which `/api/nft/stats` computes as SUM(price) over every
                      completed sale WITHOUT grouping by currency — so it mixes
                      chains. The sibling `LiveStatsBar.tsx:37-41` deliberately
                      leaves the same field UNLABELLED and says why: *"it was
                      labelled 'BNB', which is a unit the number does not
                      have."* This component stapled a dollar sign to it instead.
                    */}
                    <Loadable loading={isPending} placeholder="000K+">
                      {isPending
                        ? null
                        : totalVolume >= 1000000
                          ? `${(totalVolume / 1000000).toFixed(0)}M+`
                          : totalVolume >= 1000
                            ? `${(totalVolume / 1000).toFixed(0)}K+`
                            : `${totalVolume}`}
                    </Loadable>{" "}
                    {tCommon("trading_volume")}
                  </span>
                </div>
              )}
              {(isPending || totalUsers > 0) && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>
                    <Loadable loading={isPending} placeholder="000K+">
                      {isPending
                        ? null
                        : totalUsers >= 1000
                          ? `${(totalUsers / 1000).toFixed(0)}K+`
                          : totalUsers}
                    </Loadable>{" "}
                    {tCommon("active_users")}
                  </span>
                </div>
              )}
              {(isPending || totalChains > 0) && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>
                    <Loadable loading={isPending} placeholder="0">
                      {isPending ? null : totalChains}
                    </Loadable>{" "}
                    Blockchain{!isPending && totalChains !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </m.div>
        )}
      </div>
    </section>
  );
}
