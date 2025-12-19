"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Shield,
  Info,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  FileCheck,
  FileWarning,
  AlertOctagon,
  Check,
  X,
  Sparkles,
  Zap,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
interface VerificationTabProps {
  applicationId: string;
  level: any;
}

// Update the type for VerificationStatus to include the new status values
type VerificationStatus =
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "MANUAL_REVIEW"
  | "VERIFIED"
  | "FAILED"
  | "NOT_STARTED";
interface VerificationResult {
  id: string;
  applicationId: string;
  status: VerificationStatus;
  score?: number;
  service?: {
    name: string;
  };
  checks?: any;
  documentVerifications?: any; // Using any to handle both object and array types
  createdAt: string;
  updatedAt?: string;
}
export function VerificationTab({
  applicationId,
  level,
}: VerificationTabProps) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  // Parse verification service from level if it's a string
  const verificationService = level.verificationService
    ? typeof level.verificationService === "string"
      ? JSON.parse(level.verificationService)
      : level.verificationService
    : null;

  // Update the fetchVerificationResult function to handle the new response format
  const fetchVerificationResult = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await $fetch({
      url: `/api/admin/crm/kyc/service/${applicationId}/result`,
      silent: true,
    });
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    // Handle the case where data is an array
    if (Array.isArray(data) && data.length > 0) {
      try {
        const result = {
          ...data[0],
        };

        // Parse checks if it's a string
        if (typeof result.checks === "string") {
          result.checks = JSON.parse(result.checks);
        }

        // Parse documentVerifications if it's a string
        if (typeof result.documentVerifications === "string") {
          result.documentVerifications = JSON.parse(
            result.documentVerifications
          );
        }
        setVerificationResult(result);
      } catch (parseError) {
        console.error("Error parsing verification result:", parseError);
        setError("Failed to parse verification result data.");
      }
    } else if (data) {
      // Handle single object response
      try {
        const result = {
          ...data,
        };

        // Parse checks if it's a string
        if (typeof result.checks === "string") {
          result.checks = JSON.parse(result.checks);
        }

        // Parse documentVerifications if it's a string
        if (typeof result.documentVerifications === "string") {
          result.documentVerifications = JSON.parse(
            result.documentVerifications
          );
        }
        setVerificationResult(result);
      } catch (parseError) {
        console.error("Error parsing verification result:", parseError);
        setError("Failed to parse verification result data.");
      }
    } else {
      setVerificationResult(null);
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchVerificationResult();
  }, [applicationId, verificationService]);

  // Update the startVerification function to handle the new response format
  const startVerification = async () => {
    // Check if verification service is configured
    if (!verificationService || !verificationService.id) {
      toast({
        title: "Error",
        description: "Verification service is not configured.",
        variant: "destructive",
      });
      return;
    }
    setVerifying(true);
    setError(null);
    const { data, error } = await $fetch({
      url: `/api/admin/crm/kyc/service/${verificationService.id}/verify`,
      method: "POST",
      body: {
        applicationId,
      },
      silent: true,
    });
    if (error) {
      setError(error);
      setVerifying(false);
      return;
    }

    // Handle the response data
    try {
      let result;
      if (Array.isArray(data)) {
        // If it's an array, take the first item
        result = {
          ...data[0],
        };
      } else {
        // If it's a single object
        result = {
          ...data,
        };
      }

      // Parse checks if it's a string
      if (typeof result.checks === "string") {
        result.checks = JSON.parse(result.checks);
      }

      // Parse documentVerifications if it's a string
      if (typeof result.documentVerifications === "string") {
        result.documentVerifications = JSON.parse(result.documentVerifications);
      }
      setVerificationResult(result);
    } catch (parseError) {
      console.error("Error parsing verification result:", parseError);
      setError("Failed to parse verification result data.");
    }
    setVerifying(false);
  };

  // Update the getStatusInfo function to include the VERIFIED status
  const getStatusInfo = (status: VerificationStatus) => {
    switch (status) {
      case "VERIFIED":
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          color: "text-green-500 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800/50",
          label: "Verified",
          description: "All verification checks passed successfully",
        };
      case "FAILED":
        return {
          icon: <XCircle className="h-5 w-5" />,
          color: "text-red-500 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-200 dark:border-red-800/50",
          label: "Failed",
          description: "One or more verification checks failed",
        };
      case "MANUAL_REVIEW":
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          color: "text-blue-500 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/20",
          borderColor: "border-blue-200 dark:border-blue-800/50",
          label: "Manual Review Required",
          description:
            "This application requires manual review by an administrator",
        };
      case "PENDING":
        return {
          icon: <Clock className="h-5 w-5" />,
          color: "text-yellow-500 dark:text-yellow-400",
          bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
          borderColor: "border-yellow-200 dark:border-yellow-800/50",
          label: "Pending",
          description: "Verification is in progress",
        };
      case "APPROVED":
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          color: "text-green-500 dark:text-green-400",
          bgColor: "bg-green-50 dark:bg-green-950/20",
          borderColor: "border-green-200 dark:border-green-800/50",
          label: "Approved",
          description: "This verification has been approved",
        };
      case "REJECTED":
        return {
          icon: <XCircle className="h-5 w-5" />,
          color: "text-red-500 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-950/20",
          borderColor: "border-red-200 dark:border-red-800/50",
          label: "Rejected",
          description: "This verification has been rejected",
        };
      case "NOT_STARTED":
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          color: "text-zinc-500 dark:text-zinc-400",
          bgColor: "bg-zinc-50 dark:bg-zinc-800",
          borderColor: "border-zinc-200 dark:border-zinc-700",
          label: "Not Started",
          description: "Verification has not been initiated yet",
        };
    }
  };

  // Update the getVerificationProgress function to include the VERIFIED status
  const getVerificationProgress = (result: VerificationResult) => {
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

  // Format the AI response with proper line breaks and styling
  const formatAIResponse = (data: any) => {
    if (!data) return null;

    // If data is a string, just display it directly
    if (typeof data === "string") {
      return <div className="whitespace-pre-wrap text-sm">{data}</div>;
    }

    // Otherwise, handle it as an object
    return (
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => {
          // Handle nested objects
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            return (
              <div key={key} className="mt-3">
                <h4 className="text-sm font-medium mb-2 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </h4>
                <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-md">
                  {Object.entries(value as Record<string, any>).map(
                    ([subKey, subValue]) => (
                      <div
                        key={subKey}
                        className="flex justify-between text-sm py-1 border-b border-zinc-100 dark:border-zinc-700 last:border-0"
                      >
                        <span className="font-medium capitalize">
                          {subKey.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span>{String(subValue)}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          }

          // Handle arrays
          if (Array.isArray(value)) {
            return (
              <div key={key} className="mt-3">
                <h4 className="text-sm font-medium mb-2 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </h4>
                {value.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {value.map((item, idx) => (
                      <li key={idx} className="text-sm">
                        {String(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("no_issues_detected")}
                  </div>
                )}
              </div>
            );
          }

          // Handle boolean values
          if (typeof value === "boolean") {
            return (
              <div
                key={key}
                className="flex items-center justify-between text-sm py-2"
              >
                <span className="font-medium capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <Badge
                  variant="outline"
                  className={
                    value
                      ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50"
                      : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"
                  }
                >
                  {value ? (
                    <>
                      <Check className="h-3 w-3 mr-1" /> Yes
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" /> No
                    </>
                  )}
                </Badge>
              </div>
            );
          }

          // Handle other primitive values
          return (
            <div
              key={key}
              className="flex items-center justify-between text-sm py-2"
            >
              <span className="font-medium capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <span>{String(value)}</span>
            </div>
          );
        })}
      </div>
    );
  };
  if (loading) {
    return (
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Premium loading header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800/30">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>

          {/* Progress skeleton */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
            <div className="flex justify-between items-center mb-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="flex justify-between mt-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-18" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    );
  }

  // If no verification service is configured
  if (!verificationService) {
    return (
      <CardContent className="pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-2xl p-8 text-center border border-blue-100 dark:border-blue-800/30"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 dark:from-blue-800/20 dark:to-indigo-800/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/30 to-blue-200/30 dark:from-purple-800/20 dark:to-blue-800/20 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur-lg opacity-30 animate-pulse" />
                <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-full shadow-lg">
                  <Info className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-3">
              {t("no_verification_service")}
            </h3>
            <p className="text-blue-700 dark:text-blue-300 max-w-lg mx-auto text-base leading-relaxed">
              {t("this_kyc_level_doesnt_have_a")}{" "}
              {t("verification_is_not_required_for_this_application_1")}
            </p>
            <div className="mt-6 inline-flex items-center gap-3 bg-white dark:bg-zinc-900 px-5 py-3 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <Shield className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">
                  {tCommon("level")}
                </p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Level {level.level}: {level.name}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </CardContent>
    );
  }

  // If verification result is not available
  if (!verificationResult) {
    return (
      <CardContent className="pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/30 dark:to-cyan-950/30 rounded-2xl p-8 text-center border border-emerald-100 dark:border-emerald-800/30"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 dark:from-emerald-800/20 dark:to-teal-800/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-200/40 to-emerald-200/40 dark:from-cyan-800/20 dark:to-emerald-800/20 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-r from-teal-200/30 to-emerald-200/30 dark:from-teal-800/10 dark:to-emerald-800/10 rounded-full" />

          <div className="relative">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full blur-xl opacity-40 animate-pulse" />
                <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-full shadow-xl">
                  <ShieldCheck className="h-12 w-12 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-1.5 shadow-md">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 mb-3">
              {t("verification_not_started")}
            </h3>
            <p className="text-emerald-700 dark:text-emerald-300 max-w-lg mx-auto text-base leading-relaxed mb-2">
              {t("this_application_has_not_been_verified_yet_1")}{" "}
              {t("click_the_button_process_using")}
            </p>
            <Badge className="bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1 text-sm font-medium">
              <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
              {verificationService.serviceName}
            </Badge>

            <div className="mt-8">
              <Button
                onClick={startVerification}
                disabled={verifying}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 px-8 py-3 h-auto text-base font-medium transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />{" "}
                    {t("starting_verification_ellipsis")}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5 mr-2" />{" "}
                    {tCommon("start_verification")}
                  </>
                )}
              </Button>
            </div>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-4 rounded-xl inline-flex items-center gap-3 border border-red-200 dark:border-red-800/50"
              >
                <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="font-medium">{error}</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      </CardContent>
    );
  }

  // Display verification result
  const statusInfo = getStatusInfo(verificationResult.status);
  const progress = getVerificationProgress(verificationResult);
  const serviceName =
    verificationResult.service?.name || verificationService.serviceName;

  // Get status gradient colors
  const getStatusGradient = () => {
    switch (verificationResult.status) {
      case "VERIFIED":
      case "APPROVED":
        return "from-green-500 to-emerald-600";
      case "FAILED":
      case "REJECTED":
        return "from-red-500 to-rose-600";
      case "MANUAL_REVIEW":
        return "from-blue-500 to-indigo-600";
      default:
        return "from-amber-500 to-orange-600";
    }
  };

  return (
    <CardContent className="pt-6 print:p-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Premium Verification Status Header */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl p-6 border print:border-none print:rounded-none print:p-2",
            statusInfo.bgColor,
            statusInfo.borderColor
          )}
        >
          {/* Decorative gradient overlay */}
          <div
            className={cn(
              "absolute top-0 right-0 w-48 h-48 bg-gradient-to-br rounded-full opacity-20 -translate-y-1/2 translate-x-1/4",
              getStatusGradient()
            )}
          />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                  getStatusGradient()
                )}
              >
                <div className="text-white scale-125">{statusInfo.icon}</div>
              </div>
              <div>
                <h3 className={cn("font-bold text-xl", statusInfo.color)}>
                  {statusInfo.label}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 print:text-zinc-700 text-sm">
                  {statusInfo.description}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 px-3 py-1.5 print:bg-transparent">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                {serviceName}
              </Badge>
              {verificationResult.status === "PENDING" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 print:hidden"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Premium Verification Progress */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-sm print:border-none print:p-0 print:pt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center bg-gradient-to-br",
                  getStatusGradient()
                )}
              >
                <CheckCircle className="h-3.5 w-3.5 text-white" />
              </div>
              {tCommon("verification_progress")}
            </h3>
            <span
              className={cn(
                "text-lg font-bold",
                verificationResult.status === "VERIFIED"
                  ? "text-green-600 dark:text-green-400"
                  : verificationResult.status === "FAILED"
                    ? "text-red-600 dark:text-red-400"
                    : "text-blue-600 dark:text-blue-400"
              )}
            >
              {progress}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded-full h-3 overflow-hidden print:bg-zinc-300">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-3 rounded-full bg-gradient-to-r",
                  verificationResult.status === "VERIFIED" ||
                    verificationResult.status === "APPROVED"
                    ? "from-green-400 to-emerald-500"
                    : verificationResult.status === "FAILED" ||
                        verificationResult.status === "REJECTED"
                      ? "from-red-400 to-rose-500"
                      : verificationResult.status === "MANUAL_REVIEW"
                        ? "from-blue-400 to-indigo-500"
                        : "from-amber-400 to-orange-500",
                  "print:bg-black"
                )}
              />
            </div>

            {/* Progress steps */}
            <div className="flex justify-between mt-4">
              {[
                { label: "Started", threshold: 25 },
                { label: "Processing", threshold: 50 },
                { label: "Reviewing", threshold: 75 },
                { label: "Complete", threshold: 100 },
              ].map((step, index) => (
                <div key={step.label} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all duration-300",
                      progress >= step.threshold
                        ? cn(
                            "bg-gradient-to-br text-white border-transparent",
                            verificationResult.status === "VERIFIED" ||
                              verificationResult.status === "APPROVED"
                              ? "from-green-400 to-emerald-500"
                              : verificationResult.status === "FAILED" ||
                                  verificationResult.status === "REJECTED"
                                ? "from-red-400 to-rose-500"
                                : "from-blue-400 to-indigo-500"
                          )
                        : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-600"
                    )}
                  >
                    {progress >= step.threshold ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs mt-2 font-medium",
                      progress >= step.threshold
                        ? verificationResult.status === "VERIFIED" ||
                          verificationResult.status === "APPROVED"
                          ? "text-green-600 dark:text-green-400"
                          : verificationResult.status === "FAILED" ||
                              verificationResult.status === "REJECTED"
                            ? "text-red-600 dark:text-red-400"
                            : "text-blue-600 dark:text-blue-400"
                        : "text-zinc-400 dark:text-zinc-500"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Premium Verification Score */}
        {verificationResult.score !== undefined &&
          verificationResult.score !== null && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-sm print:border-none print:p-0 print:pt-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                      verificationResult.score > 80
                        ? "from-green-400 to-emerald-500"
                        : verificationResult.score > 60
                          ? "from-amber-400 to-orange-500"
                          : "from-red-400 to-rose-500"
                    )}
                  >
                    <AlertOctagon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {t("verification_score")}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span
                        className={cn(
                          "text-4xl font-bold",
                          verificationResult.score > 80
                            ? "text-green-600 dark:text-green-400"
                            : verificationResult.score > 60
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {verificationResult.score}
                      </span>
                      <span className="text-lg text-zinc-400 dark:text-zinc-500">
                        /100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-xs">
                  <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1.5">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${verificationResult.score}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn(
                        "h-3 rounded-full bg-gradient-to-r",
                        verificationResult.score > 80
                          ? "from-green-400 to-emerald-500"
                          : verificationResult.score > 60
                            ? "from-amber-400 to-orange-500"
                            : "from-red-400 to-rose-500",
                        "print:bg-black"
                      )}
                    />
                  </div>
                  <div className="flex justify-center mt-2">
                    <Badge
                      className={cn(
                        "px-3 py-1",
                        verificationResult.score > 80
                          ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50"
                          : verificationResult.score > 60
                            ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
                            : "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"
                      )}
                    >
                      {verificationResult.score > 80
                        ? "Excellent"
                        : verificationResult.score > 60
                          ? "Moderate"
                          : "Needs Review"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Verification Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <FileCheck className="h-4 w-4 text-white" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              {t("verification_results")}
            </span>
          </h3>

          {/* Verification Checks */}
          {verificationResult.checks && (
            <Card className="overflow-hidden rounded-xl border-zinc-200 dark:border-zinc-700 shadow-sm print:border-none print:shadow-none">
              <CardHeader className="py-4 px-5 bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-700 print:bg-transparent print:p-0 print:pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    {t("verification_summary")}
                  </CardTitle>
                  <Badge
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 print:bg-transparent",
                      statusInfo.bgColor,
                      statusInfo.color,
                      statusInfo.borderColor
                    )}
                  >
                    {statusInfo.icon}
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="py-4 px-5 print:p-0 print:py-2">
                <div className="space-y-4">
                  {/* Display summary if it exists */}
                  {verificationResult.checks.summary &&
                    typeof verificationResult.checks.summary === "string" && (
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-md print:bg-transparent print:p-0">
                        <p className="text-sm whitespace-pre-wrap">
                          {verificationResult.checks.summary}
                        </p>
                      </div>
                    )}

                  {/* Display boolean values */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(verificationResult.checks)
                      .filter(([key, value]) => typeof value === "boolean")
                      .map(([key, value]) => {
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-2 rounded-md print:bg-transparent print:p-1"
                          >
                            <span className="text-sm font-medium capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                value
                                  ? "bg-green-50 text-green-700 border-green-200 print:bg-transparent"
                                  : "bg-red-50 text-red-700 border-red-200 print:bg-transparent"
                              }
                            >
                              {value ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" /> Yes
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3 mr-1" /> No
                                </>
                              )}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>

                  {/* Display confidence score */}
                  {verificationResult.checks.confidenceScore !== undefined && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium">
                          {tCommon("confidence_score")}
                        </h4>
                        <span className="text-sm font-bold">
                          {typeof verificationResult.checks.confidenceScore ===
                            "number" &&
                          verificationResult.checks.confidenceScore <= 1
                            ? `${verificationResult.checks.confidenceScore * 100}%`
                            : `${verificationResult.checks.confidenceScore}%`}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 print:bg-zinc-300">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            (
                              typeof verificationResult.checks
                                .confidenceScore === "number" &&
                              verificationResult.checks.confidenceScore <= 1
                                ? verificationResult.checks.confidenceScore >
                                  0.8
                                : verificationResult.checks.confidenceScore > 80
                            )
                              ? "bg-green-500"
                              : (
                                    typeof verificationResult.checks
                                      .confidenceScore === "number" &&
                                    verificationResult.checks.confidenceScore <=
                                      1
                                      ? verificationResult.checks
                                          .confidenceScore > 0.6
                                      : verificationResult.checks
                                          .confidenceScore > 60
                                  )
                                ? "bg-yellow-500"
                                : "bg-red-500",
                            "print:bg-black"
                          )}
                          style={{
                            width: `${typeof verificationResult.checks.confidenceScore === "number" && verificationResult.checks.confidenceScore <= 1 ? verificationResult.checks.confidenceScore * 100 : verificationResult.checks.confidenceScore}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Display issues */}
                  {verificationResult.checks.issues && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <FileWarning className="h-4 w-4 text-amber-500" />
                        {t("detected_issues")}
                      </h4>
                      {Array.isArray(verificationResult.checks.issues) &&
                      verificationResult.checks.issues.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {verificationResult.checks.issues.map(
                            (issue, idx) => (
                              <li key={idx} className="text-sm text-red-600">
                                {issue}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {t("no_issues_detected")}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Display extracted info */}
                  {verificationResult.checks.extractedInfo && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium mb-2">
                        {tCommon("extracted_information")}
                      </h4>
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-md print:bg-transparent print:p-0">
                        {Object.entries(
                          verificationResult.checks.extractedInfo
                        ).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between text-sm py-1 border-b border-zinc-100 dark:border-zinc-700 last:border-0"
                          >
                            <span className="font-medium capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Verification Results */}
          {verificationResult.documentVerifications && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-indigo-500" />
                <span>{t("document_verification")}</span>
              </h3>

              <Card className="overflow-hidden print:border-none print:shadow-none">
                <CardHeader className="py-3 px-4 bg-zinc-50 dark:bg-zinc-800 print:bg-transparent print:p-0 print:pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-medium">
                      {t("document_analysis")}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor} flex items-center gap-1 print:bg-transparent`}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-3 px-4 print:p-0 print:py-2">
                  {Array.isArray(verificationResult.documentVerifications) ? (
                    // Handle array of document verifications
                    <div className="space-y-4">
                      {verificationResult.documentVerifications.map(
                        (doc, index) => {
                          return (
                            <div
                              key={index}
                              className="border rounded-lg p-3 print:border-none print:p-0 print:py-1"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">
                                  Document {index + 1}
                                </h4>
                              </div>

                              {doc.message && (
                                <div className="text-sm mt-2">
                                  <p className="font-medium">
                                    {tCommon("message")}:
                                  </p>
                                  <p className="whitespace-pre-wrap">
                                    {doc.message}
                                  </p>
                                </div>
                              )}

                              {doc.details && (
                                <div className="text-sm mt-2 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-md print:bg-transparent print:p-0">
                                  <p className="font-medium mb-1">
                                    {tCommon("details")}:
                                  </p>
                                  <p className="whitespace-pre-wrap">
                                    {doc.details}
                                  </p>
                                </div>
                              )}

                              {doc.aiResponse && (
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                                    <Shield className="h-4 w-4 text-indigo-500" />
                                    AI Analysis
                                  </h4>
                                  <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-lg text-sm print:bg-transparent print:p-0">
                                    {formatAIResponse(doc.aiResponse)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    // Handle single document verification object
                    <div className="border rounded-lg p-3 print:border-none print:p-0 print:py-1">
                      {verificationResult.documentVerifications &&
                        verificationResult.documentVerifications.message && (
                          <div className="text-sm mt-2">
                            <p className="font-medium">{tCommon("message")}:</p>
                            <p className="whitespace-pre-wrap">
                              {verificationResult.documentVerifications.message}
                            </p>
                          </div>
                        )}

                      {verificationResult.documentVerifications &&
                        verificationResult.documentVerifications.details && (
                          <div className="text-sm mt-2 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-md print:bg-transparent print:p-0">
                            <p className="font-medium mb-1">
                              {tCommon("details")}:
                            </p>
                            <p className="whitespace-pre-wrap">
                              {verificationResult.documentVerifications.details}
                            </p>
                          </div>
                        )}

                      {verificationResult.documentVerifications &&
                        verificationResult.documentVerifications.aiResponse && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                              <Shield className="h-4 w-4 text-indigo-500" />
                              AI Analysis
                            </h4>
                            <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-lg text-sm print:bg-transparent print:p-0">
                              {formatAIResponse(
                                verificationResult.documentVerifications
                                  .aiResponse
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Verification Metadata */}
          <div className="mt-6 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 print:bg-transparent print:p-0 print:pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{t("verification_id_1")}:</span>{" "}
                {verificationResult.id}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{tCommon("created")}:</span>{" "}
                {new Date(verificationResult.createdAt).toLocaleString()}
              </div>
              {verificationResult.updatedAt && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{tCommon("updated")}:</span>{" "}
                  {new Date(verificationResult.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </CardContent>
  );
}
