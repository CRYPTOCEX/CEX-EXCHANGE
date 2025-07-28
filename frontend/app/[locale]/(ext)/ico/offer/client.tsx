"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OfferingsFilter } from "./components/offers-filter";
import { CompletedOfferings } from "./components/completed-offers";
import { useFilterStore } from "@/store/ico/offer/filter-store";
import { useOfferStore } from "@/store/ico/offer/offer-store";
import { ActiveTokenOfferings } from "./components/active-offers";
import { UpcomingTokenOfferings } from "./components/upcoming-offers";
import { OfferingsPagination } from "./components/offers-pagination";
import { useTranslations } from "next-intl";

export default function OfferingsPageClient() {
  const t = useTranslations("ext");
  const { filters, setActiveTab, applyFilters } = useFilterStore();
  const {
    activePagination,
    upcomingPagination,
    completedPagination,
    setActivePage,
    setUpcomingPage,
    setCompletedPage,
  } = useOfferStore();

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
    // Apply filters when changing tabs
    setTimeout(() => {
      applyFilters();
    }, 0);
  };

  return (
    <div className="container py-10">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold">{t("token_offerings")}</h1>
        <p className="text-muted-foreground">
          {t("discover_and_invest_our_platform")}
        </p>
      </div>

      <div className="relative space-y-6">
        {/* Filter and Search Section */}
        <div className="flex flex-col space-y-4">
          <OfferingsFilter />

          <div className="flex justify-between items-center">
            <Tabs
              defaultValue={filters.activeTab}
              className="w-full"
              onValueChange={handleTabChange}
            >
              <TabsList className="grid w-full sm:w-auto grid-cols-3">
                <TabsTrigger value="active">{t("Active")}</TabsTrigger>
                <TabsTrigger value="upcoming">{t("Upcoming")}</TabsTrigger>
                <TabsTrigger value="completed">{t("Completed")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Offerings Content */}
        <div className="space-y-6 pb-20">
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
        </div>
      </div>
    </div>
  );
}
