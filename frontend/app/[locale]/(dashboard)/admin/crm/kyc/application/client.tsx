"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  XCircle,
  CalendarIcon,
  BarChart3,
  Layers,
  FileCheck,
  FileText,
  User,
  X,
} from "lucide-react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { AnimatePresence } from "framer-motion";

// Import the components from the detail page
import { ApplicationDetailsTab } from "./components/application-details-tab";
import { VerificationTab } from "./components/verification-tab";
import { UserProfileTab } from "./components/user-tab";
import { ReviewSidebar, VerificationTips } from "./components/sidebar";
import { FullScreenImageViewer } from "./components/image-viewer";
import {
  type ApplicationStatus,
  ProgressBar,
  StatusBanner,
  StatusConfirmation,
  StatusUpdateSuccess,
} from "./components/status";

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

// Add print styles and drawer width override
const printStyles = `
  /* Force drawer to be 90% width */
  [data-state="open"][data-side="right"] {
    width: 90vw !important;
    max-width: 90vw !important;
    min-width: 90vw !important;
  }
  
  /* Override any shadcn sheet content width */
  .kyc-drawer-content {
    width: 90vw !important;
    max-width: 90vw !important;
    min-width: 90vw !important;
  }
  
  @media print {
    /* Hide elements not needed for printing */
    button, 
    .no-print,
    nav,
    footer,
    .sidebar,
    [role="tablist"],
    .verification-tips {
      display: none !important;
    }
    
    /* Ensure the page breaks properly */
    .page-break {
      page-break-before: always;
    }
    
    /* Expand the main content to full width */
    .main-content {
      width: 100% !important;
    }
    
    /* Ensure all sections are expanded */
    .section-content {
      display: block !important;
      height: auto !important;
      opacity: 1 !important;
    }
    
    /* Improve contrast for printing */
    * {
      color: black !important;
      background: white !important;
      box-shadow: none !important;
    }
    
    /* Ensure borders are visible */
    .print-border {
      border: 1px solid #ddd !important;
    }
    
    /* Format the application header for print */
    .application-header {
      border-bottom: 2px solid #000 !important;
      padding-bottom: 10px !important;
      margin-bottom: 20px !important;
    }
    
    /* Format the application status for print */
    .application-status {
      border: 1px solid #000 !important;
      padding: 10px !important;
      margin-bottom: 20px !important;
    }
    
    /* Hide the progress bar in print */
    .progress-container {
      display: none !important;
    }
  }
`;

export default function ApplicationsClient() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string; }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [activeTab, setActiveTab] = useState("all");
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

  // Drawer states
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithDetails | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Detail page states for drawer
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("details");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showConfirmation, setShowConfirmation] = useState<ApplicationStatus | null>(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle mounting state to prevent SSR hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Add the styles to the document
  useEffect(() => {
    if (!mounted) return;
    
    // Create style element
    const style = document.createElement("style");
    style.innerHTML = printStyles;
    style.id = "print-styles";

    // Add to head if it doesn't exist yet
    if (!document.getElementById("print-styles")) {
      document.head.appendChild(style);
    }

    // Cleanup on unmount
    return () => {
      const existingStyle = document.getElementById("print-styles");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [mounted]);

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

        // Build filter object based on current selections
        const filterObj: Record<string, any> = {};
        if (statusFilter !== "all") {
          filterObj.status = statusFilter;
        }
        if (levelFilter !== "all") {
          filterObj.levelId = levelFilter;
        }
        if (verificationFilter !== "all") {
          if (verificationFilter === "service") {
            filterObj["level.verificationService"] = {
              operator: "notEqual",
              value: null,
            };
          } else if (verificationFilter === "manual") {
            filterObj["level.verificationService"] = null;
          }
        }
        if (Object.keys(filterObj).length > 0) {
          queryParams.set("filter", JSON.stringify(filterObj));
        }

        // Fetch applications using $fetch
        const { data, error } = await $fetch({
          url: `/api/admin/crm/kyc/application?${queryParams.toString()}`,
          silentSuccess: true,
        });
        if (!error) {
          const { items, pagination } = data;
          setApplications(Array.isArray(items) ? items : []);
          setPagination(pagination);
        }
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplications();
  }, [statusFilter, levelFilter, verificationFilter, sortBy, page]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data, error } = await $fetch({
          url: "/api/admin/crm/kyc/application/analytics",
          silentSuccess: true,
        });
        if (!error) setStats(data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };
    const fetchLevels = async () => {
      try {
        const { data, error } = await $fetch({
          url: "/api/admin/crm/kyc/level/options",
          silentSuccess: true,
        });
        setLevels(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching levels:", error);
      }
    };
    fetchAnalytics();
    fetchLevels();
  }, []);

  // Client-side search filtering (this only filters within the current page)
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          app.id?.toLowerCase().includes(query) ||
          app.user?.firstName?.toLowerCase().includes(query) ||
          app.user?.lastName?.toLowerCase().includes(query) ||
          app.user?.email?.toLowerCase().includes(query) ||
          app.level?.name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [applications, searchQuery]);

  // Get applications by tab (using the status property)
  const getApplicationsByTab = (tab: string) => {
    if (tab === "all") return filteredApplications;
    return filteredApplications.filter(
      (app) => app.status === tab.toUpperCase()
    );
  };
  const currentApplications = getApplicationsByTab(activeTab);

  // Fetch detailed application data for drawer
  const fetchApplicationDetails = async (id: string) => {
    if (!mounted) return;

    setDrawerLoading(true);
    setDrawerError(null);

    try {
      const response = await $fetch({
        url: `/api/admin/crm/kyc/application/${id}`,
        silentSuccess: true,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.error) {
        console.error(`[KYC-DRAWER-DEBUG] API Error:`, response.error);
        setDrawerError(response.error);
        setDrawerLoading(false);
        return;
      }

      const applicationData = response.data;
      
      if (!applicationData) {
        setDrawerError("No application data received");
        setDrawerLoading(false);
        return;
      }

      // Process the data similar to the detail page
      const processedData = { ...applicationData };

      try {
        const parseJsonSafely = (jsonString: string, fallback: any = {}) => {
          try {
            if (typeof jsonString === 'string' && jsonString.trim()) {
              return JSON.parse(jsonString);
            }
            return fallback;
          } catch (e) {
            console.warn("JSON parsing failed:", e);
            return fallback;
          }
        };

        // Process application data field
        if (processedData.data && typeof processedData.data === "string") {
          processedData.data = parseJsonSafely(processedData.data, {});
        }

        // Process level fields
        if (processedData.level) {
          if (processedData.level.fields && typeof processedData.level.fields === "string") {
            processedData.level.fields = parseJsonSafely(processedData.level.fields, []);
          }

          if (processedData.level.features && typeof processedData.level.features === "string") {
            processedData.level.features = parseJsonSafely(processedData.level.features, []);
          }

          if (processedData.level.verificationService && typeof processedData.level.verificationService === "string") {
            processedData.level.verificationService = parseJsonSafely(processedData.level.verificationService, null);
          }
        }

        // Process user profile
        if (processedData.user && processedData.user.profile && typeof processedData.user.profile === "string") {
          processedData.user.profile = parseJsonSafely(processedData.user.profile, {});
        }

        // Process application data fields more efficiently
        if (processedData.data && typeof processedData.data === 'object') {
          Object.keys(processedData.data).forEach((key) => {
            const value = processedData.data[key];
            if (typeof value === "string" && value.startsWith("{") && value.endsWith("}")) {
              processedData.data[key] = parseJsonSafely(value, value);
            }
          });
        }

        // Update field types efficiently
        if (processedData.level && Array.isArray(processedData.level.fields)) {
          processedData.level.fields = processedData.level.fields.map((field: any) => {
            if (
              field.id === "identity" ||
              field.id === "identityVerification" ||
              (field.type === "CUSTOM" && field.label && field.label.toLowerCase().includes("identity"))
            ) {
              return { ...field, type: "IDENTITY" };
            }
            return field;
          });
        }

        setSelectedApplication(processedData);
        setAdminNotes(processedData.adminNotes || "");
        setDrawerLoading(false);
        
      } catch (processingError: any) {
        console.error(`[KYC-DRAWER-DEBUG] Data processing error:`, processingError);
        setDrawerError("Failed to process application data");
        setDrawerLoading(false);
        return;
      }
      
    } catch (error: any) {
      console.error(`[KYC-DRAWER-DEBUG] Fetch error:`, error);
      setDrawerError(error.message || "Failed to load application data");
      setDrawerLoading(false);
    }
  };

  // Handle view application - opens drawer instead of navigating
  const handleViewApplication = async (id: string) => {
    // Reset drawer state before opening
    setSelectedApplication(null);
    setDrawerError(null);
    setDrawerLoading(true);
    setAdminNotes("");
    setActiveDetailTab("details");
    setExpandedSections({});
    setShowConfirmation(null);
    setStatusUpdateSuccess(false);
    setFullScreenImage(null);
    setCopiedField(null);
    
    setIsDrawerOpen(true);
    await fetchApplicationDetails(id);
  };

  // Handle close drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedApplication(null);
    setDrawerError(null);
    setAdminNotes("");
    setActiveDetailTab("details");
    setExpandedSections({});
    setShowConfirmation(null);
    setStatusUpdateSuccess(false);
    setFullScreenImage(null);
    setCopiedField(null);
  };

  // Update application status in drawer
  const updateApplicationStatus = async (status: ApplicationStatus) => {
    if (!selectedApplication || updatingStatus) return; // Prevent multiple simultaneous updates
    setShowConfirmation(null);

    setUpdatingStatus(true);
    setDrawerError(null);

    try {
      const applicationId = selectedApplication.id; // Store ID to prevent race conditions
      const response = await $fetch({
        url: `/api/admin/crm/kyc/application/${applicationId}`,
        method: "PUT",
        body: {
          status,
          adminNotes,
        },
      });

      if (response.error) {
        setDrawerError(response.error);
        return;
      }

      // Update the selected application only if it's still the same one
      setSelectedApplication(prev => 
        prev?.id === applicationId 
          ? { ...prev, status, adminNotes }
          : prev
      );

      // Update the application in the main list
      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, status, adminNotes }
          : app
      ));

      setStatusUpdateSuccess(true);
      setTimeout(() => setStatusUpdateSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error updating application status:", error);
      setDrawerError(error.message || "Failed to update application status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 flex items-center gap-1 px-2 py-1"
          >
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 flex items-center gap-1 px-2 py-1"
          >
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      case "ADDITIONAL_INFO_REQUIRED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 flex items-center gap-1 px-2 py-1"
          >
            <AlertCircle className="h-3 w-3 mr-1" /> Info Required
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 flex items-center gap-1 px-2 py-1"
          >
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  // Don't render anything until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
        </div>
      </div>
    );
  }

  const processedApplication = selectedApplication;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            KYC Applications
          </h1>
          <p className="text-muted-foreground">
            Manage and review Know Your Customer (KYC) verification applications
          </p>
        </div>
        <Button
          className="md:w-auto"
          onClick={() => router.push("/admin/crm/kyc/level")}
        >
          <Shield className="mr-2 h-4 w-4" /> KYC Levels
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Applications
                </p>
                <h3 className="text-3xl font-bold mt-1">{stats.total}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Layers className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={100} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Review
                </p>
                <h3 className="text-3xl font-bold mt-1">{stats.pending}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={
                  stats.total > 0 ? (stats.pending / stats.total) * 100 : 0
                }
                className="h-1 bg-yellow-100 dark:bg-yellow-900/30"
                indicatorClassName="bg-yellow-500 dark:bg-yellow-400"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.total > 0
                  ? Math.round((stats.pending / stats.total) * 100)
                  : 0}
                % of total applications
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Approved
                </p>
                <h3 className="text-3xl font-bold mt-1">{stats.approved}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={
                  stats.total > 0 ? (stats.approved / stats.total) * 100 : 0
                }
                className="h-1 bg-green-100 dark:bg-green-900/30"
                indicatorClassName="bg-green-500 dark:bg-green-400"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {stats.total > 0
                  ? Math.round((stats.approved / stats.total) * 100)
                  : 0}
                % approval rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Processing Time
                </p>
                <h3 className="text-3xl font-bold mt-1">
                  {stats.averageProcessingTime.toFixed(1)}h
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={Math.min(100, (stats.averageProcessingTime / 24) * 100)}
                className="h-1 bg-blue-100 dark:bg-blue-900/30"
                indicatorClassName="bg-blue-500 dark:bg-blue-400"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Average time to process applications
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search applications, users, or levels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon="mdi:magnify"
        />
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Status</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ADDITIONAL_INFO_REQUIRED">
                Info Required
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[160px]">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Level</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={verificationFilter}
            onValueChange={setVerificationFilter}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>Verification</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Verification Types</SelectItem>
              <SelectItem value="service">Service Verification</SelectItem>
              <SelectItem value="manual">Manual Verification</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <span>Sort By</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="verificationType">
                By Verification Type
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs and Applications List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <span className="hidden md:inline">All Applications</span>
            <span className="md:hidden">All</span>
            <Badge variant="secondary">{filteredApplications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="PENDING" className="flex items-center gap-2">
            <span className="hidden md:inline">Pending</span>
            <span className="md:hidden">Pending</span>
            <Badge variant="secondary">
              {
                filteredApplications.filter((app) => app.status === "PENDING")
                  .length
              }
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="flex items-center gap-2">
            <span className="hidden md:inline">Approved</span>
            <span className="md:hidden">Approved</span>
            <Badge variant="secondary">
              {
                filteredApplications.filter((app) => app.status === "APPROVED")
                  .length
              }
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="REJECTED" className="flex items-center gap-2">
            <span className="hidden md:inline">Rejected</span>
            <span className="md:hidden">Rejected</span>
            <Badge variant="secondary">
              {
                filteredApplications.filter((app) => app.status === "REJECTED")
                  .length
              }
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {currentApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3 mb-3">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No applications found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
                  No applications match your current filters. Try adjusting your
                  search criteria or filters.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setLevelFilter("all");
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-400px)] pe-4">
              <div className="space-y-4">
                {currentApplications.map((app) => {
                  return (
                    <Card
                      key={app.id}
                      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
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
                                  alt={app.user?.firstName || "User Avatar"}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {app.user?.firstName?.charAt(0) || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium text-lg">
                                  {app.user?.firstName} {app.user?.lastName}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {app.user?.email || "No email available"}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={app.status} />
                              <Badge
                                variant="outline"
                                className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary border-primary/20 dark:border-primary/30 flex items-center gap-1"
                              >
                                <Layers className="h-3 w-3 mr-1" />
                                {app.level?.name || "Unknown"}
                              </Badge>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {app.level?.verificationService ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                                      >
                                        <ShieldCheck className="h-3 w-3 mr-1" />{" "}
                                        {app.level.verificationService.name}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 flex items-center gap-1"
                                      >
                                        <ShieldOff className="h-3 w-3 mr-1" />{" "}
                                        Manual
                                      </Badge>
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {app.level?.verificationService
                                      ? `Verified by ${app.level.verificationService.name} service`
                                      : "Manual verification by admin"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>

                          <Separator className="my-4" />

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Application ID
                              </p>
                              <p className="text-sm font-mono mt-1">{app.id}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Submitted
                              </p>
                              <p className="text-sm mt-1 flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(app.createdAt ?? ""), "PPP p")}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                Reviewed
                              </p>
                              <p className="text-sm mt-1 flex items-center gap-1">
                                {app.reviewedAt ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    {format(new Date(app.reviewedAt), "PPP p")}
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 text-yellow-500" />
                                    Not reviewed yet
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          {app.adminNotes && (
                            <div className="mt-4 bg-muted/50 dark:bg-muted/20 p-3 rounded-md border border-muted dark:border-muted/40">
                              <p className="text-sm font-medium text-foreground">Admin Notes</p>
                              <p className="text-sm mt-1 text-muted-foreground">{app.adminNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Application Details Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent 
          side="right" 
          className="kyc-drawer-content !w-[90vw] !max-w-[90vw] min-w-[90vw] p-0 overflow-hidden"
          style={{ width: '90vw', maxWidth: '90vw', minWidth: '90vw' }}
        >
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SheetTitle className="text-xl font-semibold">
                {drawerLoading ? "Loading..." : "KYC Application Details"}
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-hidden">
              {drawerLoading ? (
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-64" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                </div>
              ) : drawerError || !processedApplication ? (
                <div className="p-6">
                  <div className="text-center py-10">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                      {drawerError || "Application not found"}
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-2">
                      {drawerError
                        ? "There was an error loading the application. Please try again."
                        : "The application you're looking for doesn't exist or you don't have permission to view it."}
                    </p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button
                        variant="outline"
                        onClick={handleCloseDrawer}
                      >
                        Close
                      </Button>
                      {drawerError && (
                        <Button
                          variant="default"
                          onClick={() => fetchApplicationDetails(selectedApplication?.id || "")}
                          disabled={drawerLoading}
                        >
                          {drawerLoading ? "Retrying..." : "Retry"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {statusUpdateSuccess && (
                    <div className="px-6 py-2">
                      <StatusUpdateSuccess />
                    </div>
                  )}

                  {/* Status Banner */}
                  <div className="px-6 py-2">
                    <StatusBanner status={processedApplication.status} />
                  </div>

                  {/* Progress Bar */}
                  <div className="px-6 py-2">
                    <ProgressBar status={processedApplication.status} />
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {/* Mobile Layout - Tabs for everything */}
                    <div className="block lg:hidden h-full flex flex-col">
                      <div className="p-4 border-b flex-shrink-0">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold">
                              Application #{processedApplication.id}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Submitted on {new Date(processedApplication.createdAt ?? "").toLocaleDateString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <FileText className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        </div>
                      </div>

                      <Tabs
                        value={activeDetailTab}
                        onValueChange={setActiveDetailTab}
                        className="flex flex-col flex-1 min-h-0"
                      >
                        <div className="px-4 py-2 border-b flex-shrink-0">
                          <TabsList className="grid grid-cols-4 w-full">
                            <TabsTrigger value="details" className="flex items-center gap-1">
                              <FileCheck className="h-4 w-4" />
                              <span className="text-xs">Details</span>
                            </TabsTrigger>
                            <TabsTrigger value="verification" className="flex items-center gap-1">
                              <ShieldCheck className="h-4 w-4" />
                              <span className="text-xs">Verify</span>
                            </TabsTrigger>
                            <TabsTrigger value="user" className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span className="text-xs">User</span>
                            </TabsTrigger>
                            <TabsTrigger value="review" className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span className="text-xs">Review</span>
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <div className="flex-1 min-h-0">
                          <TabsContent value="details" className="h-full m-0 overflow-auto">
                            <div className="p-4">
                              <ApplicationDetailsTab
                                level={processedApplication.level}
                                applicationData={processedApplication.data}
                                expandedSections={expandedSections}
                                toggleSection={toggleSection}
                                onCopy={copyToClipboard}
                                copiedField={copiedField}
                                onViewImage={setFullScreenImage}
                              />
                            </div>
                          </TabsContent>

                          <TabsContent value="verification" className="h-full m-0 overflow-auto">
                            <div className="p-4">
                              <VerificationTab 
                                applicationId={processedApplication.id} 
                                level={processedApplication.level} 
                              />
                            </div>
                          </TabsContent>

                          <TabsContent value="user" className="h-full m-0 overflow-auto">
                            <div className="p-4">
                              <UserProfileTab
                                user={processedApplication.user}
                                userName={`${processedApplication.user.firstName || ""} ${processedApplication.user.lastName || ""}`.trim() || "User"}
                                userInitials={`${processedApplication.user.firstName || ""} ${processedApplication.user.lastName || ""}`.trim().split(" ").map((n) => n[0] || "").join("").toUpperCase()}
                                copiedField={copiedField}
                                onCopy={copyToClipboard}
                              />
                            </div>
                          </TabsContent>

                          <TabsContent value="review" className="h-full m-0 overflow-auto">
                            <div className="p-4 space-y-4">
                              <AnimatePresence>
                                {showConfirmation && (
                                  <StatusConfirmation
                                    status={showConfirmation}
                                    onConfirm={() => updateApplicationStatus(showConfirmation)}
                                    onCancel={() => setShowConfirmation(null)}
                                  />
                                )}
                              </AnimatePresence>

                              <ReviewSidebar
                                adminNotes={adminNotes}
                                onAdminNotesChange={setAdminNotes}
                                onStatusChange={setShowConfirmation}
                                updatingStatus={updatingStatus}
                                currentStatus={processedApplication.status}
                              />

                              <VerificationTips />
                            </div>
                          </TabsContent>
                        </div>
                      </Tabs>
                    </div>

                    {/* Desktop Layout - Side by side */}
                    <div className="hidden lg:flex flex-col h-full">
                      <div className="p-6 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">
                              Application #{processedApplication.id}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Submitted on {new Date(processedApplication.createdAt ?? "").toLocaleDateString()} at {new Date(processedApplication.createdAt ?? "").toLocaleTimeString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <FileText className="h-4 w-4 mr-1" />
                            Print
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 flex overflow-hidden">
                        {/* Main Content */}
                        <div className="flex-1 overflow-auto">
                          <div className="p-6">
                            <Tabs
                              value={activeDetailTab}
                              onValueChange={setActiveDetailTab}
                              className="w-full"
                            >
                              <TabsList className="grid grid-cols-3 w-full mb-6">
                                <TabsTrigger
                                  value="details"
                                  className="flex items-center gap-2"
                                >
                                  <FileCheck className="h-4 w-4" />
                                  <span>Application Details</span>
                                </TabsTrigger>
                                <TabsTrigger
                                  value="verification"
                                  className="flex items-center gap-2"
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  <span>Verification</span>
                                </TabsTrigger>
                                <TabsTrigger
                                  value="user"
                                  className="flex items-center gap-2"
                                >
                                  <User className="h-4 w-4" />
                                  <span>User Profile</span>
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="details" className="mt-0">
                                <ApplicationDetailsTab
                                  level={processedApplication.level}
                                  applicationData={processedApplication.data}
                                  expandedSections={expandedSections}
                                  toggleSection={toggleSection}
                                  onCopy={copyToClipboard}
                                  copiedField={copiedField}
                                  onViewImage={setFullScreenImage}
                                />
                              </TabsContent>

                              <TabsContent value="verification" className="mt-0">
                                <VerificationTab 
                                  applicationId={processedApplication.id} 
                                  level={processedApplication.level} 
                                />
                              </TabsContent>

                              <TabsContent value="user" className="mt-0">
                                <UserProfileTab
                                  user={processedApplication.user}
                                  userName={`${processedApplication.user.firstName || ""} ${processedApplication.user.lastName || ""}`.trim() || "User"}
                                  userInitials={`${processedApplication.user.firstName || ""} ${processedApplication.user.lastName || ""}`.trim().split(" ").map((n) => n[0] || "").join("").toUpperCase()}
                                  copiedField={copiedField}
                                  onCopy={copyToClipboard}
                                />
                              </TabsContent>
                            </Tabs>
                          </div>
                        </div>

                        {/* Sidebar */}
                        <div className="w-80 border-l bg-muted/20 overflow-auto">
                          <div className="p-4 space-y-4">
                            <AnimatePresence>
                              {showConfirmation && (
                                <StatusConfirmation
                                  status={showConfirmation}
                                  onConfirm={() => updateApplicationStatus(showConfirmation)}
                                  onCancel={() => setShowConfirmation(null)}
                                />
                              )}
                            </AnimatePresence>

                            <ReviewSidebar
                              adminNotes={adminNotes}
                              onAdminNotesChange={setAdminNotes}
                              onStatusChange={setShowConfirmation}
                              updatingStatus={updatingStatus}
                              currentStatus={processedApplication.status}
                            />

                            <VerificationTips />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Full Screen Image Viewer */}
      <AnimatePresence>
        {fullScreenImage && (
          <FullScreenImageViewer
            src={fullScreenImage}
            onClose={() => setFullScreenImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
