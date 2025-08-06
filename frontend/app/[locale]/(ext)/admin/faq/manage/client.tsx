"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useFAQAdminStore } from "@/store/faq/admin";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// faqAttributes interface is now imported from global types

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

// Icons
import {
  PlusCircle,
  GripVertical,
  Eye,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  X,
  Link2,
  FileQuestion,
  LayoutList,
  Layers,
  Sparkles,
} from "lucide-react";

// Feature Components
import { AdvancedSearch, AdvancedSearchFilters, type SearchFilters } from "./components/features/advanced-search";

// Dialog Components
import { PreviewFAQDialog } from "./components/dialogs/preview-faq-dialog";
import { DeleteFAQDialog } from "./components/dialogs/delete-faq-dialog";
import { BulkActionDialog } from "./components/dialogs/bulk-action-dialog";
import { ChangePageDialog } from "./components/dialogs/change-page-dialog";
import { DeletePageDialog } from "./components/dialogs/delete-page-dialog";

// Components
import { PageActionsMenu } from "./components/features/page-actions-menu";
import { useTranslations } from "next-intl";

export default function AdminFAQClient() {
  const t = useTranslations("ext");
  const { toast } = useToast();
  const {
    faqs,
    loading,
    error,
    fetchFAQs,
    updateFAQ,
    deleteFAQ,
    toggleFAQActive,
    reorderFAQs,
    bulkUpdateFAQs,
    pageLinks,
    fetchPageLinks,
    setCurrentPageContext,
    categories,
    fetchCategories,
    deletePageWithFAQs,
    enablePageFAQs,
    disablePageFAQs,
  } = useFAQAdminStore();

  const [editingFaq, setEditingFaq] = useState<Partial<faqAttributes> | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("manage");
  const [viewMode, setViewMode] = useState<"all" | "byPage">("byPage");
  const [selectedFaqs, setSelectedFaqs] = useState<string[]>([]);
  const [previewFaq, setPreviewFaq] = useState<faqAttributes | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<faqAttributes | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkActionToConfirm, setBulkActionToConfirm] = useState<string | null>(
    null
  );
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: "",
    tags: [],
    status: "all",
    category: "all",
  });
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>(
    {}
  );
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFaqId, setDraggedFaqId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropTargetPagePath, setDropTargetPagePath] = useState<string | null>(
    null
  );
  const [showFilters, setShowFilters] = useState(false);
  const [changePageDialogOpen, setChangePageDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<PageLink | null>(null);
  const [isMovingFaqs, setIsMovingFaqs] = useState(false);
  const [deletePageDialogOpen, setDeletePageDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<PageLink | null>(null);
  const [isDeletingPage, setIsDeletingPage] = useState(false);

  const router = useRouter();

  // Group FAQs by page path
  const faqsByPage = useMemo(() => {
    return pageLinks.reduce(
      (acc, page) => {
        acc[page.path] = faqs
          .filter((faq) => faq.pagePath === page.path)
          .sort((a, b) => a.order - b.order);
        return acc;
      },
      {} as Record<string, faqAttributes[]>
    );
  }, [faqs, pageLinks]);

  // Filter FAQs globally
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      // Search filter
      if (
        searchTerm &&
        !faq.question.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Category filter
      if (filterCategory !== "all" && faq.category !== filterCategory) {
        return false;
      }

      // Status filter
      if (filterStatus === "active" && !faq.status) return false;
      if (filterStatus === "inactive" && faq.status) return false;

      return true;
    });
  }, [faqs, searchTerm, filterCategory, filterStatus]);

  // Extract all unique tags from FAQs
  const allTags = useMemo(() => {
    return Array.from(new Set(faqs.flatMap((faq) => faq.tags || [])));
  }, [faqs]);

  // Fetch data on component mount
  useEffect(() => {
    fetchFAQs();
    fetchPageLinks();
    fetchCategories();
  }, [fetchFAQs, fetchPageLinks, fetchCategories]);

  // Initialize expanded state for all pages
  useEffect(() => {
    if (pageLinks.length > 0) {
      const initialExpanded = pageLinks.reduce(
        (acc, page) => {
          acc[page.path] = true; // expand all by default
          return acc;
        },
        {} as Record<string, boolean>
      );
      setExpandedPages(initialExpanded);
    }
  }, [pageLinks]);

  /**
   * Drag & Drop Handlers
   */
  const handleDragStart = useCallback(
    (faqId: string, pagePath: string | null) => {
      setIsDragging(true);
      setDraggedFaqId(faqId);
      setCurrentPageContext(pagePath);
      document.body.classList.add("dragging-faq");
    },
    [setCurrentPageContext]
  );

  // Allows dropping on an empty page container
  const handleDragOverPage = useCallback(
    (e: React.DragEvent, pagePath: string) => {
      e.preventDefault();
      if (draggedFaqId) {
        setDropTargetId(null);
        setDropTargetPagePath(pagePath);
      }
    },
    [draggedFaqId]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetFaqId: string, pagePath: string | null) => {
      e.preventDefault();
      if (draggedFaqId === targetFaqId) return;

      setDropTargetId(targetFaqId);
      setDropTargetPagePath(pagePath);
    },
    [draggedFaqId]
  );

  const handleDragEnd = useCallback(async () => {
    document.body.classList.remove("dragging-faq");
    setIsDragging(false);

    if (draggedFaqId && (dropTargetId || dropTargetPagePath)) {
      try {
        await reorderFAQs(draggedFaqId, dropTargetId, dropTargetPagePath);
        // Refresh FAQs after reordering to ensure UI is in sync
        await fetchFAQs();
      } catch (error) {
        console.error("Error reordering FAQs:", error);
        toast({
          title: "Error",
          description: "Failed to reorder FAQ. Please try again.",
          variant: "destructive",
        });
      }
    }

    setDraggedFaqId(null);
    setDropTargetId(null);
    setDropTargetPagePath(null);
  }, [
    draggedFaqId,
    dropTargetId,
    dropTargetPagePath,
    reorderFAQs,
    toast,
    fetchFAQs,
  ]);

  /**
   * Page Expand/Collapse
   */
  const togglePageExpand = useCallback((pagePath: string) => {
    setExpandedPages((prev) => ({
      ...prev,
      [pagePath]: !prev[pagePath],
    }));
  }, []);

  /**
   * CRUD Handlers
   */
  const handleDeleteFAQ = useCallback(async () => {
    if (!faqToDelete) return;
    try {
      await deleteFAQ(faqToDelete.id);
      setDeleteDialogOpen(false);
      toast({
        title: "FAQ deleted",
        description: "FAQ has been deleted successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete FAQ. Please try again.",
        variant: "destructive",
      });
    }
  }, [faqToDelete, deleteFAQ, toast]);

  const handleToggleActive = useCallback(
    async (faq: faqAttributes) => {
      try {
        const newStatus = !faq.status;
        await toggleFAQActive(faq.id, newStatus);
        toast({
          title: "Status updated",
          description: `FAQ ${newStatus ? "activated" : "deactivated"} successfully.`,
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to update FAQ status. Please try again.",
          variant: "destructive",
        });
      }
    },
    [toggleFAQActive, toast]
  );

  /**
   * Bulk Action
   */
  const executeBulkAction = useCallback(async () => {
    if (!bulkActionToConfirm || selectedFaqs.length === 0) return;

    try {
      const data: Partial<faqAttributes> = {};
      if (bulkActionToConfirm === "activate") {
        data.status = true;
      } else if (bulkActionToConfirm === "deactivate") {
        data.status = false;
      }

      await bulkUpdateFAQs(selectedFaqs, data);
      setBulkActionDialogOpen(false);
      setBulkActionToConfirm(null);
      setSelectedFaqs([]);

      toast({
        title: "Bulk action completed",
        description: `${selectedFaqs.length} FAQs have been updated.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to perform bulk action. Please try again.",
        variant: "destructive",
      });
    }
  }, [bulkActionToConfirm, selectedFaqs, bulkUpdateFAQs, toast]);

  /**
   * Searching
   */
  const handleSearch = useCallback(
    (filters: SearchFilters) => {
      // Only update if the filters have changed
      if (
        filters.query !== searchFilters.query ||
        filters.category !== searchFilters.category ||
        filters.status !== searchFilters.status ||
        JSON.stringify(filters.tags) !== JSON.stringify(searchFilters.tags)
      ) {
        setSearchFilters(filters);
        setSearchTerm(filters.query);
        setFilterCategory(filters.category || "all");
        setFilterStatus(filters.status || "all");
      }
    },
    [searchFilters]
  );

  const handleClearSearch = useCallback(() => {
    // Reset all filters to default values
    const defaultFilters: SearchFilters = {
      query: "",
      tags: [],
      status: "all",
      category: "all",
    };
    
    setSearchFilters(defaultFilters);
    setSearchTerm("");
    setFilterCategory("all");
    setFilterStatus("all");
    setSelectedFaqs([]); // Also clear selected FAQs
  }, []);

  /**
   * Render Single FAQ
   */
  const renderFAQItem = useCallback(
    (faq: faqAttributes, pagePath: string | null = null) => {
      const isDragTarget = dropTargetId === faq.id;
      const isBeingDragged = draggedFaqId === faq.id;

      return (
        <motion.div
          key={faq.id}
          className={cn(
            "flex items-center p-3 mb-2 rounded-md border bg-card transition-all hover:bg-muted/10",
            isDragTarget && "ring-2 ring-primary bg-primary/5",
            isBeingDragged && "opacity-50",
            !faq.status && "bg-muted/30"
          )}
          draggable
          onDragStart={() => handleDragStart(faq.id, pagePath)}
          onDragOver={(e) => handleDragOver(e, faq.id, pagePath)}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 flex-1">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{faq.question}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {faq.category && (
                  <Badge variant="outline" className="text-xs">
                    {faq.category}
                  </Badge>
                )}
                {!faq.status && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300"
                  >
                    {t("Inactive")}
                  </Badge>
                )}
                {faq.tags && faq.tags.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {faq.tags.length}{" "}{t("tags")}
                  </Badge>
                )}
                {faq.image && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-100 text-blue-800 border-blue-300"
                  >
                    {t("has_image")}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {faq.pagePath}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setPreviewFaq(faq);
                setPreviewDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Link href={`/admin/faq/manage/${faq.id}`}>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => {
                setFaqToDelete(faq);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Switch
              checked={faq.status}
              onCheckedChange={() => handleToggleActive(faq)}
              className="ml-2"
            />
          </div>
        </motion.div>
      );
    },
    [
      dropTargetId,
      draggedFaqId,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      router,
      setPreviewFaq,
      setPreviewDialogOpen,
      handleToggleActive,
    ]
  );

  /**
   * Move FAQs to a new page
   */
  const handleMoveFaqs = useCallback(
    async (newPagePath: string) => {
      if (!selectedPage) return;

      setIsMovingFaqs(true);
      try {
        // All FAQs for the "from" page
        const pageFaqs = faqs.filter(
          (faq) => faq.pagePath === selectedPage.path
        );

        // Update each FAQ's pagePath
        await Promise.all(
          pageFaqs.map((faq) =>
            updateFAQ(faq.id, {
              ...faq,
              pagePath: newPagePath,
            })
          )
        );

        toast({
          title: "FAQs moved",
          description: `Successfully moved ${pageFaqs.length} FAQs to ${newPagePath}`,
        });

        setChangePageDialogOpen(false);
        fetchFAQs(); // Refresh list
      } catch (err) {
        console.error("Error moving FAQs:", err);
        toast({
          title: "Error",
          description: "Failed to move FAQs. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsMovingFaqs(false);
      }
    },
    [selectedPage, faqs, updateFAQ, fetchFAQs, toast]
  );

  /**
   * Delete Page
   */
  const handleDeletePage = useCallback((page: PageLink) => {
    setPageToDelete(page);
    setDeletePageDialogOpen(true);
  }, []);

  const confirmDeletePage = useCallback(async () => {
    if (!pageToDelete) return;

    setIsDeletingPage(true);
    try {
      const success = await deletePageWithFAQs(pageToDelete.path);
      if (success) {
        toast({
          title: "Page deleted",
          description: "The page and all its FAQs have been deleted.",
        });
        setDeletePageDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to delete page. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error deleting page:", err);
      toast({
        title: "Error",
        description: "Failed to delete page. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingPage(false);
    }
  }, [pageToDelete, deletePageWithFAQs, toast]);

  /**
   * Enable/Disable All FAQs on Page
   */
  const handleEnablePageFaqs = useCallback(
    async (page: PageLink) => {
      try {
        const success = await enablePageFAQs(page.path);
        if (success) {
          toast({
            title: "FAQs enabled",
            description: `All FAQs on ${page.name} have been enabled.`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to enable FAQs. Please try again.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error enabling FAQs:", err);
        toast({
          title: "Error",
          description: "Failed to enable FAQs. Please try again.",
          variant: "destructive",
        });
      }
    },
    [enablePageFAQs, toast]
  );

  const handleDisablePageFaqs = useCallback(
    async (page: PageLink) => {
      try {
        const success = await disablePageFAQs(page.path);
        if (success) {
          toast({
            title: "FAQs disabled",
            description: `All FAQs on ${page.name} have been disabled.`,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to disable FAQs. Please try again.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Error disabling FAQs:", err);
        toast({
          title: "Error",
          description: "Failed to disable FAQs. Please try again.",
          variant: "destructive",
        });
      }
    },
    [disablePageFAQs, toast]
  );

  /**
   * Render a single Page section (with its FAQs)
   */
  const renderPageSection = useCallback(
    (page: PageLink) => {
      const pageFaqs = faqsByPage[page.path] || [];
      // Filter them by current search & status
      const filteredPageFaqs = pageFaqs.filter((faq) => {
        if (
          searchTerm &&
          !faq.question.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        if (filterCategory !== "all" && faq.category !== filterCategory) {
          return false;
        }
        if (filterStatus === "active" && !faq.status) return false;
        if (filterStatus === "inactive" && faq.status) return false;
        return true;
      });

      return (
        <motion.div
          key={page.id}
          className="border rounded-lg overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between p-4 bg-muted/30">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium">{page.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {page.group}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {page.path}
              </Badge>
              <Badge variant="outline">{filteredPageFaqs.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPage(page);
                  setChangePageDialogOpen(true);
                }}
                disabled={filteredPageFaqs.length === 0}
              >
                {t("move_faqs")}
              </Button>
              <PageActionsMenu
                page={page}
                faqCount={filteredPageFaqs.length}
                onDeletePage={handleDeletePage}
                onEnableFaqs={handleEnablePageFaqs}
                onDisableFaqs={handleDisablePageFaqs}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => togglePageExpand(page.path)}
              >
                {expandedPages[page.path] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <AnimatePresence>
            {expandedPages[page.path] && (
              <motion.div
                className={cn(
                  "p-4",
                  dropTargetPagePath === page.path && !dropTargetId && "bg-primary/5 border-2 border-dashed border-primary"
                )}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                // IMPORTANT: handle drag events here so we can drop onto empty page
                onDragOver={(e) => handleDragOverPage(e, page.path)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDragEnd();
                }}
              >
                {filteredPageFaqs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    {t("no_faqs_found_for_this_page_matching_your_filters")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPageFaqs.map((faq) =>
                      renderFAQItem(faq, page.path)
                    )}
                  </div>
                )}
                <div className="mt-4 flex justify-center">
                  <Link
                    href={`/admin/faq/manage/new?page=${encodeURIComponent(page.path)}`}
                  >
                    <Button variant="outline" type="button" size="sm">
                      <PlusCircle className="mr-2 h-3 w-3" />
                      {t("add_faq_to")}{" "}
                      {page.name}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    },
    [
      faqsByPage,
      searchTerm,
      filterCategory,
      filterStatus,
      expandedPages,
      togglePageExpand,
      setCurrentPageContext,
      renderFAQItem,
      handleDeletePage,
      handleEnablePageFaqs,
      handleDisablePageFaqs,
      setSelectedPage,
      setChangePageDialogOpen,
      handleDragOverPage,
      handleDragEnd,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t("faq_management")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("create_and_manage_your_users")}.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/faq/manage/new">
              <Button type="button">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("add_faq")}
              </Button>
            </Link>
            <Link href="/admin/faq/ai">
              <Button
                variant="outline"
                type="button"
                className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t("ai_improve")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <AdvancedSearch
            onSearch={handleSearch}
            categories={categories}
            tags={allTags}
            onClear={handleClearSearch}
              showFilters={showFilters}
              onToggleFilters={setShowFilters}
          />
        </div>
          <div className="flex items-start gap-2 lg:pt-0">
            <div className="flex items-center border rounded-md overflow-hidden bg-background">
            <Button
              variant={viewMode === "byPage" ? "default" : "ghost"}
                size="default"
                className="rounded-none border-0"
              onClick={() => setViewMode("byPage")}
            >
              <Layers className="h-4 w-4 mr-2" />
              {t("by_page")}
            </Button>
            <Separator orientation="vertical" className="h-8" />
            <Button
              variant={viewMode === "all" ? "default" : "ghost"}
                size="default"
                className="rounded-none border-0"
              onClick={() => setViewMode("all")}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              {t("all_faqs")}
            </Button>
          </div>
        </div>
        </div>
        
        {/* Full width filter panel */}
        <AdvancedSearchFilters
          showFilters={showFilters}
          categories={categories}
          tags={allTags}
          onFiltersChange={setSearchFilters}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("loading_faqs")}.
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-destructive">
            <p>
              {t("error_loading_faqs")}
              {error}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => fetchFAQs()}
            >
              {t("try_again")}
            </Button>
          </div>
        </div>
      ) : filteredFaqs.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center h-64"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{t("no_faqs_found")}</h3>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            {searchTerm || filterCategory !== "all" || filterStatus !== "all"
              ? "No FAQs match your current filters. Try adjusting your search criteria."
              : "Get started by creating your first FAQ."}
          </p>
          {(searchTerm ||
            filterCategory !== "all" ||
            filterStatus !== "all") && (
            <Button variant="outline" onClick={handleClearSearch}>
              <X className="mr-2 h-4 w-4" />
              {t("clear_filters")}
            </Button>
          )}
        </motion.div>
      ) : viewMode === "byPage" ? (
        <div className="grid gap-6">{pageLinks.map(renderPageSection)}</div>
      ) : (
        <div className="grid gap-2">
          {filteredFaqs.map((faq) => renderFAQItem(faq))}
        </div>
      )}

      {/* Dialogs */}
      <PreviewFAQDialog
        faq={previewFaq}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        onEdit={() => {
          setPreviewDialogOpen(false);
          if (previewFaq) {
            setEditingFaq(previewFaq);
            setEditDialogOpen(true);
          }
        }}
      />

      <DeleteFAQDialog
        faq={faqToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteFAQ}
      />

      <BulkActionDialog
        action={bulkActionToConfirm as any}
        count={selectedFaqs.length}
        open={bulkActionDialogOpen}
        onOpenChange={setBulkActionDialogOpen}
        onConfirm={executeBulkAction}
      />

      {selectedPage && (
        <ChangePageDialog
          currentPage={selectedPage}
          availablePages={pageLinks}
          faqCount={faqsByPage[selectedPage.path]?.length || 0}
          open={changePageDialogOpen}
          onOpenChange={setChangePageDialogOpen}
          onConfirm={handleMoveFaqs}
          isSubmitting={isMovingFaqs}
        />
      )}

      <DeletePageDialog
        page={pageToDelete}
        faqCount={pageToDelete ? faqsByPage[pageToDelete.path]?.length || 0 : 0}
        open={deletePageDialogOpen}
        onOpenChange={setDeletePageDialogOpen}
        onConfirm={confirmDeletePage}
        isSubmitting={isDeletingPage}
      />
    </div>
  );
}
