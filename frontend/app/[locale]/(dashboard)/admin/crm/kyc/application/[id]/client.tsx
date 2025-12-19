"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  FileCheck,
  ShieldCheck,
  User,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Layers,
  ShieldOff,
  Printer,
  RefreshCw,
  Mail,
  Phone,
  Globe,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Import existing components
import { ApplicationDetailsTab } from "../components/application-details-tab";
import { VerificationTab } from "../components/verification-tab";
import { UserProfileTab } from "../components/user-tab";
import { ReviewSidebar, VerificationTips } from "../components/sidebar";
import { FullScreenImageViewer } from "../components/image-viewer";
import {
  type ApplicationStatus,
  ProgressBar,
  StatusBanner,
  StatusConfirmation,
  StatusUpdateSuccess,
  getStatusInfo,
} from "../components/status";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

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

export default function ApplicationDetailClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationWithDetails | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail page states
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [showConfirmation, setShowConfirmation] =
    useState<ApplicationStatus | null>(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setApplicationId(p.id));
  }, [params]);

  // Fetch application data
  useEffect(() => {
    if (!applicationId) return;

    const fetchApplication = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await $fetch({
          url: `/api/admin/crm/kyc/application/${applicationId}`,
          silent: true,
        });

        if (response.error) {
          setError(response.error);
          return;
        }

        const data = response.data;
        if (!data) {
          setError("Application not found");
          return;
        }

        // Process the data
        const processedData = { ...data };

        const parseJsonSafely = (jsonString: string, fallback: any = {}) => {
          try {
            if (typeof jsonString === "string" && jsonString.trim()) {
              return JSON.parse(jsonString);
            }
            return fallback;
          } catch {
            return fallback;
          }
        };

        if (processedData.data && typeof processedData.data === "string") {
          processedData.data = parseJsonSafely(processedData.data, {});
        }

        if (processedData.level) {
          if (
            processedData.level.fields &&
            typeof processedData.level.fields === "string"
          ) {
            processedData.level.fields = parseJsonSafely(
              processedData.level.fields,
              []
            );
          }
          if (
            processedData.level.features &&
            typeof processedData.level.features === "string"
          ) {
            processedData.level.features = parseJsonSafely(
              processedData.level.features,
              []
            );
          }
          if (
            processedData.level.verificationService &&
            typeof processedData.level.verificationService === "string"
          ) {
            processedData.level.verificationService = parseJsonSafely(
              processedData.level.verificationService,
              null
            );
          }
        }

        if (
          processedData.user?.profile &&
          typeof processedData.user.profile === "string"
        ) {
          processedData.user.profile = parseJsonSafely(
            processedData.user.profile,
            {}
          );
        }

        if (processedData.data && typeof processedData.data === "object") {
          Object.keys(processedData.data).forEach((key) => {
            const value = processedData.data[key];
            if (
              typeof value === "string" &&
              value.startsWith("{") &&
              value.endsWith("}")
            ) {
              processedData.data[key] = parseJsonSafely(value, value);
            }
          });
        }

        if (processedData.level && Array.isArray(processedData.level.fields)) {
          processedData.level.fields = processedData.level.fields.map(
            (field: any) => {
              if (
                field.id === "identity" ||
                field.id === "identityVerification" ||
                (field.type === "CUSTOM" &&
                  field.label?.toLowerCase().includes("identity"))
              ) {
                return { ...field, type: "IDENTITY" };
              }
              return field;
            }
          );
        }

        setApplication(processedData);
        setAdminNotes(processedData.adminNotes || "");
      } catch (err: any) {
        setError(err.message || "Failed to load application");
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId]);

  const updateApplicationStatus = async (status: ApplicationStatus) => {
    if (!application || updatingStatus) return;
    setShowConfirmation(null);
    setUpdatingStatus(true);
    setError(null);

    try {
      const response = await $fetch({
        url: `/api/admin/crm/kyc/application/${application.id}`,
        method: "PUT",
        body: { status, adminNotes },
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setApplication((prev) => (prev ? { ...prev, status, adminNotes } : null));
      setStatusUpdateSuccess(true);
      setTimeout(() => setStatusUpdateSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-12 h-12 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground">
            Loading application...
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !application) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <motion.div
          className="flex flex-col items-center gap-4 text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold">
            {error || "Application not found"}
          </h2>
          <p className="text-sm text-muted-foreground">
            The application you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <div className="flex gap-2">
            <Link href="/admin/crm/kyc/application">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Applications
              </Button>
            </Link>
            {error && (
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(application.status);
  const userName =
    `${application.user?.firstName || ""} ${application.user?.lastName || ""}`.trim() ||
    "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase();

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Premium Header */}
      <motion.div variants={itemVariants} className="sticky top-0 z-50">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
          </div>

          <div className="relative container mx-auto px-4 md:px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left side */}
              <div className="flex items-center gap-4">
                <Link href="/admin/crm/kyc/application">
                  <motion.div
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>

                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Avatar className="h-12 w-12 border-2 border-white/20">
                      <AvatarImage src={application.user?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-medium">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>

                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">
                      {userName}
                    </h1>
                    <div className="flex items-center gap-3 text-slate-400 text-sm">
                      <span className="font-mono">
                        #{application.id.slice(0, 8)}
                      </span>
                      <span>•</span>
                      <span>{application.level?.name || "Unknown Level"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Status & Actions */}
              <div className="flex items-center gap-3">
                <Badge
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium",
                    application.status === "APPROVED"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : application.status === "REJECTED"
                        ? "bg-red-500/20 text-red-300 border-red-500/30"
                        : application.status === "ADDITIONAL_INFO_REQUIRED"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  )}
                >
                  {statusInfo.icon}
                  <span className="ml-1.5">{statusInfo.label}</span>
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>

            {/* Quick Info Row */}
            <motion.div
              className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 pt-4 border-t border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  Submitted{" "}
                  <span className="text-white font-medium">
                    {format(new Date(application.createdAt || ""), "PPP")}
                  </span>
                </span>
              </div>

              {application.reviewedAt && (
                <div className="flex items-center gap-2 text-slate-400">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm">
                    Reviewed{" "}
                    <span className="text-white font-medium">
                      {format(new Date(application.reviewedAt), "PPP")}
                    </span>
                  </span>
                </div>
              )}

              {application.level?.verificationService ? (
                <div className="flex items-center gap-2 text-indigo-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {application.level.verificationService.name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldOff className="h-4 w-4" />
                  <span className="text-sm">Manual Verification</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-6">
        <AnimatePresence>
          {statusUpdateSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              <StatusUpdateSuccess />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Banner & Progress */}
        <motion.div variants={itemVariants} className="space-y-4 mb-6">
          <StatusBanner status={application.status} />
          <ProgressBar status={application.status} />
        </motion.div>

        {/* Review Section - Full Width Card */}
        <motion.div variants={itemVariants} className="mb-6">
          <Card className="shadow-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
            <CardContent className="p-6">
              <AnimatePresence>
                {showConfirmation && (
                  <div className="mb-4">
                    <StatusConfirmation
                      status={showConfirmation}
                      onConfirm={() =>
                        updateApplicationStatus(showConfirmation)
                      }
                      onCancel={() => setShowConfirmation(null)}
                    />
                  </div>
                )}
              </AnimatePresence>

              <ReviewSidebar
                adminNotes={adminNotes}
                onAdminNotesChange={setAdminNotes}
                onStatusChange={setShowConfirmation}
                updatingStatus={updatingStatus}
                currentStatus={application.status}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Area - Full Width */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-6 pt-4 pb-2">
                <TabsList className="grid grid-cols-4 w-full h-12">
                  <TabsTrigger
                    value="details"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <FileCheck className="h-4 w-4" />
                    <span>Details</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="verification"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verify</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="user"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <User className="h-4 w-4" />
                    <span>User</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="tips"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>Tips</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="px-4 pt-2">
                <TabsContent value="details" className="mt-0">
                  <ApplicationDetailsTab
                    level={application.level}
                    applicationData={application.data}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    onCopy={copyToClipboard}
                    copiedField={copiedField}
                    onViewImage={setFullScreenImage}
                  />
                </TabsContent>

                <TabsContent value="verification" className="mt-0">
                  <VerificationTab
                    applicationId={application.id}
                    level={application.level}
                  />
                </TabsContent>

                <TabsContent value="user" className="mt-0">
                  <UserProfileTab
                    user={application.user}
                    userName={userName}
                    userInitials={userInitials}
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                </TabsContent>

                <TabsContent value="tips" className="mt-0">
                  <VerificationTips />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>

      {/* Full Screen Image Viewer */}
      <AnimatePresence>
        {fullScreenImage && (
          <FullScreenImageViewer
            src={fullScreenImage}
            onClose={() => setFullScreenImage(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
