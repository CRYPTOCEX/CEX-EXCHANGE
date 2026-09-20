"use client";

import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import CountUp from "react-countup";
import { Loadable } from "@/components/ui/skeleton";
import { useNftStore } from "@/store/nft/nft-store";
import { useTranslations } from "next-intl";

interface Stat {
  label: string;
  value: number;
  change?: number;
  prefix?: string;
  suffix?: string;
  format?: "number" | "currency" | "compact";
}

export default function LiveStatsBar() {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const [mounted, setMounted] = useState(false);
  const { marketplaceStats, fetchMarketplaceStats } = useNftStore();

  useEffect(() => {
    setMounted(true);
    fetchMarketplaceStats("24h");
  }, [fetchMarketplaceStats]);

  const liveStats: Stat[] = [
    {
      label: `24h ${tCommon('volume')}`,
      value: marketplaceStats?.volume?.totalVolume || 0,
      prefix: "",
      // No ticker. `/api/nft/stats` returns SUM(price) over every completed
      // sale WITHOUT grouping by currency, so this figure mixes chains — it
      // was labelled "BNB", which is a unit the number does not have. Give it
      // a real ticker only once the endpoint aggregates per currency.
      suffix: "",
      format: "currency",
    },
    {
      label: tExt("total_nfts"),
      value: marketplaceStats?.overview?.totalTokens || 0,
      format: "compact",
    },
    {
      label: tExt("active_listings"),
      value: marketplaceStats?.overview?.totalListings || 0,
      format: "compact",
    },
    {
      label: `24h ${tCommon('sales')}`,
      value: marketplaceStats?.volume?.totalSales || 0,
      format: "compact",
    },
    {
      label: t("total_owners"),
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

  /**
   * THE BAR IS 68px OF PAGE, AND IT USED TO ARRIVE LATE.
   * ==========================================================================
   *
   * `if (!mounted) return null` meant the strip did not exist for the first
   * client render, then appeared: `py-3` twice (24px) plus a `text-lg` figure
   * (28px) over a `text-xs` label (16px), 68px in all. The harness measured
   * `/en/nft` at **+68px page height** with 55 elements moved, every one of
   * them in the footer and every one of them by exactly that 68 — the whole
   * page below the hero stepping down as the bar materialised.
   *
   * The mount gate was never about layout. It exists because `CountUp` runs a
   * requestAnimationFrame tween, and the chrome around it — the container, the
   * dividers, the labels — has nothing to do with that. So the bar renders in
   * both states and only the FIGURE waits.
   *
   * `!mounted || !marketplaceStats` rather than `!mounted` alone: the store is
   * null until `fetchMarketplaceStats` resolves, so a bar that only waited for
   * mount would count up to a confident `0` for every one of the five metrics
   * and then jump to the real numbers. The two conditions are the same pending
   * window seen from either end.
   */
  const isPending = !mounted || !marketplaceStats;

  /**
   * The figure, in both states — as a VALUE-LEVEL swap, not a tree-level one.
   *
   * The first spelling of this was `if (isPending) return <SkeletonText/>` above
   * a second return, and the debt scanner flagged it as `full-swap-return` and
   * was right to: an early return on load state is the exact shape it exists to
   * catch, and it cannot tell a whole-page bail-out from a five-word helper.
   * `Loadable` is the house primitive for this and reads as what it is — one
   * expression, one return, the value swapped inside it.
   *
   * `SkeletonText` is measured by the text it replaces — it renders "0,000" for
   * real at `text-lg font-bold`, hidden, and paints over that box — so the line
   * box is produced by the same layout that will run on the real figure. A
   * hardcoded `h-5 w-16` beside a `text-lg` figure would be a guess.
   */
  const renderFigure = (stat: Stat) => (
    <Loadable loading={isPending} placeholder="0,000">
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
    </Loadable>
  );

  return (
    <m.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm"
    >
      <div className="container">
        {/* Desktop Stats - Horizontal Scroll */}
        <div className="hidden md:flex items-center justify-between py-3 gap-8">
          {liveStats.map((stat, index) => (
            <m.div
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
                    {renderFigure(stat)}
                  </span>
                  {stat.change !== undefined && (
                    <span
                      className={`flex items-center gap-0.5 text-xs font-medium ${
                        stat.change > 0 ? "text-up" : "text-down"
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
            </m.div>
          ))}
        </div>

        {/* Mobile Stats - Scrollable */}
        <div className="md:hidden overflow-x-auto py-3 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-6 min-w-max">
            {liveStats.map((stat, index) => (
              <m.div
                key={stat.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex flex-col min-w-[120px]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base font-bold whitespace-nowrap">
                    {stat.prefix}
                    {renderFigure(stat)}
                  </span>
                  {stat.change !== undefined && (
                    <span
                      className={`flex items-center gap-0.5 text-[10px] font-medium ${
                        stat.change > 0 ? "text-up" : "text-down"
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
              </m.div>
            ))}
          </div>
        </div>
      </div>

      {/* Animated pulse indicator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary to-transparent opacity-50">
        <m.div
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          className="h-full w-1/3 bg-linear-to-r from-transparent via-primary to-transparent"
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
    </m.div>
  );
}
