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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  ArrowUpDown,
  BarChart3,
  Binary,
  Briefcase,
  Check,
  ChevronLeft,
  CreditCard,
  DollarSign,
  Eye,
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
  Rocket,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Store,
  TicketCheck,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
};

// Feature ID constants
const FEATURE = {
  // Trading features
  TRADE: "trade",
  BINARY_TRADING: "binary_trading",
  VIEW_FOREX: "view_forex",
  DEPOSIT_FOREX: "deposit_forex",
  WITHDRAW_FOREX: "withdraw_forex",
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
  // ICO features
  VIEW_ICO: "view_ico",
  PURCHASE_ICO: "purchase_ico",
  CREATE_ICO: "create_ico",
  // P2P features
  AFFILIATE_MLM: "affiliate_mlm",
  MAKE_P2P_OFFER: "make_p2p_offer",
  BUY_P2P_OFFER: "buy_p2p_offer",
  // Staking features
  VIEW_STAKING: "view_staking",
  INVEST_STAKING: "invest_staking",
  // Support features
  ASK_FAQ: "ask_faq",
  SUPPORT_TICKET: "support_ticket",
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
    id: FEATURE.VIEW_FOREX,
    name: "Forex Market Access",
    category: CATEGORY.TRADING,
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Access to view forex trading markets and analysis",
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
    id: FEATURE.FUTURES_TRADING,
    name: "Futures Trading",
    category: CATEGORY.TRADING,
    icon: <LineChart className="h-4 w-4" />,
    description: "Access to futures contract trading functionality",
    recommendedLevel: 3,
  },
  {
    id: FEATURE.VIEW_ICO,
    name: "Token Sale Access",
    category: CATEGORY.ICO,
    icon: <Eye className="h-4 w-4" />,
    description: "Access to view available token sales and offerings",
    recommendedLevel: 1,
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
    id: FEATURE.VIEW_STAKING,
    name: "Staking Options",
    category: CATEGORY.STAKING,
    icon: <Eye className="h-4 w-4" />,
    description: "Access to view available staking options and rewards",
    recommendedLevel: 1,
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
    id: FEATURE.SUPPORT_TICKET,
    name: "Support Access",
    category: CATEGORY.SUPPORT,
    icon: <TicketCheck className="h-4 w-4" />,
    description: "Ability to create and manage support tickets",
    recommendedLevel: 1,
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
  const t = useTranslations("dashboard");
  // State for the active category filter
  const [activeCategory, setActiveCategory] = useState(CATEGORY.ALL);

  // State for the search query
  const [searchQuery, setSearchQuery] = useState("");

  // State for the features configuration
  const [features, setFeatures] = useState<LevelFeature[]>(() => {
    // Initialize with existing features or default values
    if (existingFeatures.length > 0) {
      return existingFeatures;
    }

    // Default: enable features based on level
    return platformFeatures.map((feature) => {
      // Basic features enabled by default for all levels
      const basicFeatures = [
        FEATURE.VIEW_WALLETS,
        FEATURE.VIEW_ECOMMERCE,
        FEATURE.VIEW_FOREX,
        FEATURE.VIEW_ICO,
        FEATURE.VIEW_STAKING,
        FEATURE.COMMENT_BLOG,
        FEATURE.ASK_FAQ,
        FEATURE.SUPPORT_TICKET,
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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Header with back button and level info */}
      <div className="border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 flex items-center">
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
            <Shield className="h-5 w-5 text-indigo-500" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("Level")}{" "}
              {levelNumber}{" "}
              {t("Features")}
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("configure_which_features_kyc_level")} {levelNumber}{" "}
            {levelName && `(${levelName})`}
          </p>
        </div>

        <div className="flex items-center">
          <Badge
            variant="outline"
            className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
          >
            {enabledFeaturesCount}{" "}
            {t("of")}{" "}
            {platformFeatures.length}{" "}
            {t("features_enabled")}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar for categories */}
        <div className="w-48 border-r border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 flex flex-col">
          <div className="p-3">
            <Badge className="w-full justify-center py-1 mb-2">
              {enabledFeaturesCount}{" "}
              {t("of")}{" "}
              {platformFeatures.length}{" "}
              {t("Enabled")}
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
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
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
                            ? "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
                            : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:border-zinc-700"
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
          <div className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-zinc-500" />
                <Input
                  placeholder="Search features..."
                  className="pl-9 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 h-9"
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
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
                    : ""
                )}
                onClick={() => setBulkActionOpen(!bulkActionOpen)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                {t("Bulk")}
                {selectedFeatures.length > 0 && (
                  <Badge className="ml-1 bg-indigo-600 text-white">
                    {selectedFeatures.length}
                  </Badge>
                )}
              </Button>

              <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Bulk action panel */}
            <AnimatePresence>
              {bulkActionOpen && (
                <motion.div
                  className="mt-2 p-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md"
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
                    <div className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                      {selectedFeatures.length}
                      {t("features_selected")}
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
                      {t("deselect_all")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                      onClick={enableSelected}
                      disabled={selectedFeatures.length === 0}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {t("enable_selected")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                      onClick={disableSelected}
                      disabled={selectedFeatures.length === 0}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      {t("disable_selected")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Feature cards */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {filteredFeatures.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-full mb-3">
                      <Search className="h-6 w-6 text-gray-400 dark:text-zinc-500" />
                    </div>
                    <h3 className="text-base font-medium text-gray-700 dark:text-zinc-300 mb-1">
                      {t("no_features_found")}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-xs">
                      {t("try_adjusting_your_search_or_filter_criteria")}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory(CATEGORY.ALL);
                      }}
                    >
                      {t("clear_filters")}
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
                            "border transition-all hover:shadow-sm relative overflow-hidden",
                            featureConfig.enabled
                              ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10"
                              : "border-gray-200 dark:border-zinc-800",
                            isSelected &&
                              "ring-2 ring-indigo-500 dark:ring-indigo-400"
                          )}
                        >
                          {/* Selection overlay */}
                          {bulkActionOpen && (
                            <div
                              className="absolute inset-0 bg-black/5 dark:bg-white/5 z-10 flex items-center justify-center"
                              onClick={() => toggleFeatureSelection(feature.id)}
                            >
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center border-2",
                                  isSelected
                                    ? "bg-indigo-500 border-indigo-500 text-white"
                                    : "bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600"
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
                                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                                      : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
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
                              className="data-[state=checked]:bg-indigo-600"
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
                                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
                                      : "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                                  )}
                                >
                                  {feature.category}
                                </Badge>

                                <Badge
                                  variant="outline"
                                  className="text-xs px-1.5 py-0 h-5 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                                >
                                  {'L'}
                                  {feature.recommendedLevel}+
                                </Badge>
                              </div>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 rounded-full"
                                    >
                                      <Info className="h-3.5 w-3.5 text-gray-400" />
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
                                        <div>{t("category")}</div>
                                        <div className="font-medium">
                                          {feature.category}
                                        </div>
                                        <div>{t("recommended_for")}</div>
                                        <div className="font-medium">
                                          {t("Level")}
                                          {feature.recommendedLevel}+
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
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
          <div className="border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-4 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span className="font-medium">
                  {enabledFeaturesCount}
                  {t("Enabled")}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <span className="font-medium">
                  {platformFeatures.length - enabledFeaturesCount}
                  {t("Disabled")}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="font-medium">
                  {enabledAboveRecommendedCount}
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
