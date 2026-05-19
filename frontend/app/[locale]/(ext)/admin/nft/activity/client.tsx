"use client";

import { useState, useEffect, useCallback } from "react";
import { $fetch } from "@/lib/api";
import { ActivityList } from "./components/activity-list";
import { ActivityFilters, ActivityFilters as ActivityFiltersType } from "./components/activity-filters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, Activity as ActivityIcon, RefreshCw, ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function NFTActivityClient() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState<ActivityFiltersType>({
    types: [],
    collectionId: undefined,
    creatorId: undefined,
    tokenId: undefined,
    search: undefined,
  });

  const pageSize = 20;

  const fetchActivities = useCallback(async (pageNum: number, resetData: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: any = {
        page: pageNum,
        pageSize: pageSize,
        sortField: "createdAt",
        sortOrder: "DESC",
      };

      // Add filters
      if (filters.types.length > 0) {
        params.type = filters.types.join(',');
      }
      if (filters.collectionId) {
        params.collectionId = filters.collectionId;
      }
      if (filters.creatorId) {
        params.creatorId = filters.creatorId;
      }
      if (filters.tokenId) {
        params.tokenId = filters.tokenId;
      }
      if (filters.search) {
        params.search = filters.search;
      }

      const response = await $fetch({
        url: "/api/admin/nft/activity",
        params,
        silentSuccess: true,
      });

      if (response.data) {
        const newActivities = response.data.items || [];
        setActivities(resetData ? newActivities : [...activities, ...newActivities]);
        setTotalItems(response.data.pagination?.totalItems || 0);
        setHasMore(pageNum < (response.data.pagination?.totalPages || 0));
      }
    } catch (err: any) {
      console.error("Error fetching NFT activities:", err);
      setError(err.message || "Failed to load NFT activities");
    } finally {
      setIsLoading(false);
    }
  }, [filters, activities]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1);
    setActivities([]);
    fetchActivities(1, true);

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [filters]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, false);
  };

  const handleRefresh = () => {
    setPage(1);
    setActivities([]);
    fetchActivities(1, true);
  };

  const handleFilterChange = (newFilters: ActivityFiltersType) => {
    setFilters(newFilters);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    try {
      await $fetch({
        url: `/api/admin/nft/activity/${id}`,
        method: "DELETE",
      });
      setActivities(activities.filter(a => a.id !== id));
      setTotalItems(totalItems - 1);
    } catch (err: any) {
      console.error("Error deleting activity:", err);
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (activeTab === "all") return true;
    return activity.type === activeTab.toUpperCase();
  });

  const activeFilterCount =
    filters.types.length +
    (filters.collectionId ? 1 : 0) +
    (filters.creatorId ? 1 : 0) +
    (filters.tokenId ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <div className=" relative min-h-screen">
      {/* Hero Background */}
      <div className="absolute inset-0 h-[200px] bg-gradient-to-b from-muted/50 via-muted/20 to-transparent">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,white)] dark:bg-grid-black/10" />
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-[1600px]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/nft">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ActivityIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">NFT Activity</h1>
                  <p className="text-sm text-muted-foreground">
                    {totalItems} {t("total_activities")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Filters */}
            <div className="lg:col-span-3 space-y-6">
              <div className="lg:sticky lg:top-[90px] space-y-6">
                <ActivityFilters
                  onFilterChange={handleFilterChange}
                  activeFilters={filters}
                />
              </div>
            </div>

            {/* Right Content - Activity Timeline */}
            <div className="lg:col-span-9 space-y-6 w-full">
              {/* Quick Type Tabs */}
              <div className="sticky top-[88px] z-40 bg-background/95 backdrop-blur-sm pb-2">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full grid grid-cols-4 lg:grid-cols-9">
                    <TabsTrigger value="all" className="text-xs">
                      All
                      <Badge variant="outline" className="ml-1 text-[10px] px-1">
                        {activities.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="mint" className="text-xs">Mint</TabsTrigger>
                    <TabsTrigger value="sale" className="text-xs">Sale</TabsTrigger>
                    <TabsTrigger value="transfer" className="text-xs">Transfer</TabsTrigger>
                    <TabsTrigger value="list" className="text-xs">List</TabsTrigger>
                    <TabsTrigger value="bid" className="text-xs">Bid</TabsTrigger>
                    <TabsTrigger value="offer" className="text-xs">Offer</TabsTrigger>
                    <TabsTrigger value="delist" className="text-xs">Delist</TabsTrigger>
                    <TabsTrigger value="burn" className="text-xs">Burn</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Activity Timeline */}
              <div className="px-2">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="rounded-full bg-destructive/10 p-6 mb-4">
                      <ActivityIcon className="h-12 w-12 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{t("error_loading_activities")}</h3>
                    <p className="text-muted-foreground max-w-sm mb-4">{error}</p>
                    <Button onClick={handleRefresh}>{tCommon("try_again")}</Button>
                  </div>
                ) : (
                  <ActivityList
                    activities={filteredActivities}
                    isLoading={isLoading}
                    hasMore={hasMore}
                    onLoadMore={handleLoadMore}
                    onDelete={handleDelete}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <Button
          className="fixed bottom-8 right-8 rounded-full h-12 w-12 shadow-lg animate-fade-in z-30"
          onClick={scrollToTop}
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
}
