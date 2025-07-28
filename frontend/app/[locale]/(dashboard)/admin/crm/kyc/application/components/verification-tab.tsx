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
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
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
                    No issues detected
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
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-full" />

          <div className="space-y-4">
            {Array.from({
              length: 3,
            }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <Skeleton className="h-6 w-48 mb-1" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-full" />
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
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-full">
              <Info className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
            No Verification Service
          </h3>
          <p className="text-blue-700 dark:text-blue-300 max-w-md mx-auto">
            This KYC level doesn't have a verification service configured.
            Verification is not required for this application.
          </p>
          <div className="mt-4 inline-block bg-blue-100 dark:bg-blue-900/50 px-4 py-2 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Shield className="h-4 w-4" />
              <span>
                Level {level.level}: {level.name}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    );
  }

  // If verification result is not available
  if (!verificationResult) {
    return (
      <CardContent className="pt-6">
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-full">
              <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Verification Not Started
          </h3>
          <p className="text-blue-700 dark:text-blue-300 max-w-md mx-auto">
            This application has not been verified yet. Click the button below
            to start the verification process using{" "}
            <span className="font-semibold">
              {verificationService.serviceName}
            </span>
            .
          </p>
          <div className="mt-6">
            <Button
              onClick={startVerification}
              disabled={verifying}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {verifying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Starting
                  Verification...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" /> Start Verification
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="mt-4 text-red-600 bg-red-50 p-3 rounded-lg inline-block">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    );
  }

  // Display verification result
  const statusInfo = getStatusInfo(verificationResult.status);
  const progress = getVerificationProgress(verificationResult);
  const serviceName =
    verificationResult.service?.name || verificationService.serviceName;
  return (
    <CardContent className="pt-6 print:p-0">
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
          duration: 0.3,
        }}
        className="space-y-6"
      >
        {/* Verification Status Header */}
        <div
          className={`${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:border-none print:rounded-none print:p-2`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`${statusInfo.color} bg-white p-2 rounded-full print:p-1`}
            >
              {statusInfo.icon}
            </div>
            <div>
              <h3 className={`font-medium ${statusInfo.color} text-lg`}>
                Verification Status: {statusInfo.label}
              </h3>
                        <p className="text-zinc-600 dark:text-zinc-400 print:text-zinc-700">
            {statusInfo.description}
          </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 flex items-center gap-1 print:bg-transparent"
            >
              <Shield className="h-3 w-3" /> {serviceName}
            </Badge>
            {verificationResult.status === "PENDING" && (
              <Button
                variant="outline"
                size="sm"
                className="border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 print:hidden"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Verification Progress */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 print:border-none print:p-0 print:pt-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Verification Progress</h3>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 print:bg-zinc-300">
                <div
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-700",
                    verificationResult.status === "VERIFIED"
                      ? "bg-green-500"
                      : verificationResult.status === "FAILED"
                        ? "bg-red-500"
                        : verificationResult.status === "MANUAL_REVIEW"
                          ? "bg-blue-500"
                          : "bg-yellow-500",
                    "print:bg-black"
                  )}
                  style={{
                    width: `${progress}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <div
                className={cn(
                  "font-medium",
                  progress >= 25
                    ? verificationResult.status === "VERIFIED"
                      ? "text-green-600"
                      : verificationResult.status === "FAILED"
                        ? "text-red-600"
                        : "text-blue-600"
                    : "",
                  "print:text-black"
                )}
              >
                Started
              </div>
              <div
                className={cn(
                  "font-medium",
                  progress >= 50
                    ? verificationResult.status === "VERIFIED"
                      ? "text-green-600"
                      : verificationResult.status === "FAILED"
                        ? "text-red-600"
                        : "text-blue-600"
                    : "",
                  "print:text-black"
                )}
              >
                Processing
              </div>
              <div
                className={cn(
                  "font-medium",
                  progress >= 75
                    ? verificationResult.status === "VERIFIED"
                      ? "text-green-600"
                      : verificationResult.status === "FAILED"
                        ? "text-red-600"
                        : "text-blue-600"
                    : "",
                  "print:text-black"
                )}
              >
                Reviewing
              </div>
              <div
                className={cn(
                  "font-medium",
                  progress >= 100
                    ? verificationResult.status === "VERIFIED"
                      ? "text-green-600"
                      : verificationResult.status === "FAILED"
                        ? "text-red-600"
                        : ""
                    : "",
                  "print:text-black"
                )}
              >
                Complete
              </div>
            </div>
          </div>
        </div>

        {/* Verification Score */}
        {verificationResult.score !== undefined &&
          verificationResult.score !== null && (
            <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 print:border-none print:p-0 print:pt-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-blue-500" />
                <span>Verification Score</span>
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl font-bold">
                  {verificationResult.score}
                </div>
                <div className="text-sm text-muted-foreground">/100</div>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 print:bg-zinc-300">
                <div
                  className={cn(
                    "h-2.5 rounded-full",
                    verificationResult.score > 80
                      ? "bg-green-500"
                      : verificationResult.score > 60
                        ? "bg-yellow-500"
                        : "bg-red-500",
                    "print:bg-black"
                  )}
                  style={{
                    width: `${verificationResult.score}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

        {/* Verification Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-blue-500" />
            <span>Verification Results</span>
          </h3>

          {/* Verification Checks */}
          {verificationResult.checks && (
            <Card className="overflow-hidden print:border-none print:shadow-none">
              <CardHeader className="py-3 px-4 bg-zinc-50 dark:bg-zinc-800 print:bg-transparent print:p-0 print:pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-medium">
                    Verification Summary
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
                          Confidence Score
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
                        Detected Issues
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
                          No issues detected
                        </div>
                      )}
                    </div>
                  )}

                  {/* Display extracted info */}
                  {verificationResult.checks.extractedInfo && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium mb-2">
                        Extracted Information
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
                <span>Document Verification</span>
              </h3>

                              <Card className="overflow-hidden print:border-none print:shadow-none">
                <CardHeader className="py-3 px-4 bg-zinc-50 dark:bg-zinc-800 print:bg-transparent print:p-0 print:pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-medium">
                      Document Analysis
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
                                  <p className="font-medium">Message:</p>
                                  <p className="whitespace-pre-wrap">
                                    {doc.message}
                                  </p>
                                </div>
                              )}

                              {doc.details && (
                                <div className="text-sm mt-2 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-md print:bg-transparent print:p-0">
                                  <p className="font-medium mb-1">Details:</p>
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
                            <p className="font-medium">Message:</p>
                            <p className="whitespace-pre-wrap">
                              {verificationResult.documentVerifications.message}
                            </p>
                          </div>
                        )}

                      {verificationResult.documentVerifications &&
                        verificationResult.documentVerifications.details && (
                          <div className="text-sm mt-2 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-md print:bg-transparent print:p-0">
                            <p className="font-medium mb-1">Details:</p>
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
                <span className="font-medium">Verification ID:</span>{" "}
                {verificationResult.id}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Created:</span>{" "}
                {new Date(verificationResult.createdAt).toLocaleString()}
              </div>
              {verificationResult.updatedAt && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Updated:</span>{" "}
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
