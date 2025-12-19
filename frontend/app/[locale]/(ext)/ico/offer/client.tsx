"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfferingsFilter } from "./components/offers-filter";
import { CompletedOfferings } from "./components/completed-offers";
import { useFilterStore } from "@/store/ico/offer/filter-store";
import { useOfferStore } from "@/store/ico/offer/offer-store";
import { ActiveTokenOfferings } from "./components/active-offers";
import { UpcomingTokenOfferings } from "./components/upcoming-offers";
import { OfferingsPagination } from "./components/offers-pagination";
import { useTranslations } from "next-intl";
import { Rocket, TrendingUp, Clock, Sparkles, Shield, Users } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
export default function OfferingsPageClient() {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { filters, setActiveTab, applyFilters } = useFilterStore();
  const {
    activePagination,
    upcomingPagination,
    completedPagination,
    setActivePage,
    setUpcomingPage,
    setCompletedPage,
    fetchOfferingCounts,
    activeOfferingsFetched,
    upcomingOfferingsFetched,
    completedOfferingsFetched,
  } = useOfferStore();

  // Fetch counts on mount and initial active offerings
  useEffect(() => {
    fetchOfferingCounts();
    if (!activeOfferingsFetched) {
      applyFilters(); // This will fetch active offerings by default
    }
  }, []);  // Empty dependency array - only run once on mount

  // Get the current pagination based on active tab
  const getCurrentPagination = () => {
    switch (filters.activeTab) {
      case "active":
        return activePagination;
      case "upcoming":
        return upcomingPagination;
      case "completed":
        return completedPagination;
      default:
        return activePagination;
    }
  };

  // Handle page change based on active tab
  const handlePageChange = (page: number) => {
    switch (filters.activeTab) {
      case "active":
        setActivePage(page);
        break;
      case "upcoming":
        setUpcomingPage(page);
        break;
      case "completed":
        setCompletedPage(page);
        break;
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Only fetch if this tab hasn't been fetched yet
    const shouldFetch =
      (value === "active" && !activeOfferingsFetched) ||
      (value === "upcoming" && !upcomingOfferingsFetched) ||
      (value === "completed" && !completedOfferingsFetched);

    if (shouldFetch) {
      setTimeout(() => {
        applyFilters();
      }, 0);
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "active":
        return Rocket;
      case "upcoming":
        return Clock;
      case "completed":
        return TrendingUp;
      default:
        return Rocket;
    }
  };

  const currentPagination = getCurrentPagination();
  const totalOfferings = activePagination.total + upcomingPagination.total + completedPagination.total;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: t("explore_verified_token_offerings"),
          gradient: "from-teal-500/10 to-cyan-500/10",
          iconColor: "text-teal-600",
          textColor: "text-teal-600 dark:text-teal-400",
        }}
        title={[
          { text: tCommon("discover") + " " },
          { text: t("token_offerings"), gradient: "from-teal-600 via-cyan-500 to-teal-600 dark:from-teal-400 dark:via-cyan-400 dark:to-teal-400" },
        ]}
        description={t("browse_active_upcoming_and_completed_token_offerings")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        background={{
          orbs: [
            {
              color: "#14b8a6",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#06b6d4",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#14b8a6", "#06b6d4"],
          size: 8,
        }}
      >
        <div className="mt-8">
          <StatsGroup
            stats={[
              {
                icon: Rocket,
                label: tCommon('active_offers'),
                value: activePagination.total,
                iconColor: "text-teal-600",
                iconBgColor: "bg-teal-600/10",
              },
              {
                icon: Clock,
                label: t("upcoming_offerings"),
                value: upcomingPagination.total,
                iconColor: "text-cyan-500",
                iconBgColor: "bg-cyan-500/10",
              },
              {
                icon: TrendingUp,
                label: tExt("total_offerings"),
                value: totalOfferings,
                iconColor: "text-teal-600",
                iconBgColor: "bg-teal-600/10",
              },
            ]}
          />
        </div>
      </HeroSection>

      {/* Offerings Content */}
      <div className="container mx-auto py-8">
        <div className="relative space-y-6">
          {/* Tabs Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Tabs
              defaultValue={filters.activeTab}
              className="w-full"
              onValueChange={handleTabChange}
            >
              <TabsList className="grid w-full grid-cols-3 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl">
                {[
                  { key: "active", count: activePagination.total },
                  { key: "upcoming", count: upcomingPagination.total },
                  { key: "completed", count: completedPagination.total },
                ].map(({ key, count }) => {
                  const Icon = getTabIcon(key);
                  return (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm transition-all duration-200"
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {tCommon(key as any)}
                      <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                        ({count})
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Filter Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <OfferingsFilter />
          </motion.div>

          {/* Offerings Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-6 pb-20"
          >
            {filters.activeTab === "active" && <ActiveTokenOfferings />}
            {filters.activeTab === "upcoming" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <UpcomingTokenOfferings />
              </div>
            )}
            {filters.activeTab === "completed" && <CompletedOfferings />}

            {/* Pagination */}
            <OfferingsPagination
              currentPage={getCurrentPagination().currentPage}
              totalPages={getCurrentPagination().totalPages}
              onPageChange={handlePageChange}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
