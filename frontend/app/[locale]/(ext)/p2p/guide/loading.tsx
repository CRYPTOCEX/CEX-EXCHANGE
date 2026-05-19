"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { HeroSection } from "@/components/ui/hero-section";
import { BookOpen, Shield, TrendingUp } from "lucide-react";
import { StatsGroup } from "@/components/ui/stats-group";
import { useTranslations } from "next-intl";

export default function GuideLoading() {
  const t = useTranslations("ext_p2p");
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section - Show actual hero */}
      <HeroSection
        badge={{
          icon: <BookOpen className="h-3.5 w-3.5" />,
          text: "P2P Trading Guide",
          gradient: `from-blue-500/10 to-violet-500/10`,
          iconColor: `text-blue-500`,
          textColor: `text-blue-600 dark:text-blue-400`,
        }}
        title={[
          { text: "P2P Trading Guide" },
        ]}
        description={t("learn_how_to_safely_trade_cryptocurrencies_1")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        background={{
          orbs: [
            {
              color: "#3b82f6",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#8b5cf6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#3b82f6", "#8b5cf6"],
          size: 8,
        }}
      >
        <StatsGroup
          stats={[
            {
              icon: BookOpen,
              label: "Comprehensive Guides",
              value: "",
              iconColor: `text-blue-500`,
              iconBgColor: `bg-blue-500/10`,
            },
            {
              icon: Shield,
              label: "Safety Best Practices",
              value: "",
              iconColor: `text-blue-500`,
              iconBgColor: `bg-blue-500/10`,
            },
            {
              icon: TrendingUp,
              label: "Trading Strategies",
              value: "",
              iconColor: `text-blue-500`,
              iconBgColor: `bg-blue-500/10`,
            },
          ]}
        />
      </HeroSection>

      <main className="container mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Tabs Skeleton */}
          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="h-10 flex-1 rounded-md bg-zinc-200/50 dark:bg-zinc-700/50"
              />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl p-6 dark:bg-zinc-900/50"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className={`h-10 w-10 rounded-xl bg-blue-500/20`} />
                    <Skeleton className="h-6 w-48 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  </div>
                  <Skeleton className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-4 w-5/6 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-4 w-4/6 bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
