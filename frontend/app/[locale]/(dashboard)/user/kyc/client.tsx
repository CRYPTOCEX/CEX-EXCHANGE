"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  FileText,
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  LockKeyhole,
  Fingerprint,
  UserCheck,
  Wallet,
  CreditCard,
  DollarSign,
  Landmark,
  AlertTriangle,
  LayersIcon,
  ShieldCheck,
  Zap,
  ChevronLeft,
  Settings,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { $fetch } from "@/lib/api";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useConfigStore } from "@/store/config";

// Define the KycLevel type

interface KycLevel {
  id: string;
  level: number;
  name: string;
  description?: string;
  fields: any[];
  features: any[];
}

// Define the KycApplication type
interface KycApplication {
  id: string;
  levelId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Add other properties as needed
}

export function UserKycClient() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { settings } = useConfigStore();
  const [levels, setLevels] = useState<KycLevel[]>([]);
  const [applications, setApplications] = useState<KycApplication[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if KYC is enabled in settings (handle both string and boolean values)
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";

  // If KYC is disabled, show a message with button to go to profile
  if (!kycEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4">
        <div className="relative">
          {/* Background gradient circle */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full blur-3xl w-64 h-64 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />

          {/* Main content container */}
          <div className="relative bg-background/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 max-w-lg mx-auto shadow-2xl">
            {/* Icon container */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 rounded-full">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                  <AlertTriangle className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                {t("kyc_verification_disabled")}
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full mx-auto" />
            </div>

            {/* Description */}
            <div className="text-center mb-8">
              <p className="text-muted-foreground leading-relaxed">
                {t("kyc_verification_is_currently")}
              </p>
            </div>

            {/* Info Alert */}
            <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                {t("kyc_verification_features_are")}
              </AlertDescription>
            </Alert>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3">
              <Link href="/user/profile">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  {t("go_to_profile")}
                </Button>
              </Link>
              <Link href="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/20"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  {t("back_to_dashboard")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fetchLevelsData = async () => {
    const { data, error } = await $fetch({
      url: "/api/user/kyc/level",
      silentSuccess: true,
    });
    if (!error && data) {
      // Parse the JSON strings in the response
      return Array.isArray(data)
        ? data.map((level) => ({
            ...level,
            fields:
              typeof level.fields === "string"
                ? (() => {
                    try {
                      return JSON.parse(level.fields);
                    } catch (e) {
                      console.error("Failed to parse level fields:", e);
                      return [];
                    }
                  })()
                : level.fields || [],
            features:
              typeof level.features === "string"
                ? (() => {
                    try {
                      return JSON.parse(level.features);
                    } catch (e) {
                      console.error("Failed to parse level features:", e);
                      return [];
                    }
                  })()
                : level.features || [],
          }))
        : [];
    }
    return [];
  };
  const fetchApplicationsData = async () => {
    const { data, error } = await $fetch({
      url: "/api/user/kyc/application",
      silentSuccess: true,
    });
    if (!error) {
      return data || [];
    }
    return [];
  };
  const fetchData = async () => {
    try {
      const [levelsData, applicationsData] = await Promise.all([
        fetchLevelsData(),
        fetchApplicationsData(),
      ]);

      // Ensure levelsData and applicationsData are arrays before using array methods
      const levelsArray = Array.isArray(levelsData) ? levelsData : [];
      const applicationsArray = Array.isArray(applicationsData)
        ? applicationsData
        : [];
      setLevels(levelsArray);
      setApplications(applicationsArray);

      // Find the highest approved level
      const approvedApplications = applicationsArray.filter(
        (app) => app.status === "APPROVED"
      );
      if (approvedApplications.length > 0) {
        const highestLevel = Math.max(
          ...approvedApplications.map(
            (app) => levelsArray.find((l) => l.id === app.levelId)?.level || 0
          )
        );
        setCurrentLevel(highestLevel);
      }
      setIsLoading(false);
      setError(null);
    } catch (error) {
      console.error("Error in data fetching:", error);
      setIsLoading(false);
      setError("Failed to load data. Please try again later.");
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 flex items-center gap-1 px-3 py-1 rounded-full"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t("Approved")}</span>
          </Badge>
        );
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 flex items-center gap-1 px-3 py-1 rounded-full"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{t("Pending")}</span>
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 flex items-center gap-1 px-3 py-1 rounded-full"
          >
            <XCircle className="h-3.5 w-3.5" />
            <span>{t("Rejected")}</span>
          </Badge>
        );
      case "ADDITIONAL_INFO_REQUIRED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 flex items-center gap-1 px-3 py-1 rounded-full"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{t("info_required")}</span>
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 px-3 py-1 rounded-full"
          >
            {status}
          </Badge>
        );
    }
  };
  const getLevelIcon = (level: number) => {
    const icons = [
      <UserCheck key="1" className="h-5 w-5" />,
      <Fingerprint key="2" className="h-5 w-5" />,
      <Wallet key="3" className="h-5 w-5" />,
      <CreditCard key="4" className="h-5 w-5" />,
      <DollarSign key="5" className="h-5 w-5" />,
      <Landmark key="6" className="h-5 w-5" />,
    ];
    return icons[(level - 1) % icons.length];
  };
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch (e) {
      return "Invalid date";
    }
  };
  const canApplyForLevel = (levelNumber: number) => {
    // Can apply if it's the next level after current level
    return levelNumber === currentLevel + 1;
  };
  const getApplicationForLevel = (levelId: string) => {
    return Array.isArray(applications)
      ? applications.find((app) => app.levelId === levelId)
      : undefined;
  };

  // Check if there's a pending application for the next level
  const hasNextLevelPendingApplication = () => {
    if (!Array.isArray(applications) || applications.length === 0) return false;
    const nextLevel = currentLevel + 1;
    const nextLevelId = levels.find((l) => l.level === nextLevel)?.id;
    if (!nextLevelId) return false;
    return applications.some(
      (app) =>
        app.levelId === nextLevelId &&
        (app.status === "PENDING" || app.status === "ADDITIONAL_INFO_REQUIRED")
    );
  };
  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col gap-8 animate-pulse">
          <div className="h-8 w-64 bg-gray-200 dark:bg-zinc-700 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 bg-gray-200 dark:bg-zinc-700 rounded-lg"
              ></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 dark:bg-zinc-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Calculate verification progress
  const totalLevels = levels.length;
  const verificationProgress =
    totalLevels > 0 ? (currentLevel / totalLevels) * 100 : 0;

  // Count applications by status
  const approvedCount = Array.isArray(applications)
    ? applications.filter((app) => app.status === "APPROVED").length
    : 0;
  const pendingCount = Array.isArray(applications)
    ? applications.filter(
        (app) =>
          app.status === "PENDING" || app.status === "ADDITIONAL_INFO_REQUIRED"
      ).length
    : 0;
  const rejectedCount = Array.isArray(applications)
    ? applications.filter((app) => app.status === "REJECTED").length
    : 0;

  // Check if next level application is pending
  const nextLevelPending = hasNextLevelPendingApplication();
  return (
    <div className="container max-w-6xl py-8">
      <div className="flex flex-col gap-8">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 rounded-xl p-8 text-white overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
          <div className="absolute right-0 top-0 h-full w-2/5 bg-white/10 transform skew-x-12 -mr-20 hidden lg:block"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link href={"/user/profile"}>
                  <Button
                    variant="secondary"
                    size={"icon"}
                    className="bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20"
                  >
                    <ChevronLeft className="h-5 w-5 text-white" />
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">
                  {t("identity_verification")}
                </h1>
              </div>
              <p className="text-blue-100 dark:text-blue-200 max-w-md">
                {t("complete_verification_to_transaction_limits")}
              </p>

              {currentLevel > 0 ? (
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-white/20 rounded-full p-1.5">
                    <BadgeCheck className="h-5 w-5 text-blue-100" />
                  </div>
                  <span className="font-medium">
                    {t("Level")}
                    {currentLevel}
                    {t("Verified")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-white/20 rounded-full p-1.5">
                    <AlertCircle className="h-5 w-5 text-blue-100" />
                  </div>
                  <span>{t("not_verified")}</span>
                </div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 w-full md:w-auto">
              <div className="text-sm text-blue-100 dark:text-blue-200 mb-1">
                {t("verification_progress")}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-full md:w-48">
                  <Progress
                    value={verificationProgress}
                    className="h-2.5 bg-white/20"
                    indicatorClassName="bg-blue-200"
                  />
                </div>
                <span className="text-sm font-medium">
                  {Math.round(verificationProgress)}%
                </span>
              </div>
              <div className="text-xs text-blue-100 dark:text-blue-200 mt-2">
                {currentLevel === 0
                  ? "Start verification to unlock features"
                  : currentLevel === totalLevels
                    ? "All levels completed!"
                    : `${currentLevel} of ${totalLevels} levels completed`}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 mt-2 text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* KYC Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {t("current_level")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {currentLevel > 0 ? `Level ${currentLevel}` : "Unverified"}
                </div>
                {currentLevel > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full"
                  >
                    {levels.find((l) => l.level === currentLevel)?.name || ""}
                  </Badge>
                )}
              </div>
              {currentLevel > 0 && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                  {currentLevel < totalLevels
                    ? "Continue verification to unlock more features"
                    : "All verification levels completed"}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-green-50 to-white dark:from-green-950/50 dark:to-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                {t("Approved")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {approvedCount}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {t("of")}
                  {Array.isArray(applications) ? applications.length : 0}{" "}
                  {t("total")}
                </div>
              </div>
              <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                {approvedCount > 0
                  ? `${approvedCount} verification level${approvedCount > 1 ? "s" : ""} completed`
                  : "No verifications completed yet"}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-md bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/50 dark:to-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-full">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                {t("Pending")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {pendingCount}
                </div>
                {pendingCount > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full"
                  >
                    {t("in_review")}
                  </Badge>
                )}
              </div>
              <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                {pendingCount > 0
                  ? `${pendingCount} application${pendingCount > 1 ? "s" : ""} awaiting review`
                  : "No pending applications"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Verification Levels */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center dark:text-zinc-100">
              <LayersIcon className="mr-2 h-5 w-5 text-blue-600" />
              {t("available_verification_levels")}
            </h2>

            {currentLevel < totalLevels && (
              <Button
                onClick={() => {
                  const nextLevel = levels.find(
                    (l) => l.level === currentLevel + 1
                  );
                  if (nextLevel) {
                    router.push(`/user/kyc/apply/${nextLevel.id}`);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={nextLevelPending}
                title={
                  nextLevelPending
                    ? "You already have a pending application for the next level"
                    : ""
                }
              >
                {nextLevelPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    {t("application_pending")}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("start_next_level")}
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-8">
            {/* Keep only the levels content here */}
            <div className="grid gap-6">
              {Array.isArray(levels) &&
                levels
                  .sort((a, b) => a.level - b.level)
                  .map((level) => {
                    const application = getApplicationForLevel(level.id);
                    const isApproved = application?.status === "APPROVED";
                    const isPending =
                      application?.status === "PENDING" ||
                      application?.status === "ADDITIONAL_INFO_REQUIRED";
                    const isRejected = application?.status === "REJECTED";
                    const isAvailable = canApplyForLevel(level.level);
                    const isLocked = level.level > currentLevel + 1;
                    return (
                      <Card
                        key={level.id}
                        className={`
                        overflow-hidden transition-all duration-300 hover:shadow-md dark:bg-zinc-900 dark:border-zinc-700
                        ${isApproved ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/30" : ""}
                        ${isPending ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/30" : ""}
                        ${isRejected ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/30" : ""}
                        ${isAvailable ? "border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/30" : ""}
                        ${isLocked ? "opacity-70" : ""}
                      `}
                      >
                        <CardHeader className="pb-2 relative">
                          <div className="absolute top-0 right-0 mt-4 mr-4">
                            {application && getStatusBadge(application.status)}
                          </div>
                          <div className="flex items-start gap-4">
                            <div
                              className={`
                              p-3 rounded-full 
                              ${isApproved ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : ""}
                              ${isPending ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300" : ""}
                              ${isRejected ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" : ""}
                              ${isAvailable ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : ""}
                              ${isLocked ? "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400" : ""}`}
                            >
                              {isLocked ? (
                                <LockKeyhole className="h-6 w-6" />
                              ) : (
                                getLevelIcon(level.level)
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-xl flex items-center gap-2 dark:text-zinc-100">
                                {t("Level")}{" "}
                                {level.level}: {level.name}
                                {isApproved && (
                                  <BadgeCheck className="h-5 w-5 text-green-500 ml-1" />
                                )}
                              </CardTitle>
                              <CardDescription className="mt-1 dark:text-zinc-400">
                                {level.description ||
                                  `Complete Level ${level.level} verification`}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pb-2">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2 mt-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground dark:text-zinc-400">
                                  {t("application_status")}
                                </span>
                                <span className="font-medium dark:text-zinc-200">
                                  {application?.status === "APPROVED" &&
                                    "Approved"}
                                  {application?.status === "PENDING" &&
                                    "Under Review"}
                                  {application?.status ===
                                    "ADDITIONAL_INFO_REQUIRED" &&
                                    "Additional Info Required"}
                                  {application?.status === "REJECTED" &&
                                    "Rejected"}
                                  {!application && "Not Started"}
                                </span>
                              </div>

                              {application?.status === "PENDING" && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="dark:text-zinc-400">
                                      {t("verification_progress")}
                                    </span>
                                    <span className="dark:text-zinc-300">
                                      {(application as any)
                                        ?.verificationProgress || 30}
                                      %
                                    </span>
                                  </div>
                                  <Progress
                                    value={
                                      (application as any)
                                        ?.verificationProgress || 30
                                    }
                                    className="h-2"
                                  />
                                </div>
                              )}

                              {application?.createdAt && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground dark:text-zinc-400">
                                    {t("Submitted")}
                                  </span>
                                  <span className="dark:text-zinc-300">
                                    {formatDate(
                                      application.createdAt.toString()
                                    )}
                                  </span>
                                </div>
                              )}

                              {application?.updatedAt &&
                                application?.status !== "PENDING" && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground dark:text-zinc-400">
                                      {t("last_updated")}
                                    </span>
                                    <span className="dark:text-zinc-300">
                                      {formatDate(
                                        application.updatedAt.toString()
                                      )}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="pt-2 pb-4">
                          {isApproved ? (
                            <Button
                              variant="outline"
                              className="w-full bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-800 dark:hover:text-green-200"
                              disabled
                            >
                              <BadgeCheck className="mr-2 h-4 w-4" />
                              {t("Verified")}
                            </Button>
                          ) : isPending ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() =>
                                router.push(
                                  `/user/kyc/application/${application?.id}`
                                )
                              }
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              {t("view_application")}
                            </Button>
                          ) : isRejected ? (
                            <Button
                              variant="outline"
                              className="w-full border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={() =>
                                router.push(`/user/kyc/apply/${level.id}`)
                              }
                            >
                              <ArrowUpRight className="mr-2 h-4 w-4" />
                              {t("apply_again")}
                            </Button>
                          ) : isAvailable ? (
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={() =>
                                router.push(`/user/kyc/apply/${level.id}`)
                              }
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              {t("start_verification")}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="w-full"
                              disabled
                            >
                              {isLocked ? (
                                <>
                                  <LockKeyhole className="mr-2 h-4 w-4" />
                                  {t("complete_previous_level")}
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {t("already_completed")}
                                </>
                              )}
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
            </div>

            {/* Benefits section */}
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-6 mt-8">
              <h3 className="text-lg font-medium mb-4 dark:text-zinc-100">
                {t("benefits_of_verification")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full text-blue-700 dark:text-blue-300">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium dark:text-zinc-100">
                      {t("higher_limits")}
                    </h4>
                    <p className="text-sm text-muted-foreground dark:text-zinc-400">
                      {t("increase_your_transaction_and_withdrawal_limits")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full text-green-700 dark:text-green-300">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium dark:text-zinc-100">
                      {t("enhanced_security")}
                    </h4>
                    <p className="text-sm text-muted-foreground dark:text-zinc-400">
                      {t("protect_your_account_with_verified_identity")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full text-purple-700 dark:text-purple-300">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium dark:text-zinc-100">
                      {t("exclusive_features")}
                    </h4>
                    <p className="text-sm text-muted-foreground dark:text-zinc-400">
                      {t("access_premium_features_and_opportunities")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
