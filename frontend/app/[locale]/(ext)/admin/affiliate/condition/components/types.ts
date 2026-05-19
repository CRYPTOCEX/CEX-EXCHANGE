import {
  Wallet,
  ArrowRightLeft,
  TrendingUp,
  Target,
  BarChart3,
  Sparkles,
  Activity,
  Zap,
  Coins,
  ShoppingCart,
  Users,
  Image as ImageIcon,
  Award,
  CircleDot,
  LucideIcon,
} from "lucide-react";

export type ConditionType =
  | "DEPOSIT"
  | "TRADE"
  | "SPOT_TRADE"
  | "BINARY_WIN"
  | "INVESTMENT"
  | "AI_INVESTMENT"
  | "FOREX_INVESTMENT"
  | "ICO_CONTRIBUTION"
  | "STAKING"
  | "ECOMMERCE_PURCHASE"
  | "P2P_TRADE"
  | "NFT_TRADE"
  | "COPY_TRADING"
  | "FUTURES_TRADE"
  | "TOKEN_PURCHASE";

export interface Condition {
  id: string;
  name: string;
  title: string;
  description: string;
  type: ConditionType;
  reward: number;
  rewardType: "PERCENTAGE" | "FIXED";
  rewardWalletType: "FIAT" | "SPOT" | "ECO";
  rewardCurrency: string;
  rewardChain?: string;
  minAmount: number;
  image?: string;
  status: boolean;
}

export interface TypeConfig {
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  label: string;
}

export const CONDITION_TYPES: Record<ConditionType, TypeConfig> = {
  DEPOSIT: {
    icon: Wallet,
    color: "emerald",
    bgGradient: "from-emerald-500/20 to-emerald-600/10",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    label: "Deposit",
  },
  TRADE: {
    icon: ArrowRightLeft,
    color: "blue",
    bgGradient: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-600 dark:text-blue-400",
    label: "Trade",
  },
  SPOT_TRADE: {
    icon: TrendingUp,
    color: "cyan",
    bgGradient: "from-cyan-500/20 to-cyan-600/10",
    borderColor: "border-cyan-500/30",
    textColor: "text-cyan-600 dark:text-cyan-400",
    label: "Spot Trade",
  },
  BINARY_WIN: {
    icon: Target,
    color: "amber",
    bgGradient: "from-amber-500/20 to-amber-600/10",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-600 dark:text-amber-400",
    label: "Binary Win",
  },
  INVESTMENT: {
    icon: BarChart3,
    color: "violet",
    bgGradient: "from-violet-500/20 to-violet-600/10",
    borderColor: "border-violet-500/30",
    textColor: "text-violet-600 dark:text-violet-400",
    label: "Investment",
  },
  AI_INVESTMENT: {
    icon: Sparkles,
    color: "fuchsia",
    bgGradient: "from-fuchsia-500/20 to-fuchsia-600/10",
    borderColor: "border-fuchsia-500/30",
    textColor: "text-fuchsia-600 dark:text-fuchsia-400",
    label: "AI Investment",
  },
  FOREX_INVESTMENT: {
    icon: Activity,
    color: "teal",
    bgGradient: "from-teal-500/20 to-teal-600/10",
    borderColor: "border-teal-500/30",
    textColor: "text-teal-600 dark:text-teal-400",
    label: "Forex Investment",
  },
  ICO_CONTRIBUTION: {
    icon: Zap,
    color: "orange",
    bgGradient: "from-orange-500/20 to-orange-600/10",
    borderColor: "border-orange-500/30",
    textColor: "text-orange-600 dark:text-orange-400",
    label: "ICO Contribution",
  },
  STAKING: {
    icon: Coins,
    color: "lime",
    bgGradient: "from-lime-500/20 to-lime-600/10",
    borderColor: "border-lime-500/30",
    textColor: "text-lime-600 dark:text-lime-400",
    label: "Staking",
  },
  ECOMMERCE_PURCHASE: {
    icon: ShoppingCart,
    color: "pink",
    bgGradient: "from-pink-500/20 to-pink-600/10",
    borderColor: "border-pink-500/30",
    textColor: "text-pink-600 dark:text-pink-400",
    label: "Ecommerce",
  },
  P2P_TRADE: {
    icon: Users,
    color: "indigo",
    bgGradient: "from-indigo-500/20 to-indigo-600/10",
    borderColor: "border-indigo-500/30",
    textColor: "text-indigo-600 dark:text-indigo-400",
    label: "P2P Trade",
  },
  NFT_TRADE: {
    icon: ImageIcon,
    color: "rose",
    bgGradient: "from-rose-500/20 to-rose-600/10",
    borderColor: "border-rose-500/30",
    textColor: "text-rose-600 dark:text-rose-400",
    label: "NFT Trade",
  },
  COPY_TRADING: {
    icon: Award,
    color: "sky",
    bgGradient: "from-sky-500/20 to-sky-600/10",
    borderColor: "border-sky-500/30",
    textColor: "text-sky-600 dark:text-sky-400",
    label: "Copy Trading",
  },
  FUTURES_TRADE: {
    icon: TrendingUp,
    color: "red",
    bgGradient: "from-red-500/20 to-red-600/10",
    borderColor: "border-red-500/30",
    textColor: "text-red-600 dark:text-red-400",
    label: "Futures Trade",
  },
  TOKEN_PURCHASE: {
    icon: CircleDot,
    color: "purple",
    bgGradient: "from-purple-500/20 to-purple-600/10",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-600 dark:text-purple-400",
    label: "Token Purchase",
  },
};
