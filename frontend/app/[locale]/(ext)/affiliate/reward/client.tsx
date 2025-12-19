"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { useRewardStore, type Reward } from "@/store/affiliate/reward-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  DollarSign,
  Filter,
  Gift,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import AffiliateRewardsLoading from "./loading";
import AffiliateRewardsErrorState from "./error-state";
import { RewardHero } from "./components/reward-hero";
import { useTranslations } from "next-intl";

export default function AffiliateRewardsClient() {
  const t = useTranslations("ext_affiliate");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const {
    rewards,
    pagination,
    loading,
    claimingRewardId,
    error,
    fetchRewards,
    claimReward,
  } = useRewardStore();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "CLAIMED" | "UNCLAIMED"
  >("ALL");
  const [sortField, setSortField] = useState<"createdAt" | "reward">(
    "createdAt"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filteredRewards, setFilteredRewards] = useState<Reward[]>([]);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
  useEffect(() => {
    fetchRewards(page, perPage);
  }, [fetchRewards, page, perPage]);
  useEffect(() => {
    if (rewards) {
      let filtered = [...rewards];

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(
          (reward) =>
            reward.condition?.title
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            reward.condition?.rewardCurrency
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }

      // Apply status filter
      if (statusFilter === "CLAIMED") {
        filtered = filtered.filter((reward) => reward.isClaimed);
      } else if (statusFilter === "UNCLAIMED") {
        filtered = filtered.filter((reward) => !reward.isClaimed);
      }

      // Apply sorting
      filtered.sort((a, b) => {
        if (sortField === "createdAt") {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        } else {
          return sortDirection === "asc"
            ? a.reward - b.reward
            : b.reward - a.reward;
        }
      });
      setFilteredRewards(filtered);
    }
  }, [rewards, searchTerm, statusFilter, sortField, sortDirection]);
  const handleSort = (field: "createdAt" | "reward") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  const handlePerPageChange = (newPerPage: string) => {
    setPerPage(Number.parseInt(newPerPage));
    setPage(1); // Reset to first page when changing items per page
  };
  const handleClaimReward = async (rewardId: string) => {
    setIsClaimDialogOpen(false);
    const success = await claimReward(rewardId);
    if (success) {
      toast.success("Reward claimed successfully!");
    }
  };

  // Calculate total rewards and unclaimed rewards
  const totalRewards =
    rewards?.reduce((total, reward) => total + reward.reward, 0) || 0;
  const unclaimedRewards = rewards?.filter((reward) => !reward.isClaimed) || [];
  const totalUnclaimedAmount = unclaimedRewards.reduce(
    (total, reward) => total + reward.reward,
    0
  );

  // Calculate pagination display values
  const totalItems = pagination?.totalItems || 0;
  const totalPages = pagination?.totalPages || 1;
  const startItem = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, totalItems);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    // Fix: Explicitly type the array as (number | string)[]
    const pageNumbers: (number | string)[] = [];
    const maxPagesToShow = 5; // Show at most 5 page numbers

    if (totalPages <= maxPagesToShow) {
      // If we have fewer pages than maxPagesToShow, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Calculate start and end of page range
      let startPage = Math.max(2, page - 1);
      let endPage = Math.min(totalPages - 1, page + 1);

      // Adjust if we're near the beginning
      if (page <= 3) {
        endPage = Math.min(totalPages - 1, maxPagesToShow - 1);
      }

      // Adjust if we're near the end
      if (page >= totalPages - 2) {
        startPage = Math.max(2, totalPages - maxPagesToShow + 2);
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push("ellipsis-start");
      }

      // Add page numbers in the middle
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push("ellipsis-end");
      }

      // Always show last page
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };
  if (loading && rewards.length === 0) {
    return <AffiliateRewardsLoading />;
  }
  if (error) {
    return <AffiliateRewardsErrorState error={error} />;
  }
  // Calculate stats for hero
  const rewardCount = pagination.totalItems || 0;
  const allTimeEarnings = rewards.reduce((sum, r) => sum + (r.reward || 0), 0);
  const thisMonth = new Date();
  const monthlyEarnings = rewards
    .filter(r => new Date(r.createdAt).getMonth() === thisMonth.getMonth())
    .reduce((sum, r) => sum + (r.reward || 0), 0);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <RewardHero
        totalRewards={rewardCount}
        totalEarnings={allTimeEarnings}
        thisMonthEarnings={monthlyEarnings}
      />

      <div className="container mx-auto pb-6 pt-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <Card className="bg-linear-to-br from-blue-600/5 to-blue-600/10 border-blue-600/20">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {tCommon("total_earnings")}
                </p>
                <p className="text-2xl md:text-3xl font-bold mt-1">
                  ${totalRewards.toFixed(2)}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {t("lifetime_earnings")}
                </p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
            </div>
            <Progress value={100} className="h-1.5 mt-4" />
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-green-500/5 to-green-500/10 border-green-500/20">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {tCommon("available_balance")}
                </p>
                <p className="text-2xl md:text-3xl font-bold mt-1">
                  ${totalUnclaimedAmount.toFixed(2)}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {tExt("ready_to_claim")}
                </p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
              </div>
            </div>
            <Progress
              value={(totalUnclaimedAmount / Math.max(totalRewards, 1)) * 100}
              className="h-1.5 mt-4 bg-muted"
              indicatorClassName="bg-green-500"
            />
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-amber-600/5 to-amber-600/10 border-amber-600/20">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {tExt("pending_rewards")}
                </p>
                <p className="text-2xl md:text-3xl font-bold mt-1">
                  {unclaimedRewards.length}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {t("unclaimed_rewards")}
                </p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-amber-600/20 flex items-center justify-center">
                <Gift className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reward History Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
          <h2 className="text-xl font-bold">{tExt("reward_history")}</h2>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("search_rewards_ellipsis")}
                className="pl-8 w-full md:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as any)}
            >
              <SelectTrigger className="w-full sm:w-[130px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Status</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("all_rewards")}</SelectItem>
                <SelectItem value="CLAIMED">Claimed</SelectItem>
                <SelectItem value="UNCLAIMED">Unclaimed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon("reward_type")}</TableHead>
                <TableHead>
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => handleSort("reward")}
                  >
                    Amount
                    {sortField === "reward" && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}
                      />
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden sm:table-cell">Currency</TableHead>
                <TableHead>
                  <div
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => handleSort("createdAt")}
                  >
                    Date
                    {sortField === "createdAt" && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}
                      />
                    )}
                  </div>
                </TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredRewards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Filter className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">
                          {t("no_rewards_found")}
                        </p>
                        {(searchTerm || statusFilter !== "ALL") && (
                          <Button
                            variant="link"
                            onClick={() => {
                              setSearchTerm("");
                              setStatusFilter("ALL");
                            }}
                          >
                            {tCommon("clear_filters")}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRewards.map((reward) => {
                    return (
                      <motion.tr
                        key={reward.id}
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          y: -10,
                        }}
                        transition={{
                          duration: 0.2,
                        }}
                        className="border-b"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {reward.condition?.title}
                            </p>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                              {reward.condition?.rewardType === "PERCENTAGE"
                                ? "Percentage"
                                : "Fixed"}{" "}
                              reward
                            </p>
                            <div className="sm:hidden mt-1">
                              <Badge
                                variant={
                                  reward.isClaimed ? "success" : "secondary"
                                }
                                className="text-xs"
                              >
                                {reward.isClaimed ? "Claimed" : "Unclaimed"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {reward.reward.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant="outline"
                            className="bg-amber-600/5 border-amber-600/20 text-xs"
                          >
                            {reward.condition?.rewardCurrency}
                            {reward.condition?.rewardChain &&
                              ` (${reward.condition.rewardChain})`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {reward.createdAt
                                ? new Date(
                                    reward.createdAt
                                  ).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            variant={reward.isClaimed ? "success" : "secondary"}
                          >
                            {reward.isClaimed ? "Claimed" : "Unclaimed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!reward.isClaimed ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedReward(reward);
                                setIsClaimDialogOpen(true);
                              }}
                              disabled={claimingRewardId === reward.id}
                              className="whitespace-nowrap"
                            >
                              {claimingRewardId === reward.id
                                ? "Claiming..."
                                : "Claim"}
                            </Button>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="sm" disabled>
                                    Claimed
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("this_reward_has_already_been_claimed")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>

        {pagination.totalPages > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Results summary */}
            <div className="text-sm text-muted-foreground order-2 sm:order-1">
              Showing {startItem} to {endItem} of {totalItems} results
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-4 order-1 sm:order-2">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {t("items_per_page_1")}:
                </span>
                <Select
                  value={perPage.toString()}
                  onValueChange={handlePerPageChange}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue placeholder={perPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page navigation */}
              <Pagination>
                <PaginationContent>
                  {/* First page button */}
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(1)}
                      disabled={page === 1}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                      <span className="sr-only">First page</span>
                    </Button>
                  </PaginationItem>

                  {/* Previous page button */}
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous page</span>
                    </Button>
                  </PaginationItem>

                  {/* Page numbers - desktop only */}
                  {getPageNumbers().map((pageNum, index) => {
                    return (
                      <PaginationItem
                        key={index}
                        className="hidden sm:inline-block"
                      >
                        {pageNum === "ellipsis-start" ||
                        pageNum === "ellipsis-end" ? (
                          <div className="flex items-center justify-center h-9 w-9">
                            <span>...</span>
                          </div>
                        ) : (
                          <Button
                            variant={pageNum === page ? "default" : "outline"}
                            size="icon"
                            onClick={() => handlePageChange(pageNum as number)}
                            className="h-9 w-9"
                          >
                            {pageNum}
                          </Button>
                        )}
                      </PaginationItem>
                    );
                  })}

                  {/* Current page indicator - mobile only */}
                  <PaginationItem className="sm:hidden">
                    <span className="px-2">
                      {page} / {totalPages}
                    </span>
                  </PaginationItem>

                  {/* Next page button */}
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handlePageChange(Math.min(totalPages, page + 1))
                      }
                      disabled={page === totalPages}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next page</span>
                    </Button>
                  </PaginationItem>

                  {/* Last page button */}
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={page === totalPages}
                      className="h-8 w-8 sm:h-9 sm:w-9"
                    >
                      <ChevronsRight className="h-4 w-4" />
                      <span className="sr-only">Last page</span>
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>

      {/* Claim Dialog */}
      <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("claim_reward")}</DialogTitle>
            <DialogDescription>
              {t("claim_your_reward_and_add_it")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-muted/50">
              <DollarSign className="h-10 w-10 md:h-12 md:w-12 text-primary mb-2" />
              <p className="text-xl md:text-2xl font-bold">
                ${selectedReward?.reward.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedReward?.condition?.rewardCurrency}
                {selectedReward?.condition?.rewardChain &&
                  ` (${selectedReward.condition.rewardChain})`}
              </p>
            </div>

            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p>
                  {t("claiming_this_reward_will_add_it")} {t("you_can_withdraw_your_available_balance")}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsClaimDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleClaimReward(selectedReward?.id || "")}
              className="w-full sm:w-auto"
            >
              {t("claim_reward")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
