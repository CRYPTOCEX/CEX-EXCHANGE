"use client";

import { useEffect } from "react";
import { m } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useInView } from "react-intersection-observer";
import { cn } from "@/lib/utils";
import { useNftStore } from "@/store/nft/nft-store";
import { ChainIcon, chainNativeCurrency } from "@/app/[locale]/(ext)/nft/components/shared/chain-icon";
import { useTranslations } from "next-intl";

interface Chain {
  id: string;
  /** Raw chain identifier from the API — resolves the logo. */
  chain: string;
  name: string;
  symbol: string;
  color: string;
  volume24h: number;
  nftCount: number;
  status: "active" | "coming-soon";
}

// Chain display configuration.
//
// Each chain used to carry an approximation of its own brand hue, which is how
// one section ended up painting warning, destructive and success next to the
// accent — none of them meaning what those tokens mean. The chain is already
// named and given its ticker; the tile does not also need to be a different
// colour to identify it.
const chainConfig: Record<string, { name: string; symbol: string; color: string }> = {
  ETH: { name: "Ethereum", symbol: "ETH", color: "bg-primary" },
  BSC: { name: "BNB Chain", symbol: "BNB", color: "bg-primary" },
  POLYGON: { name: "Polygon", symbol: "MATIC", color: "bg-primary" },
  ARBITRUM: { name: "Arbitrum", symbol: "ARB", color: "bg-primary" },
  OPTIMISM: { name: "Optimism", symbol: "OP", color: "bg-primary" },
  BASE: { name: "Base", symbol: "BASE", color: "bg-primary" },
  AVALANCHE: { name: "Avalanche", symbol: "AVAX", color: "bg-primary" },
  SOLANA: { name: "Solana", symbol: "SOL", color: "bg-primary" },
};

export default function MultiChainSection() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const { chainStats, fetchChainStats } = useNftStore();

  // Fetch chain stats on mount
  useEffect(() => {
    fetchChainStats();
  }, [fetchChainStats]);

  // Map backend chain stats to display format
  const chains: Chain[] = (Array.isArray(chainStats) ? chainStats : []).map((stat: any) => {
    const config = chainConfig[stat.chain] || {
      name: stat.chain,
      symbol: stat.chain,
      color: "bg-muted"
    };

    return {
      id: stat.chain.toLowerCase(),
      chain: stat.chain,
      name: config.name,
      symbol: config.symbol,
      color: config.color,
      volume24h: parseFloat(stat.volume24h || 0),
      nftCount: parseInt(stat.nftCount || 0),
      status: "active" as const,
    };
  });

  // Only show section if we have more than 1 chain
  if (chains.length <= 1) {
    return null;
  }

  /*
    A PER-CHAIN VOLUME IS DENOMINATED IN THAT CHAIN'S OWN COIN, NOT DOLLARS.

    `nft/chains/stats/index.get.ts:65-72` computes `SUM(s.price)` GROUPED BY
    chain, so each row is a quantity of BNB, or MATIC, or ETH — never USD. The
    `$` was simply the wrong unit, and unlike the cross-currency sums elsewhere
    on this page there IS a right one, so it is used.

    The `/1000` floor is gone too: with no branch below a thousand, a genuine
    400 BNB of daily volume rendered "$0K" — a live chain advertised as dead.
  */
  const formatVolume = (volume: number, currency: string) => {
    const value = Number(volume);
    if (!Number.isFinite(value)) return "—";
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${currency}`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K ${currency}`;
    return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    return `${(count / 1000).toFixed(0)}K`;
  };

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <m.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        />
        <m.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        />
      </div>

      <div className="container relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-4 border border-primary/30"
          >
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {tExt("multi_chain_support")}
            </span>
          </m.div>

          <m.h2
            initial={{ opacity: 0, y: -20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            {t("trade_nfts_across_multiple_blockchains")}
          </m.h2>

          <m.p
            initial={{ opacity: 0, y: -20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            {t("access_nfts_from_the_most_popular")}
          </m.p>
        </div>

        {/* Chains Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {chains.map((chain, index) => (
            <m.div
              key={chain.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -8 }}
              className={cn(
                "group relative bg-card border border-border rounded-lg p-6 overflow-hidden transition-all cursor-pointer",
                chain.status === "active"
                  ? "hover:border-primary/50 hover:shadow-xl"
                  : "opacity-60"
              )}
            >
              {/* Background Gradient */}
              <div
                className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl",
                  chain.color
                )}
              />

              {/* Content */}
              <div className="relative z-10">
                {/* Chain Icon/Logo */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-muted shadow-lg">
                  <ChainIcon chain={chain.chain} size={32} />
                </div>

                {/* Chain Name */}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-lg">{chain.name}</h3>
                  <span className="text-xs font-medium text-muted-foreground">
                    {chain.symbol}
                  </span>
                  {chain.status === "active" && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>

                {/* Stats */}
                {chain.status === "active" ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{`24h ${tCommon('volume')}`}</span>
                      <span className="font-semibold">
                        {formatVolume(chain.volume24h, chainNativeCurrency(chain.chain))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">NFTs</span>
                      <span className="font-semibold">
                        {formatCount(chain.nftCount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <Badge variant="secondary" className="w-full justify-center">
                    {tCommon("coming_soon")}
                  </Badge>
                )}
              </div>

              {/* Hover Effect Arrow */}
              {chain.status === "active" && (
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              )}
            </m.div>
          ))}
        </div>

        {/* Features Grid */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: Zap,
              // "Instant Cross-Chain" until the honesty sweep. There is no
              // bridge and no cross-chain settlement anywhere on the platform:
              // the NFT transfer route carries no destination chain, and
              // `nft/chains` is multi-chain DEPLOYMENT. The marketplace lists
              // collections on several chains; it does not move a token between
              // them.
              title: tCommon("multi_chain"),
              description: t("trade_nfts_seamlessly_across_different_blockchains"),
            },
            {
              icon: TrendingUp,
              title: t("best_prices"),
              description: t("compare_prices_across_all_chains_to"),
            },
            {
              icon: Globe,
              title: t("one_platform"),
              description: t("no_need_to_switch_between_multiple_marketplaces"),
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-card border border-border rounded-lg p-6 text-center hover:border-primary/50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </m.div>
      </div>
    </section>
  );
}
