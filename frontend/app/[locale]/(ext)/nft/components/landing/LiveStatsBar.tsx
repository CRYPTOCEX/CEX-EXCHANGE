"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import CountUp from "react-countup";
import { useNftStore } from "@/store/nft/nft-store";

interface Stat {
  label: string;
  value: number;
  change?: number;
  prefix?: string;
  suffix?: string;
  format?: "number" | "currency" | "compact";
}

export default function LiveStatsBar() {
  const [mounted, setMounted] = useState(false);
  const { marketplaceStats, fetchMarketplaceStats } = useNftStore();

  useEffect(() => {
    setMounted(true);
    fetchMarketplaceStats("24h");
  }, [fetchMarketplaceStats]);

  const liveStats: Stat[] = [
    {
      label: "24h Volume",
      value: marketplaceStats?.volume?.totalVolume || 0,
      prefix: "",
      suffix: " BNB",
      format: "currency",
    },
    {
      label: "Total NFTs",
      value: marketplaceStats?.overview?.totalTokens || 0,
      format: "compact",
    },
    {
      label: "Active Listings",
      value: marketplaceStats?.overview?.totalListings || 0,
      format: "compact",
    },
    {
      label: "24h Sales",
      value: marketplaceStats?.volume?.totalSales || 0,
      format: "compact",
    },
    {
      label: "Total Owners",
      value: marketplaceStats?.overview?.totalOwners || 0,
      format: "compact",
    },
  ];

  const formatValue = (stat: Stat): string | number => {
    if (stat.format === "compact") {
      if (stat.value >= 1000000) {
        return `${(stat.value / 1000000).toFixed(0)}M`;
      } else if (stat.value >= 1000) {
        return `${(stat.value / 1000).toFixed(0)}K`;
      }
    } else if (stat.format === "currency") {
      if (stat.value >= 1000000) {
        return `${(stat.value / 1000000).toFixed(2)}M`;
      } else if (stat.value >= 1000) {
        return `${(stat.value / 1000).toFixed(2)}K`;
      }
    }
    return stat.value;
  };

  if (!mounted) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm"
    >
      <div className="container">
        {/* Desktop Stats - Horizontal Scroll */}
        <div className="hidden md:flex items-center justify-between py-3 gap-8">
          {liveStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="flex items-center gap-3 min-w-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold whitespace-nowrap">
                    {stat.prefix}
                    <CountUp
                      end={
                        stat.format === "compact" || stat.format === "currency"
                          ? parseFloat(formatValue(stat).toString().replace(/[MK]/g, ""))
                          : stat.value
                      }
                      duration={2}
                      decimals={stat.format === "number" ? 2 : stat.format === "currency" ? 2 : 0}
                      separator=","
                    />
                    {stat.format === "compact" && stat.value >= 1000000 && "M"}
                    {stat.format === "compact" && stat.value < 1000000 && stat.value >= 1000 && "K"}
                    {stat.format === "currency" && stat.value >= 1000000 && "M"}
                    {stat.format === "currency" && stat.value < 1000000 && stat.value >= 1000 && "K"}
                    {stat.suffix}
                  </span>
                  {stat.change !== undefined && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        stat.change > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {stat.change > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(stat.change)}%
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {stat.label}
                </div>
              </div>
              {index < liveStats.length - 1 && (
                <div className="h-8 w-px bg-border" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Mobile Stats - Scrollable */}
        <div className="md:hidden overflow-x-auto py-3 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-6 min-w-max">
            {liveStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex flex-col min-w-[120px]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base font-bold whitespace-nowrap">
                    {stat.prefix}
                    <CountUp
                      end={
                        stat.format === "compact" || stat.format === "currency"
                          ? parseFloat(formatValue(stat).toString().replace(/[MK]/g, ""))
                          : stat.value
                      }
                      duration={2}
                      decimals={stat.format === "number" ? 2 : stat.format === "currency" ? 2 : 0}
                      separator=","
                    />
                    {stat.format === "compact" && stat.value >= 1000000 && "M"}
                    {stat.format === "compact" && stat.value < 1000000 && stat.value >= 1000 && "K"}
                    {stat.format === "currency" && stat.value >= 1000000 && "M"}
                    {stat.format === "currency" && stat.value < 1000000 && stat.value >= 1000 && "K"}
                    {stat.suffix}
                  </span>
                  {stat.change !== undefined && (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] font-medium ${
                        stat.change > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {stat.change > 0 ? (
                        <TrendingUp className="w-2.5 h-2.5" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5" />
                      )}
                      {Math.abs(stat.change)}%
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Animated pulse indicator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50">
        <motion.div
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
        />
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.div>
  );
}
