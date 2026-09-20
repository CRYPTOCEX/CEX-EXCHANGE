"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowUpDown,
  Banknote,
  BarChart3,
  Binary,
  Bot,
  Boxes,
  Briefcase,
  Check,
  ChevronLeft,
  CreditCard,
  DollarSign,
  Eye,
  FileCode2,
  FileEdit,
  Filter,
  HandCoins,
  Handshake,
  HelpCircle,
  Info,
  Key,
  Layers,
  LineChart,
  MessageSquare,
  PlayCircle,
  Rocket,
  Search,
  Send,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  TicketCheck,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Feature category constants
const CATEGORY = {
  ALL: "all",
  TRADING: "trading",
  WALLET: "wallet",
  CONTENT: "content",
  ECOMMERCE: "ecommerce",
  INVESTMENT: "investment",
  ICO: "ico",
  P2P: "p2p",
  STAKING: "staking",
  SUPPORT: "support",
  NFT: "nft",
  GATEWAY: "gateway",
  COPY_TRADING: "copy_trading",
  TRADING_BOT: "trading_bot",
  HUMMINGBOT: "hummingbot",
  DEX: "dex",
};

// Feature ID constants
//
// SIX WERE REMOVED, NOT WIRED: view_forex, view_ico, view_staking, view_nft,
// view_gateway and view_copy_trading. Nothing enforced any of them — no
// `KYC_FEATURES.X` call site in `backend/src`, no `useKycGate("view_*")` in any
// frontend call site, and no mobile module mapped to one — and six of the seven
// were pre-ticked in the recommended set below, so every new level shipped them
// switched on. Wiring them would REVOKE access users have today, which is the
// reason `kycFeatureEnforcement` itself defaults off. `view_dex` is the one
// that stayed: it is half of the deliberate two-id design documented in
// `backend/src/utils/kyc.ts` for a product with no grandfathered users, and it
// is not asserted anywhere YET.
const FEATURE = {
  // Trading features
  TRADE: "trade",
  BINARY_TRADING: "binary_trading",
  DEPOSIT_FOREX: "deposit_forex",
  WITHDRAW_FOREX: "withdraw_forex",
  TRADE_FOREX: "trade_forex",
  CREATE_FOREX_ACCOUNT: "create_forex_account",
  FUTURES_TRADING: "futures_trading",
  // Wallet features
  VIEW_WALLETS: "view_wallets",
  DEPOSIT_WALLET: "deposit_wallet",
  WITHDRAW_WALLET: "withdraw_wallet",
  TRANSFER_WALLETS: "transfer_wallets",
  API_KEYS: "api_keys",
  // Content features
  AUTHOR_BLOG: "author_blog",
  COMMENT_BLOG: "comment_blog",
  // E-commerce features
  VIEW_ECOMMERCE: "view_ecommerce",
  ORDER_ECOMMERCE: "order_ecommerce",
  // Investment features
  INVEST_FOREX: "invest_forex",
  INVEST_GENERAL: "invest_general",
  INVEST_AI: "invest_ai",
  // ICO features
  PURCHASE_ICO: "purchase_ico",
  CREATE_ICO: "create_ico",
  // P2P features
  AFFILIATE_MLM: "affiliate_mlm",
  WITHDRAW_AFFILIATE: "withdraw_affiliate",
  MAKE_P2P_OFFER: "make_p2p_offer",
  BUY_P2P_OFFER: "buy_p2p_offer",
  // Staking features
  INVEST_STAKING: "invest_staking",
  WITHDRAW_STAKING: "withdraw_staking",
  // Support features
  ASK_FAQ: "ask_faq",
  SUPPORT_TICKET: "support_ticket",
  // NFT features
  CREATE_NFT: "create_nft",
  BUY_NFT: "buy_nft",
  SELL_NFT: "sell_nft",
  TRANSFER_NFT: "transfer_nft",
  DEPLOY_NFT_CONTRACT: "deploy_nft_contract",
  // Gateway features
  USE_GATEWAY: "use_gateway",
  // Copy Trading features
  COPY_TRADERS: "copy_traders",
  BECOME_TRADER: "become_trader",
  // Trading Bot features
  VIEW_TRADING_BOT: "view_trading_bot",
  TRADE_BOT_LIVE: "trade_bot_live",
  BUY_BOT_STRATEGY: "buy_bot_strategy",
  BECOME_BOT_SELLER: "become_bot_seller",
  // Hummingbot features
  VIEW_HB: "view_hb",
  // DEX / Swap features
  VIEW_DEX: "view_dex",
  SWAP_DEX: "swap_dex",
  /* The server half of this contract is `KYC_FEATURES` in
     `backend/src/utils/kyc.ts`. A feature id that exists in only one of the two
     fails OPEN — the `includes` is simply never true — which is the worst
     possible direction for a gate, so both are edited together or neither is. */
  SWAP_DIRECT: "swap_direct",
};

// Define the feature categories and their icons
const featureCategories = [
  {
    id: CATEGORY.ALL,
    name: "All Features",
    icon: <Layers className="h-4 w-4" />,
  },
  {
    id: CATEGORY.TRADING,
    name: "Trading",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    id: CATEGORY.WALLET,
    name: "Wallet",
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    id: CATEGORY.CONTENT,
    name: "Content",
    icon: <FileEdit className="h-4 w-4" />,
  },
  {
    id: CATEGORY.ECOMMERCE,
    name: "E-commerce",
    icon: <Store className="h-4 w-4" />,
  },
  {
    id: CATEGORY.INVESTMENT,
    name: "Investment",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    id: CATEGORY.ICO,
    name: "ICO",
    icon: <Rocket className="h-4 w-4" />,
  },
  {
    id: CATEGORY.P2P,
    name: "P2P",
    icon: <Handshake className="h-4 w-4" />,
  },
  {
    id: CATEGORY.STAKING,
    name: "Staking",
    icon: <Layers className="h-4 w-4" />,
  },
  {
    id: CATEGORY.SUPPORT,
    name: "Support",
    icon: <TicketCheck className="h-4 w-4" />,
  },
  {
    id: CATEGORY.NFT,
    name: "NFT",
    icon: <Layers className="h-4 w-4" />,
  },
  {
    id: CATEGORY.GATEWAY,
    name: "Gateway",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: CATEGORY.COPY_TRADING,
    name: "Copy Trading",
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: CATEGORY.TRADING_BOT,
    name: "Trading Bot",
    icon: <Bot className="h-4 w-4" />,
  },
  {
    id: CATEGORY.HUMMINGBOT,
    name: "Hummingbot",
    icon: <Boxes className="h-4 w-4" />,
  },
  {
    id: CATEGORY.DEX,
    name: "Swap (DEX)",
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
];

// Define the features with their categories and icons
export const platformFeatures = [
  {
    id: FEATURE.TRADE,
    name: "Cryptocurrency Trading",
    category: CATEGORY.TRADING,
    icon: <ArrowUpDown className="h-4 w-4" />,
    description:
      "Access to cryptocurrency trading functionality on the platform",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.VIEW_WALLETS,
    name: "Wallet Access",
    category: CATEGORY.WALLET,
    icon: <Eye className="h-4 w-4" />,
    description:
      "Access to view wallet balances, addresses, and transaction history",
    recommendedLevel: 1,
  },
  {
    id: FEATURE.DEPOSIT_WALLET,
    name: "Deposit Funds",
    category: CATEGORY.WALLET,
    icon: <DollarSign className="h-4 w-4" />,
    description:
      "Ability to deposit cryptocurrencies and fiat currencies into platform wallets",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.WITHDRAW_WALLET,
    name: "Withdraw Funds",
    category: CATEGORY.WALLET,
    icon: <CreditCard className="h-4 w-4" />,
    description:
      "Ability to withdraw cryptocurrencies and fiat currencies from platform wallets",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.TRANSFER_WALLETS,
    name: "Internal Transfers",
    category: CATEGORY.WALLET,
    icon: <ArrowUpDown className="h-4 w-4" />,
    description:
      "Ability to transfer assets between different wallets within the platform",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.API_KEYS,
    name: "API Access",
    category: CATEGORY.WALLET,
    icon: <Key className="h-4 w-4" />,
    description:
      "Ability to create and manage API keys for programmatic platform access",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.AUTHOR_BLOG,
    name: "Content Creation",
    category: CATEGORY.CONTENT,
    icon: <FileEdit className="h-4 w-4" />,
    description:
      "Ability to apply for content creation privileges on the platform blog",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.BINARY_TRADING,
    name: "Binary Options Trading",
    category: CATEGORY.TRADING,
    icon: <Binary className="h-4 w-4" />,
    description: "Access to binary options trading functionality",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.COMMENT_BLOG,
    name: "Community Engagement",
    category: CATEGORY.CONTENT,
    icon: <MessageSquare className="h-4 w-4" />,
    description:
      "Ability to comment and engage with content on the platform blog",
    recommendedLevel: 1,
  },
  {
    id: FEATURE.VIEW_ECOMMERCE,
    name: "Marketplace Access",
    category: CATEGORY.ECOMMERCE,
    icon: <Store className="h-4 w-4" />,
    description:
      "Access to view products and services in the platform marketplace",
    recommendedLevel: 1,
  },
  {
    id: FEATURE.ORDER_ECOMMERCE,
    name: "Marketplace Purchases",
    category: CATEGORY.ECOMMERCE,
    icon: <ShoppingCart className="h-4 w-4" />,
    description:
      "Ability to purchase products and services from the platform marketplace",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.ASK_FAQ,
    name: "Knowledge Base Inquiries",
    category: CATEGORY.SUPPORT,
    icon: <HelpCircle className="h-4 w-4" />,
    description: "Ability to submit questions to the platform knowledge base",
    recommendedLevel: 1,
  },
  {
    id: FEATURE.DEPOSIT_FOREX,
    name: "Forex Account Funding",
    category: CATEGORY.TRADING,
    icon: <DollarSign className="h-4 w-4" />,
    description: "Ability to fund forex trading accounts",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.WITHDRAW_FOREX,
    name: "Forex Withdrawals",
    category: CATEGORY.TRADING,
    icon: <CreditCard className="h-4 w-4" />,
    description: "Ability to withdraw funds from forex trading accounts",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.TRADE_FOREX,
    name: "Forex & Multi-Asset Live Trading",
    category: CATEGORY.TRADING,
    icon: <LineChart className="h-4 w-4" />,
    description:
      "Ability to place live (real-money) orders in the Forex & Multi-Asset trading terminal. Demo trading never requires this feature.",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.CREATE_FOREX_ACCOUNT,
    name: "Forex Live Account Opening",
    category: CATEGORY.TRADING,
    icon: <UserCheck className="h-4 w-4" />,
    description:
      "Ability to have a live MetaTrader broker account provisioned and its credentials issued. Demo accounts are never affected.",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.INVEST_FOREX,
    name: "Forex Investment Plans",
    category: CATEGORY.INVESTMENT,
    icon: <Briefcase className="h-4 w-4" />,
    description: "Access to forex-based investment plans and managed accounts",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.INVEST_GENERAL,
    name: "Investment Products",
    category: CATEGORY.INVESTMENT,
    icon: <Briefcase className="h-4 w-4" />,
    description: "Access to general investment products and opportunities",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.INVEST_AI,
    name: "AI Investment Participation",
    category: CATEGORY.INVESTMENT,
    icon: <Sparkles className="h-4 w-4" />,
    description:
      "Ability to open AI-managed trading investments funded from platform wallets",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.FUTURES_TRADING,
    name: "Futures Trading",
    category: CATEGORY.TRADING,
    icon: <LineChart className="h-4 w-4" />,
    description: "Access to futures contract trading functionality",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.PURCHASE_ICO,
    name: "Token Sale Participation",
    category: CATEGORY.ICO,
    icon: <ShoppingCart className="h-4 w-4" />,
    description: "Ability to participate in token sales and offerings",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.CREATE_ICO,
    name: "Token Sale Creation",
    category: CATEGORY.ICO,
    icon: <Rocket className="h-4 w-4" />,
    description: "Ability to create and launch token sales on the platform",
    recommendedLevel: 4,
  },
  {
    id: FEATURE.AFFILIATE_MLM,
    name: "Affiliate Program",
    category: CATEGORY.P2P,
    icon: <Users className="h-4 w-4" />,
    description: "Access to the platform's affiliate and referral program",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.WITHDRAW_AFFILIATE,
    name: "Affiliate Reward Payouts",
    category: CATEGORY.P2P,
    icon: <Banknote className="h-4 w-4" />,
    description:
      "Ability to claim earned referral rewards and have them credited to a platform wallet",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.MAKE_P2P_OFFER,
    name: "P2P Offer Creation",
    category: CATEGORY.P2P,
    icon: <HandCoins className="h-4 w-4" />,
    description: "Ability to create peer-to-peer trading offers",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.BUY_P2P_OFFER,
    name: "P2P Trading",
    category: CATEGORY.P2P,
    icon: <Handshake className="h-4 w-4" />,
    description: "Ability to participate in peer-to-peer trading",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.INVEST_STAKING,
    name: "Staking Participation",
    category: CATEGORY.STAKING,
    icon: <Layers className="h-4 w-4" />,
    description: "Ability to stake assets and earn rewards",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.WITHDRAW_STAKING,
    name: "Staking Withdrawals",
    category: CATEGORY.STAKING,
    icon: <Banknote className="h-4 w-4" />,
    description:
      "Ability to claim accrued staking earnings and withdraw staked principal. Never set this above Staking Participation — principal is locked until the end date and this is the only exit.",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.SUPPORT_TICKET,
    name: "Support Access",
    category: CATEGORY.SUPPORT,
    icon: <TicketCheck className="h-4 w-4" />,
    description: "Ability to create and manage support tickets",
    recommendedLevel: 1,
  },
  // NFT features
  {
    id: FEATURE.CREATE_NFT,
    name: "NFT Creation",
    category: CATEGORY.NFT,
    icon: <FileEdit className="h-4 w-4" />,
    description: "Ability to mint and create new NFTs on the platform",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.BUY_NFT,
    name: "NFT Purchases",
    category: CATEGORY.NFT,
    icon: <ShoppingCart className="h-4 w-4" />,
    description: "Ability to purchase NFTs from the marketplace",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.SELL_NFT,
    name: "NFT Sales",
    category: CATEGORY.NFT,
    icon: <DollarSign className="h-4 w-4" />,
    description: "Ability to list and sell NFTs on the marketplace",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.TRANSFER_NFT,
    name: "NFT Transfers",
    category: CATEGORY.NFT,
    icon: <Send className="h-4 w-4" />,
    description:
      "Ability to send an owned NFT to another address or user without a sale — the NFT equivalent of a withdrawal",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.DEPLOY_NFT_CONTRACT,
    name: "NFT Contract Deployment",
    category: CATEGORY.NFT,
    icon: <FileCode2 className="h-4 w-4" />,
    description:
      "Ability to deploy a collection smart contract on-chain. The platform-funded path spends the master wallet's gas, so this is an irreversible spend of platform funds.",
    recommendedLevel: 4,
  },
  // Gateway features
  {
    id: FEATURE.USE_GATEWAY,
    name: "Payment Gateway Usage",
    category: CATEGORY.GATEWAY,
    icon: <CreditCard className="h-4 w-4" />,
    description: "Ability to process payments through external gateways",
    recommendedLevel: 2,
  },
  // Copy Trading features
  {
    id: FEATURE.COPY_TRADERS,
    name: "Copy Traders",
    category: CATEGORY.COPY_TRADING,
    icon: <Users className="h-4 w-4" />,
    description: "Ability to copy trades from other traders on the platform",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.BECOME_TRADER,
    name: "Become a Trader",
    category: CATEGORY.COPY_TRADING,
    icon: <TrendingUp className="h-4 w-4" />,
    description: "Ability to register as a trader and allow others to copy your trades",
    recommendedLevel: 3,
  },
  // Trading Bot features
  {
    id: FEATURE.VIEW_TRADING_BOT,
    name: "Trading Bot Access",
    category: CATEGORY.TRADING_BOT,
    icon: <Eye className="h-4 w-4" />,
    description:
      "Access to the trading bot dashboard, your bot list, tradable markets and the strategy marketplace listing",
    recommendedLevel: 1,
  },
  {
    id: FEATURE.TRADE_BOT_LIVE,
    name: "Live Trading Bot Execution",
    category: CATEGORY.TRADING_BOT,
    icon: <PlayCircle className="h-4 w-4" />,
    description:
      "Ability to create and run trading bots in LIVE mode against real balances. Paper trading never requires this feature.",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.BUY_BOT_STRATEGY,
    name: "Strategy Marketplace Purchases",
    category: CATEGORY.TRADING_BOT,
    icon: <ShoppingCart className="h-4 w-4" />,
    description:
      "Ability to purchase paid trading bot strategies from the marketplace. Viewing strategies already bought is never gated.",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.BECOME_BOT_SELLER,
    name: "Become a Strategy Seller",
    category: CATEGORY.TRADING_BOT,
    icon: <Store className="h-4 w-4" />,
    description:
      "Ability to submit a strategy for marketplace review, after which every sale credits the creator real funds",
    recommendedLevel: 3,
  },
  // Hummingbot features
  {
    id: FEATURE.VIEW_HB,
    name: "Hummingbot Connector Access",
    category: CATEGORY.HUMMINGBOT,
    icon: <Boxes className="h-4 w-4" />,
    description:
      "Access to the Hummingbot setup guide, connector kit download, strategy presets and the live bot console. API-key issuance and order placement are gated separately.",
    recommendedLevel: 1,
  },
  // DEX / Swap features
  {
    id: FEATURE.VIEW_DEX,
    name: "Swap Page Access",
    category: CATEGORY.DEX,
    icon: <ArrowLeftRight className="h-4 w-4" />,
    description:
      "Access to the non-custodial Swap page, token list, quotes and swap history. Executing a swap is gated separately.",
    recommendedLevel: 1,
  },
  {
    id: FEATURE.SWAP_DEX,
    name: "Execute Swaps",
    category: CATEGORY.DEX,
    icon: <ArrowLeftRight className="h-4 w-4" />,
    description:
      "Ability to build and submit a swap transaction. The user signs from their own wallet; the platform never holds funds.",
    recommendedLevel: 2,
  },
  {
    id: FEATURE.SWAP_DIRECT,
    name: "Trade Against Operator Liquidity",
    category: CATEGORY.DEX,
    icon: <ArrowLeftRight className="h-4 w-4" />,
    description:
      "Ability to swap through a liquidity pool this platform's operator seeded. On these routes the operator is the counterparty rather than an interface, which is why it is gated separately from ordinary swaps.",
    recommendedLevel: 2,
  },
];

// Define the interface for the component props
type LevelStatus = "ACTIVE" | "DRAFT" | "INACTIVE";
interface FeatureManagementProps {
  onBack: () => void;
  levelNumber: number;
  levelName: string;
  onSave: (
    features: LevelFeature[],
    levelData?: {
      name: string;
      description: string;
      level: number;
      status: LevelStatus;
    }
  ) => void;
  existingFeatures?: LevelFeature[];
}

// Define the interface for a feature with its level-specific settings
interface LevelFeature {
  id: string;
  enabled: boolean;
}
export function FeatureManagement({
  onBack,
  levelNumber,
  levelName,
  onSave,
  existingFeatures = [],
}: FeatureManagementProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  // State for the active category filter
  const [activeCategory, setActiveCategory] = useState(CATEGORY.ALL);

  // State for the search query
  const [searchQuery, setSearchQuery] = useState("");

  // State for the features configuration
  const [features, setFeatures] = useState<LevelFeature[]>(() => {
    /*
      Initialize with existing features or default values.

      Existing rows are FILTERED against `platformFeatures` rather than returned
      verbatim. A level saved before an id was retired keeps that id in its
      `features` JSON, and the auto-save below writes whatever is in this state
      straight back — so an orphan id would be re-persisted for ever, on a level
      whose builder can no longer show it. Six such ids were retired at once
      (the dead `view_*` switches), so every level created before that carries
      them. Filtering here prunes them the first time the level is opened.
    */
    if (existingFeatures.length > 0) {
      const known = new Set(platformFeatures.map((f) => f.id));
      return existingFeatures.filter((f) => known.has(f.id));
    }

    // Default: enable features based on level
    return platformFeatures.map((feature) => {
      // Basic features enabled by default for all levels
      const basicFeatures = [
        FEATURE.VIEW_WALLETS,
        FEATURE.VIEW_ECOMMERCE,
        FEATURE.COMMENT_BLOG,
        FEATURE.ASK_FAQ,
        FEATURE.SUPPORT_TICKET,
        FEATURE.VIEW_TRADING_BOT,
        FEATURE.VIEW_HB,
      ];

      // Enable features based on recommended level
      return {
        id: feature.id,
        enabled:
          feature.recommendedLevel <= levelNumber ||
          basicFeatures.includes(feature.id),
      };
    });
  });

  // State for bulk selection
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);

  // Auto-save effect
  useEffect(() => {
    // Debounce the save operation to avoid too many calls
    const timer = setTimeout(() => {
      onSave(features);
    }, 1000);
    return () => clearTimeout(timer);
  }, [features, onSave]);

  // Filter features based on category and search query
  const filteredFeatures = platformFeatures.filter((feature) => {
    const matchesCategory =
      activeCategory === CATEGORY.ALL || feature.category === activeCategory;
    const matchesSearch =
      feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Toggle a feature on/off
  const toggleFeature = (featureId: string) => {
    setFeatures((prev) =>
      prev.map((feature) =>
        feature.id === featureId
          ? {
              ...feature,
              enabled: !feature.enabled,
            }
          : feature
      )
    );
  };

  // Toggle feature selection for bulk actions
  const toggleFeatureSelection = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  // Select all visible features
  const selectAllVisible = () => {
    setSelectedFeatures(filteredFeatures.map((f) => f.id));
  };

  // Deselect all features
  const deselectAll = () => {
    setSelectedFeatures([]);
  };

  // Enable all selected features
  const enableSelected = () => {
    setFeatures((prev) =>
      prev.map((feature) =>
        selectedFeatures.includes(feature.id)
          ? {
              ...feature,
              enabled: true,
            }
          : feature
      )
    );
    setSelectedFeatures([]);
    setBulkActionOpen(false);
  };

  // Disable all selected features
  const disableSelected = () => {
    setFeatures((prev) =>
      prev.map((feature) =>
        selectedFeatures.includes(feature.id)
          ? {
              ...feature,
              enabled: false,
            }
          : feature
      )
    );
    setSelectedFeatures([]);
    setBulkActionOpen(false);
  };

  // Get feature configuration
  const getFeatureConfig = (featureId: string) => {
    return (
      features.find((f) => f.id === featureId) || {
        id: featureId,
        enabled: false,
      }
    );
  };

  // Calculate the number of enabled features
  const enabledFeaturesCount = features.filter((f) => f.enabled).length;

  // Calculate the number of features enabled above recommended level
  const enabledAboveRecommendedCount = platformFeatures.filter(
    (f) => f.recommendedLevel > levelNumber && getFeatureConfig(f.id).enabled
  ).length;

  // Calculate stats for each category
  const categoryStats = featureCategories.map((category) => {
    if (category.id === CATEGORY.ALL) {
      return {
        ...category,
        total: platformFeatures.length,
        enabled: enabledFeaturesCount,
      };
    }
    const categoryFeatures = platformFeatures.filter(
      (f) => f.category === category.id
    );
    const enabledCount = categoryFeatures.filter(
      (f) => getFeatureConfig(f.id).enabled
    ).length;
    return {
      ...category,
      total: categoryFeatures.length,
      enabled: enabledCount,
    };
  });

  // Effect to close bulk action panel when no features are selected
  useEffect(() => {
    if (selectedFeatures.length === 0) {
      setBulkActionOpen(false);
    }
  }, [selectedFeatures]);
  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header with back button and level info */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0 mr-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">
              {tCommon("level")} {levelNumber} {tCommon("features")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("configure_which_features_kyc_level")} {levelNumber}{" "}
            {levelName && `(${levelName})`}
          </p>
        </div>

        <div className="flex items-center">
          <Badge
            variant="outline"
            className="bg-primary/10 text-foreground border-primary/30"
          >
            {enabledFeaturesCount} {tCommon("of")} {platformFeatures.length}{" "}
            {t("features_enabled")}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar for categories */}
        <div className="w-48 border-r border-border bg-surface-2 flex flex-col">
          <div className="p-3">
            <Badge className="w-full justify-center py-1 mb-2">
              {enabledFeaturesCount} {tCommon("of")} {platformFeatures.length}{" "}
              {tCommon("enabled")}
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 py-1">
              {featureCategories.map((category) => {
                const stats = categoryStats.find((c) => c.id === category.id);
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md mb-1",
                      isActive
                        ? "bg-primary/10 text-foreground font-medium"
                        : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                    )}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span>{category.name}</span>
                    </div>

                    {category.id !== CATEGORY.ALL && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "ml-1 px-1.5 py-0 h-5 text-xs",
                          isActive
                            ? "bg-primary text-primary-foreground border-transparent"
                            : "bg-surface-3 text-muted-foreground border-border-strong"
                        )}
                      >
                        {stats?.enabled || 0}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and filters */}
          <div className="border-b border-border bg-surface-2 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`${t("search_features")}…`}
                  className="pl-9 bg-card border-border-strong"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9",
                  bulkActionOpen
                    ? "bg-primary/10 text-foreground border-primary"
                    : ""
                )}
                onClick={() => setBulkActionOpen(!bulkActionOpen)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                {t("bulk")}
                {selectedFeatures.length > 0 && (
                  <Badge className="ml-1 bg-primary text-primary-foreground">
                    {selectedFeatures.length}
                  </Badge>
                )}
              </Button>

              <Button variant="outline" size="sm" className="w-9 p-0">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Bulk action panel */}
            <AnimatePresence>
              {bulkActionOpen && (
                <m.div
                  className="mt-2 p-2 bg-card border border-border-strong rounded-lg"
                  initial={{
                    opacity: 0,
                    height: 0,
                  }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm text-muted-foreground mr-2">
                      {selectedFeatures.length} {t("features_selected")}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={selectAllVisible}
                    >
                      {t("select_all_visible")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={deselectAll}
                      disabled={selectedFeatures.length === 0}
                    >
                      {tCommon("deselect_all")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 bg-success/10 text-foreground border-success/30 hover:bg-success/20 hover:text-foreground"
                      onClick={enableSelected}
                      disabled={selectedFeatures.length === 0}
                    >
                      <Check className="h-3.5 w-3.5 mr-1 text-success" />
                      {t("enable_selected")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 bg-destructive/10 text-foreground border-destructive/30 hover:bg-destructive/20 hover:text-foreground"
                      onClick={disableSelected}
                      disabled={selectedFeatures.length === 0}
                    >
                      <X className="h-3.5 w-3.5 mr-1 text-destructive" />
                      {t("disable_selected")}
                    </Button>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Feature cards */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {filteredFeatures.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-surface-3 p-3 rounded-full mb-3">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-medium text-muted-foreground mb-1">
                      {t("no_features_found")}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      {tCommon("try_adjusting_your_search_or_filter_criteria")}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory(CATEGORY.ALL);
                      }}
                    >
                      {tCommon("clear_filters")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredFeatures.map((feature) => {
                      const featureConfig = getFeatureConfig(feature.id);
                      const isSelected = selectedFeatures.includes(feature.id);
                      return (
                        <Card
                          key={feature.id}
                          className={cn(
                            "border transition-all relative overflow-hidden",
                            featureConfig.enabled
                              ? "border-primary bg-primary/5 dark:bg-primary/10"
                              : "border-border",
                            isSelected &&
                              "ring-2 ring-primary"
                          )}
                        >
                          {/* Selection overlay */}
                          {bulkActionOpen && (
                            <div
                              className="absolute inset-0 bg-foreground/5 z-10 flex items-center justify-center"
                              onClick={() => toggleFeatureSelection(feature.id)}
                            >
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center border-2",
                                  isSelected
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "bg-card border-border-strong"
                                )}
                              >
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </div>
                            </div>
                          )}

                          <CardHeader className="p-3 pb-1 flex flex-row items-start justify-between space-y-0">
                            <div className="space-y-1">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <div
                                  className={cn(
                                    "p-1.5 rounded-md",
                                    featureConfig.enabled
                                      ? "bg-primary/15 text-primary-ink"
                                      : "bg-surface-3 text-muted-foreground"
                                  )}
                                >
                                  {feature.icon}
                                </div>
                                <span>{feature.name}</span>
                              </CardTitle>
                              <CardDescription className="text-xs line-clamp-2">
                                {feature.description}
                              </CardDescription>
                            </div>

                            <Switch
                              checked={featureConfig.enabled}
                              onCheckedChange={() => toggleFeature(feature.id)}
                              className="data-[state=checked]:bg-primary"
                            />
                          </CardHeader>

                          <CardContent className="p-3 pt-0">
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs px-1.5 py-0 h-5",
                                    featureConfig.enabled
                                      ? "bg-primary/10 text-foreground border-primary/30"
                                      : "bg-surface-3 text-muted-foreground border-border-strong"
                                  )}
                                >
                                  {feature.category}
                                </Badge>

                                <Badge
                                  variant="outline"
                                  className="text-xs px-1.5 py-0 h-5 bg-primary/10 text-foreground border-primary/30"
                                >
                                  L
                                  {feature.recommendedLevel}+
                                </Badge>
                              </div>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 rounded-full"
                                    >
                                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="left"
                                    align="center"
                                    className="max-w-xs"
                                  >
                                    <div className="space-y-2">
                                      <p className="font-medium">
                                        {feature.name}
                                      </p>
                                      <p className="text-xs">
                                        {feature.description}
                                      </p>
                                      <div className="grid grid-cols-2 gap-1 text-xs">
                                        <div>{tCommon("category")}</div>
                                        <div className="font-medium">
                                          {feature.category}
                                        </div>
                                        <div>{t("recommended_for")}</div>
                                        <div className="font-medium">
                                          {tCommon("level")}{" "}
                                          {feature.recommendedLevel}+
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Compact footer */}
          <div className="border-t border-border bg-surface-2 px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-success" />
                <span className="font-medium">
                  {enabledFeaturesCount} {tCommon("enabled")}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <span className="font-medium">
                  {platformFeatures.length - enabledFeaturesCount}{" "}
                  {tCommon("disabled")}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="font-medium">
                  {enabledAboveRecommendedCount}{" "}
                  {t("enabled_above_recommended_level")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
