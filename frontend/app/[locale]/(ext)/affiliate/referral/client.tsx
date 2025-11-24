"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  useReferralStore,
  type Referral,
} from "@/store/affiliate/referral-store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronDown,
  Copy,
  Filter,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Search,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { SidebarProvider } from "@/components/ui/sidebar";
export default function AffiliateReferralsClient() {
  const {
    referrals,
    pagination,
    loading,
    error,
    fetchReferrals,
    fetchReferralDetails,
  } = useReferralStore();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "PENDING" | "REJECTED"
  >("ALL");
  const [sortField, setSortField] = useState<"createdAt" | "status">(
    "createdAt"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(
    null
  );
  const [referralDetails, setReferralDetails] = useState<any>(null);
  const [isDetailSidebarOpen, setIsDetailSidebarOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  useEffect(() => {
    fetchReferrals(page, perPage);
  }, [fetchReferrals, page, perPage]);
  useEffect(() => {
    if (referrals) {
      let filtered = [...referrals];

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(
          (referral) =>
            referral.referred?.firstName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            referral.referred?.lastName
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            referral.referred?.email
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
        );
      }

      // Apply status filter
      if (statusFilter !== "ALL") {
        filtered = filtered.filter(
          (referral) => referral.status === statusFilter
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        if (sortField === "createdAt") {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        } else {
          return sortDirection === "asc"
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        }
      });
      setFilteredReferrals(filtered);
    }
  }, [referrals, searchTerm, statusFilter, sortField, sortDirection]);

  // Fetch referral details when a referral is selected
  useEffect(() => {
    async function getDetails() {
      if (selectedReferral && isDetailSidebarOpen) {
        setLoadingDetails(true);
        try {
          const details = await fetchReferralDetails(selectedReferral.id);
          setReferralDetails(details);
        } catch (error) {
          console.error("Failed to fetch referral details:", error);
          toast.error("Failed to load referral details");
        } finally {
          setLoadingDetails(false);
        }
      }
    }
    getDetails();
  }, [selectedReferral, isDetailSidebarOpen, fetchReferralDetails]);
  const handleSort = (field: "createdAt" | "status") => {
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
  const handlePerPageChange = (value: string) => {
    const newPerPage = Number.parseInt(value, 10);
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when changing items per page
    fetchReferrals(1, newPerPage);
  };
  if (loading && referrals.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 md:px-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Your Referrals</h1>
            <p className="text-muted-foreground">
              Manage and track your referred users
            </p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }
  return (
    <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl mx-auto">
      {/* Referrals List */}
      <div className="mb-6">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Your Referrals
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage and track your referred users
          </p>
        </div>
      </div>

      <div>
        <Tabs defaultValue="cards" className="w-full">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-col xs:flex-row items-center justify-between gap-3">
              <TabsList className="w-full xs:w-auto grid grid-cols-2 xs:flex">
                <TabsTrigger value="cards" className="text-xs sm:text-sm">
                  Card View
                </TabsTrigger>
                <TabsTrigger value="table" className="text-xs sm:text-sm">
                  Table View
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search referrals..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as any)}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="truncate">Status</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="table">
            <div className="rounded-md border overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      <div
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={() => handleSort("status")}
                      >
                        Status
                        {sortField === "status" && (
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}
                          />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      <div
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={() => handleSort("createdAt")}
                      >
                        Joined
                        {sortField === "createdAt" && (
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}
                          />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredReferrals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Filter className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">
                              No referrals found
                            </p>
                            {(searchTerm || statusFilter !== "ALL") && (
                              <Button
                                variant="link"
                                onClick={() => {
                                  setSearchTerm("");
                                  setStatusFilter("ALL");
                                }}
                              >
                                Clear filters
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReferrals.map((referral) => {
                        return (
                          <motion.tr
                            key={referral.id}
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
                            className="border-b hover:bg-muted/30 cursor-pointer"
                            onClick={() => {
                              setSelectedReferral(referral);
                              setIsDetailSidebarOpen(true);
                            }}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                                  <AvatarImage
                                    src={referral.referred?.avatar || ""}
                                  />
                                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs md:text-sm">
                                    {referral.referred?.firstName?.charAt(0) ||
                                      ""}
                                    {referral.referred?.lastName?.charAt(0) ||
                                      ""}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm md:text-base">
                                    {referral.referred?.firstName}{" "}
                                    {referral.referred?.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground hidden sm:block">
                                    {referral.referred?.email}
                                  </p>
                                  <div className="sm:hidden mt-1">
                                    <StatusBadge status={referral.status} />
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <StatusBadge status={referral.status} />
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {referral.createdAt
                                    ? new Date(
                                        referral.createdAt
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedReferral(referral);
                                    }}
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Contact
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.success("Email sent to referral!");
                                    }}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.success("Referral details copied!");
                                    }}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="cards">
            {filteredReferrals.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Filter className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No referrals found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filter criteria
                </p>
                {(searchTerm || statusFilter !== "ALL") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("ALL");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {
                    opacity: 0,
                  },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                    },
                  },
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredReferrals.map((referral) => (
                  <ReferralCard
                    key={referral.id}
                    referral={referral}
                    onContact={() => {
                      setSelectedReferral(referral);
                    }}
                    onViewDetails={() => {
                      setSelectedReferral(referral);
                      setIsDetailSidebarOpen(true);
                    }}
                  />
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>

        {pagination.totalPages > 1 && (
          <div className="mt-4 overflow-x-auto">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="h-9 w-9"
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                    <span className="sr-only">Go to previous page</span>
                  </Button>
                </PaginationItem>

                {/* First page */}
                {page > 3 && (
                  <PaginationItem className="hidden sm:inline-block">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(1)}
                      className="h-9 w-9"
                    >
                      1
                    </Button>
                  </PaginationItem>
                )}

                {/* Ellipsis if needed */}
                {page > 4 && (
                  <PaginationItem className="hidden sm:inline-block">
                    <span className="px-2">...</span>
                  </PaginationItem>
                )}

                {/* Page numbers around current page */}
                {Array.from(
                  {
                    length: pagination.totalPages,
                  },
                  (_, i) => i + 1
                )
                  .filter((pageNum) => {
                    // Show current page and 1 page before and after on mobile
                    // Show current page and 2 pages before and after on desktop
                    return (
                      Math.abs(pageNum - page) <= 2 &&
                      pageNum !== 1 &&
                      pageNum !== pagination.totalPages
                    );
                  })
                  .map((pageNum) => (
                    <PaginationItem
                      key={pageNum}
                      className="hidden sm:inline-block"
                    >
                      <Button
                        variant={pageNum === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-9 w-9"
                      >
                        {pageNum}
                      </Button>
                    </PaginationItem>
                  ))}

                {/* Ellipsis if needed */}
                {page < pagination.totalPages - 3 && (
                  <PaginationItem className="hidden sm:inline-block">
                    <span className="px-2">...</span>
                  </PaginationItem>
                )}

                {/* Last page */}
                {pagination.totalPages > 1 &&
                  page < pagination.totalPages - 2 && (
                    <PaginationItem className="hidden sm:inline-block">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(pagination.totalPages)}
                        className="h-9 w-9"
                      >
                        {pagination.totalPages}
                      </Button>
                    </PaginationItem>
                  )}

                {/* Mobile page indicator */}
                <PaginationItem className="sm:hidden">
                  <span className="px-2">
                    Page {page} of {pagination.totalPages}
                  </span>
                </PaginationItem>

                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handlePageChange(
                        Math.min(pagination.totalPages, page + 1)
                      )
                    }
                    disabled={page === pagination.totalPages}
                    className="h-9 w-9"
                  >
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                    <span className="sr-only">Go to next page</span>
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
        {pagination.totalItems > 0 && (
          <div className="mt-4 flex justify-between items-center text-sm">
            <div className="text-muted-foreground">
              Showing{" "}
              {Math.min((page - 1) * perPage + 1, pagination.totalItems)} to{" "}
              {Math.min(page * perPage, pagination.totalItems)} of{" "}
              {pagination.totalItems} referrals
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Show</span>
              <Select
                value={perPage.toString()}
                onValueChange={handlePerPageChange}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <span>{perPage}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">per page</span>
            </div>
          </div>
        )}
      </div>
      {/* Detail Sidebar */}
      <SidebarProvider>
        <Dialog
          open={isDetailSidebarOpen}
          onOpenChange={setIsDetailSidebarOpen}
        >
          <DialogContent className="sm:max-w-[500px] p-0 max-h-[90vh] flex flex-col">
            {selectedReferral && (
              <>
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                  <div className="flex justify-between items-center">
                    <DialogTitle>Referral Details</DialogTitle>
                    {/* Only one close button here */}
                  </div>
                </DialogHeader>

                {loadingDetails ? (
                  <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground">
                        Loading referral details...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-6">
                      <div className="flex flex-col items-center text-center mb-6">
                        <Avatar className="h-16 w-16 md:h-20 md:w-20 mb-4">
                          <AvatarImage
                            src={selectedReferral.referred?.avatar || ""}
                          />
                          <AvatarFallback className="text-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                            {selectedReferral.referred?.firstName?.charAt(0) ||
                              ""}
                            {selectedReferral.referred?.lastName?.charAt(0) ||
                              ""}
                          </AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-bold">
                          {selectedReferral.referred?.firstName}{" "}
                          {selectedReferral.referred?.lastName}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                          {selectedReferral.referred?.email}
                        </p>
                        <div className="mt-2">
                          <StatusBadge status={selectedReferral.status} />
                        </div>
                      </div>

                      <div className="space-y-4 md:space-y-6">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                              Referral Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Referral ID
                                </span>
                                <span className="font-mono">
                                  {selectedReferral.id}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Joined Date
                                </span>
                                <span>
                                  {selectedReferral.createdAt
                                    ? new Date(
                                        selectedReferral.createdAt
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Referrer ID
                                </span>
                                <span className="font-mono">
                                  {selectedReferral.referrerId || "N/A"}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {referralDetails?.metrics ? (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">
                                Performance Metrics
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <div className="space-y-4">
                                {referralDetails.metrics.activityScore !==
                                  undefined && (
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm">
                                        Activity Score
                                      </span>
                                      <span className="text-sm font-medium">
                                        {referralDetails.metrics.activityScore}%
                                      </span>
                                    </div>
                                    <Progress
                                      value={
                                        referralDetails.metrics.activityScore
                                      }
                                      className="h-2"
                                    />
                                  </div>
                                )}
                                {referralDetails.metrics.engagement !==
                                  undefined && (
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm">
                                        Engagement
                                      </span>
                                      <span className="text-sm font-medium">
                                        {referralDetails.metrics.engagement}%
                                      </span>
                                    </div>
                                    <Progress
                                      value={referralDetails.metrics.engagement}
                                      className="h-2"
                                    />
                                  </div>
                                )}
                                {referralDetails.metrics.retention !==
                                  undefined && (
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-sm">Retention</span>
                                      <span className="text-sm font-medium">
                                        {referralDetails.metrics.retention}%
                                      </span>
                                    </div>
                                    <Progress
                                      value={referralDetails.metrics.retention}
                                      className="h-2"
                                    />
                                  </div>
                                )}
                                {!referralDetails.metrics.activityScore &&
                                  !referralDetails.metrics.engagement &&
                                  !referralDetails.metrics.retention && (
                                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                                      <Info className="h-4 w-4 mr-2" />
                                      <span>No metrics available</span>
                                    </div>
                                  )}
                              </div>
                            </CardContent>
                          </Card>
                        ) : null}

                        {referralDetails?.earnings ? (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">
                                Earnings & Rewards
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Total Earnings
                                  </span>
                                  <span className="font-medium">
                                    ${referralDetails.earnings.total.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    Pending Rewards
                                  </span>
                                  <span className="font-medium">
                                    $
                                    {referralDetails.earnings.pending.toFixed(
                                      2
                                    )}
                                  </span>
                                </div>
                                {referralDetails.earnings.lastReward && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Last Reward
                                    </span>
                                    <span className="font-medium">
                                      $
                                      {referralDetails.earnings.lastReward.amount.toFixed(
                                        2
                                      )}{" "}
                                      (
                                      {new Date(
                                        referralDetails.earnings.lastReward.date
                                      ).toLocaleDateString()}
                                      )
                                    </span>
                                  </div>
                                )}
                                {!referralDetails.earnings.total &&
                                  !referralDetails.earnings.pending &&
                                  !referralDetails.earnings.lastReward && (
                                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                                      <Info className="h-4 w-4 mr-2" />
                                      <span>No earnings data available</span>
                                    </div>
                                  )}
                              </div>
                            </CardContent>
                          </Card>
                        ) : null}

                        {referralDetails?.timeline &&
                        referralDetails.timeline.length > 0 ? (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">
                                Activity Timeline
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <div className="space-y-4">
                                {referralDetails.timeline.map(
                                  (event: any, index: number) => (
                                    <div key={index} className="flex gap-3">
                                      <div className="relative flex flex-col items-center">
                                        <div
                                          className={`h-8 w-8 rounded-full ${getEventIconBackground(event.type)} flex items-center justify-center`}
                                        >
                                          {getEventIcon(event.type)}
                                        </div>
                                        {index <
                                          referralDetails.timeline.length -
                                            1 && (
                                          <div className="h-full w-0.5 bg-border absolute top-8"></div>
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-medium">
                                          {event.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {new Date(
                                            event.date
                                          ).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium">
                                Activity Timeline
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                              <div className="flex items-center justify-center py-8 text-muted-foreground">
                                <Info className="h-4 w-4 mr-2" />
                                <span>No activity data available</span>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t p-4 flex flex-col sm:flex-row gap-2 justify-between flex-shrink-0">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setIsDetailSidebarOpen(false);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Contact</span>
                  </Button>
                  <Button
                    className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    onClick={() => {
                      toast.success("Email sent to referral!");
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    <span>Send Email</span>
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const getStatusIcon = () => {
    switch (status) {
      case "ACTIVE":
        return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case "PENDING":
        return <Clock className="h-3 w-3 mr-1" />;
      case "REJECTED":
        return <XCircle className="h-3 w-3 mr-1" />;
      default:
        return <AlertCircle className="h-3 w-3 mr-1" />;
    }
  };
  return (
    <Badge
      variant={
        status === "ACTIVE"
          ? "success"
          : status === "REJECTED"
            ? "destructive"
            : "secondary"
      }
      className="flex items-center px-2 py-0.5 text-xs"
    >
      {getStatusIcon()}
      <span>{status}</span>
    </Badge>
  );
}
function ReferralCard({
  referral,
  onContact,
  onViewDetails,
}: {
  referral: Referral;
  onContact: () => void;
  onViewDetails: () => void;
}) {
  return (
    <motion.div
      variants={{
        hidden: {
          opacity: 0,
          y: 20,
        },
        show: {
          opacity: 1,
          y: 0,
        },
      }}
    >
      <Card className="overflow-hidden h-full hover:shadow-md transition-shadow group">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <StatusBadge status={referral.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onContact}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    toast.success("Email sent to referral!");
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    toast.success("Referral details copied!");
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center mb-4">
            <Avatar className="h-16 w-16 mb-3 border-2 border-white shadow-md group-hover:shadow-indigo-200 transition-shadow">
              <AvatarImage src={referral.referred?.avatar || ""} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-lg">
                {referral.referred?.firstName?.charAt(0) || ""}
                {referral.referred?.lastName?.charAt(0) || ""}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-medium text-lg">
              {referral.referred?.firstName} {referral.referred?.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {referral.referred?.email}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined:</span>
              <span>
                {referral.createdAt
                  ? new Date(referral.createdAt).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Referral ID:</span>
              <span className="font-mono">{referral.id.substring(0, 8)}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                toast.success("Email sent to referral!");
              }}
            >
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              onClick={onViewDetails}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Helper function to get the appropriate icon for timeline events
function getEventIcon(eventType: string) {
  switch (eventType) {
    case "activation":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "reward":
      return <Sparkles className="h-4 w-4 text-blue-600" />;
    case "invite":
      return <UserPlus className="h-4 w-4 text-purple-600" />;
    default:
      return <Info className="h-4 w-4 text-gray-600" />;
  }
}

// Helper function to get the appropriate background color for timeline events
function getEventIconBackground(eventType: string) {
  switch (eventType) {
    case "activation":
      return "bg-green-100";
    case "reward":
      return "bg-blue-100";
    case "invite":
      return "bg-purple-100";
    default:
      return "bg-gray-100";
  }
}
