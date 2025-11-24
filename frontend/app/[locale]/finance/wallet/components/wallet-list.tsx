"use client";

import { useState, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import {
  Search,
  ChevronRight,
  CreditCard,
  Coins,
  Leaf,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWalletStore } from "@/store/finance/wallet-store";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";
import { useConfigStore } from "@/store/config";

// Helper function to safely convert any value to a string
const safeString = (value: any): string => {
  if (value === null || value === undefined) {
    return "Unknown";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    return keys.length > 0 ? keys[0] : "Unknown";
  }
  return String(value);
};
export function WalletList() {
  const t = useTranslations("finance/wallet/components/wallet-list");
  const router = useRouter();
  const { fiatWallets, spotWallets, ecoWallets, futuresWallets } =
    useWalletStore();
  const { settings } = useConfigStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const isMobile = useIsMobile();
  
  // Check if spot wallets are enabled
  const isSpotEnabled = settings?.spotWallets === true || settings?.spotWallets === "true";

  // Normalize wallet data
  const normalizedWallets = useMemo(() => {
    function normalize(w: any, type: string) {
      const code: string = safeString(w.currency);
      return {
        ...w,
        type,
        change: w.change ?? 0,
        balance: w.balance ?? 0,
        currency: code,
        address:
          typeof w.address === "object" ? safeString(w.address) : w.address,
      };
    }
    return {
      fiat: (fiatWallets || []).map((w) => normalize(w, "FIAT")),
      spot: isSpotEnabled ? (spotWallets || []).map((w) => normalize(w, "SPOT")) : [],
      eco: (ecoWallets || []).map((w) => normalize(w, "ECO")),
      futures: (futuresWallets || []).map((w) => normalize(w, "FUTURES")),
    };
  }, [fiatWallets, spotWallets, ecoWallets, futuresWallets, isSpotEnabled]);

  // Combine all wallet types into a single array
  const allWallets = useMemo(() => {
    return [
      ...normalizedWallets.fiat,
      ...normalizedWallets.spot,
      ...normalizedWallets.eco,
      ...normalizedWallets.futures,
    ];
  }, [normalizedWallets]);

  // Filter wallets based on search term and active tab
  const filteredWallets = useMemo(() => {
    let wallets: any[] = [];

    // Filter by tab
    switch (activeTab) {
      case "fiat":
        wallets = normalizedWallets.fiat;
        break;
      case "spot":
        wallets = normalizedWallets.spot;
        break;
      case "eco":
        wallets = normalizedWallets.eco;
        break;
      case "futures":
        wallets = normalizedWallets.futures;
        break;
      default:
        wallets = allWallets;
    }

    // Filter by search term
    if (searchTerm) {
      return wallets.filter(
        (wallet) =>
          wallet.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wallet.currency.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return wallets;
  }, [allWallets, normalizedWallets, activeTab, searchTerm]);
  const walletTypeColors = {
    FIAT: {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-700 dark:text-green-300",
      icon: "bg-green-500",
    },
    SPOT: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-300",
      icon: "bg-blue-500",
    },
    ECO: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-700 dark:text-purple-300",
      icon: "bg-purple-500",
    },
    FUTURES: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      icon: "bg-amber-500",
    },
  };
  const container = {
    hidden: {
      opacity: 0,
    },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };
  const item = {
    hidden: {
      y: 10,
      opacity: 0,
    },
    show: {
      y: 0,
      opacity: 1,
    },
  };

  // Helper function to safely format percentage changes
  const formatChange = (change: number | undefined | null) => {
    if (change === undefined || change === null) return "0.00%";
    return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
  };
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search wallets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/50 dark:bg-zinc-800/50 focus:bg-white dark:focus:bg-zinc-800 transition-colors"
        />
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-5 w-full h-auto">
          <TabsTrigger
            value="all"
            className="text-xs sm:text-sm py-1.5 sm:py-2"
          >
            {t("All")}
          </TabsTrigger>
          <TabsTrigger
            value="fiat"
            className="flex items-center gap-1 text-xs sm:text-sm py-1.5 sm:py-2"
          >
            <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className={isMobile ? "hidden sm:inline" : ""}>
              {t("Fiat")}
            </span>
          </TabsTrigger>
          {isSpotEnabled && (
            <TabsTrigger
              value="spot"
              className="flex items-center gap-1 text-xs sm:text-sm py-1.5 sm:py-2"
            >
              <Coins className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className={isMobile ? "hidden sm:inline" : ""}>
                {t("Spot")}
              </span>
            </TabsTrigger>
          )}
          <TabsTrigger
            value="eco"
            className="flex items-center gap-1 text-xs sm:text-sm py-1.5 sm:py-2"
          >
            <Leaf className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className={isMobile ? "hidden sm:inline" : ""}>
              {t("Eco")}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="futures"
            className="flex items-center gap-1 text-xs sm:text-sm py-1.5 sm:py-2"
          >
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className={isMobile ? "hidden sm:inline" : ""}>
              {t("Futures")}
            </span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-3 sm:mt-4">
          {filteredWallets.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <p className="text-sm text-muted-foreground">
                {t("no_wallets_found_matching_your_criteria")}.
              </p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-2 sm:space-y-3"
            >
              {filteredWallets.map((wallet, index) => {
                const colors =
                  walletTypeColors[
                    wallet.type as keyof typeof walletTypeColors
                  ] || walletTypeColors.SPOT;
                const currencyStr = safeString(wallet.currency);
                const typeStr = safeString(wallet.type);
                const addressStr = wallet.address
                  ? safeString(wallet.address)
                  : "No address";
                return (
                  <motion.div
                    key={`${typeStr}-${currencyStr}-${index}`}
                    variants={item}
                  >
                    <button
                      onClick={() =>
                        router.push(
                          `/finance/wallet/${typeStr.toLowerCase()}/${currencyStr.toLowerCase()}`
                        )
                      }
                      className="w-full group"
                    >
                      <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-center">
                          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden mr-3 sm:mr-4 flex-shrink-0">
                            <div
                              className={`absolute inset-0 ${colors.icon} opacity-20`}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-base sm:text-lg font-bold text-white">
                                {currencyStr.substring(0, 2)}
                              </span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center">
                              <span className="text-sm sm:text-base font-medium">
                                {currencyStr}
                              </span>
                              <span
                                className={`ml-2 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                              >
                                {typeStr}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                              {addressStr}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div className="text-right mr-2 sm:mr-4">
                            <div className="text-sm sm:text-base font-semibold">
                              {wallet.balance || 0}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">
                              {typeof wallet.change === "number" ? (
                                wallet.change >= 0 ? (
                                  <span className="text-green-500">
                                    {formatChange(wallet.change)}
                                  </span>
                                ) : (
                                  <span className="text-red-500">
                                    {formatChange(wallet.change)}
                                  </span>
                                )
                              ) : (
                                <span className="text-zinc-500">
                                  0. 00%
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
