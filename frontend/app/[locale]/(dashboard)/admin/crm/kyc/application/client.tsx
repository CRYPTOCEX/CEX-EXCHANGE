"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatsCard, statsCardColors } from "@/components/ui/card/stats-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Loadable } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  XCircle,
  CalendarIcon,
  BarChart3,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDuration, slaLevel } from "@/config/sla";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Define the ApplicationStatus type
type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "ADDITIONAL_INFO_REQUIRED";

// Define the ApplicationWithDetails type
type ApplicationWithDetails = {
  id: string;
  status: ApplicationStatus;
  data: any;
  adminNotes: string;
  createdAt?: string;
  reviewedAt?: string;
  level: any;
  user: any;
};

export default function ApplicationsClient() {
  const tCommon2 = useTranslations("common");
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string; }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Distinct from `isLoading`: the full-page skeleton is a FIRST-load state.
  // Gating it on `isLoading` alone blanked the entire queue — cards, filters
  // and tabs — every time the operator turned a page or typed a character.
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // The box used to filter the rows already on screen. It now drives a server
  // query, so it needs a settling delay before it costs a round trip.
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  // Queue contract point 1: OLDEST first. The applicant who has been waiting
  // longest is the one to review next; "newest" put them on the last page.
  const [sortBy, setSortBy] = useState<string>("oldest");
  // The tabs ARE the status filter. There used to be a Status dropdown as well,
  // filtering server-side, while the tabs filtered the current page client-side
  // — two controls for one axis, disagreeing with each other and with the KPI
  // cards above them.
  // …and opens on what is actionable, not on years of settled applications.
  const [activeTab, setActiveTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    infoRequired: 0,
    completionRate: 0,
    averageProcessingTime: 0,
  });
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    perPage: perPage,
    totalPages: 1,
  });
  // Fetch applications and levels whenever filters, sorting, or pagination change.
  useEffect(() => {
    const fetchApplications = async () => {
      setIsLoading(true);
      try {
        // Build query parameters for the listing endpoint
        const queryParams = new URLSearchParams();
        queryParams.set("page", page.toString());
        queryParams.set("perPage", perPage.toString());

        // Set sort fields based on sortBy
        if (sortBy === "newest") {
          queryParams.set("sortField", "createdAt");
          queryParams.set("sortOrder", "desc");
        } else if (sortBy === "oldest") {
          queryParams.set("sortField", "createdAt");
          queryParams.set("sortOrder", "asc");
        } else if (sortBy === "status") {
          queryParams.set("sortField", "status");
          queryParams.set("sortOrder", "asc");
        } else if (sortBy === "verificationType") {
          queryParams.set("sortField", "level.verificationService.name");
          queryParams.set("sortOrder", "asc");
        }

        // Status comes from the active tab; level and verification type are
        // first-class query params rather than entries in the opaque `filter`
        // JSON. The old code filtered on `level.verificationService`, which is
        // the association ALIAS — the column is `kycLevel.serviceId`, so that
        // dropdown produced an unknown-column error, never a filtered list.
        if (activeTab !== "all") {
          queryParams.set("filter", JSON.stringify({ status: activeTab }));
        }
        if (levelFilter !== "all") {
          queryParams.set("levelId", levelFilter);
        }
        if (verificationFilter !== "all") {
          queryParams.set("verification", verificationFilter);
        }
        if (debouncedSearch.trim()) {
          queryParams.set("search", debouncedSearch.trim());
        }

        // Fetch applications using $fetch
        const { data, error } = await $fetch({
          url: `/api/admin/crm/kyc/application?${queryParams.toString()}`,
          silentSuccess: true,
        });
        if (!error) {
          const { items, pagination } = data;
          setApplications(Array.isArray(items) ? items : []);
          if (pagination) setPagination(pagination);
        }
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    };
    fetchApplications();
  }, [activeTab, levelFilter, verificationFilter, sortBy, page, debouncedSearch]);

  // Any change to the scope sends the operator back to page 1, or a narrower
  // result set leaves them stranded past its last page looking at an empty
  // list. Done in the handlers rather than an effect — the repo's eslint config
  // errors on `set-state-in-effect`, and this is the honest place for it.
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };
  const handleLevelChange = (value: string) => {
    setLevelFilter(value);
    setPage(1);
  };
  const handleVerificationChange = (value: string) => {
    setVerificationFilter(value);
    setPage(1);
  };
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  // The tab badges and the KPI cards both read these figures, and the endpoint
  // now takes the same scope as the list — so the three can no longer disagree
  // on one screen. Status is not sent: the per-status counts are the answer.
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const params = new URLSearchParams();
        if (levelFilter !== "all") params.set("levelId", levelFilter);
        if (verificationFilter !== "all") params.set("verification", verificationFilter);
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
        const qs = params.toString();

        const { data, error } = await $fetch({
          url: `/api/admin/crm/kyc/application/analytics${qs ? `?${qs}` : ""}`,
          silentSuccess: true,
        });
        if (!error && data) setStats(data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };
    fetchAnalytics();
  }, [levelFilter, verificationFilter, debouncedSearch]);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const { data } = await $fetch({
          url: "/api/admin/crm/kyc/level/options",
          silentSuccess: true,
        });
        setLevels(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching levels:", error);
      }
    };
    fetchLevels();
  }, []);

  // Search, status and level are all resolved by the server now, so the rows
  // that arrive are the rows to show. Filtering them again here is what made
  // the counts lie: it could only ever remove rows from the current ten.
  const currentApplications = applications;

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const rangeStart = pagination.totalItems === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, pagination.totalItems);

  const resetFilters = () => {
    setSearchQuery("");
    setActiveTab("all");
    setLevelFilter("all");
    setVerificationFilter("all");
    setPage(1);
  };

  // Handle view application - navigates to the detail page
  const handleViewApplication = (id: string) => {
    router.push(`/admin/crm/kyc/application/${id}`);
  };

  // Status pill — the hue comes from the platform status table; only the icon
  // and the (translated) label are decided here.
  const ApplicationStatusBadge = ({ status }: { status: string }) => {
    const tCommon = useTranslations("common");
    switch (status) {
      case "APPROVED":
        return (
          <StatusBadge
            status={status}
            icon={<CheckCircle className="h-3 w-3" />}
            label="Approved"
            className="px-2 py-1"
          />
        );
      case "REJECTED":
        return (
          <StatusBadge
            status={status}
            icon={<XCircle className="h-3 w-3" />}
            label="Rejected"
            className="px-2 py-1"
          />
        );
      case "ADDITIONAL_INFO_REQUIRED":
        return (
          <StatusBadge
            status={status}
            icon={<AlertCircle className="h-3 w-3" />}
            label={tCommon("info_required")}
            className="px-2 py-1"
          />
        );
      case "PENDING":
      default:
        // Unmapped values kept their PENDING pill before this migration.
        return (
          <StatusBadge
            status="PENDING"
            icon={<Clock className="h-3 w-3" />}
            label="Pending"
            className="px-2 py-1"
          />
        );
    }
  };

  /*
   * `if (!mounted) return null` USED TO BE HERE — "to prevent hydration issues".
   * ===========================================================================
   * It undid the whole conversion documented below: the page was rebuilt so its
   * chrome renders while its figures wait, and then this line withheld the
   * chrome as well, so the server sent an empty document for the review queue.
   *
   * There was no hydration issue to prevent. Every piece of state in this
   * component is declared with a literal initial value — `activeTab:
   * "PENDING"`, `sortBy: "oldest"`, `page: 1`, `stats` at zeroes,
   * `applications: []` — and every one of them is only ever changed from a
   * `$fetch` effect. There is no `localStorage` read, no `window` read, no
   * `persist`ed store, and no media query anywhere in the file, so the server
   * and the browser's first render compute the same tree by construction.
   *
   * The one timezone-sensitive call, `format(new Date(app.createdAt), "PPP p")`,
   * cannot run before hydration either: it is inside the `applications.map`,
   * and `applications` is `[]` until the fetch resolves.
   */

  /**
   * THE PAGE RENDERS; ITS NUMBERS WAIT.
   * ==========================================================================
   *
   * What was removed: `if (!hasLoaded) return <div className="space-y-6">…` —
   * a second layout made of eleven loose grey rectangles standing in for a
   * page whose chrome is entirely static. The heading, the "KYC levels"
   * button, the four KPI labels, the search field, three Select triggers and a
   * five-tab bar are all literals or `t()` strings in this file, and none of
   * them needed the fetch.
   *
   * Where the copy disagreed with the page, and it disagreed everywhere:
   *
   *  - `h-32` (128px) for a KPI against `StatsCard`, which is ~130.5px with a
   *    delta row and 176px when it reserves trend space;
   *  - `h-10 w-full` for the FILTER block, which is an `Input` plus a
   *    three-column `Select` grid — about 88px, not 40px;
   *  - `h-24` rows against application cards that are `p-6` two-column
   *    layouts, several times taller;
   *  - and no tab bar at all, so the five tabs and their count badges — the
   *    control an operator reaches for first — appeared only at the end.
   *
   * `stats` already initialises to zeroes, so every figure below has a defined
   * value in both states and only needs a placeholder over it.
   */
  const pending = !hasLoaded;

  /* Empty is a CONCLUSION about a list that arrived. `currentApplications` is
     also `[]` before the first fetch, and "No applications found — try
     adjusting your filters" is actively wrong there: there are no filters to
     adjust yet. */
  const showEmptyState = hasLoaded && currentApplications.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("kyc_applications")}
          </h1>
          <p className="text-muted-foreground">
            {t("manage_and_review_verification_applications")}
          </p>
        </div>
        <Button
          className="md:w-auto"
          onClick={() => router.push("/admin/crm/kyc/level")}
        >
          <Shield className="mr-2 h-4 w-4" /> {t("kyc_levels")}
        </Button>
      </div>

      {/* Stats Cards.
          These were four hand-built <Card>s — a `border-l-4` rail, a 3xl bold
          figure, a 12x12 rounded-full icon plate and a Progress bar each. Three
          of those bars restated the percentage printed directly beneath them;
          the fourth encoded processing time as a fraction of a 24-hour day,
          which is the one signal that did not survive the move. Everything else
          — every figure, every percentage, every t() string — is preserved. */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label={tCommon("total_applications")}
          loading={pending}
          value={stats.total}
          icon={Layers}
          {...statsCardColors.primary}
        />
        <StatsCard
          label={tCommon("pending_review")}
          loading={pending}
          value={stats.pending}
          icon={Clock}
          changeLabel={`${
            stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0
          }% ${t("of_total_applications")}`}
          {...statsCardColors.warning}
        />
        <StatsCard
          label={tCommon("approved")}
          loading={pending}
          value={stats.approved}
          icon={CheckCircle}
          changeLabel={`${
            stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
          }% ${tCommon("approval_rate")}`}
          {...statsCardColors.success}
        />
        <StatsCard
          label={tCommon("processing_time")}
          loading={pending}
          value={`${stats.averageProcessingTime.toFixed(1)}h`}
          icon={BarChart3}
          changeLabel={tCommon("average_time_to_process_applications")}
          {...statsCardColors.primary}
        />
      </div>

      {/* Filters and Search */}
      <div className="shrink-0 flex flex-col gap-4">
        <Input
          placeholder={`${t("search_applications_users_or_levels")}…`}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          icon="mdi:magnify"
        />
        {/* Three controls, not four: the Status dropdown that used to sit here
            was a second control for the axis the tabs below already own. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={levelFilter} onValueChange={handleLevelChange}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0" />
                <span className="truncate">Level</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("all_levels")}</SelectItem>
              {levels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={verificationFilter}
            onValueChange={handleVerificationChange}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="truncate">Verification</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon("all_verification_types")}</SelectItem>
              <SelectItem value="service">{tCommon("service_verification")}</SelectItem>
              <SelectItem value="manual">{tCommon("manual_verification")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 shrink-0" />
                <span className="truncate">{tCommon("sort_by")}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{tCommon("newest_first")}</SelectItem>
              <SelectItem value="oldest">{tCommon("oldest_first")}</SelectItem>
              <SelectItem value="status">{tCommon("by_status")}</SelectItem>
              <SelectItem value="verificationType">
                {tCommon("by_verification_type")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs and Applications List */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* No negative margins. The `-mx-4 px-4 md:-mx-6 md:px-6` bleed here
            assumed a parent whose horizontal padding matched, and it did not:
            the bar rendered 8px wider than the viewport, so the whole admin page
            scrolled sideways. A sticky bar only needs to span its own column.

            `top-header` rather than `top-16`: the bar sticks below the shell's
            fixed top bar, whose height is `--header-height` and is overridden by
            navbar variants (`lib/chrome/variants.ts`). A literal 4rem detaches
            from the bar on any variant that is not the default. */}
        <div className="sticky top-header z-20 bg-background pb-4">
          {/* Every badge is the server's count for the whole filtered
              population, not a tally of the ten rows on screen — which is what
              made these numbers contradict the KPI cards directly above them.
              ADDITIONAL_INFO_REQUIRED gets a tab of its own; it was previously
              reachable only through the Status dropdown that is now gone. */}
          <TabsList className="grid grid-cols-3 md:grid-cols-5 w-full">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <span className="hidden md:inline">{tCommon("all_applications")}</span>
            <span className="md:hidden">All</span>
            <Badge variant="secondary">
              <Loadable loading={pending} placeholder="000">
                {stats.total}
              </Loadable>
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="PENDING" className="flex items-center gap-2">
            <span>Pending</span>
            <Badge variant="secondary">
              <Loadable loading={pending} placeholder="000">
                {stats.pending}
              </Loadable>
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="ADDITIONAL_INFO_REQUIRED"
            className="flex items-center gap-2"
          >
            <span className="hidden md:inline">{tCommon("info_required")}</span>
            <span className="md:hidden">Info</span>
            <Badge variant="secondary">
              <Loadable loading={pending} placeholder="000">
                {stats.infoRequired}
              </Loadable>
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="flex items-center gap-2">
            <span>Approved</span>
            <Badge variant="secondary">
              <Loadable loading={pending} placeholder="000">
                {stats.approved}
              </Loadable>
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="REJECTED" className="flex items-center gap-2">
            <span>Rejected</span>
            <Badge variant="secondary">
              <Loadable loading={pending} placeholder="000">
                {stats.rejected}
              </Loadable>
            </Badge>
          </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value={activeTab}
          className={cn(
            "space-y-4 min-h-[60vh] transition-opacity",
            isLoading && "opacity-60 pointer-events-none"
          )}
        >
          {showEmptyState ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">{tCommon("no_applications_found")}</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
                  {t("no_applications_match_your_current_filters_1")} {t("try_adjusting_your_search_criteria_or_filters_1")}
                </p>
                <Button variant="outline" className="mt-4" onClick={resetFilters}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {tCommon("reset_filters")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
                {currentApplications.map((app) => {
                  return (
                    <Card
                      key={app.id}
                      className="overflow-hidden cursor-pointer"
                      onClick={() => handleViewApplication(app.id)}
                    >
                      <div className="flex flex-col md:flex-row">
                        <div className="flex-1 p-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarImage
                                  src={
                                    app.user?.avatar || "/img/placeholder.svg"
                                  }
                                  alt={app.user?.firstName || tCommon2("user_avatar")}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary-ink">
                                  {app.user?.firstName?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-lg">
                                  {app.user?.firstName} {app.user?.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {app.user?.email || t("no_email_available")}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <ApplicationStatusBadge status={app.status} />
                              <Badge
                                variant="outline"
                                className="bg-primary/10 text-foreground border-primary/30 flex items-center gap-1"
                              >
                                <Layers className="h-3 w-3 mr-1 text-primary-ink" />
                                {app.level?.name || tCommon2("unknown")}
                              </Badge>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {app.level?.verificationService ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-primary/10 text-foreground border-primary/30 flex items-center gap-1"
                                      >
                                        <ShieldCheck className="h-3 w-3 mr-1 text-primary-ink" />{" "}
                                        {app.level.verificationService.name}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-muted dark:bg-muted/50 text-muted-foreground border-border-strong flex items-center gap-1"
                                      >
                                        <ShieldOff className="h-3 w-3 mr-1" />{" "}
                                        Manual
                                      </Badge>
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {app.level?.verificationService
                                      ? t("verified_by_service", { name: String(app.level.verificationService.name) })
                                      : t("manual_verification_by_admin")}
                                  </TooltipContent>
                                </Tooltip>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                {tCommon("application_id")}
                              </p>
                              <p className="text-sm font-mono mt-1">{app.id}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Submitted
                              </p>
                              {/* Queue contract point 2. The absolute date said
                                  WHEN; it never said whether that was a
                                  problem. The 7-day budget is the same number
                                  the dashboard health card warns on, read from
                                  `config/sla.ts`. Only a still-pending
                                  application is tinted — an application
                                  approved a year ago is old, not late. */}
                              <p className="text-sm mt-1 flex items-center gap-1.5">
                                <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(app.createdAt ?? ""), "PPP p")}
                                {(() => {
                                  if (!app.createdAt) return null;
                                  const waiting =
                                    app.status === "PENDING" ||
                                    app.status === "ADDITIONAL_INFO_REQUIRED";
                                  if (!waiting) return null;
                                  const { level, hours, budgetHours } = slaLevel(
                                    app.createdAt,
                                    "kyc"
                                  );
                                  if (level === "fresh") return null;
                                  return (
                                    <Badge
                                      tone={
                                        level === "breached"
                                          ? "destructive"
                                          : "warning"
                                      }
                                      appearance="soft"
                                      className="ml-1"
                                    >
                                      {level === "breached"
                                        ? `${formatDuration(hours - budgetHours)} overdue`
                                        : `${formatDuration(budgetHours - hours)} left`}
                                    </Badge>
                                  );
                                })()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Reviewed
                              </p>
                              <p className="text-sm mt-1 flex items-center gap-1">
                                {app.reviewedAt ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 text-success-ink" />
                                    {format(new Date(app.reviewedAt), "PPP p")}
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 text-warning-ink" />
                                    {tCommon("not_reviewed_yet")}
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          {app.adminNotes && (
                            <div className="mt-4 bg-muted/50 dark:bg-muted/20 p-3 rounded-md border border-muted dark:border-muted/40">
                              <p className="text-sm font-medium text-foreground">{tCommon("admin_notes")}</p>
                              <p className="text-sm mt-1 text-muted-foreground">{app.adminNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          )}

          {/* The queue was pinned to whatever ten rows the first page returned:
              `setPage` existed, nothing ever called it, and no control was
              rendered. Everything past row ten was unreachable. */}
          {pagination.totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-sm text-muted-foreground">
                {tCommon("showing")} {rangeStart}–{rangeEnd} {tCommon("of")}{" "}
                {pagination.totalItems}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                >
                  {tCommon("previous")}
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                >
                  {tCommon("next")}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
