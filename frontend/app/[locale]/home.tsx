"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  LineChart,
  Shield,
  Zap,
  BarChart3,
  Globe,
  ArrowRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  Award,
  Star,
  CheckCircle,
  Sparkles,
  Target,
  DollarSign,
  HelpCircle,
} from "lucide-react";
import Image from "next/image";
import { AnimatedSection } from "@/app/[locale]/components/animated-section";
import { AnimatedCard } from "@/app/[locale]/components/animated-card";
import { AnimatedText } from "@/app/[locale]/components/animated-text";
import { AnimatedTicker } from "@/app/[locale]/components/animated-ticker";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { tickersWs } from "@/services/tickers-ws";
import { Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useTranslations } from "next-intl";
import { MobileAppSection } from "./components/mobile-app-section";
import { getCryptoImageUrl } from "@/utils/image-fallback";
import { useConfigStore } from "@/store/config";
import { $fetch } from "@/lib/api";

// Type definition for page content
interface PageContent {
  id: string;
  pageId: string;
  pageSource: string;
  type: string;
  title: string;
  variables: Record<string, any>;
  content: string;
  meta: string;
  status: string;
  lastModified: string;
}

// Helper function to get text from database variables only (no translation fallback)
const getContent = (pageContent: PageContent | null, path: string, defaultValue: string = "") => {
  if (!pageContent?.variables) return defaultValue;
  
  const pathParts = path.split('.');
  let value = pageContent.variables;
  
  for (const part of pathParts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return defaultValue;
    }
  }
  
  // Return the direct value or default, ensuring it's always a string
  const result = value || defaultValue;
  return result != null ? String(result) : defaultValue;
};

export default function DefaultHomePage() {
  const t = useTranslations("home");
  const [markets, setMarkets] = useState<any[]>([]);
  const [tickers, setTickers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { user } = useUserStore();
  const { settings } = useConfigStore();
  
  // Check if spot wallets are enabled
  const isSpotEnabled = settings?.spotWallets === true || settings?.spotWallets === "true";

  // Load page content from database
  useEffect(() => {
    let isMounted = true;
    let hasRun = false; // Prevent duplicate runs

    const fetchPageContent = async () => {
      // Prevent duplicate execution
      if (hasRun || !isMounted) return;
      hasRun = true;

      try {
        // Fetch only the default source (most common case)
        // Only fetch builder if explicitly needed
        const response = await $fetch<PageContent>({
          url: `/api/content/default-page/home`,
          method: "GET",
          params: {
            pageSource: 'default'
          },
          silent: true
        });

        if (!isMounted) return;

        if (response.data) {
          setPageContent(response.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Error loading page content:", error);
        }
      }
    };

    // Use a small delay to debounce StrictMode double calls
    const timeoutId = setTimeout(() => {
      fetchPageContent();
    }, 0);

    // Cleanup function
    return () => {
      isMounted = false;
      hasRun = true;
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let spotUnsubscribe: (() => void) | null = null;

    // Only fetch markets if spot is enabled
    if (!isSpotEnabled) {
      setIsLoading(false);
      return;
    }

    const fetchMarkets = async () => {
      try {
        setError(null);
        const res = await fetch("/api/exchange/market");

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        setMarkets(
          Array.isArray(data)
            ? data.map((market) => ({
                ...market,
                displaySymbol: `${market.currency}/${market.pair}`,
                symbol: `${market.currency}${market.pair}`,
              }))
            : []
        );
      } catch (e) {
        console.error("Error fetching markets:", e);
        const errorMsg =
          e instanceof Error ? e.message : "Failed to fetch markets";
        setError(errorMsg);
        setMarkets([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Use Promise.resolve().then() to handle potential unhandled rejections
    Promise.resolve()
      .then(() => fetchMarkets())
      .catch((err) => {
        console.error("Unhandled error in fetchMarkets:", err);
        setError("Unexpected error loading markets");
        setIsLoading(false);
      });

    // Initialize WebSocket connection with error handling
    try {
      tickersWs.initialize();
      spotUnsubscribe = tickersWs.subscribeToSpotData((tickers) => {
        setTickers({ ...tickers });
      });
    } catch (wsError) {
      console.error("WebSocket initialization error:", wsError);
      // Continue without WebSocket functionality
    }

    return () => {
      if (spotUnsubscribe) {
        try {
          spotUnsubscribe();
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
        }
      }
    };
  }, [isSpotEnabled]);

  const topAssets = useMemo(() => {
    if (!markets.length || !Object.keys(tickers).length) return [];
    try {
      return markets
        .map((market) => {
          const tickerKey = `${market.currency}/${market.pair}`;
          const ticker = tickers[tickerKey] || {};
          const price = Number(ticker.last) || 0;
          const change24h = Number(ticker.change) || 0;
          const marketCap = price * (market.marketCap || 1_000_000);
          const volume = Number(ticker.quoteVolume) || 0;
          return {
            name: market.currency,
            symbol: market.symbol,
            ticker: market.currency,
            currency: market.currency,
            pair: market.pair,
            price,
            change24h,
            marketCap,
            volume,
          };
        })
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10);
    } catch (error) {
      console.error("Error processing top assets:", error);
      return [];
    }
  }, [markets, tickers]);

  const formatPrice = (price: number) => {
    try {
      if (price >= 1000) {
        return price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } else if (price >= 1) {
        return price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      } else {
        return price.toLocaleString("en-US", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 6,
        });
      }
    } catch (error) {
      console.error("Error formatting price:", error);
      return "0.00";
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    if (volume >= 1) return `$${volume.toFixed(2)}`;
    if (volume > 0) return `$${volume.toFixed(8)}`;
    return `$0.00`;
  };

  const renderSkeletonRows = () =>
    Array(5)
      .fill(0)
      .map((_, index) => (
        <div
          key={`loading-${index}`}
          className={cn(
            "grid grid-cols-4 gap-4 p-4 rounded-xl animate-pulse",
            isDark ? "bg-zinc-800/30" : "bg-gray-50"
          )}
        >
          <div className="col-span-1 flex items-center gap-3">
            <div
              className={cn(
                "w-12 h-12 rounded-full",
                isDark ? "bg-zinc-700" : "bg-gray-200"
              )}
            ></div>
            <div className="flex flex-col">
              <div
                className={cn(
                  "h-4 w-16 rounded",
                  isDark ? "bg-zinc-700" : "bg-gray-200"
                )}
              ></div>
              <div
                className={cn(
                  "h-3 w-10 rounded mt-1",
                  isDark ? "bg-zinc-700" : "bg-gray-200"
                )}
              ></div>
            </div>
          </div>
          <div className="col-span-1 flex items-center justify-end">
            <div
              className={cn(
                "h-4 w-20 rounded",
                isDark ? "bg-zinc-700" : "bg-gray-200"
              )}
            ></div>
          </div>
          <div className="col-span-1 flex items-center justify-end">
            <div
              className={cn(
                "h-4 w-16 rounded",
                isDark ? "bg-zinc-700" : "bg-gray-200"
              )}
            ></div>
          </div>
          <div className="col-span-1 flex items-center justify-end">
            <div
              className={cn(
                "h-4 w-20 rounded",
                isDark ? "bg-zinc-700" : "bg-gray-200"
              )}
            ></div>
          </div>
        </div>
      ));

  // Show error state if there's an error
  if (error) {
    console.warn("Home page error:", error);
    // Still render the page but without market data
  }

  return (
    <div className="w-full bg-background text-foreground overflow-hidden">
      {/* Enhanced Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-indigo-600/20 dark:from-blue-500/30 dark:via-purple-500/30 dark:to-indigo-500/30" />
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-2000" />
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10 pt-20">
          <div className={cn(
            "flex flex-col lg:flex-row items-center gap-8 lg:gap-12",
            isSpotEnabled ? "justify-between" : "justify-center"
          )}>
            {/* Left Content */}
            <div className={cn(
              "text-center",
              isSpotEnabled ? "lg:w-3/5 lg:text-left" : "lg:text-center max-w-4xl"
            )}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800/50 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-6 md:mb-8"
              >
                <Sparkles className="w-4 h-4" />
                {getContent(pageContent, "hero.badge", "#1 Crypto Trading Platform")}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight"
              >
                <div className="-mb-1 md:-mb-2">
                  {getContent(pageContent, "hero.title", "Trade Crypto")}
                </div>
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {getContent(pageContent, "hero.subtitle", "Like a Pro")}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className={cn(
                  "text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 max-w-2xl leading-relaxed mx-auto lg:mx-0",
                  isDark ? "text-zinc-300" : "text-gray-600"
                )}
              >
                {getContent(pageContent, "hero.description", "Advanced trading tools with lightning-fast execution")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className={cn(
                  "flex flex-col sm:flex-row gap-4 mb-8 md:mb-12",
                  isSpotEnabled ? "justify-center lg:justify-start" : "justify-center"
                )}
              >
                <Link
                  href={user ? "/market" : "/register"}
                  className="group relative inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl md:rounded-2xl font-semibold transition-all duration-300 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 w-fit mx-auto sm:mx-0"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {user ? "Start Trading" : getContent(pageContent, "hero.cta", "Start Trading Free")}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 rounded-xl md:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className={cn(
                  "flex flex-wrap gap-4 md:gap-6",
                  isSpotEnabled ? "justify-center lg:justify-start" : "justify-center"
                )}
              >
                {(pageContent?.variables?.hero?.features || ["Secure Trading", "Real-time Data", "24/7 Support"]).map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span
                    className={cn(isDark ? "text-zinc-300" : "text-gray-700")}
                  >
                      {feature}
                  </span>
                </div>
                ))}
              </motion.div>
            </div>

            {/* Enhanced Market Overview - Only show if spot is enabled */}
            {isSpotEnabled && (
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="lg:w-2/5 w-full"
              >
              <div
                className={cn(
                  "relative backdrop-blur-xl rounded-2xl p-4 md:p-6 lg:p-8 shadow-2xl border",
                  isDark
                    ? "bg-zinc-900/50 border-zinc-700/50"
                    : "bg-white/80 border-white/20"
                )}
              >
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-xl" />

                <div className="relative z-10">
                  <div className="space-y-3 md:space-y-4">
                    <div className="grid grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 px-2">
                      <div>{getContent(pageContent, "marketSection.title", "Asset")}</div>
                      <div className="text-center flex gap-2">
                        <span>{getContent(pageContent, "marketSection.priceTitle", "Price")}</span> /
                        <span>{getContent(pageContent, "marketSection.capTitle", "Cap")}</span>
                      </div>
                      <div className="text-right">{getContent(pageContent, "marketSection.changeTitle", "24h")}</div>
                    </div>

                    <div className="space-y-3 md:space-y-4">
                      {isLoading || !topAssets.length
                        ? renderSkeletonRows()
                        : topAssets.slice(0, 5).map((asset, index) => (
                            <Link
                              href={`/trade?symbol=${asset.currency}-${asset.pair}`}
                              key={asset.symbol}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.5,
                                  delay: 0.1 * index,
                                }}
                                className={cn(
                                  "grid grid-cols-3 gap-2 md:gap-4 p-3 md:p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group",
                                  isDark
                                    ? "bg-zinc-800/30 hover:bg-zinc-700/50 border border-zinc-700/30 hover:border-zinc-600/50"
                                    : "bg-gray-50/80 hover:bg-white border border-gray-200/50 hover:border-gray-300/70"
                                )}
                              >
                                <div className="col-span-1 flex items-center gap-2 md:gap-3">
                                  <div
                                    className={cn(
                                      "min-w-[2rem] min-h-[2rem] w-8 h-8 md:min-w-[3rem] md:min-h-[3rem] md:w-12 md:h-12 rounded-full flex items-center justify-center overflow-hidden border-2 flex-shrink-0",
                                      isDark 
                                        ? "bg-zinc-800 border-zinc-700" 
                                        : "bg-white border-gray-200"
                                    )}
                                  >
                                    <Image
                                      src={getCryptoImageUrl(asset.currency || "generic")}
                                      alt={asset.currency || "generic"}
                                      width={32}
                                      height={32}
                                      className="w-6 h-6 md:w-8 md:h-8 object-cover"
                                      onError={(e) => {
                                        // Prevent infinite loops by checking if we already tried fallback
                                        const target = e.currentTarget;
                                        if (!target.dataset.fallbackAttempted) {
                                          target.dataset.fallbackAttempted = 'true';
                                          // Use a data URI as fallback to prevent further errors
                                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI2IiB5PSI2Ij4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iOCIgc3Ryb2tlPSIjNjk3MDdCIiBzdHJva2Utd2lkdGg9IjEuNSIvPgo8cGF0aCBkPSJtMTIuNSA3LjUtNSA1IiBzdHJva2U9IiM2OTcwN0IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0ibTcuNSA3LjUgNSA1IiBzdHJva2U9IiM2OTcwN0IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cjwvc3ZnPg==';
                                        }
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-xs md:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                      {asset.name}
                                    </div>
                                    <div
                                      className={cn(
                                        "text-[10px] md:text-xs",
                                        isDark
                                          ? "text-zinc-400"
                                          : "text-gray-500"
                                      )}
                                    >
                                      {asset.symbol}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Price and Cap stacked in middle column */}
                                <div className="col-span-1 flex flex-col items-center justify-center gap-1">
                                  <div className="font-mono font-semibold text-xs md:text-sm">
                                    {asset.price
                                      ? "$" + formatPrice(asset.price)
                                      : "--"}
                                  </div>
                                  <div className="font-medium text-[10px] md:text-xs text-gray-500 dark:text-gray-400">
                                    {asset.marketCap
                                      ? formatVolume(asset.marketCap)
                                      : "--"}
                                  </div>
                                </div>
                                
                                <div className="col-span-1 flex items-center justify-end">
                                  <div
                                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs md:text-sm font-semibold ${
                                      asset.change24h >= 0
                                        ? "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400"
                                        : "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400"
                                    }`}
                                  >
                                    {asset.change24h >= 0 ? "+" : ""}
                                    {typeof asset.change24h === "number"
                                      ? asset.change24h.toFixed(2)
                                      : asset.change24h}
                                    %
                                    {asset.change24h >= 0 ? (
                                      <ArrowUpRight className="h-3 w-3" />
                                    ) : (
                                      <ArrowDownRight className="h-3 w-3" />
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            </Link>
                          ))}
                    </div>
                  </div>

                  <div className="mt-4 md:mt-6 text-center">
                    <Link
                      href="/market"
                      className="group inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors text-sm md:text-base"
                    >
                      {getContent(pageContent, "marketSection.viewAllText", t("view_all_markets"))}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Enhanced Ticker - Only show if spot is enabled */}
      {isSpotEnabled && (
        <section
          className={cn(
            "py-6 border-y backdrop-blur-sm",
            isDark
              ? "bg-zinc-900/50 border-zinc-700/50"
              : "bg-gray-50/80 border-gray-200/50"
          )}
        >
          <AnimatedTicker assets={topAssets} />
        </section>
      )}

      {/* Enhanced Features Section */}
      <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-950/10" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <AnimatedSection className="text-center mb-12 md:mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800/50 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-6 md:mb-8"
            >
              <Award className="w-4 h-4" />
                {getContent(pageContent, "featuresSection.badge", "Why Choose Us")}
            </motion.div>

            <AnimatedText
              type="heading"
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6"
            >
                {getContent(pageContent, "featuresSection.title", "Built for")}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}
                  {getContent(pageContent, "featuresSection.subtitle", "Professional Traders")}
              </span>
            </AnimatedText>
            <AnimatedText
              type="paragraph"
              delay={0.2}
              className={cn(
                "text-lg md:text-xl max-w-3xl mx-auto leading-relaxed",
                isDark ? "text-zinc-300" : "text-gray-600"
              )}
            >
                {getContent(pageContent, "featuresSection.description", t("experience_the_most_unmatched_security"))}
            </AnimatedText>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {(pageContent?.variables?.features || [
              {
                icon: "Zap",
                title: "Fast Execution",
                description:
                  "Execute trades quickly with our reliable matching engine and responsive trading interface.",
                gradient: "from-yellow-400 to-orange-500",
                bg: "from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20",
              },
              {
                icon: "Shield",
                title: "Secure Platform",
                description:
                  "Multi-layer security with encryption, secure wallets, and authentication protocols to protect your assets.",
                gradient: "from-green-400 to-emerald-500",
                bg: "from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
              },
              {
                icon: "BarChart3",
                title: "Real-time Charts",
                description:
                  "Professional charting tools with technical indicators and market data for informed trading decisions.",
                gradient: "from-blue-400 to-cyan-500",
                bg: "from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20",
              },
            ]).map((feature, index) => {
              // Map icon strings to components
              const iconMap: Record<string, any> = {
                Zap, Shield, BarChart3, Users, Target, DollarSign, Award, Globe, LineChart
              };
              const IconComponent = iconMap[feature.icon] || Zap;
              
              return (
              <AnimatedCard
                key={`feature-${index}-${feature.title}`}
                index={index}
                className={cn(
                  "group relative overflow-hidden backdrop-blur-sm rounded-2xl p-8 border transition-all duration-500 hover:scale-105 cursor-pointer",
                  `bg-gradient-to-br ${feature.bg}`,
                  isDark ? "border-zinc-700/50" : "border-white/20"
                )}
              >
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br opacity-20 rounded-full blur-xl group-hover:opacity-30 transition-opacity duration-500" />

                <div className="relative z-10">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-r",
                      feature.gradient
                    )}
                  >
                  <IconComponent className="h-8 w-8 text-white" />
                  </div>

                  <h3 className="text-xl font-bold mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {feature.title}
                  </h3>

                  <p
                    className={cn(
                      "leading-relaxed",
                      isDark ? "text-zinc-300" : "text-gray-600"
                    )}
                  >
                    {feature.description}
                  </p>
                </div>
              </AnimatedCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Global Section */}
      <section
        className={cn(
          "py-16 md:py-24 lg:py-32 relative overflow-hidden",
          isDark ? "bg-zinc-900/30" : "bg-gray-50/50"
        )}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center">
            <AnimatedSection>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800/50 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-8"
              >
                <Globe className="w-4 h-4" />
                {getContent(pageContent, "globalSection.badge", "Global Platform")}
              </motion.div>

              <AnimatedText
                type="heading"
                className="text-4xl md:text-5xl font-bold mb-6"
              >
                {getContent(pageContent, "globalSection.title", "Reliable")}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {" "}
                  {getContent(pageContent, "globalSection.subtitle", "Trading Platform")}
                </span>
              </AnimatedText>

              <AnimatedText
                type="paragraph"
                delay={0.2}
                className={cn(
                  "text-xl mb-8 leading-relaxed",
                  isDark ? "text-zinc-300" : "text-gray-600"
                )}
              >
                {getContent(pageContent, "globalSection.description", "Experience secure cryptocurrency trading with advanced security measures and professional tools.")}
              </AnimatedText>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {(pageContent?.variables?.globalSection?.stats || [
                  {
                    icon: "Users",
                    label: "User-Friendly",
                    value: "Easy Interface",
                  },
                  {
                    icon: "Globe",
                    label: "Global Access",
                    value: "Trade Anywhere",
                  },
                  {
                    icon: "Shield",
                    label: "Secure Trading",
                    value: "Protected Assets",
                  },
                  {
                    icon: "Award",
                    label: "Quality Service",
                    value: "24/7 Support",
                  },
                ]).map((stat, index) => {
                  // Map icon strings to components
                  const iconMap: Record<string, any> = {
                    Users, Globe, Shield, Award, Zap, BarChart3, Target, DollarSign, LineChart
                  };
                  const IconComponent = iconMap[stat.icon] || Users;

                  return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl backdrop-blur-sm border",
                      isDark
                        ? "bg-zinc-800/30 border-zinc-700/50"
                        : "bg-white/80 border-white/50"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold">{stat.label}</div>
                      <div
                        className={cn(
                          "text-sm",
                          isDark ? "text-zinc-400" : "text-gray-500"
                        )}
                      >
                        {stat.value}
                      </div>
                    </div>
                  </motion.div>
                  );
                })}
              </div>
            </AnimatedSection>

            <AnimatedCard index={0} className="relative">
              <div
                className={cn(
                  "relative backdrop-blur-xl rounded-3xl p-8 border shadow-2xl",
                  isDark
                    ? "bg-zinc-900/50 border-zinc-700/50"
                    : "bg-white/80 border-white/20"
                )}
              >
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl" />

                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-6">
                    {getContent(pageContent, "globalSection.platformFeatures.title", "Platform Features")}
                  </h3>

                  <div className="space-y-4">
                    {(pageContent?.variables?.globalSection?.platformFeatures?.items || [
                      "Real-time market data and price feeds",
                      "Multiple order types for trading flexibility",
                      "Responsive web interface for all devices",
                      "Customer support and help resources",
                      "Secure wallet and account management",
                      "Professional charting and analysis tools",
                    ]).map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span
                          className={cn(
                            isDark ? "text-zinc-300" : "text-gray-700"
                          )}
                        >
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedCard>
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials */}
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <AnimatedSection className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-800/50 rounded-full px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 mb-8"
            >
              <Target className="w-4 h-4" />
              {getContent(pageContent, "gettingStarted.badge", "Get Started")}
            </motion.div>

            <AnimatedText
              type="heading"
              className="text-4xl md:text-5xl font-bold mb-6"
            >
              {getContent(pageContent, "gettingStarted.title", "Start Your")}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}
                {getContent(pageContent, "gettingStarted.subtitle", "Trading Journey")}
              </span>
            </AnimatedText>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(pageContent?.variables?.gettingStarted?.steps || [
              {
                title: "Create Account",
                description:
                  "Sign up for your free trading account with email verification and secure password setup.",
                icon: "Users",
                step: "01",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                title: "Secure Your Wallet",
                description:
                  "Set up your secure wallet with proper authentication and backup recovery methods.",
                icon: "Shield",
                step: "02",
                gradient: "from-purple-500 to-pink-500",
              },
              {
                title: "Start Trading",
                description:
                  "Explore markets, analyze charts, and execute your first trades with our intuitive platform.",
                icon: "BarChart3",
                step: "03",
                gradient: "from-orange-500 to-red-500",
              },
            ]).map((step, index) => {
              // Map icon strings to components
              const iconMap: Record<string, any> = {
                Users, Shield, BarChart3, Zap, Target, DollarSign, Award, Globe, LineChart
              };
              const IconComponent = iconMap[step.icon] || Users;

              return (
              <AnimatedCard
                key={step.title}
                index={index}
                className={cn(
                  "group relative backdrop-blur-sm rounded-2xl p-8 border transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl",
                  isDark
                    ? "bg-zinc-900/30 border-zinc-700/50 hover:border-zinc-600/70"
                    : "bg-white/80 border-white/20 hover:border-white/40"
                )}
              >
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-xl group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-all duration-500" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center text-white bg-gradient-to-r transition-all duration-300 group-hover:scale-110",
                        step.gradient
                      )}
                    >
                      <IconComponent className="w-8 h-8" />
                    </div>
                    <div className="text-4xl font-bold text-zinc-200 dark:text-zinc-700 transition-all duration-300 group-hover:text-zinc-300 dark:group-hover:text-zinc-600">
                      {step.step}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    {step.title}
                  </h3>

                  <p
                    className={cn(
                      "leading-relaxed transition-colors duration-300",
                      isDark ? "text-zinc-300 group-hover:text-zinc-200" : "text-gray-700 group-hover:text-gray-600"
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </AnimatedCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mobile App Section */}
      <MobileAppSection />

      {/* Enhanced CTA Section */}
      <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center text-white">
          <AnimatedSection>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm font-medium mb-8"
            >
              <Sparkles className="w-4 h-4" />
              {getContent(pageContent, "cta.badge", "Start Your Journey")}
            </motion.div>

            <AnimatedText
              type="heading"
              className="text-4xl md:text-6xl font-bold mb-6 text-white"
            >
              {user ? "Continue Trading" : getContent(pageContent, "cta.title", "Ready to Start Trading?")}
            </AnimatedText>

            <AnimatedText
              type="paragraph"
              delay={0.2}
              className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-white/90 leading-relaxed"
            >
              {user
                ? "Explore our markets and continue your trading journey with advanced tools and real-time data."
                : getContent(pageContent, "cta.description", "Join our platform and experience secure cryptocurrency trading with professional tools and real-time market data.")}
            </AnimatedText>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                href={user ? "/market" : "/register"}
                className="group px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 rounded-2xl font-semibold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center gap-2"
              >
                {user ? getContent(pageContent, "cta.buttonUser", "Explore Markets") : getContent(pageContent, "cta.button", "Create Free Account")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <div className="flex items-center gap-4 text-white/80">
                {(user ? 
                  pageContent?.variables?.cta?.featuresUser || ["Real-time Data", "Secure Trading"] : 
                  pageContent?.variables?.cta?.features || ["No Credit Card Required", "Free Registration"]
                ).map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>{feature}</span>
                </div>
                ))}
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
