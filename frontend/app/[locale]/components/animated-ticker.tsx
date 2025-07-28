"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface Asset {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
}
interface AnimatedTickerProps {
  assets: Asset[];
}
export function AnimatedTicker({ assets }: AnimatedTickerProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Duplicate the assets to create a seamless loop
  const tickerAssets = [...assets, ...assets];
  return (
    <div className="overflow-hidden">
      <motion.div
        animate={{
          x: ["0%", "-50%"],
        }}
        transition={{
          duration: 30,
          ease: "linear",
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "loop",
        }}
        className="flex whitespace-nowrap"
      >
        {tickerAssets.map((asset, index) => {
          return (
            <div
              key={`${asset.symbol}-${index}`}
              className={cn(
                "inline-flex items-center mx-6",
                isDark ? "text-gray-300" : "text-gray-700"
              )}
            >
              <div className="font-medium">{asset.symbol}</div>
              <div className="mx-2 font-mono">
                {asset.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div
                className={cn(
                  "flex items-center",
                  asset.change24h >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                <span>
                  {asset.change24h >= 0 ? "+" : ""}
                  {asset.change24h}%
                </span>
                <ArrowUpRight
                  className={`h-3 w-3 ml-0.5 ${asset.change24h < 0 ? "rotate-180" : ""}`}
                />
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
