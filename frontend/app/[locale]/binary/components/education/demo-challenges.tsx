"use client";

/**
 * Demo Challenges Component
 *
 * A comprehensive gamification system for binary trading education.
 * Features daily/weekly challenges, achievements, XP leveling, and rewards.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trophy,
  Target,
  Flame,
  Star,
  Gift,
  CheckCircle2,
  Lock,
  ChevronRight,
  Sparkles,
  TrendingUp,
  BarChart3,
  Coins,
  RefreshCw,
  Award,
  Zap,
  Crown,
  Clock,
  Calendar,
  Shield,
  Rocket,
  Heart,
  Timer,
  Moon,
  Sun,
  Activity,
  TrendingDown,
  DollarSign,
  Percent,
  AlertTriangle,
  Brain,
  Gauge,
  Crosshair,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  Coffee,
  Sunrise,
  Sunset,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useBinaryStore } from "@/store/trade/use-binary-store";
import type { OrderSide } from "@/types/binary-trading";
import { useTranslations } from "next-intl";

// Helper function to determine if an order side is bullish (upward direction)
function isBullishSide(side: OrderSide | string): boolean {
  return side === "RISE" || side === "HIGHER" || side === "TOUCH" || side === "CALL" || side === "UP";
}

// ============================================================================
// TYPES
// ============================================================================

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: "daily" | "weekly" | "achievement" | "special";
  category:
    | "trades"
    | "profit"
    | "streak"
    | "symbols"
    | "timing"
    | "risk"
    | "consistency"
    | "milestone"
    | "special";
  target: number;
  reward: {
    type: "xp" | "badge" | "demo_bonus" | "title";
    value: number | string;
    icon?: React.ReactNode;
  };
  difficulty: "easy" | "medium" | "hard" | "legendary";
  progress?: number;
  completed?: boolean;
  expiresAt?: string;
  prerequisiteId?: string;
  hidden?: boolean;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

interface ChallengeProgress {
  challengeId: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
  claimedReward?: boolean;
}

interface UserStats {
  totalXP: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  totalTrades: number;
  totalWins: number;
  totalLosses: number;
  tradingDays: number;
  joinedAt: string;
  titles: string[];
  activeTitle?: string;
}

export interface DemoChallengesProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true, disables enter/exit animations for instant overlay switching on mobile */
  isMobile?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "binary_challenge_progress_v2";
const STATS_KEY = "binary_user_stats";

// XP required for each level (cumulative)
const LEVEL_XP = [
  0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500, 10000, 13000, 17000,
  22000, 28000, 35000, 45000, 60000, 80000, 100000,
];

const LEVEL_TITLES = [
  "Newcomer",
  "Apprentice",
  "Trader",
  "Skilled Trader",
  "Expert",
  "Master",
  "Elite",
  "Champion",
  "Legend",
  "Grandmaster",
];

// Difficulty colors and multipliers
const DIFFICULTY_CONFIG = {
  easy: { color: "emerald", multiplier: 1, label: "Easy" },
  medium: { color: "blue", multiplier: 1.5, label: "Medium" },
  hard: { color: "purple", multiplier: 2, label: "Hard" },
  legendary: { color: "amber", multiplier: 3, label: "Legendary" },
};

const RARITY_CONFIG = {
  common: { color: "zinc", glow: false },
  rare: { color: "blue", glow: true },
  epic: { color: "purple", glow: true },
  legendary: { color: "amber", glow: true },
};

// ============================================================================
// CHALLENGE DEFINITIONS
// ============================================================================

const DAILY_CHALLENGES: Challenge[] = [
  // Trading Volume
  {
    id: "daily-first-trade",
    title: "First Trade of the Day",
    description: "Place your first trade today",
    icon: <Zap className="w-5 h-5" />,
    type: "daily",
    category: "trades",
    target: 1,
    reward: { type: "xp", value: 10 },
    difficulty: "easy",
  },
  {
    id: "daily-5-trades",
    title: "Active Trader",
    description: "Complete 5 trades today",
    icon: <Target className="w-5 h-5" />,
    type: "daily",
    category: "trades",
    target: 5,
    reward: { type: "xp", value: 25 },
    difficulty: "easy",
  },
  {
    id: "daily-10-trades",
    title: "Trading Machine",
    description: "Complete 10 trades today",
    icon: <Activity className="w-5 h-5" />,
    type: "daily",
    category: "trades",
    target: 10,
    reward: { type: "xp", value: 50 },
    difficulty: "medium",
  },
  {
    id: "daily-20-trades",
    title: "Marathon Trader",
    description: "Complete 20 trades in a single day",
    icon: <Rocket className="w-5 h-5" />,
    type: "daily",
    category: "trades",
    target: 20,
    reward: { type: "xp", value: 100 },
    difficulty: "hard",
  },

  // Win Streaks
  {
    id: "daily-win-streak-3",
    title: "Hot Streak",
    description: "Win 3 trades in a row",
    icon: <Flame className="w-5 h-5" />,
    type: "daily",
    category: "streak",
    target: 3,
    reward: { type: "xp", value: 50 },
    difficulty: "medium",
  },
  {
    id: "daily-win-streak-5",
    title: "On Fire",
    description: "Win 5 trades in a row today",
    icon: <Sparkles className="w-5 h-5" />,
    type: "daily",
    category: "streak",
    target: 5,
    reward: { type: "xp", value: 100 },
    difficulty: "hard",
  },

  // Diversification
  {
    id: "daily-2-symbols",
    title: "Diversifier",
    description: "Trade 2 different symbols",
    icon: <BarChart3 className="w-5 h-5" />,
    type: "daily",
    category: "symbols",
    target: 2,
    reward: { type: "xp", value: 20 },
    difficulty: "easy",
  },
  {
    id: "daily-3-symbols",
    title: "Multi-Asset Trader",
    description: "Trade 3 different symbols today",
    icon: <Coins className="w-5 h-5" />,
    type: "daily",
    category: "symbols",
    target: 3,
    reward: { type: "xp", value: 35 },
    difficulty: "medium",
  },

  // Timing Challenges
  {
    id: "daily-morning-trader",
    title: "Early Bird",
    description: "Complete a trade before 10 AM",
    icon: <Sunrise className="w-5 h-5" />,
    type: "daily",
    category: "timing",
    target: 1,
    reward: { type: "xp", value: 15 },
    difficulty: "easy",
  },
  {
    id: "daily-night-trader",
    title: "Night Owl",
    description: "Complete a trade after 10 PM",
    icon: <Moon className="w-5 h-5" />,
    type: "daily",
    category: "timing",
    target: 1,
    reward: { type: "xp", value: 15 },
    difficulty: "easy",
  },

  // Profit Challenges
  {
    id: "daily-3-wins",
    title: "Triple Win",
    description: "Win 3 trades today",
    icon: <Trophy className="w-5 h-5" />,
    type: "daily",
    category: "profit",
    target: 3,
    reward: { type: "xp", value: 30 },
    difficulty: "easy",
  },
  {
    id: "daily-5-wins",
    title: "Winner's Circle",
    description: "Win 5 trades today",
    icon: <Star className="w-5 h-5" />,
    type: "daily",
    category: "profit",
    target: 5,
    reward: { type: "xp", value: 60 },
    difficulty: "medium",
  },

  // Direction Challenges
  {
    id: "daily-bull-run",
    title: "Bull Run",
    description: "Win 3 CALL trades today",
    icon: <ArrowUpRight className="w-5 h-5" />,
    type: "daily",
    category: "trades",
    target: 3,
    reward: { type: "xp", value: 30 },
    difficulty: "medium",
  },
  {
    id: "daily-bear-market",
    title: "Bear Market",
    description: "Win 3 PUT trades today",
    icon: <ArrowDownRight className="w-5 h-5" />,
    type: "daily",
    category: "trades",
    target: 3,
    reward: { type: "xp", value: 30 },
    difficulty: "medium",
  },

  // Consistency
  {
    id: "daily-balanced",
    title: "Balanced Trader",
    description: "Make both CALL and PUT trades today (min 2 each)",
    icon: <Repeat className="w-5 h-5" />,
    type: "daily",
    category: "consistency",
    target: 4,
    reward: { type: "xp", value: 40 },
    difficulty: "medium",
  },
];

const WEEKLY_CHALLENGES: Challenge[] = [
  // Volume
  {
    id: "weekly-25-trades",
    title: "Trading Marathon",
    description: "Complete 25 trades this week",
    icon: <TrendingUp className="w-5 h-5" />,
    type: "weekly",
    category: "trades",
    target: 25,
    reward: { type: "xp", value: 150 },
    difficulty: "medium",
  },
  {
    id: "weekly-50-trades",
    title: "Trading Champion",
    description: "Complete 50 trades this week",
    icon: <Crown className="w-5 h-5" />,
    type: "weekly",
    category: "trades",
    target: 50,
    reward: { type: "demo_bonus", value: 500 },
    difficulty: "hard",
  },
  {
    id: "weekly-100-trades",
    title: "Trading Legend",
    description: "Complete 100 trades this week",
    icon: <Trophy className="w-5 h-5" />,
    type: "weekly",
    category: "trades",
    target: 100,
    reward: { type: "demo_bonus", value: 1500 },
    difficulty: "legendary",
  },

  // Win Rate
  {
    id: "weekly-55-winrate",
    title: "Consistent Performer",
    description: "Achieve 55% win rate with 15+ trades",
    icon: <Percent className="w-5 h-5" />,
    type: "weekly",
    category: "profit",
    target: 55,
    reward: { type: "xp", value: 100 },
    difficulty: "medium",
  },
  {
    id: "weekly-60-winrate",
    title: "Precision Master",
    description: "Achieve 60% win rate with 20+ trades",
    icon: <Crosshair className="w-5 h-5" />,
    type: "weekly",
    category: "profit",
    target: 60,
    reward: { type: "demo_bonus", value: 1000 },
    difficulty: "hard",
  },
  {
    id: "weekly-70-winrate",
    title: "Elite Performer",
    description: "Achieve 70% win rate with 10+ trades",
    icon: <Shield className="w-5 h-5" />,
    type: "weekly",
    category: "profit",
    target: 70,
    reward: { type: "xp", value: 300 },
    difficulty: "legendary",
  },

  // Diversification
  {
    id: "weekly-5-symbols",
    title: "Explorer",
    description: "Trade 5 different symbols",
    icon: <Star className="w-5 h-5" />,
    type: "weekly",
    category: "symbols",
    target: 5,
    reward: { type: "xp", value: 100 },
    difficulty: "medium",
  },
  {
    id: "weekly-8-symbols",
    title: "Market Explorer",
    description: "Trade 8 different symbols this week",
    icon: <Eye className="w-5 h-5" />,
    type: "weekly",
    category: "symbols",
    target: 8,
    reward: { type: "xp", value: 200 },
    difficulty: "hard",
  },

  // Streaks
  {
    id: "weekly-streak-7",
    title: "Lucky Seven",
    description: "Win 7 trades in a row",
    icon: <Flame className="w-5 h-5" />,
    type: "weekly",
    category: "streak",
    target: 7,
    reward: { type: "xp", value: 250 },
    difficulty: "hard",
  },
  {
    id: "weekly-streak-10",
    title: "Perfect Ten",
    description: "Win 10 trades in a row",
    icon: <Sparkles className="w-5 h-5" />,
    type: "weekly",
    category: "streak",
    target: 10,
    reward: { type: "demo_bonus", value: 2000 },
    difficulty: "legendary",
  },

  // Consistency
  {
    id: "weekly-5-days",
    title: "Dedicated Trader",
    description: "Trade on 5 different days this week",
    icon: <Calendar className="w-5 h-5" />,
    type: "weekly",
    category: "consistency",
    target: 5,
    reward: { type: "xp", value: 150 },
    difficulty: "medium",
  },
  {
    id: "weekly-7-days",
    title: "No Days Off",
    description: "Trade every day this week",
    icon: <Shield className="w-5 h-5" />,
    type: "weekly",
    category: "consistency",
    target: 7,
    reward: { type: "xp", value: 300 },
    difficulty: "hard",
  },

  // Profit
  {
    id: "weekly-20-wins",
    title: "Winning Week",
    description: "Win 20 trades this week",
    icon: <Trophy className="w-5 h-5" />,
    type: "weekly",
    category: "profit",
    target: 20,
    reward: { type: "xp", value: 200 },
    difficulty: "hard",
  },
];

const ACHIEVEMENTS: Challenge[] = [
  // Milestone Achievements
  {
    id: "achievement-first-trade",
    title: "First Steps",
    description: "Complete your first trade",
    icon: <Zap className="w-5 h-5" />,
    type: "achievement",
    category: "milestone",
    target: 1,
    reward: { type: "badge", value: "first_trade" },
    difficulty: "easy",
    rarity: "common",
  },
  {
    id: "achievement-first-win",
    title: "First Victory",
    description: "Win your first trade",
    icon: <Trophy className="w-5 h-5" />,
    type: "achievement",
    category: "profit",
    target: 1,
    reward: { type: "badge", value: "first_win" },
    difficulty: "easy",
    rarity: "common",
  },
  {
    id: "achievement-10-trades",
    title: "Getting Started",
    description: "Complete 10 trades",
    icon: <Target className="w-5 h-5" />,
    type: "achievement",
    category: "trades",
    target: 10,
    reward: { type: "badge", value: "beginner" },
    difficulty: "easy",
    rarity: "common",
  },
  {
    id: "achievement-50-trades",
    title: "Experienced Trader",
    description: "Complete 50 trades",
    icon: <Award className="w-5 h-5" />,
    type: "achievement",
    category: "trades",
    target: 50,
    reward: { type: "badge", value: "experienced" },
    difficulty: "medium",
    rarity: "rare",
  },
  {
    id: "achievement-100-trades",
    title: "Century Club",
    description: "Complete 100 trades",
    icon: <Star className="w-5 h-5" />,
    type: "achievement",
    category: "trades",
    target: 100,
    reward: { type: "badge", value: "century" },
    difficulty: "medium",
    rarity: "rare",
  },
  {
    id: "achievement-250-trades",
    title: "Veteran Trader",
    description: "Complete 250 trades",
    icon: <Shield className="w-5 h-5" />,
    type: "achievement",
    category: "trades",
    target: 250,
    reward: { type: "badge", value: "veteran" },
    difficulty: "hard",
    rarity: "epic",
  },
  {
    id: "achievement-500-trades",
    title: "Trading Master",
    description: "Complete 500 trades",
    icon: <Crown className="w-5 h-5" />,
    type: "achievement",
    category: "trades",
    target: 500,
    reward: { type: "badge", value: "master" },
    difficulty: "hard",
    rarity: "epic",
  },
  {
    id: "achievement-1000-trades",
    title: "Trading Legend",
    description: "Complete 1000 trades",
    icon: <Trophy className="w-5 h-5" />,
    type: "achievement",
    category: "trades",
    target: 1000,
    reward: { type: "title", value: "Legend" },
    difficulty: "legendary",
    rarity: "legendary",
  },

  // Streak Achievements
  {
    id: "achievement-3-streak",
    title: "Lucky Three",
    description: "Win 3 trades in a row",
    icon: <Flame className="w-5 h-5" />,
    type: "achievement",
    category: "streak",
    target: 3,
    reward: { type: "badge", value: "lucky_three" },
    difficulty: "easy",
    rarity: "common",
  },
  {
    id: "achievement-5-streak",
    title: "On Fire",
    description: "Win 5 trades in a row",
    icon: <Flame className="w-5 h-5" />,
    type: "achievement",
    category: "streak",
    target: 5,
    reward: { type: "badge", value: "on_fire" },
    difficulty: "medium",
    rarity: "rare",
  },
  {
    id: "achievement-7-streak",
    title: "Lucky Seven",
    description: "Win 7 trades in a row",
    icon: <Sparkles className="w-5 h-5" />,
    type: "achievement",
    category: "streak",
    target: 7,
    reward: { type: "badge", value: "lucky_seven" },
    difficulty: "hard",
    rarity: "epic",
  },
  {
    id: "achievement-10-streak",
    title: "Unstoppable",
    description: "Win 10 trades in a row",
    icon: <Rocket className="w-5 h-5" />,
    type: "achievement",
    category: "streak",
    target: 10,
    reward: { type: "title", value: "Unstoppable" },
    difficulty: "legendary",
    rarity: "legendary",
  },
  {
    id: "achievement-15-streak",
    title: "Perfection",
    description: "Win 15 trades in a row",
    icon: <Crown className="w-5 h-5" />,
    type: "achievement",
    category: "streak",
    target: 15,
    reward: { type: "title", value: "The Perfect" },
    difficulty: "legendary",
    rarity: "legendary",
  },

  // Win Achievements
  {
    id: "achievement-10-wins",
    title: "Winner",
    description: "Win 10 trades total",
    icon: <Trophy className="w-5 h-5" />,
    type: "achievement",
    category: "profit",
    target: 10,
    reward: { type: "badge", value: "winner" },
    difficulty: "easy",
    rarity: "common",
  },
  {
    id: "achievement-50-wins",
    title: "Consistent Winner",
    description: "Win 50 trades total",
    icon: <Award className="w-5 h-5" />,
    type: "achievement",
    category: "profit",
    target: 50,
    reward: { type: "badge", value: "consistent_winner" },
    difficulty: "medium",
    rarity: "rare",
  },
  {
    id: "achievement-100-wins",
    title: "Century Winner",
    description: "Win 100 trades total",
    icon: <Star className="w-5 h-5" />,
    type: "achievement",
    category: "profit",
    target: 100,
    reward: { type: "badge", value: "century_winner" },
    difficulty: "hard",
    rarity: "epic",
  },
  {
    id: "achievement-500-wins",
    title: "Winning Machine",
    description: "Win 500 trades total",
    icon: <Crown className="w-5 h-5" />,
    type: "achievement",
    category: "profit",
    target: 500,
    reward: { type: "title", value: "The Winner" },
    difficulty: "legendary",
    rarity: "legendary",
  },

  // Symbol Achievements
  {
    id: "achievement-5-symbols",
    title: "Diversified",
    description: "Trade 5 different symbols",
    icon: <BarChart3 className="w-5 h-5" />,
    type: "achievement",
    category: "symbols",
    target: 5,
    reward: { type: "badge", value: "diversified" },
    difficulty: "easy",
    rarity: "common",
  },
  {
    id: "achievement-10-symbols",
    title: "Multi-Market",
    description: "Trade 10 different symbols",
    icon: <Coins className="w-5 h-5" />,
    type: "achievement",
    category: "symbols",
    target: 10,
    reward: { type: "badge", value: "multi_market" },
    difficulty: "medium",
    rarity: "rare",
  },
  {
    id: "achievement-15-symbols",
    title: "Global Trader",
    description: "Trade 15 different symbols",
    icon: <Star className="w-5 h-5" />,
    type: "achievement",
    category: "symbols",
    target: 15,
    reward: { type: "badge", value: "global_trader" },
    difficulty: "hard",
    rarity: "epic",
  },

  // Consistency Achievements
  {
    id: "achievement-7-day-streak",
    title: "Week Warrior",
    description: "Trade for 7 consecutive days",
    icon: <Calendar className="w-5 h-5" />,
    type: "achievement",
    category: "consistency",
    target: 7,
    reward: { type: "badge", value: "week_warrior" },
    difficulty: "medium",
    rarity: "rare",
  },
  {
    id: "achievement-14-day-streak",
    title: "Fortnight Fighter",
    description: "Trade for 14 consecutive days",
    icon: <Shield className="w-5 h-5" />,
    type: "achievement",
    category: "consistency",
    target: 14,
    reward: { type: "badge", value: "fortnight_fighter" },
    difficulty: "hard",
    rarity: "epic",
  },
  {
    id: "achievement-30-day-streak",
    title: "Monthly Master",
    description: "Trade for 30 consecutive days",
    icon: <Crown className="w-5 h-5" />,
    type: "achievement",
    category: "consistency",
    target: 30,
    reward: { type: "title", value: "Dedicated" },
    difficulty: "legendary",
    rarity: "legendary",
  },

  // XP/Level Achievements
  {
    id: "achievement-level-5",
    title: "Rising Star",
    description: "Reach Level 5",
    icon: <Star className="w-5 h-5" />,
    type: "achievement",
    category: "milestone",
    target: 5,
    reward: { type: "badge", value: "rising_star" },
    difficulty: "medium",
    rarity: "rare",
  },
  {
    id: "achievement-level-10",
    title: "Elite Status",
    description: "Reach Level 10",
    icon: <Trophy className="w-5 h-5" />,
    type: "achievement",
    category: "milestone",
    target: 10,
    reward: { type: "title", value: "Elite" },
    difficulty: "hard",
    rarity: "epic",
  },
  {
    id: "achievement-1000-xp",
    title: "XP Hunter",
    description: "Earn 1,000 XP total",
    icon: <Zap className="w-5 h-5" />,
    type: "achievement",
    category: "milestone",
    target: 1000,
    reward: { type: "badge", value: "xp_hunter" },
    difficulty: "medium",
    rarity: "rare",
  },
  {
    id: "achievement-5000-xp",
    title: "XP Master",
    description: "Earn 5,000 XP total",
    icon: <Sparkles className="w-5 h-5" />,
    type: "achievement",
    category: "milestone",
    target: 5000,
    reward: { type: "badge", value: "xp_master" },
    difficulty: "hard",
    rarity: "epic",
  },
  {
    id: "achievement-10000-xp",
    title: "XP Legend",
    description: "Earn 10,000 XP total",
    icon: <Crown className="w-5 h-5" />,
    type: "achievement",
    category: "milestone",
    target: 10000,
    reward: { type: "title", value: "XP Legend" },
    difficulty: "legendary",
    rarity: "legendary",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function loadProgress(): Map<string, ChallengeProgress> {
  if (typeof window === "undefined") return new Map();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return new Map(Object.entries(data));
    }
  } catch {
    // Ignore storage errors
  }
  return new Map();
}

function saveProgress(progress: Map<string, ChallengeProgress>): void {
  if (typeof window === "undefined") return;
  try {
    const data = Object.fromEntries(progress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function loadStats(): UserStats {
  if (typeof window === "undefined") {
    return getDefaultStats();
  }
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore storage errors
  }
  return getDefaultStats();
}

function saveStats(stats: UserStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage errors
  }
}

function getDefaultStats(): UserStats {
  return {
    totalXP: 0,
    level: 1,
    currentStreak: 0,
    bestStreak: 0,
    totalTrades: 0,
    totalWins: 0,
    totalLosses: 0,
    tradingDays: 0,
    joinedAt: new Date().toISOString(),
    titles: ["Newcomer"],
    activeTitle: "Newcomer",
  };
}

function calculateLevel(xp: number): number {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) {
      return i + 1;
    }
  }
  return 1;
}

function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_XP.length) return LEVEL_XP[LEVEL_XP.length - 1];
  return LEVEL_XP[currentLevel];
}

function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Compact XP Progress Bar Component for sidebar
function XPProgressBarCompact({
  currentXP,
  level,
  isDark,
}: {
  currentXP: number;
  level: number;
  isDark: boolean;
}) {
  const t = useTranslations("binary_components");
  const currentLevelXP = level > 1 ? LEVEL_XP[level - 1] : 0;
  const nextLevelXP = getXPForNextLevel(level);
  const progressInLevel = currentXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progressPercent = Math.min((progressInLevel / xpNeeded) * 100, 100);
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  return (
    <div className="space-y-3">
      {/* Level Badge */}
      <div className="flex flex-col items-center">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg ${
            isDark
              ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white"
              : "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
          }`}
        >
          {level}
        </div>
        <div
          className={`mt-2 text-sm font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Level {level}
        </div>
        <div
          className={`text-xs ${isDark ? "text-zinc-500" : "text-gray-500"}`}
        >
          {levelTitle}
        </div>
      </div>

      {/* XP Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className={isDark ? "text-zinc-500" : "text-gray-500"}>XP</span>
          <span
            className={`font-medium ${
              isDark ? "text-amber-400" : "text-amber-600"
            }`}
          >
            {currentXP.toLocaleString()}
          </span>
        </div>
        <div
          className={`h-2 rounded-full overflow-hidden ${
            isDark ? "bg-zinc-800" : "bg-gray-200"
          }`}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500"
          />
        </div>
        <div
          className={`text-[10px] text-center ${
            isDark ? "text-zinc-600" : "text-gray-400"
          }`}
        >
          {(nextLevelXP - currentXP).toLocaleString()} {t("xp_to_level")} {level + 1}
        </div>
      </div>
    </div>
  );
}

// Compact Stats Item for sidebar
function StatItem({
  icon,
  label,
  value,
  subValue,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  isDark: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className={isDark ? "text-zinc-500" : "text-gray-400"}>
          {icon}
        </span>
        <span
          className={`text-xs ${isDark ? "text-zinc-400" : "text-gray-500"}`}
        >
          {label}
        </span>
      </div>
      <div className="text-right">
        <div
          className={`text-sm font-semibold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          {value}
        </div>
        {subValue && (
          <div
            className={`text-[10px] ${
              isDark ? "text-zinc-600" : "text-gray-400"
            }`}
          >
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
}

// Challenge Card Component - Compact and clean design
interface ChallengeCardProps {
  challenge: Challenge;
  progress: number;
  completed: boolean;
  isDark: boolean;
  onClaim?: () => void;
  claimed?: boolean;
}

function ChallengeCard({
  challenge,
  progress,
  completed,
  isDark,
  onClaim,
  claimed,
}: ChallengeCardProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const progressPercent = Math.min((progress / challenge.target) * 100, 100);
  const diffConfig = DIFFICULTY_CONFIG[challenge.difficulty];

  const rewardLabel = useMemo(() => {
    switch (challenge.reward.type) {
      case "xp":
        return `+${challenge.reward.value} XP`;
      case "demo_bonus":
        return `+$${challenge.reward.value}`;
      case "badge":
        return "Badge";
      case "title":
        return `"${challenge.reward.value}"`;
      default:
        return "";
    }
  }, [challenge.reward]);

  const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
    easy: {
      bg: isDark ? "bg-emerald-500/10" : "bg-emerald-50",
      text: "text-emerald-500",
      border: isDark ? "border-emerald-500/20" : "border-emerald-200",
    },
    medium: {
      bg: isDark ? "bg-blue-500/10" : "bg-blue-50",
      text: "text-blue-500",
      border: isDark ? "border-blue-500/20" : "border-blue-200",
    },
    hard: {
      bg: isDark ? "bg-purple-500/10" : "bg-purple-50",
      text: "text-purple-500",
      border: isDark ? "border-purple-500/20" : "border-purple-200",
    },
    legendary: {
      bg: isDark ? "bg-amber-500/10" : "bg-amber-50",
      text: "text-amber-500",
      border: isDark ? "border-amber-500/20" : "border-amber-200",
    },
  };

  const diffColors = difficultyColors[challenge.difficulty];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative p-3 rounded-xl transition-all border ${
        completed
          ? isDark
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-emerald-50/50 border-emerald-200"
          : isDark
          ? "bg-zinc-800/30 border-zinc-700/50 hover:bg-zinc-800/50 hover:border-zinc-600/50"
          : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            completed
              ? "bg-emerald-500 text-white"
              : `${diffColors.bg} ${diffColors.text}`
          }`}
        >
          {completed ? <CheckCircle2 className="w-5 h-5" /> : challenge.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={`text-sm font-medium truncate ${
                completed
                  ? isDark
                    ? "text-emerald-400"
                    : "text-emerald-700"
                  : isDark
                  ? "text-white"
                  : "text-gray-900"
              }`}
            >
              {challenge.title}
            </h4>
            <span
              className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                completed
                  ? "bg-emerald-500/20 text-emerald-500"
                  : isDark
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              {rewardLabel}
            </span>
          </div>

          <p
            className={`text-xs mt-0.5 truncate ${
              isDark ? "text-zinc-500" : "text-gray-500"
            }`}
          >
            {challenge.description}
          </p>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`flex-1 h-1.5 rounded-full overflow-hidden ${
                isDark ? "bg-zinc-700" : "bg-gray-200"
              }`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  completed
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-amber-400 to-orange-500"
                }`}
              />
            </div>
            <span
              className={`text-[10px] font-medium tabular-nums ${
                isDark ? "text-zinc-500" : "text-gray-500"
              }`}
            >
              {Math.min(progress, challenge.target)}/{challenge.target}
            </span>
          </div>
        </div>
      </div>

      {/* Difficulty indicator bar at the left edge */}
      <div
        className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${
          completed ? "bg-emerald-500" : diffColors.text.replace("text-", "bg-")
        }`}
      />

      {/* Claim Button */}
      {completed && !claimed && onClaim && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onClaim}
          className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 transition-all"
        >
          {tCommon("claim_reward")}
        </motion.button>
      )}
    </motion.div>
  );
}


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DemoChallenges({
  isOpen,
  onClose,
  isMobile = false,
}: DemoChallengesProps) {
  const t = useTranslations("binary_components");
  const tCommon = useTranslations("common");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<
    "daily" | "weekly" | "achievements" | "stats"
  >("daily");
  const [progress, setProgress] = useState<Map<string, ChallengeProgress>>(
    new Map()
  );
  const [stats, setStats] = useState<UserStats>(getDefaultStats());
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevelRef = useRef(1);

  // Get trading data from store
  const { completedOrders, tradingMode } = useBinaryStore();

  // Load saved progress and stats on mount
  useEffect(() => {
    setProgress(loadProgress());
    setStats(loadStats());
  }, []);

  // Calculate challenge progress from trading data
  useEffect(() => {
    if (!isOpen || tradingMode !== "demo") return;

    const demoOrders = completedOrders;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = demoOrders.filter((order) => {
      const orderDate = new Date(order.expiryTime || order.entryTime);
      return orderDate >= today;
    });

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekOrders = demoOrders.filter((order) => {
      const orderDate = new Date(order.expiryTime || order.entryTime);
      return orderDate >= weekStart;
    });

    // Calculate various stats
    const todayTrades = todayOrders.length;
    const todayWins = todayOrders.filter((o) => o.status === "WIN").length;
    const todaySymbols = new Set(todayOrders.map((o) => o.symbol)).size;
    const todayCallWins = todayOrders.filter(
      (o) => o.status === "WIN" && isBullishSide(o.side)
    ).length;
    const todayPutWins = todayOrders.filter(
      (o) => o.status === "WIN" && !isBullishSide(o.side)
    ).length;
    const todayCalls = todayOrders.filter((o) => isBullishSide(o.side)).length;
    const todayPuts = todayOrders.filter((o) => !isBullishSide(o.side)).length;

    const weekTrades = weekOrders.length;
    const weekWins = weekOrders.filter((o) => o.status === "WIN").length;
    const weekSymbols = new Set(weekOrders.map((o) => o.symbol)).size;
    const weekWinRate = weekTrades >= 10 ? (weekWins / weekTrades) * 100 : 0;
    const weekWinRate15 = weekTrades >= 15 ? (weekWins / weekTrades) * 100 : 0;
    const weekWinRate20 = weekTrades >= 20 ? (weekWins / weekTrades) * 100 : 0;

    // Calculate trading days this week
    const tradingDaysThisWeek = new Set(
      weekOrders.map((o) => {
        const d = new Date(o.expiryTime || o.entryTime);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    ).size;

    const totalTrades = demoOrders.length;
    const totalWins = demoOrders.filter((o) => o.status === "WIN").length;
    const totalSymbols = new Set(demoOrders.map((o) => o.symbol)).size;

    // Calculate win streak (current and max)
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;
    const sortedOrders = [...demoOrders].sort(
      (a, b) =>
        new Date(a.expiryTime || a.entryTime).getTime() -
        new Date(b.expiryTime || b.entryTime).getTime()
    );

    for (const order of sortedOrders) {
      if (order.status === "WIN") {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Current streak from latest trades
    const reversedOrders = [...sortedOrders].reverse();
    for (const order of reversedOrders) {
      if (order.status === "WIN") {
        currentStreak++;
      } else {
        break;
      }
    }

    // Check timing challenges
    const hasMorningTrade = todayOrders.some((o) => {
      const hour = new Date(o.entryTime).getHours();
      return hour < 10;
    });
    const hasNightTrade = todayOrders.some((o) => {
      const hour = new Date(o.entryTime).getHours();
      return hour >= 22;
    });

    // Calculate day streak
    const tradingDays = new Set(
      demoOrders.map((o) => {
        const d = new Date(o.expiryTime || o.entryTime);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );

    // Calculate consecutive day streak
    let dayStreak = 0;
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    if (tradingDays.has(todayStr)) {
      dayStreak = 1;
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const dateStr = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
        if (tradingDays.has(dateStr)) {
          dayStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Update progress for each challenge
    const newProgress = new Map<string, ChallengeProgress>();

    // Helper function to update progress
    const updateProgress = (id: string, prog: number, target: number) => {
      newProgress.set(id, {
        challengeId: id,
        progress: prog,
        completed: prog >= target,
      });
    };

    // Daily challenges
    updateProgress("daily-first-trade", todayTrades, 1);
    updateProgress("daily-5-trades", todayTrades, 5);
    updateProgress("daily-10-trades", todayTrades, 10);
    updateProgress("daily-20-trades", todayTrades, 20);
    updateProgress("daily-win-streak-3", Math.min(currentStreak, 3), 3);
    updateProgress("daily-win-streak-5", Math.min(currentStreak, 5), 5);
    updateProgress("daily-2-symbols", todaySymbols, 2);
    updateProgress("daily-3-symbols", todaySymbols, 3);
    updateProgress("daily-morning-trader", hasMorningTrade ? 1 : 0, 1);
    updateProgress("daily-night-trader", hasNightTrade ? 1 : 0, 1);
    updateProgress("daily-3-wins", todayWins, 3);
    updateProgress("daily-5-wins", todayWins, 5);
    updateProgress("daily-bull-run", todayCallWins, 3);
    updateProgress("daily-bear-market", todayPutWins, 3);
    updateProgress(
      "daily-balanced",
      todayCalls >= 2 && todayPuts >= 2 ? 4 : Math.min(todayCalls, 2) + Math.min(todayPuts, 2),
      4
    );

    // Weekly challenges
    updateProgress("weekly-25-trades", weekTrades, 25);
    updateProgress("weekly-50-trades", weekTrades, 50);
    updateProgress("weekly-100-trades", weekTrades, 100);
    updateProgress("weekly-55-winrate", weekTrades >= 15 ? Math.round(weekWinRate15) : 0, 55);
    updateProgress("weekly-60-winrate", weekTrades >= 20 ? Math.round(weekWinRate20) : 0, 60);
    updateProgress("weekly-70-winrate", weekTrades >= 10 ? Math.round(weekWinRate) : 0, 70);
    updateProgress("weekly-5-symbols", weekSymbols, 5);
    updateProgress("weekly-8-symbols", weekSymbols, 8);
    updateProgress("weekly-streak-7", Math.min(maxStreak, 7), 7);
    updateProgress("weekly-streak-10", Math.min(maxStreak, 10), 10);
    updateProgress("weekly-5-days", tradingDaysThisWeek, 5);
    updateProgress("weekly-7-days", tradingDaysThisWeek, 7);
    updateProgress("weekly-20-wins", weekWins, 20);

    // Achievements
    updateProgress("achievement-first-trade", totalTrades > 0 ? 1 : 0, 1);
    updateProgress("achievement-first-win", totalWins > 0 ? 1 : 0, 1);
    updateProgress("achievement-10-trades", totalTrades, 10);
    updateProgress("achievement-50-trades", totalTrades, 50);
    updateProgress("achievement-100-trades", totalTrades, 100);
    updateProgress("achievement-250-trades", totalTrades, 250);
    updateProgress("achievement-500-trades", totalTrades, 500);
    updateProgress("achievement-1000-trades", totalTrades, 1000);
    updateProgress("achievement-3-streak", Math.min(maxStreak, 3), 3);
    updateProgress("achievement-5-streak", Math.min(maxStreak, 5), 5);
    updateProgress("achievement-7-streak", Math.min(maxStreak, 7), 7);
    updateProgress("achievement-10-streak", Math.min(maxStreak, 10), 10);
    updateProgress("achievement-15-streak", Math.min(maxStreak, 15), 15);
    updateProgress("achievement-10-wins", totalWins, 10);
    updateProgress("achievement-50-wins", totalWins, 50);
    updateProgress("achievement-100-wins", totalWins, 100);
    updateProgress("achievement-500-wins", totalWins, 500);
    updateProgress("achievement-5-symbols", totalSymbols, 5);
    updateProgress("achievement-10-symbols", totalSymbols, 10);
    updateProgress("achievement-15-symbols", totalSymbols, 15);
    updateProgress("achievement-7-day-streak", Math.min(dayStreak, 7), 7);
    updateProgress("achievement-14-day-streak", Math.min(dayStreak, 14), 14);
    updateProgress("achievement-30-day-streak", Math.min(dayStreak, 30), 30);

    // Calculate total XP from completed challenges
    let totalXP = 0;
    const allChallenges = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES, ...ACHIEVEMENTS];
    for (const challenge of allChallenges) {
      const prog = newProgress.get(challenge.id);
      if (prog?.completed && challenge.reward.type === "xp") {
        totalXP += challenge.reward.value as number;
      }
    }

    // Level achievements
    const level = calculateLevel(totalXP);
    updateProgress("achievement-level-5", level, 5);
    updateProgress("achievement-level-10", level, 10);
    updateProgress("achievement-1000-xp", totalXP, 1000);
    updateProgress("achievement-5000-xp", totalXP, 5000);
    updateProgress("achievement-10000-xp", totalXP, 10000);

    // Update stats
    const newStats: UserStats = {
      ...stats,
      totalXP,
      level,
      currentStreak,
      bestStreak: Math.max(stats.bestStreak, maxStreak),
      totalTrades,
      totalWins,
      totalLosses: totalTrades - totalWins,
      tradingDays: tradingDays.size,
    };

    // Check for level up
    if (level > prevLevelRef.current) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
    prevLevelRef.current = level;

    setProgress(newProgress);
    saveProgress(newProgress);
    setStats(newStats);
    saveStats(newStats);
  }, [isOpen, tradingMode, completedOrders]);

  const challenges = useMemo(() => {
    switch (activeTab) {
      case "daily":
        return DAILY_CHALLENGES;
      case "weekly":
        return WEEKLY_CHALLENGES;
      case "achievements":
        return ACHIEVEMENTS;
      default:
        return [];
    }
  }, [activeTab]);

  const completedCount = useMemo(() => {
    return challenges.filter((c) => progress.get(c.id)?.completed).length;
  }, [challenges, progress]);

  const dailyCompleted = DAILY_CHALLENGES.filter(
    (c) => progress.get(c.id)?.completed
  ).length;
  const weeklyCompleted = WEEKLY_CHALLENGES.filter(
    (c) => progress.get(c.id)?.completed
  ).length;
  const achievementsCompleted = ACHIEVEMENTS.filter(
    (c) => progress.get(c.id)?.completed
  ).length;

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

  const borderClass = isDark ? "border-zinc-800/50" : "border-gray-200/50";

  // Calculate time until daily/weekly reset
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  // Separate completed and in-progress challenges
  const { inProgress, completed: completedChallenges } = useMemo(() => {
    const inProg: Challenge[] = [];
    const comp: Challenge[] = [];
    for (const c of challenges) {
      if (progress.get(c.id)?.completed) {
        comp.push(c);
      } else {
        inProg.push(c);
      }
    }
    return { inProgress: inProg, completed: comp };
  }, [challenges, progress]);

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
        className={`absolute inset-0 ${
          isDark ? "bg-black/70" : "bg-black/40"
        } backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed inset-0 z-60 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: 3, duration: 0.3 }}
              >
                <Crown className="w-20 h-20 text-amber-400 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {t("level_up")}
              </h2>
              <p className="text-xl text-amber-400">Level {stats.level}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container - Responsive Layout */}
      <PanelWrapper
        {...panelProps}
        className={`relative h-full w-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden ${
          isDark ? "bg-zinc-900" : "bg-gray-50"
            }`}
          >
            {/* Left Sidebar - Stats & Navigation */}
            <div
              className={`w-full md:w-64 shrink-0 flex flex-col md:border-r md:overflow-y-auto ${borderClass} ${
                isDark ? "bg-zinc-900" : "bg-white"
              }`}
            >
              {/* Header */}
              <div className={`p-4 border-b ${borderClass}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-xl ${
                        isDark ? "bg-purple-500/10" : "bg-purple-50"
                      }`}
                    >
                      <Gift size={18} className="text-purple-500" />
                    </div>
                    <h2
                      className={`text-base font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Challenges
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className={`hidden md:flex p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? "hover:bg-zinc-700/50 text-zinc-400"
                        : "hover:bg-gray-100 text-gray-500"
                    }`}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* XP Progress */}
                <XPProgressBarCompact
                  currentXP={stats.totalXP}
                  level={stats.level}
                  isDark={isDark}
                />
              </div>

              {/* Stats Section */}
              <div className={`p-4 border-b ${borderClass}`}>
                <h3
                  className={`text-xs font-medium uppercase tracking-wider mb-2 ${
                    isDark ? "text-zinc-500" : "text-gray-400"
                  }`}
                >
                  {t("your_stats")}
                </h3>
                <div className={`divide-y ${isDark ? "divide-zinc-800" : "divide-gray-100"}`}>
                  <StatItem
                    icon={<Flame size={14} />}
                    label={t("win_streak")}
                    value={stats.currentStreak}
                    subValue={`Best: ${stats.bestStreak}`}
                    isDark={isDark}
                  />
                  <StatItem
                    icon={<Target size={14} />}
                    label="Trades"
                    value={stats.totalTrades}
                    isDark={isDark}
                  />
                  <StatItem
                    icon={<Trophy size={14} />}
                    label={tCommon("win_rate")}
                    value={
                      stats.totalTrades > 0
                        ? `${Math.round((stats.totalWins / stats.totalTrades) * 100)}%`
                        : "0%"
                    }
                    subValue={`${stats.totalWins}W / ${stats.totalLosses}L`}
                    isDark={isDark}
                  />
                  <StatItem
                    icon={<Calendar size={14} />}
                    label={tCommon("days_active")}
                    value={stats.tradingDays}
                    isDark={isDark}
                  />
                </div>
              </div>

              {/* Navigation Tabs - horizontal scroll on mobile */}
              <div className="p-4 md:flex-1">
                <h3
                  className={`text-xs font-medium uppercase tracking-wider mb-3 ${
                    isDark ? "text-zinc-500" : "text-gray-400"
                  }`}
                >
                  Categories
                </h3>
                <nav className="flex md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                  <button
                    onClick={() => setActiveTab("daily")}
                    className={`shrink-0 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "daily"
                        ? isDark
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-amber-50 text-amber-600"
                        : isDark
                        ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock size={16} />
                      Daily
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ml-2 ${
                        activeTab === "daily"
                          ? isDark
                            ? "bg-amber-500/20"
                            : "bg-amber-100"
                          : isDark
                          ? "bg-zinc-700"
                          : "bg-gray-200"
                      }`}
                    >
                      {dailyCompleted}/{DAILY_CHALLENGES.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("weekly")}
                    className={`shrink-0 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "weekly"
                        ? isDark
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-blue-50 text-blue-600"
                        : isDark
                        ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar size={16} />
                      Weekly
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ml-2 ${
                        activeTab === "weekly"
                          ? isDark
                            ? "bg-blue-500/20"
                            : "bg-blue-100"
                          : isDark
                          ? "bg-zinc-700"
                          : "bg-gray-200"
                      }`}
                    >
                      {weeklyCompleted}/{WEEKLY_CHALLENGES.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("achievements")}
                    className={`shrink-0 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "achievements"
                        ? isDark
                          ? "bg-purple-500/10 text-purple-400"
                          : "bg-purple-50 text-purple-600"
                        : isDark
                        ? "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Trophy size={16} />
                      Achievements
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ml-2 ${
                        activeTab === "achievements"
                          ? isDark
                            ? "bg-purple-500/20"
                            : "bg-purple-100"
                          : isDark
                          ? "bg-zinc-700"
                          : "bg-gray-200"
                      }`}
                    >
                      {achievementsCompleted}/{ACHIEVEMENTS.length}
                    </span>
                  </button>
                </nav>
              </div>

              {/* Demo Mode Notice - hidden on mobile */}
              {tradingMode !== "demo" && (
                <div
                  className={`hidden md:block p-3 m-4 rounded-lg ${
                    isDark ? "bg-amber-500/10" : "bg-amber-50"
                  }`}
                >
                  <p className="text-xs text-amber-500 text-center">
                    {t("switch_to_demo_mode_to_track_progress")}
                  </p>
                </div>
              )}
            </div>

            {/* Main Content - Challenges Grid */}
            <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden">
              {/* Content Header */}
              <div
                className={`shrink-0 px-6 py-4 border-b ${borderClass} ${
                  isDark ? "bg-zinc-900/50" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {activeTab === "daily"
                        ? "Daily Challenges"
                        : activeTab === "weekly"
                        ? "Weekly Challenges"
                        : "Achievements"}
                    </h3>
                    <p
                      className={`text-sm ${
                        isDark ? "text-zinc-500" : "text-gray-500"
                      }`}
                    >
                      {activeTab === "daily"
                        ? "Complete challenges before the day ends"
                        : activeTab === "weekly"
                        ? "Complete challenges before the week ends"
                        : "Unlock achievements to earn badges and titles"}
                    </p>
                  </div>
                  {(activeTab === "daily" || activeTab === "weekly") && (
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        isDark ? "bg-zinc-800" : "bg-gray-100"
                      }`}
                    >
                      <Timer
                        size={14}
                        className={isDark ? "text-zinc-500" : "text-gray-400"}
                      />
                      <span
                        className={`text-xs font-medium ${
                          isDark ? "text-amber-400" : "text-amber-600"
                        }`}
                      >
                        {formatTimeRemaining(
                          activeTab === "daily" ? endOfDay : endOfWeek
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className={`flex-1 h-2 rounded-full overflow-hidden ${
                      isDark ? "bg-zinc-800" : "bg-gray-200"
                    }`}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${
                          challenges.length > 0
                            ? (completedCount / challenges.length) * 100
                            : 0
                        }%`,
                      }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                    />
                  </div>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      isDark ? "text-zinc-400" : "text-gray-600"
                    }`}
                  >
                    {completedCount}/{challenges.length}
                  </span>
                </div>
              </div>

              {/* Scrollable Challenge List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  {/* In Progress Section */}
                  {inProgress.length > 0 && (
                    <div className="mb-6">
                      <h4
                        className={`text-xs font-medium uppercase tracking-wider mb-3 px-1 ${
                          isDark ? "text-zinc-500" : "text-gray-400"
                        }`}
                      >
                        In Progress ({inProgress.length})
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                        <AnimatePresence mode="popLayout">
                          {inProgress.map((challenge) => {
                            const challengeProgress = progress.get(challenge.id);
                            return (
                              <ChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                progress={challengeProgress?.progress || 0}
                                completed={false}
                                isDark={isDark}
                              />
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Completed Section */}
                  {completedChallenges.length > 0 && (
                    <div>
                      <h4
                        className={`text-xs font-medium uppercase tracking-wider mb-3 px-1 ${
                          isDark ? "text-zinc-500" : "text-gray-400"
                        }`}
                      >
                        Completed ({completedChallenges.length})
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                        <AnimatePresence mode="popLayout">
                          {completedChallenges.map((challenge) => {
                            const challengeProgress = progress.get(challenge.id);
                            return (
                              <ChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                progress={challengeProgress?.progress || 0}
                                completed={true}
                                isDark={isDark}
                              />
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {challenges.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Trophy
                        size={48}
                        className={isDark ? "text-zinc-700" : "text-gray-300"}
                      />
                      <p
                        className={`mt-4 text-sm ${
                          isDark ? "text-zinc-500" : "text-gray-500"
                        }`}
                      >
                        {t("no_challenges_available")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
