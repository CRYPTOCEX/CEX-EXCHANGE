"use client";

import type React from "react";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Shield,
  FileText,
  Info,
  Calendar,
  CheckSquare,
  MessageSquare,
  HelpCircle,
  Download,
  Layers,
  ArrowUpRight,
  Fingerprint,
  Lock,
  ChevronRight,
  Camera,
  CreditCard,
  Landmark,
  MapPin,
  User,
  CheckCheck,
  ShieldCheck,
  BadgeCheck,
  FileCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbox } from "@/components/ui/lightbox";
import { $fetch } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Define the KycApplication type

interface KycApplication {
  id: string;
  status: string;
  level: {
    name: string;
    fields: any[];
    features: any[];
  };
  data: any;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  verificationResult?: VerificationResult;
}
type VerificationStatus =
  | "VERIFIED"
  | "FAILED"
  | "MANUAL_REVIEW"
  | "PENDING"
  | "NOT_STARTED"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED";
interface VerificationResult {
  status: VerificationStatus;
  score: number;
  checks: Record<string, any> | string;
}

// Improved verification score chart component with better rendering
const VerificationScoreChart = ({
  score = 0,
  checks = {},
  passedChecks = 0,
  totalChecks = 0,
}: {
  score: number;
  checks: Record<string, any>;
  passedChecks: number;
  totalChecks: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  useEffect(() => {
    if (!isClient || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions with device pixel ratio for high-resolution rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw background circle
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Draw background circle with gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGradient.addColorStop(0, "#f1f5f9");
    bgGradient.addColorStop(1, "#e2e8f0");
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = bgGradient;
    ctx.fill();

    // Draw progress arc with gradient
    const startAngle = -0.5 * Math.PI; // Start at top
    const endAngle = startAngle + 2 * Math.PI * (score / 100);
    let progressGradient;
    if (score >= 70) {
      progressGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      progressGradient.addColorStop(0, "#22c55e"); // green-500
      progressGradient.addColorStop(1, "#16a34a"); // green-600
    } else if (score >= 40) {
      progressGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      progressGradient.addColorStop(0, "#f59e0b"); // amber-500
      progressGradient.addColorStop(1, "#d97706"); // amber-600
    } else {
      progressGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
      progressGradient.addColorStop(0, "#ef4444"); // red-500
      progressGradient.addColorStop(1, "#dc2626"); // red-600
    }
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = progressGradient;
    ctx.fill();

    // Add shadow to the progress arc
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw inner circle (to create donut) with subtle gradient
    const innerGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.5,
      centerX,
      centerY,
      radius * 0.7
    );
    innerGradient.addColorStop(0, "#ffffff");
    innerGradient.addColorStop(1, "#f8fafc");
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.7, 0, 2 * Math.PI);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw text with subtle shadow
    ctx.fillStyle = "#0f172a"; // slate-900
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add subtle text shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.1)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(`${Math.round(score)}%`, centerX, centerY);
  }, [isClient, score]);
  return (
    <div className="flex flex-col items-center p-4">
      <div className="relative w-48 h-48">
        {isClient ? (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
          >
            <canvas
              ref={canvasRef}
              width={192}
              height={192}
              style={{
                width: "192px",
                height: "192px",
              }}
            />
          </motion.div>
        ) : (
          <div className="w-48 h-48 rounded-full bg-muted animate-pulse" />
        )}
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          {totalChecks > 0
            ? `${passedChecks} of ${totalChecks} checks passed`
            : "No verification checks performed yet"}
        </p>
      </div>
    </div>
  );
};

// Document preview component with improved styling
const DocumentPreview = ({
  document,
  type,
  path,
}: {
  document: any;
  type: string;
  path?: string;
}) => {
  const t = useTranslations("dashboard");
  return (
    <motion.div
      whileHover={{
        y: -5,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
      }}
      transition={{
        duration: 0.2,
      }}
      className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-3 flex justify-between items-center border-b">
        <div className="flex items-center">
          <div className="bg-primary/10 p-1.5 rounded-md mr-2">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-sm capitalize">
            {type.replace(/-/g, " ")}
          </span>
        </div>
        {path && (
          <a
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button variant="ghost" size="sm" className="rounded-full">
              <Download className="h-4 w-4 mr-1" />
              <span className="text-xs">{t("Download")}</span>
            </Button>
          </a>
        )}
      </div>
      <div className="aspect-[3/2] bg-slate-100 relative">
        {path ? (
          <Lightbox
            src={path}
            alt={type}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t("document_preview_protected")}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Add this function to parse JSON strings safely
const safeJsonParse = (
  jsonString: string | null | undefined,
  fallback: any = {}
) => {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return fallback;
  }
};

// Field icon mapping with improved styling
const getFieldIcon = (fieldType: string) => {
  switch (fieldType.toUpperCase()) {
    case "TEXT":
      return <FileText className="h-4 w-4" />;
    case "IDENTITY":
      return <CreditCard className="h-4 w-4" />;
    case "FILE":
    case "IMAGE":
      return <Camera className="h-4 w-4" />;
    case "ADDRESS":
      return <MapPin className="h-4 w-4" />;
    case "CHECKBOX":
      return <CheckSquare className="h-4 w-4" />;
    case "SELECT":
    case "RADIO":
      return <ChevronRight className="h-4 w-4" />;
    case "DATE":
      return <Calendar className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

// Verification step component
const VerificationStep = ({
  icon,
  title,
  description,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
}) => {
  const t = useTranslations("dashboard");
  return (
    <div className="flex items-start space-x-3">
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          status === "completed"
            ? "bg-green-100"
            : status === "current"
              ? "bg-amber-100"
              : "bg-slate-100"
        )}
      >
        {status === "completed" ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          icon
        )}
      </div>
      <div>
        <div className="flex items-center">
          <h4 className="font-medium text-sm">{title}</h4>
          {status === "current" && (
            <Badge
              variant="outline"
              className="ml-2 bg-amber-100 text-amber-800 border-amber-300 text-[10px]"
            >
              {t("in_progress")}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
};

// Update the getStatusInfo function to properly map FAILED to REJECTED
const getStatusInfo = (status: VerificationStatus) => {
  switch (status) {
    case "VERIFIED":
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        color: "text-green-500",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        label: "Verified",
        description: "All verification checks passed successfully",
      };
    case "FAILED":
    case "REJECTED":
      return {
        icon: <XCircle className="h-5 w-5" />,
        color: "text-red-500",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        label: "Rejected",
        description: "One or more verification checks failed",
      };
    case "MANUAL_REVIEW":
      return {
        icon: <AlertCircle className="h-5 w-5" />,
        color: "text-blue-500",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        label: "Manual Review Required",
        description:
          "This application requires manual review by an administrator",
      };
    case "PENDING":
      return {
        icon: <Clock className="h-5 w-5" />,
        color: "text-yellow-500",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        label: "Pending",
        description: "Verification is in progress",
      };
    case "APPROVED":
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        color: "text-green-500",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        label: "Approved",
        description: "This verification has been approved",
      };
    case "NOT_STARTED":
    default:
      return {
        icon: <AlertTriangle className="h-5 w-5" />,
        color: "text-gray-500",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        label: "Not Started",
        description: "Verification has not been initiated yet",
      };
  }
};

// Update the getVerificationProgress function to handle REJECTED status
const getVerificationProgress = (result: VerificationResult | undefined) => {
  if (!result) return 0;
  switch (result.status) {
    case "VERIFIED":
    case "APPROVED":
      return 100;
    case "FAILED":
    case "REJECTED":
      return 100;
    case "MANUAL_REVIEW":
      return 75;
    case "PENDING":
    case "PROCESSING":
      return 50;
    case "NOT_STARTED":
    default:
      return 0;
  }
};

// Main component
export function ApplicationDetailsClient() {
  const t = useTranslations("dashboard");
  const { id } = useParams() as {
    id: string;
  };
  const router = useRouter();
  const { toast } = useToast();
  const [application, setApplication] = useState<KycApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showSupport, setShowSupport] = useState(false);

  // Fetch application data with useCallback to prevent unnecessary re-renders
  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await $fetch({
        url: `/api/user/kyc/application/${id}`,
        silentSuccess: true,
      });
      if (error) {
        throw new Error(error);
      }

      // Deconstruct the data object
      const { level: fetchedLevel, ...fetchedApplication } = data;

      // Parse the JSON strings
      const parsedData = safeJsonParse(fetchedApplication.data);
      const parsedFields = safeJsonParse(fetchedLevel.fields);
      const parsedFeatures = safeJsonParse(fetchedLevel.features);

      // Create the application object with parsed data
      setApplication({
        ...fetchedApplication,
        data: parsedData,
        level: {
          ...fetchedLevel,
          fields: parsedFields,
          features: parsedFeatures,
        },
      });
    } catch (error) {
      console.error("Failed to fetch KYC application:", error);
      toast({
        title: "Error",
        description: "Failed to load KYC application details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id]); // Only depend on the id parameter

  // Call fetchApplication only once when the component mounts
  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "PENDING":
        return <Clock className="h-8 w-8 text-amber-500" />;
      case "REJECTED":
        return <XCircle className="h-8 w-8 text-red-500" />;
      case "ADDITIONAL_INFO_REQUIRED":
        return <AlertTriangle className="h-8 w-8 text-orange-500" />;
      default:
        return <Info className="h-8 w-8 text-gray-500" />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-300";
      case "PENDING":
        return "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-300";
      case "REJECTED":
        return "bg-gradient-to-r from-red-50 to-red-100 text-red-800 border-red-300";
      case "ADDITIONAL_INFO_REQUIRED":
        return "bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-300";
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "Your KYC application has been approved. You now have full access to all features.";
      case "PENDING":
        return "Your KYC application is currently under review. This process typically takes 1-3 business days.";
      case "REJECTED":
        return "Your KYC application has been rejected. Please review the admin notes for more information.";
      case "ADDITIONAL_INFO_REQUIRED":
        return "Additional information is required to complete your KYC verification. Please review the admin notes and update your application.";
      default:
        return "Status information unavailable.";
    }
  };
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const renderFieldValue = (field: any, value: any) => {
    if (!value) return "Not provided";
    switch (field.type) {
      case "DATE":
        return formatDate(value);
      case "CHECKBOX":
        return value ? "Yes" : "No";
      case "SELECT":
      case "RADIO": {
        const option = field.options?.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      case "IMAGE":
      case "FILE":
        return value.name || "File uploaded";
      case "ADDRESS":
        return `${value.street || ""}, ${value.city || ""}, ${value.state || ""}, ${value.zip || ""}, ${value.country || ""}`;
      case "IDENTITY":
        return `${value.documentType || "ID"} (${value.documentNumber || "No number provided"})`;
      default:
        return typeof value === "object" ? JSON.stringify(value) : value;
    }
  };

  // Fix the renderApplicationData function to properly handle empty or missing fields
  const renderApplicationData = (data: any, fields: any) => {
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {t("no_application_data")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t("no_application_data_was_found")}.{" "}
            {t("this_may_be_additional_information")}.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {fields.map((field: any, index: number) => {
          if (field.type === "SECTION") {
            return (
              <div key={field.id || index} className="mt-8 mb-4">
                <h3 className="text-lg font-semibold mb-2 text-slate-800 flex items-center">
                  <div className="bg-primary/10 p-1 rounded-md mr-2">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  {field.label}
                </h3>
                {field.description && (
                  <p className="text-sm text-muted-foreground mb-4 ml-9">
                    {field.description}
                  </p>
                )}
                {field.fields && renderApplicationData(data, field.fields)}
              </div>
            );
          }

          // Make sure field.id exists and is a valid key in data
          if (!field.id || !data) {
            return null;
          }
          const value = data[field.id];
          return (
            <motion.div
              key={field.id || index}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.05,
              }}
              className="grid grid-cols-3 gap-4 items-start rounded-lg p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="col-span-1">
                <div className="flex items-center">
                  <span className="mr-2 text-primary bg-primary/10 p-1 rounded-md">
                    {getFieldIcon(field.type)}
                  </span>
                  <p className="font-medium text-sm">{field.label}</p>
                  {field.required && (
                    <span className="ml-1 text-red-500 text-xs">*</span>
                  )}
                  {field.description && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">
                            {field.description}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {!field.description && !field.tooltip && (
                  <p className="text-xs text-muted-foreground ml-7">
                    {field.placeholder || " "}
                  </p>
                )}
              </div>
              <div
                className={cn(
                  "col-span-2 p-3 rounded-md",
                  field.type === "IDENTITY" ||
                    field.type === "FILE" ||
                    field.type === "IMAGE"
                    ? "bg-slate-100"
                    : "bg-slate-50"
                )}
              >
                <p className="text-sm break-words">
                  {renderFieldValue(field, value)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Update the renderDocumentsTab function to handle the parsed data structure
  const renderDocumentsTab = (application: KycApplication) => {
    // Check if there's any document data in the application
    const hasDocuments =
      application.data &&
      typeof application.data === "object" &&
      Object.entries(application.data).some(([key, value]) => {
        // Check for direct file paths
        if (
          typeof value === "string" &&
          (value.startsWith("/uploads/") ||
            value.includes(".jpg") ||
            value.includes(".jpeg") ||
            value.includes(".png") ||
            value.includes(".webp"))
        ) {
          return true;
        }

        // Check for nested document objects
        if (value && typeof value === "object") {
          return Object.entries(value).some(
            ([nestedKey, nestedValue]) =>
              typeof nestedValue === "string" &&
              (nestedValue.startsWith("/uploads/") ||
                nestedValue.includes(".jpg") ||
                nestedValue.includes(".jpeg") ||
                nestedValue.includes(".png") ||
                nestedValue.includes(".webp"))
          );
        }
        return false;
      });
    if (!hasDocuments) {
      return (
        <div className="text-center py-16">
          <div className="bg-slate-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {t("no_documents_found")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t("no_documents_were_found_in_your_application")}.{" "}
            {t("this_may_be_document_verification")}.
          </p>
        </div>
      );
    }

    // Collect all document files from the data
    const documents: Array<{
      key: string;
      path: string;
      label: string;
    }> = [];

    // Function to extract documents from data
    const extractDocuments = (data: any, prefix = "") => {
      if (!data || typeof data !== "object") return;
      Object.entries(data).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (
          typeof value === "string" &&
          (value.startsWith("/uploads/") ||
            value.includes(".jpg") ||
            value.includes(".jpeg") ||
            value.includes(".png") ||
            value.includes(".webp"))
        ) {
          // This is a document file path
          documents.push({
            key: fullKey,
            path: value,
            label: key
              .replace(/-/g, " ")
              .replace(/([A-Z])/g, " $1")
              .trim(),
          });
        } else if (value && typeof value === "object") {
          // Recursively check nested objects
          extractDocuments(value, fullKey);
        }
      });
    };
    extractDocuments(application.data);
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc, index) => (
            <motion.div
              key={doc.key}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.1,
              }}
            >
              <DocumentPreview
                document={doc}
                type={doc.label}
                path={doc.path}
              />
            </motion.div>
          ))}
        </div>

        <div
          role="alert"
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-start">
            <div className="bg-blue-100 p-1.5 rounded-full mr-2 flex-shrink-0">
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-md font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                {t("document_security")}
              </div>
              <div className="text-blue-700 mt-1">
                {t("your_documents_are_encrypted_and_securely_stored")}.{" "}
                {t("only_authorized_personnel_verification_process")}.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update the renderOverviewTab function to properly display verification checks
  const renderOverviewTab = (application: KycApplication) => {
    const verificationProgress = getVerificationProgress(
      application.verificationResult
    );
    const verificationStatus =
      application.verificationResult?.status || "NOT_STARTED";

    // Properly handle the checks data
    const parsedChecks = application.verificationResult?.checks
      ? typeof application.verificationResult.checks === "string"
        ? JSON.parse(application.verificationResult.checks)
        : application.verificationResult.checks
      : {};

    // Calculate passed checks correctly
    const verificationChecks: Array<{
      key: string;
      name: string;
      passed: boolean;
      description: string;
    }> = [];
    let passedChecks = 0;

    // Add selfie match check
    if (parsedChecks.selfieMatch !== undefined) {
      verificationChecks.push({
        key: "selfieMatch",
        name: "Selfie Match",
        passed: parsedChecks.selfieMatch,
        description: "Verification of selfie against ID document",
      });
      if (parsedChecks.selfieMatch) passedChecks++;
    }

    // Add document authentic check
    if (parsedChecks.documentAuthentic !== undefined) {
      verificationChecks.push({
        key: "documentAuthentic",
        name: "Document Authentic",
        passed: parsedChecks.documentAuthentic,
        description: "Verification of document authenticity",
      });
      if (parsedChecks.documentAuthentic) passedChecks++;
    }

    // Get confidence score (convert from 0-1 to 0-100 if needed)
    const confidenceScore =
      parsedChecks.confidenceScore !== undefined
        ? parsedChecks.confidenceScore <= 1
          ? Math.round(parsedChecks.confidenceScore * 100)
          : Math.round(parsedChecks.confidenceScore)
        : 0;
    return (
      <div className="space-y-8">
        {/* Application Information Card */}
        <Card className="overflow-hidden border border-slate-200">
          <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b">
            <CardTitle className="text-lg flex items-center">
              <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              {t("application_information")}
            </CardTitle>
            <CardDescription>
              {t("details_about_your_kyc_application")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
              <div className="space-y-1 bg-slate-50 p-3 rounded-md">
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("application_id")}
                </dt>
                <dd className="text-sm font-medium flex items-center">
                  <span className="bg-primary/10 p-1 rounded-full mr-2">
                    <FileText className="h-3 w-3 text-primary" />
                  </span>
                  {application.id.substring(0, 8)}
                </dd>
              </div>
              <div className="space-y-1 bg-slate-50 p-3 rounded-md">
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("submitted_on")}
                </dt>
                <dd className="text-sm font-medium flex items-center">
                  <span className="bg-primary/10 p-1 rounded-full mr-2">
                    <Calendar className="h-3 w-3 text-primary" />
                  </span>
                  {formatDate(application.createdAt)}
                </dd>
              </div>
              {application.reviewedAt && (
                <div className="space-y-1 bg-slate-50 p-3 rounded-md">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {t("reviewed_on")}
                  </dt>
                  <dd className="text-sm font-medium flex items-center">
                    <span className="bg-primary/10 p-1 rounded-full mr-2">
                      <CheckCheck className="h-3 w-3 text-primary" />
                    </span>
                    {formatDate(application.reviewedAt)}
                  </dd>
                </div>
              )}
              <div className="space-y-1 bg-slate-50 p-3 rounded-md">
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("last_updated")}
                </dt>
                <dd className="text-sm font-medium flex items-center">
                  <span className="bg-primary/10 p-1 rounded-full mr-2">
                    <Clock className="h-3 w-3 text-primary" />
                  </span>
                  {formatDate(application.updatedAt)}
                </dd>
              </div>
              <div className="space-y-1 bg-slate-50 p-3 rounded-md">
                <dt className="text-xs font-medium text-muted-foreground">
                  {t("kyc_level")}
                </dt>
                <dd className="text-sm font-medium flex items-center">
                  <span className="bg-primary/10 p-1 rounded-full mr-2">
                    <BadgeCheck className="h-3 w-3 text-primary" />
                  </span>
                  {application.level.name}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Admin Notes (if any) - Improved styling */}
        {application.adminNotes && (
          <div
            role="alert"
            className={cn(
              "border-l-4 shadow-sm p-4",
              // added padding for inner spacing
              application.status === "REJECTED"
                ? "border-red-500 bg-gradient-to-r from-red-50 to-red-100 border-red-200"
                : application.status === "ADDITIONAL_INFO_REQUIRED"
                  ? "border-l-orange-500 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200"
                  : "border-l-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
            )}
          >
            <div className="flex items-start">
              <div
                className={cn(
                  "p-2 rounded-full mr-3 flex-shrink-0",
                  application.status === "REJECTED"
                    ? "bg-red-100"
                    : application.status === "ADDITIONAL_INFO_REQUIRED"
                      ? "bg-orange-100"
                      : "bg-blue-100"
                )}
              >
                <Info
                  className={cn(
                    "h-5 w-5",
                    application.status === "REJECTED"
                      ? "text-red-600"
                      : application.status === "ADDITIONAL_INFO_REQUIRED"
                        ? "text-orange-600"
                        : "text-blue-600"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                {/* Title */}
                <div
                  className={cn(
                    "text-lg font-semibold mb-2 whitespace-nowrap overflow-hidden text-ellipsis"
                  )}
                >
                  {application.status === "REJECTED"
                    ? "Rejection Reason"
                    : application.status === "ADDITIONAL_INFO_REQUIRED"
                      ? "Additional Information Required"
                      : "Admin Notes"}
                </div>
                {/* Description */}
                <div
                  className={cn(
                    "text-base",
                    application.status === "REJECTED"
                      ? "text-red-700"
                      : application.status === "ADDITIONAL_INFO_REQUIRED"
                        ? "text-orange-700"
                        : "text-blue-700"
                  )}
                >
                  {application.adminNotes}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verification Status Card */}
        <Card className="overflow-hidden border border-slate-200">
          <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b">
            <CardTitle className="text-lg flex items-center">
              <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              {t("verification_status")}
            </CardTitle>
            <CardDescription>
              {t("current_status_of_document_verification")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="w-full md:w-1/2">
                <VerificationScoreChart
                  score={application.verificationResult?.score || 0}
                  checks={parsedChecks}
                  passedChecks={passedChecks}
                  totalChecks={verificationChecks.length}
                />
              </div>

              <div className="w-full md:w-1/2 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium flex items-center">
                      <Fingerprint className="h-4 w-4 mr-1.5 text-primary" />
                      {t("verification_status")}
                    </h4>
                    <Badge
                      variant={
                        verificationStatus === "VERIFIED" ||
                        verificationStatus === "APPROVED"
                          ? "success"
                          : verificationStatus === "FAILED" ||
                              verificationStatus === "REJECTED"
                            ? "destructive"
                            : "outline"
                      }
                      className="rounded-md font-medium"
                    >
                      {verificationStatus === "FAILED"
                        ? "REJECTED"
                        : verificationStatus}
                    </Badge>
                  </div>
                  <div className="bg-slate-100 p-1 rounded-full">
                    <Progress
                      value={verificationProgress}
                      className="h-2.5 bg-slate-200"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5 px-1">
                    <span>{t("Submitted")}</span>
                    <span>{t("in_review")}</span>
                    <span>{t("Completed")}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1.5 text-primary" />
                    {t("verification_steps")}
                  </h4>
                  <div className="space-y-4">
                    <VerificationStep
                      icon={<FileText className="h-4 w-4 text-slate-600" />}
                      title="Application Submitted"
                      description="Your KYC application has been received"
                      status="completed"
                    />
                    <VerificationStep
                      icon={<Fingerprint className="h-4 w-4 text-amber-600" />}
                      title="Identity Verification"
                      description="Your identity documents are being verified"
                      status={
                        application.status === "PENDING" ||
                        application.status === "ADDITIONAL_INFO_REQUIRED"
                          ? "current"
                          : application.status === "APPROVED" ||
                              application.status === "REJECTED"
                            ? "completed"
                            : "upcoming"
                      }
                    />
                    <VerificationStep
                      icon={<User className="h-4 w-4 text-slate-600" />}
                      title="Admin Review"
                      description="Your application is being reviewed by our team"
                      status={
                        application.status === "APPROVED" ||
                        application.status === "REJECTED"
                          ? "completed"
                          : application.status === "ADDITIONAL_INFO_REQUIRED"
                            ? "current"
                            : application.status === "PENDING"
                              ? "current"
                              : "upcoming"
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Display verification checks */}
            {parsedChecks && Object.keys(parsedChecks).length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-medium mb-4 flex items-center">
                  <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                  </div>
                  {t("verification_checks")}
                </h4>

                {/* Display summary if available */}
                {parsedChecks.summary && (
                  <div className="bg-slate-50 p-4 rounded-lg mb-4 border border-slate-200">
                    <h5 className="text-sm font-medium mb-2">{t("Summary")}</h5>
                    <p className="text-sm text-slate-700">
                      {parsedChecks.summary}
                    </p>
                  </div>
                )}

                {/* Display issues if available */}
                {parsedChecks.issues && parsedChecks.issues.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg mb-4 border border-red-200">
                    <h5 className="text-sm font-medium mb-2 text-red-700 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {t("issues_detected")}
                    </h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {parsedChecks.issues.map((issue: string, idx: number) => (
                        <li key={idx} className="text-sm text-red-700">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Display verification checks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {verificationChecks.map((check) => (
                    <motion.div
                      key={check.key}
                      whileHover={{
                        y: -2,
                      }}
                      className="border rounded-lg p-4 flex items-start bg-gradient-to-r from-slate-50 to-white shadow-sm"
                    >
                      <div
                        className={cn(
                          "p-2 rounded-full mr-3 flex-shrink-0",
                          check.passed ? "bg-green-100" : "bg-red-100"
                        )}
                      >
                        {check.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h5 className="text-sm font-medium capitalize">
                          {check.name}
                        </h5>
                        <p className="text-xs text-muted-foreground mt-1">
                          {check.passed ? "Passed" : "Failed"}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Display extracted info if available */}
                {parsedChecks.extractedInfo &&
                  Object.keys(parsedChecks.extractedInfo).length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <h5 className="text-sm font-medium mb-3">
                        {t("extracted_information")}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                        {Object.entries(parsedChecks.extractedInfo).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between text-sm py-1 border-b border-slate-100 last:border-0"
                            >
                              <span className="font-medium capitalize">
                                {key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/_/g, " ")
                                  .trim()}
                              </span>
                              <span className="text-slate-700">
                                {String(value)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Display confidence score if available */}
                {parsedChecks.confidenceScore !== undefined && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-medium">
                        {t("confidence_score")}
                      </h5>
                      <span className="text-sm font-bold">{`${confidenceScore}%`}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          confidenceScore > 80
                            ? "bg-green-500"
                            : confidenceScore > 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        )}
                        style={{
                          width: `${confidenceScore}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Process Card */}
        <Card className="overflow-hidden border border-slate-200">
          <CardHeader className="pb-2 bg-gradient-to-r from-slate-50 to-white border-b">
            <CardTitle className="text-lg flex items-center">
              <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              {t("verification_process")}
            </CardTitle>
            <CardDescription>
              {t("understanding_how_our_verification_system_works")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <p className="text-sm">
                {t("our_verification_process_regulatory_requirements")}.{" "}
                {t("heres_what_happens_during_verification")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <motion.div
                  whileHover={{
                    y: -5,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-lg border border-slate-200 shadow-sm"
                >
                  <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <Fingerprint className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="text-sm font-medium mb-2">
                    {t("identity_verification")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("we_verify_your_prevent_fraud")}.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{
                    y: -5,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-lg border border-slate-200 shadow-sm"
                >
                  <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <Landmark className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="text-sm font-medium mb-2">
                    {t("address_verification")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("we_confirm_your_official_records")}.
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{
                    y: -5,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className="bg-gradient-to-br from-slate-50 to-white p-5 rounded-lg border border-slate-200 shadow-sm"
                >
                  <div className="bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="text-sm font-medium mb-2">
                    {t("security_checks")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("we_perform_additional_regulatory_requirements")}.
                  </p>
                </motion.div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Required Card (if applicable) */}
        {application.status === "ADDITIONAL_INFO_REQUIRED" && (
          <Card className="overflow-hidden border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100 shadow-sm">
            <CardHeader className="pb-2 border-b border-orange-200">
              <CardTitle className="text-lg flex items-center text-orange-800">
                <div className="bg-orange-100 p-1.5 rounded-md mr-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                {t("action_required")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-orange-700 mb-6">
                {t("we_need_additional_your_verification")}.{" "}
                {t("please_update_your_as_possible")}.
              </p>
              <a
                href={`/user/kyc/application/${application.id}/update`}
                className="inline-block"
              >
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {t("update_application")}
                </Button>
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };
  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("Back")}
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card className="border border-slate-200">
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t("loading_application_data")}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!application) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <a href="/user/kyc" className="inline-block">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back_to_kyc")}
            </Button>
          </a>
        </div>
        <Card className="border border-red-200 bg-gradient-to-r from-red-50 to-red-100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
              {t("application_not_found")}
            </CardTitle>
            <CardDescription>
              {t("the_kyc_application_be_found")}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {t("there_was_an_error_loading_your_kyc_application")}.{" "}
                {t("please_try_again_or_contact_support")}.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <a href="/user/kyc" className="inline-block">
              <Button>{t("return_to_kyc_dashboard")}</Button>
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }
  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <a href="/user/kyc" className="inline-block mr-4">
          <Button variant="ghost" className="group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t("back_to_kyc")}
          </Button>
        </a>
        <h1 className="text-2xl font-bold">{t("kyc_application")}</h1>
      </div>

      <div className="grid gap-6">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
        >
          <Card className="overflow-hidden border-2 shadow-md">
            <div
              className={`p-6 ${getStatusColor(application.status)} relative`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-30" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(application.status)}
                  <div>
                    <h2 className="text-xl font-bold">
                      {t("application_status")}{" "}
                      {application.status.replace(/_/g, " ")}
                    </h2>
                    <p className="text-sm mt-1">
                      {getStatusText(application.status)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-medium border-2 py-1 px-3"
                >
                  {t("level")}
                  {application.level.name}
                </Badge>
              </div>
            </div>

            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="overview" className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    {t("Overview")}
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    {t("application_details")}
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center">
                    <Layers className="h-4 w-4 mr-2" />
                    {t("Documents")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {renderOverviewTab(application)}
                </TabsContent>

                <TabsContent value="details">
                  <Card className="border border-slate-200">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
                      <CardTitle className="flex items-center">
                        <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        {t("application_details")}
                      </CardTitle>
                      <CardDescription>
                        {t("information_you_provided_in_your_kyc_application")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ScrollArea className="h-[500px] pr-4">
                        {application.level.fields &&
                        application.level.fields.length > 0 ? (
                          renderApplicationData(
                            application.data,
                            application.level.fields
                          )
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                              {t("no_application_fields")}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                              {t("no_application_fields_kyc_level")}.{" "}
                              {t("this_may_be_additional_information")}.
                            </p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents">
                  <Card className="border border-slate-200">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
                      <CardTitle className="flex items-center">
                        <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                          <Layers className="h-5 w-5 text-primary" />
                        </div>
                        {t("submitted_documents")}
                      </CardTitle>
                      <CardDescription>
                        {t("documents_you_provided_for_identity_verification")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {renderDocumentsTab(application)}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col md:flex-row justify-between gap-4">
          <a href="/user/kyc" className="inline-block">
            <Button variant="outline" className="group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              {t("back_to_kyc_dashboard")}
            </Button>
          </a>

          <div className="flex gap-2">
            {application.status === "ADDITIONAL_INFO_REQUIRED" && (
              <a
                href={`/user/kyc/application/${application.id}/update`}
                className="inline-block"
              >
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {t("update_application")}
                </Button>
              </a>
            )}

            <Button
              variant="outline"
              onClick={() => setShowSupport(!showSupport)}
              className="border-dashed group"
            >
              <MessageSquare className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
              {t("need_help")}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showSupport && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
              transition={{
                duration: 0.3,
              }}
            >
              <Card className="border border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <div className="bg-primary/10 p-1.5 rounded-md mr-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    {t("Support")}
                  </CardTitle>
                  <CardDescription>
                    {t("need_help_with_your_kyc_application")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm">{t("if_you_have_to_help")}.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <a
                        href="/support/contact"
                        className="inline-block w-full"
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start group hover:border-primary hover:bg-primary/5"
                        >
                          <MessageSquare className="h-4 w-4 mr-2 group-hover:text-primary group-hover:scale-110 transition-all" />
                          {t("contact_support")}
                        </Button>
                      </a>
                      <a
                        href="/support/faq/kyc"
                        className="inline-block w-full"
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start group hover:border-primary hover:bg-primary/5"
                        >
                          <HelpCircle className="h-4 w-4 mr-2 group-hover:text-primary group-hover:scale-110 transition-all" />
                          {t("view_kyc_faq")}
                        </Button>
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
export default ApplicationDetailsClient;
