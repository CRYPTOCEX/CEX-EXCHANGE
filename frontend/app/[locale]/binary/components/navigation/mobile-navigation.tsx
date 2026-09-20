"use client";

import { Symbol } from "@/store/trade/use-binary-store";
import { LineChart, Wallet, BarChart2, BookOpen, Trophy, Target, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { CountBadge, IndicatorTab } from "../binary-ui";

interface MobileNavigationProps {
  activePanel: "chart" | "order" | "positions";
  setActivePanel: (panel: "chart" | "order" | "positions") => void;
  activePositionsCount: number;
  currentPrice: number;
  symbol: Symbol;
  priceMovement?: {
    direction: "up" | "down" | "neutral";
    percent: number;
    strength: "strong" | "medium" | "weak";
  };
  balance: number;
  tradingMode?: "demo" | "real";
  // New callbacks for footer buttons
  onAnalyticsClick?: () => void;
  onPatternLibraryClick?: () => void;
  onLeaderboardClick?: () => void;
  onChallengesClick?: () => void;
  onSettingsClick?: () => void;
  // Active states
  isAnalyticsOpen?: boolean;
  isPatternLibraryOpen?: boolean;
  isLeaderboardOpen?: boolean;
  isChallengesOpen?: boolean;
  isSettingsOpen?: boolean;
  completedTradesCount?: number;
}

export default function MobileNavigation({
  activePanel,
  setActivePanel,
  activePositionsCount,
  tradingMode = "demo",
  onAnalyticsClick,
  onPatternLibraryClick,
  onLeaderboardClick,
  onChallengesClick,
  onSettingsClick,
  isAnalyticsOpen = false,
  isPatternLibraryOpen = false,
  isLeaderboardOpen = false,
  isChallengesOpen = false,
  isSettingsOpen = false,
  completedTradesCount = 0,
}: MobileNavigationProps) {
  const t = useTranslations("common");

  // An overlay covers the panel tabs, so chart/trade only read as active when
  // nothing is layered over them.
  const anyOverlayOpen =
    isAnalyticsOpen ||
    isPatternLibraryOpen ||
    isLeaderboardOpen ||
    isChallengesOpen ||
    isSettingsOpen;

  /**
   * Every tab used to own a different accent for its indicator rule — blue
   * chart, green trade, purple patterns, amber leaders. That was decoration,
   * not meaning: "this tab is selected" is one state, so it is one token.
   */
  const tabs: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    active: boolean;
    onClick?: () => void;
    badge?: number;
  }> = [
    {
      key: "chart",
      icon: LineChart,
      label: t("chart"),
      active: activePanel === "chart" && !anyOverlayOpen,
      onClick: () => setActivePanel("chart"),
    },
    {
      key: "order",
      icon: Wallet,
      label: t("trade"),
      active: activePanel === "order" && !anyOverlayOpen,
      onClick: () => setActivePanel("order"),
      badge: activePositionsCount,
    },
    {
      key: "analytics",
      icon: BarChart2,
      label: t("analytics"),
      active: isAnalyticsOpen,
      onClick: onAnalyticsClick,
      badge: completedTradesCount,
    },
    {
      key: "patterns",
      icon: BookOpen,
      label: t("patterns"),
      active: isPatternLibraryOpen,
      onClick: onPatternLibraryClick,
    },
    {
      key: "leaders",
      icon: Trophy,
      label: t("leaders"),
      active: isLeaderboardOpen,
      onClick: onLeaderboardClick,
    },
    ...(tradingMode === "demo"
      ? [
          {
            key: "challenges",
            icon: Target,
            label: t("challenge"),
            active: isChallengesOpen,
            onClick: onChallengesClick,
          },
        ]
      : []),
    {
      key: "settings",
      icon: Settings,
      label: t("settings"),
      active: isSettingsOpen,
      onClick: onSettingsClick,
    },
  ];

  return (
    <div className="w-full shrink-0">
      {/* Flat navigation bar - matching desktop design language */}
      <div className="border-t border-border bg-background">
        {/* Navigation buttons container */}
        <div className="flex h-12">
          {tabs.map(({ key, icon: Icon, label, active, onClick, badge }) => (
            <IndicatorTab
              key={key}
              active={active}
              onClick={onClick}
              className="flex-col gap-0.5"
            >
              {badge ? (
                <CountBadge
                  count={badge}
                  className="absolute top-1 right-1 rounded-none"
                />
              ) : null}
              <Icon size={16} />
              <span className="text-[9px] font-medium">{label}</span>
            </IndicatorTab>
          ))}
        </div>

        {/* Safe area padding for devices with home indicator */}
        <div className="h-safe-area-bottom" />
      </div>
    </div>
  );
}
