"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  TrendingUp,
  Users,
  Zap,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

import { Pagination } from "./components/pagination";
import { $fetch } from "@/lib/api";
import { ThemeToggle } from "../../(dashboard)/admin/builder/components/theme-toggle";
import { Link } from "@/i18n/routing";
import { useConfigStore } from "@/store/config";
import { useUserStore } from "@/store/user";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

interface SupportTicket {
  id: string;
  userId: string;
  agentId?: string;
  agentName?: string;
  subject: string;
  importance: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "OPEN" | "REPLIED" | "CLOSED";
  messages?: Array<{
    type: string;
    text: string;
    time: string;
    userId: string;
  }>;
  type: "LIVE" | "TICKET";
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  responseTime?: number;
  satisfaction?: number;
}
const getStatusIcon = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Clock className="h-4 w-4" />;
    case "OPEN":
      return <AlertCircle className="h-4 w-4" />;
    case "REPLIED":
      return <MessageCircle className="h-4 w-4" />;
    case "CLOSED":
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <XCircle className="h-4 w-4" />;
  }
};
const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200 dark:from-yellow-950 dark:to-amber-950 dark:text-yellow-400 dark:border-yellow-800";
    case "OPEN":
      return "bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200 dark:from-blue-950 dark:to-cyan-950 dark:text-blue-400 dark:border-blue-800";
    case "REPLIED":
      return "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:text-green-400 dark:border-green-800";
    case "CLOSED":
      return "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border-gray-200 dark:from-zinc-800 dark:to-slate-800 dark:text-zinc-400 dark:border-zinc-700";
    default:
      return "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 dark:from-red-950 dark:to-rose-950 dark:text-red-400 dark:border-red-800";
  }
};
const getImportanceColor = (importance: string) => {
  switch (importance) {
    case "HIGH":
      return "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25";
    case "MEDIUM":
      return "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25";
    case "LOW":
      return "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25";
    default:
      return "bg-gradient-to-r from-gray-500 to-slate-500 text-white";
  }
};
export default function SupportPage() {
  const t = useTranslations("support/ticket");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [importanceFilter, setImportanceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    importance: "LOW" as "LOW" | "MEDIUM" | "HIGH",
    message: "",
    tags: "",
  });

  // Fetch tickets from API
  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      const { data, error } = await $fetch({
        url: "/api/user/support/ticket",
        silent: true,
        errorMessage: "Failed to load tickets",
      });
      if (data && data.items) {
        setAllTickets(
          data.items.map((ticket) => ({
            ...ticket,
            createdAt: new Date(ticket.createdAt),
            updatedAt: new Date(ticket.updatedAt),
          }))
        );
      }
      setIsLoading(false);
    };
    fetchTickets();
  }, []);

  // Filter tickets based on search and filters
  const filteredTickets = useMemo(() => {
    if (!allTickets) return [];
    return allTickets.filter((ticket) => {
      const matchesSearch =
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.tags?.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );
      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;
      const matchesImportance =
        importanceFilter === "all" || ticket.importance === importanceFilter;
      return matchesSearch && matchesStatus && matchesImportance;
    });
  }, [allTickets, searchQuery, statusFilter, importanceFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTickets.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  // Reset to first page when filters change
  const handleFilterChange = (filterType: string, value: string) => {
    setCurrentPage(1);
    if (filterType === "search") setSearchQuery(value);
    if (filterType === "status") setStatusFilter(value);
    if (filterType === "importance") setImportanceFilter(value);
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };
  const handleCreateTicket = async () => {
    try {
      const { data, error } = await $fetch<SupportTicket>({
        url: "/api/user/support/ticket",
        method: "POST",
        body: {
          subject: newTicket.subject,
          importance: newTicket.importance,
          message: newTicket.message,
          tags: newTicket.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
        successMessage: "Ticket created successfully",
      });
      
      if (error) {
        console.error("Error creating ticket:", error);
        return;
      }
      
      if (data) {
        console.log("Ticket created successfully:", data);
        const newTicketData = data;
        setAllTickets((prev) => [
          {
            ...newTicketData,
            createdAt: new Date(newTicketData.createdAt),
            updatedAt: new Date(newTicketData.updatedAt),
          },
          ...prev,
        ]);
        setNewTicket({
          subject: "",
          importance: "LOW",
          message: "",
          tags: "",
        });
        setIsCreateDialogOpen(false);
      }
    } catch (err) {
      console.error("Unexpected error creating ticket:", err);
    }
  };

  const stats =
    allTickets.length > 0
      ? {
          total: allTickets.length,
          open: allTickets.filter((t) => t.status === "OPEN").length,
          pending: allTickets.filter((t) => t.status === "PENDING").length,
          closed: allTickets.filter((t) => t.status === "CLOSED").length,
          avgResponseTime: Math.round(
            allTickets
              .filter((t) => t.responseTime)
              .reduce((acc, t) => acc + (t.responseTime || 0), 0) /
              allTickets.filter((t) => t.responseTime).length || 0
          ),
          satisfaction:
            allTickets
              .filter((t) => t.satisfaction)
              .reduce((acc, t) => acc + (t.satisfaction || 0), 0) /
              allTickets.filter((t) => t.satisfaction).length || 0,
        }
      : {
          total: 0,
          open: 0,
          pending: 0,
          closed: 0,
          avgResponseTime: 0,
          satisfaction: 0,
        };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-zinc-950 dark:via-blue-950/10 dark:to-indigo-950/10 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-zinc-400">
            {t("loading_tickets")}.
          </p>
        </div>
      </div>
    );
  }
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const canUseSupport = hasKyc() && canAccessFeature("support_ticket");
  if (kycEnabled && !canUseSupport) {
    return <KycRequiredNotice feature="support_ticket" />;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-zinc-950 dark:via-blue-950/10 dark:to-indigo-950/10">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 max-w-7xl">
        {/* Enhanced Header */}
        <div className="mb-6 sm:mb-8">
          <div className="relative overflow-hidden bg-gradient-to-r from-white via-blue-50/50 to-indigo-50/30 dark:from-zinc-900 dark:via-blue-950/20 dark:to-indigo-950/10 rounded-2xl border border-gray-200/50 dark:border-zinc-800/50 p-4 sm:p-6 lg:p-8 shadow-xl backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:to-indigo-400/5"></div>
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-0">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                    <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">
                      {t("support_center")}
                    </h1>
                    <p className="text-gray-600 dark:text-zinc-400 text-sm sm:text-base lg:text-lg">
                      {t("manage_your_support_tickets_and_get_expert_help")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">
                      {t("24/7_support_available")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">
                      {t("avg_response")} {stats.avgResponseTime} min
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">
                      {stats.satisfaction.toFixed(1)} {t("/5_rating")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 mt-4 lg:mt-0">
                <ThemeToggle />
                <Dialog
                  open={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("new_ticket")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                    <DialogHeader>
                      <DialogTitle className="text-gray-900 dark:text-zinc-100">
                        {t("create_support_ticket")}
                      </DialogTitle>
                      <DialogDescription className="text-gray-600 dark:text-zinc-400">
                        {t("describe_your_issue_as_possible")}.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label
                          htmlFor="subject"
                          className="text-gray-900 dark:text-zinc-100"
                        >
                          {t("Subject")}
                        </Label>
                        <Input
                          id="subject"
                          value={newTicket.subject}
                          onChange={(e) =>
                            setNewTicket((prev) => ({
                              ...prev,
                              subject: e.target.value,
                            }))
                          }
                          placeholder="Brief description of your issue"
                          className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label
                          htmlFor="importance"
                          className="text-gray-900 dark:text-zinc-100"
                        >
                          {t("Priority")}
                        </Label>
                        <Select
                          value={newTicket.importance}
                          onValueChange={(value: "LOW" | "MEDIUM" | "HIGH") =>
                            setNewTicket((prev) => ({
                              ...prev,
                              importance: value,
                            }))
                          }
                        >
                          <SelectTrigger className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                            <SelectItem value="LOW">
                              {t("low_-_general_inquiry")}
                            </SelectItem>
                            <SelectItem value="MEDIUM">
                              {t("medium_-_affects_workflow")}
                            </SelectItem>
                            <SelectItem value="HIGH">
                              {t("high_-_critical_issue")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label
                          htmlFor="tags"
                          className="text-gray-900 dark:text-zinc-100"
                        >
                          {t("tags_(comma-separated)")}
                        </Label>
                        <Input
                          id="tags"
                          value={newTicket.tags}
                          onChange={(e) =>
                            setNewTicket((prev) => ({
                              ...prev,
                              tags: e.target.value,
                            }))
                          }
                          placeholder="e.g., billing, account, feature-request"
                          className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label
                          htmlFor="message"
                          className="text-gray-900 dark:text-zinc-100"
                        >
                          {t("Description")}
                        </Label>
                        <Textarea
                          id="message"
                          value={newTicket.message}
                          onChange={(e) =>
                            setNewTicket((prev) => ({
                              ...prev,
                              message: e.target.value,
                            }))
                          }
                          placeholder="Please provide details about your issue..."
                          className="min-h-[100px] bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100"
                      >
                        {t("Cancel")}
                      </Button>
                      <Button
                        onClick={handleCreateTicket}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={
                          !newTicket.subject.trim() || !newTicket.message.trim()
                        }
                      >
                        {t("create_ticket")}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">
                    {t("total_tickets")}
                  </p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-4 w-4 text-blue-200" />
                    <span className="text-xs text-blue-200">
                      {t("+12%_this_month")}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <MessageCircle className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">
                    {t("open_tickets")}
                  </p>
                  <p className="text-3xl font-bold">{stats.open}</p>
                  <div className="mt-2">
                    <Progress
                      value={
                        stats.total > 0 ? (stats.open / stats.total) * 100 : 0
                      }
                      className="h-2 bg-white/20"
                    />
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <AlertCircle className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">
                    {t("Resolved")}
                  </p>
                  <p className="text-3xl font-bold">{stats.closed}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-200" />
                    <span className="text-xs text-green-200">
                      {stats.total > 0
                        ? Math.round((stats.closed / stats.total) * 100)
                        : 0}{" "}
                      {t("%_success_rate")}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CheckCircle className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">
                    {t("avg_response")}
                  </p>
                  <p className="text-3xl font-bold">
                    {stats.avgResponseTime} m
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Zap className="h-4 w-4 text-purple-200" />
                    <span className="text-xs text-purple-200">
                      {t("lightning_fast")}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Clock className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filters */}
        <Card className="mb-6 sm:mb-8 border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-500 h-4 w-4 sm:h-5 sm:w-5" />
                  <Input
                    placeholder="Search tickets by subject, tags, or content..."
                    value={searchQuery}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                    className="pl-10 sm:pl-12 h-10 sm:h-12 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm sm:text-base"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger className="w-full sm:w-48 h-10 sm:h-12 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-xl text-sm sm:text-base">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                    <SelectItem value="all">{t("all_status")}</SelectItem>
                    <SelectItem value="PENDING">{t("Pending")}</SelectItem>
                    <SelectItem value="OPEN">{t("Open")}</SelectItem>
                    <SelectItem value="REPLIED">{t("Replied")}</SelectItem>
                    <SelectItem value="CLOSED">{t("Closed")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={importanceFilter}
                  onValueChange={(value) =>
                    handleFilterChange("importance", value)
                  }
                >
                  <SelectTrigger className="w-full sm:w-48 h-10 sm:h-12 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-xl text-sm sm:text-base">
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
                    <SelectItem value="all">{t("all_priority")}</SelectItem>
                    <SelectItem value="HIGH">{t("High")}</SelectItem>
                    <SelectItem value="MEDIUM">{t("Medium")}</SelectItem>
                    <SelectItem value="LOW">{t("Low")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {filteredTickets.length > 0 && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {t("Showing")} {startIndex + 1} {t("to")}{" "}
              {Math.min(endIndex, filteredTickets.length)} {t("of")}{" "}
              {filteredTickets.length}{" "}
              {filteredTickets.length === 1 ? "ticket" : "tickets"}
              {(searchQuery ||
                statusFilter !== "all" ||
                importanceFilter !== "all") &&
                " (filtered)"}
            </p>
          </div>
        )}

        {/* Enhanced Tickets List */}
        <div className="space-y-4 sm:space-y-6">
          {paginatedTickets.map((ticket, index) => {
            return (
              <Card
                key={ticket.id}
                className="group relative overflow-hidden border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] rounded-2xl"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <CardHeader className="relative pb-3 sm:pb-4 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="space-y-2 sm:space-y-3 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words">
                          {ticket.subject}
                        </CardTitle>
                        {ticket.responseTime && ticket.responseTime < 60 && (
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 self-start">
                            <Zap className="h-3 w-3 mr-1" />
                            {t("fast_response")}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-600 dark:text-zinc-400 text-sm">
                        <span className="font-medium">
                          #
                          {ticket.id.slice(0, 8)}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                        {ticket.agentId && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-500" />
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {t("agent_assigned")}
                              </span>
                            </div>
                          </>
                        )}
                        {ticket.responseTime && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="text-blue-600 dark:text-blue-400">
                              {t("response")} {ticket.responseTime} min
                            </span>
                          </>
                        )}
                      </CardDescription>
                      {ticket.tags && (
                        <div className="flex gap-2 flex-wrap">
                          {ticket.tags && Array.isArray(ticket.tags) && ticket.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs bg-gradient-to-r from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700 text-gray-700 dark:text-zinc-300 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900 dark:hover:to-indigo-900 transition-all"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row sm:flex-col gap-2 sm:gap-3">
                      <Badge
                        className={`${getImportanceColor(ticket.importance)} text-xs`}
                        variant="outline"
                      >
                        {ticket.importance}
                      </Badge>
                      <Badge
                        className={`${getStatusColor(ticket.status)} text-xs`}
                        variant="outline"
                      >
                        <div className="flex items-center gap-1 sm:gap-2">
                          {getStatusIcon(ticket.status)}
                          {ticket.status}
                        </div>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative p-4 sm:p-6 pt-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="text-sm text-gray-600 dark:text-zinc-400 flex-1">
                      {ticket.messages && ticket.messages.length > 0 && (
                        <p className="line-clamp-2 mb-3 text-sm sm:text-base">
                          {ticket.messages[0].text}
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-gray-500 dark:text-zinc-500">
                        <span>
                          {t("updated")}
                          {new Date(ticket.updatedAt).toLocaleString()}
                        </span>
                        {ticket.status === "OPEN" && (
                          <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            {t("Active")}
                          </span>
                        )}
                        {ticket.satisfaction && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500 fill-current" />
                            <span className="text-amber-600 dark:text-amber-400">
                              {ticket.satisfaction}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {ticket.type === "LIVE" ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Trigger live chat to open
                          const liveChatEvent = new CustomEvent(
                            "openLiveChat",
                            {
                              detail: {
                                sessionId: ticket.id,
                              },
                            }
                          );
                          window.dispatchEvent(liveChatEvent);
                        }}
                        className="border-gray-200 dark:border-zinc-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-950 dark:hover:to-emerald-950 text-gray-900 dark:text-zinc-100 hover:border-green-300 dark:hover:border-green-700 transition-all duration-300 group-hover:shadow-lg text-sm sm:text-base h-9 sm:h-10 px-3 sm:px-4"
                      >
                        {t("open_live_chat")}
                        <MessageCircle className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Link href={`/support/ticket/${ticket.id}` as any}>
                        <Button
                          variant="outline"
                          className="border-gray-200 dark:border-zinc-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950 dark:hover:to-indigo-950 text-gray-900 dark:text-zinc-100 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 group-hover:shadow-lg text-sm sm:text-base h-9 sm:h-10 px-3 sm:px-4"
                        >
                          {t("view_details")}
                          <MessageCircle className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredTickets.length === 0 && !isLoading && (
            <Card className="border-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-xl rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
                  <MessageCircle className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-zinc-100">
                  {t("no_tickets_found")}
                </h3>
                <p className="text-gray-600 dark:text-zinc-400 text-center mb-8 max-w-md">
                  {searchQuery ||
                  statusFilter !== "all" ||
                  importanceFilter !== "all"
                    ? "Try adjusting your filters or search terms to find what you're looking for."
                    : "You haven't created any support tickets yet. Create your first ticket to get help from our expert team."}
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  {t("create_your_first_ticket")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pagination */}
        {filteredTickets.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredTickets.length}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
