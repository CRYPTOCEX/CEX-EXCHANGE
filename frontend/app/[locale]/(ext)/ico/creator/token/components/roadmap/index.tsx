"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useCreatorStore } from "@/store/ico/creator/creator-store";
import { RoadmapForm } from "./form";
import { useRoadmapStore } from "@/store/ico/creator/roadmap-store";
import { useLaunchPlanStore } from "@/store/ico/launch-plan-store";
import { Link } from "@/i18n/routing";
import { RoadmapTimeline } from "./timeline";
import { RoadmapStats } from "./stats";
import {
  TrendingUp,
  Plus,
  BarChart,
  Lock,
  Sparkles,
  Search,
} from "lucide-react";
import RoadmapToolbar from "./toolbar";
import RoadmapCard from "./card";
import DeleteConfirmationDialog from "./delete-dialog";
import LoadingRoadmap from "./loading";
import { useTranslations } from "next-intl";

type TokenRoadmapProps = {
  tokenId: string;
};

export default function TokenRoadmap({ tokenId }: TokenRoadmapProps) {
  const t = useTranslations("ext");
  const { currentToken, isLoadingToken, tokenError, fetchToken } =
    useCreatorStore();
  const {
    roadmapItems,
    isLoading,
    isSubmitting,
    fetchRoadmap,
    removeRoadmapItem,
    updateRoadmapItem,
  } = useRoadmapStore();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] =
    useState<icoRoadmapItemCreationAttributes | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("all");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">(
    "newest"
  );
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");
  const timelineRef = useRef<HTMLDivElement>(null);

  // Check plan limit for roadmap items using creator store.
  const [canAddMore, setCanAddMore] = useState(true);
  const { canAddRoadmapItem } = useLaunchPlanStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  // When tokenId changes, fetch both token header and roadmap data.
  useEffect(() => {
    if (tokenId) {
      fetchRoadmap(tokenId);
    }
  }, [tokenId, fetchRoadmap]);

  // Check plan limits (using roadmap items from currentToken or from roadmap store if available)
  useEffect(() => {
    const checkLimit = async () => {
      if (currentToken) {
        const planId = currentToken.plan?.id;
        if (planId) {
          const result = await canAddRoadmapItem(planId, roadmapItems.length);
          setCanAddMore(result);
        }
      }
    };
    checkLimit();
  }, [currentToken, roadmapItems, canAddRoadmapItem]);

  // Refresh token and roadmap data.
  const refreshData = () => {
    if (tokenId) {
      fetchRoadmap(tokenId);
    }
  };

  if (isLoadingToken || isLoading) {
    return <LoadingRoadmap message="Loading roadmap data..." />;
  }

  if (tokenError || !currentToken) {
    return (
      <Alert variant="destructive" className="animate-in fade-in-50">
        <AlertTitle>{t("error_loading_roadmap")}</AlertTitle>
        <AlertDescription>
          {tokenError || "Failed to load token data"}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={refreshData}
          >
            {t("Retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const planIdLocal = currentToken.plan?.id;
  const upgradeLink = `/ico/creator/token/${tokenId}/plan/upgrade?currentPlan=${planIdLocal}`;

  // Calculate completion percentage.

  const completedItems = roadmapItems.filter((item) => item.completed).length;
  const completionPercentage =
    roadmapItems.length > 0
      ? Math.round((completedItems / roadmapItems.length) * 100)
      : 0;

  // Toggle expanded state.
  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  // Filtering and sorting.
  const getFilteredItems = () => {
    let filtered = [...roadmapItems];
    if (activeTab === "completed") {
      filtered = filtered.filter((item) => item.completed);
    } else if (activeTab === "upcoming") {
      filtered = filtered.filter((item) => !item.completed);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  const getSortedItems = (itemsArray: icoRoadmapItemAttributes[]) => {
    return [...itemsArray].sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortOrder === "oldest") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortOrder === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  };

  const filteredItems = getFilteredItems();
  const sortedRoadmapItems = getSortedItems(filteredItems);

  // Group items by month/year for timeline view.
  const groupedByDate = sortedRoadmapItems.reduce(
    (acc, item) => {
      const date = new Date(item.date);
      const monthYear = `${date.toLocaleString("default", { month: "long" })} ${date.getFullYear()}`;
      if (!acc[monthYear]) {
        acc[monthYear] = [];
      }
      acc[monthYear].push(item);
      return acc;
    },
    {} as Record<string, icoRoadmapItemAttributes[]>
  );

  const handleAddSuccess = () => {
    setIsAddingItem(false);
    refreshData();
  };

  const handleEditSuccess = () => {
    setEditingItem(null);
    refreshData();
  };

  const handleDelete = async (itemId: string) => {
    await removeRoadmapItem(tokenId, itemId);
    setShowDeleteConfirm(null);
    refreshData();
  };

  const handleToggleComplete = async (item: icoRoadmapItemAttributes) => {
    await updateRoadmapItem(tokenId, { ...item, completed: !item.completed });
    refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
            <TrendingUp className="h-6 w-6 text-primary" />
            {t("project_roadmap")}
          </h2>
          <p className="text-muted-foreground">
            {t("track_your_tokens_and_progress")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {roadmapItems.length > 0 && (
            <div className="hidden md:flex items-center gap-2 bg-muted p-2 rounded-md">
              <div className="flex items-center gap-1">
                <BarChart className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {completionPercentage}
                  {t("%_complete")}
                </span>
              </div>
              <Progress value={completionPercentage} className="w-24 h-2" />
            </div>
          )}
          <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
            <DialogTrigger asChild>
              <Button
                disabled={!canAddMore}
                onClick={() => setIsAddingItem(true)}
                className="shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("add_roadmap_item")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("add_roadmap_item")}</DialogTitle>
                <DialogDescription>
                  {t("add_a_new_project_roadmap")}.
                </DialogDescription>
              </DialogHeader>
              <RoadmapForm
                tokenId={tokenId}
                onSuccess={handleAddSuccess}
                onCancel={() => setIsAddingItem(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alert for plan limit */}
      {!canAddMore && (
        <Alert className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
          <AlertDescription className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t("youve_reached_the_your_plan")}.{" "}
            <Link
              href={upgradeLink}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("upgrade_to_add_more")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Roadmap Toolbar */}
      {roadmapItems.length > 0 && (
        <RoadmapToolbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          viewMode={viewMode}
          setViewMode={setViewMode}
          totalItems={roadmapItems.length}
          completedItems={completedItems}
          upcomingItems={roadmapItems.length - completedItems}
        />
      )}

      {/* Main Roadmap Content */}
      {roadmapItems.length > 0 ? (
        <>
          {sortedRoadmapItems.length === 0 ? (
            <Alert className="bg-muted/50">
              <Search className="h-4 w-4" />
              <AlertTitle>{t("no_matching_roadmap_items")}</AlertTitle>
              <AlertDescription>
                {t("try_adjusting_your_looking_for")}.
              </AlertDescription>
            </Alert>
          ) : viewMode === "cards" ? (
            <div className="relative" ref={timelineRef}>
              <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary/80 via-primary/50 to-muted-foreground/30 z-0 hidden md:block"></div>
              <motion.div
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence>
                  {sortedRoadmapItems.map((item, index) => (
                    <RoadmapCard
                      key={item.id}
                      item={item}
                      index={index}
                      isExpanded={!!expandedItems[item.id]}
                      toggleExpansion={() => toggleItemExpansion(item.id)}
                      handleToggleComplete={() => handleToggleComplete(item)}
                      handleEdit={() => setEditingItem(item)}
                      itemVariants={itemVariants}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            <RoadmapTimeline
              items={sortedRoadmapItems}
              groupedByDate={groupedByDate}
              onEdit={(item) => setEditingItem(item)}
              onDelete={(id) => setShowDeleteConfirm(id)}
              onToggleComplete={(item) => handleToggleComplete(item as any)}
            />
          )}
        </>
      ) : (
        <Alert className="border-dashed border-2 bg-muted/50 p-10 text-center">
          <AlertTitle>{t("no_roadmap_items_yet")}</AlertTitle>
          <AlertDescription>
            {t("create_a_roadmap_and_milestones")}.
          </AlertDescription>
          <Button
            variant="default"
            size="lg"
            className="mt-6"
            disabled={!canAddMore}
            onClick={() => setIsAddingItem(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("add_your_first_roadmap_item")}
          </Button>
        </Alert>
      )}

      {roadmapItems.length > 0 && (
        <RoadmapStats
          completionPercentage={completionPercentage}
          totalItems={roadmapItems.length}
          completedItems={completedItems}
          upcomingItems={roadmapItems.length - completedItems}
          overdueItems={
            roadmapItems.filter(
              (item) =>
                !item.completed &&
                new Date(item.date).getTime() < new Date().getTime()
            ).length
          }
        />
      )}

      {/* Edit Roadmap Item Dialog */}
      {editingItem && (
        <Dialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("edit_roadmap_item")}</DialogTitle>
              <DialogDescription>
                {t("update_the_details_of_your_roadmap_item")}.
              </DialogDescription>
            </DialogHeader>
            <RoadmapForm
              tokenId={tokenId}
              initialData={editingItem}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingItem(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={!!showDeleteConfirm}
        onOpenChange={(open) => !open && setShowDeleteConfirm(null)}
        onDelete={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
