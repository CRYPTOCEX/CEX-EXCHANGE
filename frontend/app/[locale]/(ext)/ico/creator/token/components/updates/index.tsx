"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UpdateForm } from "./form";
import {
  AlertCircle,
  Edit,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Calendar,
  Clock,
  FileText,
  ImageIcon,
  LinkIcon,
  Lock,
  Sparkles,
  Search,
  X,
  Filter,
  ChevronDown,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCreatorStore } from "@/store/ico/creator/creator-store";
import { useTokenUpdateStore } from "@/store/ico/creator/updates-store";
import { useLaunchPlanStore } from "@/store/ico/launch-plan-store";
import { Link } from "@/i18n/routing";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbox } from "@/components/ui/lightbox";
import { useTranslations } from "next-intl";

type TokenUpdatesProps = {
  tokenId: string;
};
export function TokenUpdates({ tokenId }: TokenUpdatesProps) {
  const t = useTranslations("ext_ico");
  const tCommon = useTranslations("common");
  const {
    updates,
    fetchUpdates,
    deleteUpdate,
    isSubmitting,
    isLoading,
    getUpdatesThisMonth,
  } = useTokenUpdateStore();
  const { currentToken, isLoadingToken, tokenError, fetchToken } =
    useCreatorStore();
  const { canAddUpdate } = useLaunchPlanStore();
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [editingUpdate, setEditingUpdate] =
    useState<icoTokenOfferingUpdateAttributes | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [canAddMore, setCanAddMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">(
    "newest"
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation variants
  const containerVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
      },
    },
  };
  useEffect(() => {
    fetchUpdates(tokenId);
  }, [tokenId, fetchUpdates]);

  // Check plan limit asynchronously
  useEffect(() => {
    const checkLimit = async () => {
      if (currentToken) {
        try {
          const planId = currentToken.plan?.id;
          if (planId) {
            const updatesThisMonth = getUpdatesThisMonth(tokenId);
            const result = await canAddUpdate(planId, updatesThisMonth.length);
            setCanAddMore(result);
          } else {
            // If there's no plan ID, default to allowing updates
            setCanAddMore(true);
          }
        } catch (error) {
          console.error("Error checking update limit:", error);
          // Default to allowing updates if there's an error
          setCanAddMore(true);
        }
      }
    };
    checkLimit();
  }, [currentToken, getUpdatesThisMonth, tokenId, canAddUpdate, updates]);

  // Refresh data after operations
  const refreshData = () => {
    if (tokenId) {
      fetchToken(tokenId);
      fetchUpdates(tokenId);
    }
  };
  if (isLoadingToken || isLoading) {
    return (
      <div className="flex flex-col justify-center items-center p-12 space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <motion.div
            className="absolute inset-0 h-12 w-12 rounded-full border-t-2 border-primary"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        </div>
        <p className="text-muted-foreground animate-pulse">
          {t("loading_updates_ellipsis")}
        </p>
      </div>
    );
  }
  if (tokenError || !currentToken) {
    return (
      <Alert variant="destructive" className="animate-in fade-in-50">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>{t("error_loading_updates")}</AlertTitle>
        <AlertDescription>
          {tokenError || "Failed to load token data"}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={refreshData}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  const planId = currentToken.plan?.id;
  const upgradeLink = `/ico/creator/token/${tokenId}/plan/upgrade?currentPlan=${planId}`;

  // Filter updates based on search query
  const getFilteredUpdates = () => {
    if (!searchQuery.trim()) return updates;
    const query = searchQuery.toLowerCase();
    return updates.filter(
      (update) =>
        update.title.toLowerCase().includes(query) ||
        update.content.toLowerCase().includes(query)
    );
  };

  // Helper: Convert createdAt to a timestamp regardless of its type (string or Date)
  const getTimestamp = (date: string | Date | undefined) => {
    if (!date) return 0;
    return date instanceof Date ? date.getTime() : new Date(date).getTime();
  };

  // Sort updates based on sort order
  const getSortedUpdates = (
    filteredUpdates: icoTokenOfferingUpdateAttributes[]
  ) => {
    return [...filteredUpdates].sort((a, b) => {
      if (sortOrder === "newest") {
        return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
      } else if (sortOrder === "oldest") {
        return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
      } else if (sortOrder === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  };
  const filteredUpdates = getFilteredUpdates();
  const sortedUpdates = getSortedUpdates(filteredUpdates);
  const handleAddSuccess = () => {
    setIsAddingUpdate(false);
    refreshData();
  };
  const handleEditSuccess = () => {
    setEditingUpdate(null);
    refreshData();
  };
  const handleDelete = async (updateId: string) => {
    await deleteUpdate(updateId);
    setShowDeleteConfirm(null);
    refreshData();
  };

  // Format date for display
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Get time ago string
  const getTimeAgo = (dateString?: string | Date) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths > 0) {
      return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  };
  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
            <MessageSquare className="h-6 w-6 text-primary" />
            {t("project_updates")}
          </h2>
          <p className="text-muted-foreground">
            {t("keep_your_investors_your_project")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddingUpdate} onOpenChange={setIsAddingUpdate}>
            <DialogTrigger asChild>
              <Button
                disabled={!canAddMore}
                onClick={() => setIsAddingUpdate(true)}
                className="shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("post_update")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{t("post_update")}</DialogTitle>
                <DialogDescription>
                  {t('share_news_milestones_or_important_information')}
                </DialogDescription>
              </DialogHeader>
              <UpdateForm
                tokenId={tokenId}
                onSuccess={handleAddSuccess}
                onCancel={() => setIsAddingUpdate(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!canAddMore && (
        <Alert className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 animate-in slide-in-from-right-5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t("youve_reached_the_maximum_number_of")}{" "}
            <Link
              href={upgradeLink}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t("upgrade_to_post_more")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {updates.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search_updates_ellipsis")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-full sm:w-[250px]"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  Sort
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{tCommon("sort_by")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortOrder}
                  onValueChange={(value) => setSortOrder(value as any)}
                >
                  <DropdownMenuRadioItem value="newest">
                    <SortDesc className="h-4 w-4 mr-2" /> {tCommon("newest_first")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">
                    <SortAsc className="h-4 w-4 mr-2" /> {tCommon("oldest_first")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="title">
                    <Filter className="h-4 w-4 mr-2" /> {tCommon("title")} (A-Z)
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {updates.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/50">
          <CardContent className="p-10 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <MessageSquare className="h-16 w-16 text-muted-foreground/40" />
                <motion.div
                  className="absolute -right-2 -top-2"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 2,
                  }}
                >
                  <Plus className="h-6 w-6 text-primary" />
                </motion.div>
              </div>
              <h3 className="text-xl font-medium mt-2">{t("no_updates_yet")}</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t("keep_your_investors_informed_by_posting")}
              </p>
              <Button
                variant="default"
                size="lg"
                className="mt-6 group"
                disabled={!canAddMore}
                onClick={() => setIsAddingUpdate(true)}
              >
                <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                {t("post_your_first_update")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : sortedUpdates.length === 0 ? (
        <Alert className="bg-muted/50">
          <Search className="h-4 w-4" />
          <AlertTitle>{t("no_matching_updates")}</AlertTitle>
          <AlertDescription>
            {tCommon('try_adjusting_your_looking_for')}
          </AlertDescription>
        </Alert>
      ) : (
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {sortedUpdates.map((update, index) => {
              return (
                <motion.div
                  key={update.id}
                  variants={itemVariants}
                  layout
                  exit={{
                    opacity: 0,
                    y: -20,
                  }}
                >
                  <Card className="overflow-hidden hover:shadow-md transition-all duration-300">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-xl">
                              {update.title}
                            </CardTitle>
                            <Badge variant="outline" className="ml-1">
                              <Clock className="h-3 w-3 mr-1" />{" "}
                              {getTimeAgo(update.createdAt)}
                            </Badge>
                          </div>
                          <CardDescription className="mt-1 flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(update.createdAt)}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="lucide lucide-more-vertical"
                              >
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="12" cy="5" r="1" />
                                <circle cx="12" cy="19" r="1" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingUpdate(update)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => setShowDeleteConfirm(update.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-line">{update.content}</p>
                      </div>

                      {Array.isArray(update.attachments) &&
                        update.attachments.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(update.attachments as IcoAttachment[]).map((attachment, idx) => (
                              <Card key={idx} className="overflow-hidden">
                                {(attachment as any).type === "image" ? (
                                  <div className="relative group">
                                    <Lightbox
                                      src={
                                        (attachment as any).url || "/img/placeholder.svg"
                                      }
                                      alt={(attachment as any).name}
                                      className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm truncate">
                                      {(attachment as any).name}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="p-4 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-2">
                                      {(attachment as any).type === "document" ? (
                                        <FileText className="h-5 w-5 text-blue-500" />
                                      ) : (
                                        <LinkIcon className="h-5 w-5 text-green-500" />
                                      )}
                                      <span className="font-medium truncate">
                                        {(attachment as any).name}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4 truncate">
                                      {(attachment as any).url}
                                    </p>
                                    <div className="mt-auto">
                                      <a
                                        href={(attachment as any).url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                                      >
                                        {(attachment as any).type === "document"
                                          ? "View Document"
                                          : "Open Link"}
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="lucide lucide-external-link h-3 w-3"
                                        >
                                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                          <polyline points="15 3 21 3 21 9" />
                                          <line
                                            x1="10"
                                            y1="14"
                                            x2="21"
                                            y2="3"
                                          />
                                        </svg>
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingUpdate}
        onOpenChange={(open) => !open && setEditingUpdate(null)}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("edit_update")}</DialogTitle>
            <DialogDescription>{t("make_changes_to_your_update_1")}</DialogDescription>
          </DialogHeader>
          {editingUpdate && (
            <UpdateForm
              tokenId={tokenId}
              update={editingUpdate}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingUpdate(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!showDeleteConfirm}
        onOpenChange={(open) => !open && setShowDeleteConfirm(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tCommon("confirm_deletion")}</DialogTitle>
            <DialogDescription>
              {t("are_you_sure_you_want_to_delete_this_update")} {tCommon('this_action_cannot_be_undone')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                showDeleteConfirm && handleDelete(showDeleteConfirm)
              }
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
