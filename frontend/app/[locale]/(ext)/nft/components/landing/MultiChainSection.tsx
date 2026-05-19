"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
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

interface Chain {
  id: string;
  name: string;
  symbol: string;
  logo?: string;
  color: string;
  volume24h: number;
  nftCount: number;
  status: "active" | "coming-soon";
}

// Chain display configuration - using purple/pink theme colors for some chains
const chainConfig: Record<string, { name: string; symbol: string; color: string }> = {
  ETH: { name: "Ethereum", symbol: "ETH", color: "from-blue-500 to-purple-500" },
  BSC: { name: "BNB Chain", symbol: "BNB", color: "from-amber-400 to-yellow-500" },
  POLYGON: { name: "Polygon", symbol: "MATIC", color: "from-purple-500 to-pink-500" },
  ARBITRUM: { name: "Arbitrum", symbol: "ARB", color: "from-blue-400 to-cyan-400" },
  OPTIMISM: { name: "Optimism", symbol: "OP", color: "from-red-500 to-pink-500" },
  BASE: { name: "Base", symbol: "BASE", color: "from-blue-600 to-indigo-600" },
  AVALANCHE: { name: "Avalanche", symbol: "AVAX", color: "from-red-600 to-red-400" },
  SOLANA: { name: "Solana", symbol: "SOL", color: "from-purple-600 to-green-400" },
};

export default function MultiChainSection() {
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
      color: "from-gray-500 to-gray-700"
    };

    return {
      id: stat.chain.toLowerCase(),
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

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
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
        <motion.div
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
        <motion.div
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
          className="absolute bottom-20 right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"
        />
      </div>

      <div className="container relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-4 border border-primary/30"
          >
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Multi-Chain Support
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold mb-4"
          >
            Trade NFTs Across Multiple Blockchains
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Access NFTs from the most popular blockchains, all in one place.
            No need to switch platforms.
          </motion.p>
        </div>

        {/* Chains Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {chains.map((chain, index) => (
            <motion.div
              key={chain.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -8 }}
              className={cn(
                "group relative bg-card border border-border rounded-2xl p-6 overflow-hidden transition-all cursor-pointer",
                chain.status === "active"
                  ? "hover:border-primary/50 hover:shadow-xl"
                  : "opacity-60"
              )}
            >
              {/* Background Gradient */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl",
                  chain.color
                )}
              />

              {/* Content */}
              <div className="relative z-10">
                {/* Chain Icon/Logo */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                    chain.color
                  )}
                >
                  <span className="text-white font-bold text-lg">
                    {chain.symbol.slice(0, 2)}
                  </span>
                </div>

                {/* Chain Name */}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-bold text-lg">{chain.name}</h3>
                  {chain.status === "active" && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>

                {/* Stats */}
                {chain.status === "active" ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">24h Volume</span>
                      <span className="font-semibold">
                        {formatVolume(chain.volume24h)}
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
                    Coming Soon
                  </Badge>
                )}
              </div>

              {/* Hover Effect Arrow */}
              {chain.status === "active" && (
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: Zap,
              title: "Instant Cross-Chain",
              description: "Trade NFTs seamlessly across different blockchains",
            },
            {
              icon: TrendingUp,
              title: "Best Prices",
              description: "Compare prices across all chains to get the best deals",
            },
            {
              icon: Globe,
              title: "One Platform",
              description: "No need to switch between multiple marketplaces",
            },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-all"
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
        </motion.div>
      </div>
    </section>
  );
}
