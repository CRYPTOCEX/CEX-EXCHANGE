"use client";

/**
 * Leaderboard Component
 *
 * Displays top traders ranking for binary options trading.
 * Supports different time periods and ranking metrics.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trophy,
  Medal,
  TrendingUp,
  Percent,
  Activity,
  ChevronUp,
  ChevronDown,
  Crown,
  User,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useUserStore } from "@/store/user";

// ============================================================================
// TYPES
// ============================================================================

interface LeaderboardTrader {
  rank: number;
  username: string;
  avatar: string | null;
  totalProfit: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
}

interface LeaderboardData {
  period: string;
  metric: string;
  updatedAt: string;
  traders: LeaderboardTrader[];
}

interface UserPosition {
  rank: number | null;
  totalTraders: number;
  percentile: number | null;
  qualified: boolean;
  minTradesRequired: number;
  stats: {
    totalProfit: number;
    winRate: number;
    totalTrades: number;
    wins: number;
    losses: number;
    avgProfit: number;
  };
}

export interface LeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true, disables enter/exit animations for instant overlay switching on mobile */
  isMobile?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PERIODS = [
  { value: "daily", label: "Today" },
  { value: "weekly", label: "This Week" },
  { value: "monthly", label: "This Month" },
  { value: "alltime", label: "All Time" },
];

const METRICS = [
  { value: "profit", label: "Profit", icon: TrendingUp },
  { value: "winRate", label: "Win Rate", icon: Percent },
  { value: "volume", label: "Volume", icon: Activity },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function RankBadge({ rank, isDark }: { rank: number; isDark: boolean }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
        <Crown className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg">
        <Medal className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg">
        <Medal className="w-4 h-4 text-white" />
      </div>
    );
  }
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isDark ? "bg-zinc-800" : "bg-gray-200"
      }`}
    >
      <span
        className={`text-sm font-bold ${
          isDark ? "text-zinc-400" : "text-gray-600"
        }`}
      >
        {rank}
      </span>
    </div>
  );
}

function TraderAvatar({
  avatar,
  username,
  isDark,
}: {
  avatar: string | null;
  username: string;
  isDark: boolean;
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={username}
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center ${
        isDark ? "bg-zinc-700" : "bg-gray-300"
      }`}
    >
      <User className={`w-5 h-5 ${isDark ? "text-zinc-400" : "text-gray-500"}`} />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Leaderboard({ isOpen, onClose, isMobile = false }: LeaderboardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { user } = useUserStore();

  const [period, setPeriod] = useState("weekly");
  const [metric, setMetric] = useState("profit");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/exchange/binary/leaderboard?period=${period}&metric=${metric}&limit=100`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [period, metric]);

  // Fetch user's position if authenticated
  const fetchUserPosition = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/exchange/binary/leaderboard/me?period=${period}&metric=${metric}`
      );

      if (response.ok) {
        const result = await response.json();
        setUserPosition(result);
      }
    } catch {
      // Silently fail - user position is optional
    }
  }, [period, metric, user]);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
      fetchUserPosition();
    }
  }, [isOpen, fetchLeaderboard, fetchUserPosition]);

  // Format profit display
  const formatProfit = (profit: number) => {
    if (profit >= 0) {
      return `+$${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    return `-$${Math.abs(profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Theme classes matching overlay-theme.ts for consistency
  const borderClass = isDark ? "border-zinc-800/50" : "border-gray-200/50";
  const subtitleClass = isDark ? "text-zinc-400" : "text-gray-500";

  // On mobile, skip animations for instant overlay switching
  if (!isOpen) return null;

  // Wrapper components - use div on mobile (no animation), motion.div on desktop
  const Wrapper = isMobile ? 'div' : motion.div;
  const wrapperProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  };

  const BackdropWrapper = isMobile ? 'div' : motion.div;
  const backdropProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const PanelWrapper = isMobile ? 'div' : motion.div;
  const panelProps = isMobile ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  };

  const content = (
    <Wrapper
      {...wrapperProps}
      className="absolute inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <BackdropWrapper
        {...backdropProps}
        className={`absolute inset-0 ${isDark ? "bg-black/70" : "bg-black/40"} backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Leaderboard Panel - Full width overlay */}
      <PanelWrapper
        {...panelProps}
        className={`relative h-full w-full flex flex-col ${
          isDark ? "bg-zinc-900" : "bg-white"
        } shadow-2xl`}
      >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${borderClass}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? "bg-yellow-500/10" : "bg-yellow-50"}`}>
                  <Trophy size={20} className="text-yellow-500" />
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    Top Traders
                  </h2>
                  <p className={`text-xs ${isDark ? "text-zinc-500" : "text-gray-500"}`}>
                    Leaderboard rankings
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    fetchLeaderboard();
                    fetchUserPosition();
                  }}
                  disabled={loading}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? "hover:bg-zinc-700/50" : "hover:bg-gray-100"
                  } disabled:opacity-50`}
                >
                  <RefreshCw
                    size={18}
                    className={`${loading ? "animate-spin" : ""} ${subtitleClass}`}
                  />
                </button>
                <button
                  onClick={onClose}
                  className={`hidden md:flex p-2 rounded-lg transition-colors ${
                    isDark ? "hover:bg-zinc-700/50 text-zinc-400" : "hover:bg-gray-100 text-gray-500"
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className={`px-6 py-2.5 border-b ${borderClass} ${isDark ? "bg-zinc-800/50" : "bg-gray-50"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Trophy size={12} className="text-yellow-500" />
                    <span className={subtitleClass}>{data?.traders.length || 0} Traders</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-emerald-500" />
                    <span className={subtitleClass}>{PERIODS.find(p => p.value === period)?.label || "Weekly"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-blue-500" />
                    <span className={subtitleClass}>{METRICS.find(m => m.value === metric)?.label || "Profit"}</span>
                  </div>
                </div>
                {data && (
                  <span className={`text-[10px] ${isDark ? "text-zinc-600" : "text-gray-400"}`}>
                    Updated {new Date(data.updatedAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className={`px-6 py-3 border-b ${borderClass}`}>
              <div className="flex flex-wrap gap-3">
                {/* Period Selector */}
                <div className="flex gap-1">
                  {PERIODS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPeriod(p.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        period === p.value
                          ? "bg-[#F7941D] text-white"
                          : isDark
                          ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Metric Selector */}
                <div className="flex gap-1 ml-auto">
                  {METRICS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMetric(m.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          metric === m.value
                            ? isDark
                              ? "bg-zinc-800 text-white border border-zinc-700"
                              : "bg-gray-200 text-gray-900 border border-gray-300"
                            : isDark
                            ? "text-zinc-500 hover:text-zinc-300"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* User Position Banner */}
            {user && userPosition && (
              <div
                className={`px-6 py-3 border-b ${borderClass} ${
                  isDark ? "bg-[#F7941D]/10" : "bg-orange-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isDark ? "bg-zinc-800" : "bg-gray-200"
                      }`}
                    >
                      {userPosition.rank ? (
                        <span
                          className={`text-sm font-bold ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          #{userPosition.rank}
                        </span>
                      ) : (
                        <span className="text-lg">-</span>
                      )}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-medium ${
                          isDark ? "text-white" : "text-gray-900"
                        }`}
                      >
                        Your Position
                      </div>
                      {userPosition.qualified ? (
                        <div
                          className={`text-xs ${
                            isDark ? "text-zinc-400" : "text-gray-500"
                          }`}
                        >
                          Top {userPosition.percentile}% of {userPosition.totalTraders}{" "}
                          traders
                        </div>
                      ) : (
                        <div className="text-xs text-amber-500">
                          {userPosition.minTradesRequired -
                            userPosition.stats.totalTrades}{" "}
                          more trades to qualify
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${
                        userPosition.stats.totalProfit >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {formatProfit(userPosition.stats.totalProfit)}
                    </div>
                    <div
                      className={`text-xs ${
                        isDark ? "text-zinc-400" : "text-gray-500"
                      }`}
                    >
                      {userPosition.stats.winRate.toFixed(1)}% win rate
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw
                    className={`w-6 h-6 animate-spin ${
                      isDark ? "text-zinc-600" : "text-gray-400"
                    }`}
                  />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertCircle
                    className={`w-8 h-8 mb-2 ${
                      isDark ? "text-zinc-600" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`text-sm ${isDark ? "text-zinc-500" : "text-gray-500"}`}
                  >
                    {error}
                  </p>
                </div>
              ) : data?.traders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Trophy
                    className={`w-8 h-8 mb-2 ${
                      isDark ? "text-zinc-600" : "text-gray-400"
                    }`}
                  />
                  <p
                    className={`text-sm ${isDark ? "text-zinc-500" : "text-gray-500"}`}
                  >
                    No traders found for this period
                  </p>
                </div>
              ) : (
                <div className={`divide-y ${borderClass}`}>
                  {data?.traders.map((trader, index) => (
                    <motion.div
                      key={`${trader.rank}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`px-6 py-3 flex items-center gap-3 ${
                        trader.rank <= 3
                          ? isDark
                            ? "bg-zinc-800/30"
                            : "bg-gray-50"
                          : ""
                      }`}
                    >
                      <RankBadge rank={trader.rank} isDark={isDark} />
                      <TraderAvatar
                        avatar={trader.avatar}
                        username={trader.username}
                        isDark={isDark}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium truncate ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {trader.username}
                        </div>
                        <div
                          className={`text-xs ${
                            isDark ? "text-zinc-500" : "text-gray-500"
                          }`}
                        >
                          {trader.totalTrades} trades &bull; {trader.wins}W / {trader.losses}L
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-bold ${
                            trader.totalProfit >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {formatProfit(trader.totalProfit)}
                        </div>
                        <div
                          className={`text-xs ${
                            isDark ? "text-zinc-500" : "text-gray-500"
                          }`}
                        >
                          {trader.winRate.toFixed(1)}%
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
      </PanelWrapper>
    </Wrapper>
  );

  // On mobile, skip AnimatePresence to avoid exit animation delay
  if (isMobile) {
    return content;
  }

  return (
    <AnimatePresence>
      {isOpen && content}
    </AnimatePresence>
  );
}
