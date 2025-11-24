"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  Globe,
  Coins,
  Search,
  CheckSquare,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useConfigStore } from "@/store/config";
import { Skeleton } from "@/components/ui/skeleton";
import { MaintenanceBanner } from "./components/maintenance-banner";
import { PlatformDisabledBanner } from "./components/platform-disabled-banner";
import { FeatureRestrictedBanner } from "./components/feature-restricted-banner";
import { getBooleanSetting } from "@/utils/formatters";
import { useTranslations } from "next-intl";
import { siteName } from "@/lib/siteInfo";

export default function P2PLandingClient() {
  const t = useTranslations("ext");
  const {
    stats,
    isLoadingP2PStats,
    p2pStatsError,
    fetchMarketHighlights,
    fetchP2PStats,
    fetchTopCryptos,
  } = useP2PStore();

  useEffect(() => {
    fetchMarketHighlights();
    fetchP2PStats();
    fetchTopCryptos();
  }, []);

  const { settings } = useConfigStore();

  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  useEffect(() => {
    // if settings come from an async context,
    // we can detect that they've been populated here
    if (settings) {
      setIsSettingsLoaded(true);
    }
  }, [settings]);

  if (!isSettingsLoaded) {
    return null;
  }

  // Extract platform settings using the helper function with proper defaults
  const platformSettings = {
    enabled: settings?.p2pEnabled !== undefined ? getBooleanSetting(settings.p2pEnabled) : true,
    maintenanceMode: settings?.p2pMaintenanceMode !== undefined ? getBooleanSetting(settings.p2pMaintenanceMode) : false,
    allowNewOffers: settings?.p2pAllowNewOffers !== undefined ? getBooleanSetting(settings.p2pAllowNewOffers) : true,
    allowGuestBrowsing: settings?.p2pAllowGuestBrowsing !== undefined ? getBooleanSetting(settings.p2pAllowGuestBrowsing) : true,
  };

  return (
    <div className="flex w-full flex-col" style={{ minHeight: 'calc(100vh - 232px)' }}>
      {/* Status Banners */}
      <div className="container mx-auto px-4 pt-4">
        {platformSettings.maintenanceMode && <MaintenanceBanner />}
        {platformSettings.enabled === false && <PlatformDisabledBanner />}
        {platformSettings.allowGuestBrowsing === false && (
          <FeatureRestrictedBanner />
        )}
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-primary/5 px-4 py-16 md:py-24">
        <div className="space-y-6 flex items-center flex-col max-w-5xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("trade_crypto")}{" "}
            <span className="text-primary">{t("Peer-to-Peer")}</span>{" "}
            {t("with_confidence")}
          </h1>
          <p className="text-xl text-muted-foreground">
            {t("secure_fast_and_escrow_protection")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/p2p/offer">
              <Button size="lg">
                {t("start_trading")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/p2p/guide">
              <Button size="lg" variant="outline">
                {t("learn_more")}
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4 text-primary" />
              <span>{t("secure_escrow")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 text-primary" />
              <span>{t("fast_trades")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-primary" />
              <span>{t("trusted_community")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {stats &&
        Object.keys(stats).length > 0 &&
        !isNaN(stats.totalVolume) &&
        !isNaN(stats.totalOffers) &&
        !isNaN(stats.countries) &&
        !isNaN(stats.successRate) && (
          <section className="border-y bg-muted/30 py-12">
            <div className="container mx-auto max-w-6xl">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {isLoadingP2PStats ? (
                  <>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-center p-4 text-center"
                      >
                        <Skeleton className="h-8 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </>
                ) : p2pStatsError ? (
                  <div className="col-span-4 p-4 text-center text-muted-foreground">
                    <p>{t("unable_to_load_platform_statistics")}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => fetchP2PStats()}
                    >
                      {t("Retry")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-3xl font-bold">
                        / $
                        {(stats.totalVolume / 1000000).toFixed(0)}
                        {t("m+")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("trading_volume")}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-3xl font-bold">
                        {(stats.totalOffers / 1000).toFixed(0)}
                        K+
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("active_offers")}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-3xl font-bold">
                        {stats.countries}+
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("Countries")}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <div className="text-3xl font-bold">
                        {stats.successRate}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("success_rate")}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

      {/* Why Choose CryptoP2P Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.1),transparent_50%)]"></div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
              {t("why_choose")}{" "}{siteName}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("our_platform_offers_traders_worldwide")}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group">
              <div className="relative bg-gradient-to-br from-background to-muted p-1 rounded-2xl h-full transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/0 opacity-0 rounded-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="bg-background/80 dark:bg-card rounded-xl p-8 h-full relative z-10 backdrop-blur-sm">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">
                    {t("secure_escrow_protection")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("our_military-grade_escrow_fully_protected")}{" "}
                    {t("funds_are_only_is_complete")}
                  </p>
                  <div className="h-1 w-12 bg-primary/50 mt-6 rounded-full transition-all duration-300 group-hover:w-20"></div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group">
              <div className="relative bg-gradient-to-br from-background to-muted p-1 rounded-2xl h-full transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/0 opacity-0 rounded-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="bg-background/80 dark:bg-card rounded-xl p-8 h-full relative z-10 backdrop-blur-sm">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">
                    {t("global_community")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("join_our_thriving_traders_across")}{" "}
                    {stats?.countries || "100+"}
                    {t("+_countries")}{" "}
                    {t("our_reputation_system_track_records")}
                  </p>
                  <div className="h-1 w-12 bg-primary/50 mt-6 rounded-full transition-all duration-300 group-hover:w-20"></div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group">
              <div className="relative bg-gradient-to-br from-background to-muted p-1 rounded-2xl h-full transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/0 opacity-0 rounded-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
                <div className="bg-background/80 dark:bg-card rounded-xl p-8 h-full relative z-10 backdrop-blur-sm">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                    <Coins className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">
                    {t("minimal_fees")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("enjoy_the_lowest_fees_in_the_industry_at_just")}{" "}
                    {t("1%_per_completed_trade")}{" "}
                    {t("save_up_to_and_reliability")}
                  </p>
                  <div className="h-1 w-12 bg-primary/50 mt-6 rounded-full transition-all duration-300 group-hover:w-20"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 flex justify-center">
            <Link href="/p2p/guide" className="px-8 text-lg">
              <Button size="lg">
                {t("explore_all_features")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section - Completely Redesigned */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-background via-primary/5 to-background relative overflow-hidden">
        {/* Advanced Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 -right-20 w-96 h-96 bg-gradient-to-bl from-primary/15 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(var(--primary-rgb),0.1),transparent_70%)]"></div>
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          {/* Enhanced Header */}
          <div className="text-center mb-24">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="text-sm font-medium text-primary">{t("simple_process")}</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t("how_it_works")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t("our_streamlined_process_and_fast")}
            </p>
          </div>

          {/* Modern Interactive Timeline */}
          <div className="relative">
            {/* Central Timeline Line */}
            <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 transform -translate-x-1/2"></div>
            
            {/* Timeline Dots */}
            <div className="hidden lg:block absolute left-1/2 top-32 w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 shadow-lg shadow-primary/50"></div>
            <div className="hidden lg:block absolute left-1/2 top-80 w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 shadow-lg shadow-primary/50"></div>
            <div className="hidden lg:block absolute left-1/2 bottom-80 w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 shadow-lg shadow-primary/50"></div>
            <div className="hidden lg:block absolute left-1/2 bottom-32 w-4 h-4 bg-primary rounded-full transform -translate-x-1/2 shadow-lg shadow-primary/50"></div>

            {/* Step 1 - Browse & Discover */}
            <div className="flex flex-col lg:flex-row items-center mb-24 lg:mb-32">
              <div className="lg:w-1/2 lg:pr-16 order-2 lg:order-1">
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  <div className="relative bg-card/50 dark:bg-card border border-border/50 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm">
                    <div className="flex items-start mb-6">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg mr-6">
                        01
                      </div>
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                          {t("browse_offers")}
                        </h3>
                        <div className="w-16 h-1 bg-gradient-to-r from-primary to-primary/50 rounded-full mb-4"></div>
                      </div>
                    </div>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                      {t("find_the_best_filtering_system")}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm font-medium text-primary">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                        <span>{t("filter_by_payment_method_price_and_location")}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium text-primary">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                        <span>{t("compare_trader_ratings_and_reviews")}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium text-primary">
                        <div className="w-2 h-2 bg-primary rounded-full mr-3"></div>
                        <span>{t("real-time_price_updates_and_market_data")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 flex justify-center mb-12 lg:mb-0 order-1 lg:order-2">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-all duration-500 animate-pulse"></div>
                  <div className="relative w-48 h-48 md:w-56 md:h-56 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-500">
                    <div className="w-32 h-32 md:w-36 md:h-36 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-xl">
                      <Search className="h-16 w-16 md:h-20 md:w-20 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 - Select & Connect */}
            <div className="flex flex-col lg:flex-row items-center mb-24 lg:mb-32">
              <div className="lg:w-1/2 flex justify-center mb-12 lg:mb-0">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 to-green-400/10 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-all duration-500 animate-pulse"></div>
                  <div className="relative w-48 h-48 md:w-56 md:h-56 bg-gradient-to-br from-green-500/20 to-green-400/5 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-500">
                    <div className="w-32 h-32 md:w-36 md:h-36 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl">
                      <CheckSquare className="h-16 w-16 md:h-20 md:w-20 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 lg:pl-16">
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-green-400/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  <div className="relative bg-card/50 dark:bg-card border border-border/50 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm">
                    <div className="flex items-start mb-6">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg mr-6">
                        02
                      </div>
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                          {t("select_an_offer")}
                        </h3>
                        <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-green-400 rounded-full mb-4"></div>
                      </div>
                    </div>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                      {t("choose_an_offer_verified_traders")}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        <span>{t("view_trader_reputation_and_transaction_history")}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        <span>{t("instant_chat_communication_with_seller")}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        <span>{t("transparent_pricing_and_terms")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 - Secure Trade */}
            <div className="flex flex-col lg:flex-row items-center mb-24 lg:mb-32">
              <div className="lg:w-1/2 lg:pr-16 order-2 lg:order-1">
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-400/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  <div className="relative bg-card/50 dark:bg-card border border-border/50 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm">
                    <div className="flex items-start mb-6">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg mr-6">
                        03
                      </div>
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                          {t("complete_the_trade")}
                        </h3>
                        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full mb-4"></div>
                      </div>
                    </div>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                      {t("our_escrow_system_secure_transactions")}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <span>{t("real-time_chat_with_your_trading_partner")}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <span>{t("automatic_escrow_protection_for_all_funds")}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <span>{t("24/7_dispute_resolution_support")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 flex justify-center mb-12 lg:mb-0 order-1 lg:order-2">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-blue-400/10 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-all duration-500 animate-pulse"></div>
                  <div className="relative w-48 h-48 md:w-56 md:h-56 bg-gradient-to-br from-blue-500/20 to-blue-400/5 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-500">
                    <div className="w-32 h-32 md:w-36 md:h-36 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-xl">
                      <Shield className="h-16 w-16 md:h-20 md:w-20 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 - Rate & Grow */}
            <div className="flex flex-col lg:flex-row items-center">
              <div className="lg:w-1/2 flex justify-center mb-12 lg:mb-0">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/30 to-yellow-400/10 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-all duration-500 animate-pulse"></div>
                  <div className="relative w-48 h-48 md:w-56 md:h-56 bg-gradient-to-br from-yellow-500/20 to-yellow-400/5 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-500">
                    <div className="w-32 h-32 md:w-36 md:h-36 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-xl">
                      <Star className="h-16 w-16 md:h-20 md:w-20 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2 lg:pl-16">
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-yellow-400/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                  <div className="relative bg-card/50 dark:bg-card border border-border/50 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm">
                    <div className="flex items-start mb-6">
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg mr-6">
                        04
                      </div>
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                          {t("rate_your_experience")}
                        </h3>
                        <div className="w-16 h-1 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full mb-4"></div>
                      </div>
                    </div>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                      {t("share_your_trading_platform_benefits")}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                        <span>{t("build_your_reputation_score_and_credibility")}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                        <span>{t("unlock_premium_benefits_and_lower_fees")}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                        <span>{t("help_the_community_grow_and_thrive")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced CTA */}
          <div className="mt-24 text-center">
            <div className="inline-flex flex-col sm:flex-row gap-4 items-center">
              <Link href="/p2p/offer">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-lg px-8 py-4 h-auto shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  disabled={
                    !platformSettings.enabled || platformSettings.maintenanceMode
                  }
                >
                  {t("start_trading_now")}
                  <ArrowRight className="ml-3 h-5 w-5" />
                </Button>
              </Link>
              <span className="text-muted-foreground text-sm">
                {t("join_thousands_of_satisfied_traders_worldwide")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="relative z-10 rounded-2xl bg-card/80 dark:bg-card/90 border border-border/50 backdrop-blur-sm p-8 md:p-12 shadow-2xl">
            <div className="grid gap-8 md:grid-cols-2 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {t("ready_to_start_trading")}
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  {t("join_thousands_of_our_platform")}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-end">
                <Link href="/p2p/offer">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {t("browse_offers")}
                  </Button>
                </Link>
                {platformSettings.allowNewOffers &&
                  platformSettings.enabled &&
                  !platformSettings.maintenanceMode && (
                    <Link href="/p2p/offer/create">
                      <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                        {t("create_offer")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
