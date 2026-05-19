"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useSystemUpdateStore } from "@/store/update";
import {
  usePatchNotesStore,
  getPatchNotesType,
  PatchNoteVersion,
} from "@/store/patch-notes";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownRenderer, isMarkdownContent } from "@/lib/markdown-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  ChevronLeft,
  Download,
  RefreshCw,
  CheckCircle2,
  Package,
  FileText,
  Activity,
  Loader2,
  Info,
  Key,
  ExternalLink,
  ArrowRight,
  Shield,
  Sparkles,
  Clock,
  AlertCircle,
  Zap,
  Server,
  Database,
  Globe,
  LayoutDashboard,
  ShieldCheck,
  AlertTriangle,
  History,
} from "lucide-react";

export default function SystemUpdatePage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const {
    licenseVerified,
    fetchProductInfo,
    updateData,
    isUpdating,
    isUpdateChecking,
    checkForUpdates,
    updateSystem,
    productId,
    productVersion,
    productName,
    activateLicense,
  } = useSystemUpdateStore();

  const [activeTab, setActiveTab] = useState("overview");
  const [purchaseCode, setPurchaseCode] = useState("");
  const [envatoUsername, setEnvatoUsername] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  const [selectedChangelogVersion, setSelectedChangelogVersion] = useState<string | null>(null);

  // Patch notes store for fetching changelogs from docs
  const {
    data: patchNotesData,
    fetchPatchNotes,
    getProductChangelog,
    getProductVersions,
    getLatestVersion,
    isLoading: isPatchNotesLoading,
    fetchFailed: patchNotesFetchFailed,
  } = usePatchNotesStore();

  // Determine if we should show changelog tab
  const showChangelogTab = !patchNotesFetchFailed;

  // Get all versions for the changelog tab
  const patchNotesType = useMemo(
    () => getPatchNotesType(productName || "bicrypto"),
    [productName]
  );
  const allVersions = useMemo(
    () => getProductVersions(patchNotesType),
    [patchNotesData, getProductVersions, patchNotesType]
  );

  const updateCheckPerformedRef = useRef(false);
  const productInfoFetchedRef = useRef(false);
  const patchNotesFetchedRef = useRef(false);

  useEffect(() => {
    if (!productInfoFetchedRef.current) {
      productInfoFetchedRef.current = true;
      fetchProductInfo();
    }
  }, [fetchProductInfo]);

  // Fetch patch notes from docs.mashdiv.com
  useEffect(() => {
    if (!patchNotesFetchedRef.current) {
      patchNotesFetchedRef.current = true;
      fetchPatchNotes();
    }
  }, [fetchPatchNotes]);

  useEffect(() => {
    const shouldCheckForUpdates =
      productId &&
      productVersion &&
      licenseVerified &&
      !isUpdateChecking &&
      !updateCheckPerformedRef.current;

    if (shouldCheckForUpdates) {
      updateCheckPerformedRef.current = true;
      const timeoutId = setTimeout(() => {
        checkForUpdates();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [productId, productVersion, licenseVerified, isUpdateChecking, checkForUpdates]);

  useEffect(() => {
    if (productId && productVersion && productInfoFetchedRef.current) {
      updateCheckPerformedRef.current = false;
    }
  }, [productId, productVersion]);

  const handleActivateLicense = async () => {
    setIsActivating(true);
    await activateLicense(purchaseCode, envatoUsername);
    setIsActivating(false);
  };

  const hasUpdate = updateData?.status && updateData?.update_id;
  const isUpToDate = !updateData?.status && updateData?.message?.includes("latest version");

  // Get changelog from patch notes (remote) or fallback to updateData.changelog
  const getChangelogContent = (version?: string): string | null => {
    const patchNotesType = getPatchNotesType(productName || "bicrypto");
    const targetVersion = version || updateData?.version;

    // Try to get from remote patch notes first
    if (targetVersion) {
      const remoteChangelog = getProductChangelog(patchNotesType, targetVersion);
      if (remoteChangelog) return remoteChangelog;
    }

    // Fallback to latest from patch notes
    const latestFromPatchNotes = getProductChangelog(patchNotesType);
    if (latestFromPatchNotes) return latestFromPatchNotes;

    // Final fallback to updateData changelog
    return updateData?.changelog || null;
  };

  // Get current version changelog for "up to date" state
  const getCurrentVersionChangelog = (): string | null => {
    const patchNotesType = getPatchNotesType(productName || "bicrypto");
    return getProductChangelog(patchNotesType, productVersion);
  };

  // Loading state
  if (!productVersion) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container py-4">
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="container py-8">
          <div className="flex items-start gap-6 mb-8">
            <Skeleton className="h-24 w-24 rounded-2xl" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-5 w-96" />
              <Skeleton className="h-5 w-72" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  // Unlicensed view
  if (!licenseVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                {tCommon("back_to_dashboard")}
              </Button>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                <Key className="h-3 w-3 mr-1" />
                {t("license_required")}
              </Badge>
            </div>
          </div>
        </div>

        <div className="container py-8 pb-16">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-12"
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="flex items-start gap-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden shadow-lg"
                >
                  <Package className="h-12 w-12 text-primary" />
                </motion.div>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl font-bold mb-3"
                  >
                    {productName || "Bicrypto"}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl text-primary font-medium mb-3"
                  >
                    {t("complete_cryptocurrency_exchange_platform")}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-muted-foreground max-w-2xl"
                  >
                    {t("a_powerful_feature_rich_cryptocurrency_trading")}
                  </motion.p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col gap-3 lg:items-end shrink-0"
              >
                <Badge variant="outline" className="text-sm px-4 py-1.5">
                  Version {productVersion}
                </Badge>
                <a
                  href="https://codecanyon.net/item/bicrypto-crypto-trading-platform-watchlist-kyc-charting-library-wallets-binary-trading-news/35599184"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    {t("view_on_envato")}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </motion.div>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">{tCommon("platform_features")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Globe, title: "Spot Trading", description: "Advanced trading engine with limit and market orders" },
                { icon: Shield, title: "Secure Wallets", description: "Multi-currency wallets with cold storage support" },
                { icon: Zap, title: "P2P Trading", description: "Peer-to-peer trading with escrow protection" },
                { icon: Database, title: "Staking", description: "Flexible staking pools with auto-compounding" },
                { icon: Server, title: "API Access", description: "Full REST API for trading integrations" },
                { icon: Activity, title: "Real-time Data", description: "Live price feeds and market data" },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <Card className="h-full hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <feature.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* License Activation Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
              <CardContent className="p-8">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                      <Key className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{t("activate_your_license")}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t("enter_your_envato_purchase_code_to")}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>{t("automatic_updates")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>{t("premium_support")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="purchase-code" className="text-sm font-medium">
                        {t("purchase_code")}
                      </label>
                      <Input
                        id="purchase-code"
                        value={purchaseCode}
                        onChange={(e) => setPurchaseCode(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">
                        {tCommon("email")} <span className="text-muted-foreground">({tCommon("optional")})</span>
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={envatoUsername}
                        onChange={(e) => setEnvatoUsername(e.target.value)}
                        placeholder={tCommon("enter_your_email_address")}
                      />
                    </div>
                    <Button
                      className="w-full gap-2"
                      size="lg"
                      onClick={handleActivateLicense}
                      disabled={isActivating || !purchaseCode}
                    >
                      {isActivating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {tCommon("enable")}
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4" />
                          {tCommon("activate_license")}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Licensed view
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin")}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {tCommon("back_to_dashboard")}
            </Button>
            <div className="flex items-center gap-3">
              {hasUpdate && (
                <Badge className="bg-orange-500 text-white animate-pulse">
                  <Download className="h-3 w-3 mr-1" />
                  {(updateData.pendingUpdates?.length || 0) > 1
                    ? `${updateData.pendingUpdates?.length} Updates Pending`
                    : t("update_available")}
                </Badge>
              )}
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Licensed
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 pb-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 shadow-lg">
                <Package className="h-10 w-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{productName || "Bicrypto"}</h1>
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  >
                    Active
                  </Badge>
                </div>
                <p className="text-lg text-primary font-medium mb-1">
                  {t("cryptocurrency_exchange_platform")}
                </p>
                <p className="text-muted-foreground max-w-xl">
                  {t("manage_your_platform_updates_and_system")}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end shrink-0">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  v{productVersion}
                </Badge>
                <a
                  href="https://codecanyon.net/item/bicrypto-crypto-trading-platform-watchlist-kyc-charting-library-wallets-binary-trading-news/35599184"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Envato
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={cn(
            "grid w-full",
            showChangelogTab ? "max-w-lg grid-cols-3" : "max-w-sm grid-cols-2"
          )}>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-2 relative">
              <Download className="h-4 w-4" />
              Updates
              {hasUpdate && (
                (updateData.pendingUpdates?.length || 0) > 1 ? (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-orange-500 text-[10px] font-medium text-white flex items-center justify-center">
                    {updateData.pendingUpdates?.length}
                  </span>
                ) : (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                )
              )}
            </TabsTrigger>
            {showChangelogTab && (
              <TabsTrigger value="changelog" className="gap-2">
                <History className="h-4 w-4" />
                Changelog
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("license_status")}</p>
                        <p className="text-lg font-semibold text-emerald-500">Verified</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{tCommon("current_version")}</p>
                        <p className="text-lg font-semibold font-mono">{productVersion}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center",
                        hasUpdate ? "bg-orange-500/10" : "bg-emerald-500/10"
                      )}>
                        {hasUpdate ? (
                          <Download className="h-6 w-6 text-orange-500" />
                        ) : (
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("update_status")}</p>
                        <p className={cn(
                          "text-lg font-semibold",
                          hasUpdate ? "text-orange-500" : "text-emerald-500"
                        )}>
                          {isUpdateChecking ? "Checking..." : hasUpdate ? "Available" : "Up to Date"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    {t("quick_links")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <a
                      href="https://support.mashdiv.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <Globe className="h-4 w-4" />
                        {t("support_portal")}
                      </Button>
                    </a>
                    <a
                      href="https://docs.mashdiv.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full justify-start gap-2">
                        <FileText className="h-4 w-4" />
                        Documentation
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => router.push("/admin/system/extension")}
                    >
                      <Package className="h-4 w-4" />
                      Extensions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent value="updates" className="space-y-6">
            {/* Sequential Update Warning */}
            {hasUpdate && (updateData.pendingUpdates?.length || 0) > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert className="border-blue-500/30 bg-blue-500/5">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-700 dark:text-blue-400">
                    <strong>Sequential Updates Required:</strong> You have {updateData.pendingUpdates?.length} updates pending.
                    Updates must be applied in order ({productVersion} → {updateData.version} → ... → {updateData.latestVersion}).
                    Please update one version at a time.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Backup Warning */}
            {hasUpdate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-700 dark:text-amber-400">
                    {t("please_backup_your_database_and_script")}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Split Layout: Update Actions Left (1/3), Changelog Right (2/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Update Status Card - 1/3 width */}
              <motion.div
                className="lg:col-span-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Download className="h-5 w-5 text-primary" />
                          {t("system_updates")}
                        </CardTitle>
                        <CardDescription>
                          {hasUpdate
                            ? (updateData.pendingUpdates?.length || 0) > 1
                              ? `${updateData.pendingUpdates?.length} sequential updates required`
                              : `Version ${updateData.version} is available`
                            : "Keep your platform up to date."}
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={checkForUpdates}
                        disabled={isUpdateChecking}
                        className="gap-2"
                      >
                        <RefreshCw className={cn("h-4 w-4", isUpdateChecking && "animate-spin")} />
                        {isUpdateChecking ? "Checking..." : "Check"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isUpdateChecking ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : hasUpdate ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                              <Download className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                              <p className="font-semibold">{t("new_version_available")}</p>
                              <p className="text-sm text-muted-foreground">
                                {productVersion} → <span className="text-orange-500 font-mono">{updateData.version}</span>
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={updateSystem}
                            disabled={isUpdating}
                            className="w-full gap-2"
                          >
                            {isUpdating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("updating_ellipsis")}
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4" />
                                {(updateData.pendingUpdates?.length || 0) > 1
                                  ? `Update to v${updateData.version}`
                                  : t("update_now")}
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Version comparison */}
                        <div className="p-4 rounded-lg border bg-muted/30">
                          <h4 className="text-sm font-medium mb-3">Version Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Current</span>
                              <span className="font-mono">{productVersion}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Next Update</span>
                              <span className="font-mono text-orange-500">{updateData.version}</span>
                            </div>
                            {updateData.latestVersion && updateData.latestVersion !== updateData.version && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Latest</span>
                                <span className="font-mono text-emerald-500">{updateData.latestVersion}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sequential Update Progress */}
                        {(updateData.pendingUpdates?.length || 0) > 0 && (
                          <div className="p-4 rounded-lg border bg-muted/30">
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              Update Queue ({updateData.pendingUpdates?.length} pending)
                            </h4>
                            <div className="space-y-2">
                              {updateData.pendingUpdates?.slice(0, 5).map((update, index) => (
                                <div
                                  key={update.version}
                                  className={cn(
                                    "flex items-center gap-2 text-sm p-2 rounded",
                                    index === 0 ? "bg-orange-500/10 border border-orange-500/20" : "bg-muted/50"
                                  )}
                                >
                                  <div className={cn(
                                    "h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium",
                                    index === 0 ? "bg-orange-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"
                                  )}>
                                    {index + 1}
                                  </div>
                                  <span className={cn(
                                    "font-mono",
                                    index === 0 ? "text-orange-500 font-medium" : "text-muted-foreground"
                                  )}>
                                    v{update.version}
                                  </span>
                                  {index === 0 && (
                                    <Badge variant="outline" className="ml-auto text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20">
                                      Next
                                    </Badge>
                                  )}
                                </div>
                              ))}
                              {(updateData.pendingUpdates?.length || 0) > 5 && (
                                <p className="text-xs text-muted-foreground text-center pt-1">
                                  +{(updateData.pendingUpdates?.length || 0) - 5} more updates...
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{t("youre_up_to_date")}</h3>
                        <p className="text-muted-foreground max-w-md text-sm">
                          {updateData?.message || `You have the latest version (${productVersion}).`}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Right: Changelog for the update version or current version - 2/3 width */}
              <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {hasUpdate
                        ? `What's New in ${updateData.version}`
                        : `Release Notes (${productVersion})`}
                    </CardTitle>
                    <CardDescription>
                      {hasUpdate
                        ? "Review the changes before updating"
                        : "Current version release notes"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] rounded-lg border bg-muted/30 p-4">
                      {isPatchNotesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span className="ml-2 text-muted-foreground">Loading changelog...</span>
                        </div>
                      ) : (() => {
                        const changelog = hasUpdate
                          ? getChangelogContent(updateData.version)
                          : getCurrentVersionChangelog();
                        if (!changelog) {
                          return (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-muted-foreground text-sm">
                                No changelog available for this version
                              </p>
                            </div>
                          );
                        }
                        return isMarkdownContent(changelog) ? (
                          <MarkdownRenderer content={changelog} className="text-sm" />
                        ) : (
                          <div className="prose dark:prose-invert text-sm max-w-none">
                            {changelog}
                          </div>
                        );
                      })()}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* Changelog Tab - only show if fetch succeeded */}
          {showChangelogTab && (
            <TabsContent value="changelog" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <History className="h-5 w-5 text-primary" />
                          Version History
                        </CardTitle>
                        <CardDescription>
                          Browse all release notes for {productName || "Bicrypto"}
                        </CardDescription>
                      </div>
                      <Select
                        value={selectedChangelogVersion || allVersions[0]?.version || ""}
                        onValueChange={setSelectedChangelogVersion}
                      >
                        <SelectTrigger className="w-full sm:w-44">
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                        <SelectContent>
                          {allVersions.map((v) => (
                            <SelectItem key={v.version} value={v.version}>
                              v{v.version}
                              {v.version === productVersion && (
                                <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isPatchNotesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-3 text-muted-foreground">Loading changelogs...</span>
                      </div>
                    ) : allVersions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <History className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">No Changelogs Available</h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                          Changelog data is not available at the moment. Please check back later.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                        {/* Version List - narrower */}
                        <div className="lg:col-span-1">
                          <ScrollArea className="h-64 lg:h-[500px] rounded-lg border p-2">
                            <div className="space-y-1">
                              {allVersions.map((v) => (
                                <button
                                  key={v.version}
                                  onClick={() => setSelectedChangelogVersion(v.version)}
                                  className={cn(
                                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                                    (selectedChangelogVersion || allVersions[0]?.version) === v.version
                                      ? "bg-primary text-primary-foreground"
                                      : "hover:bg-muted"
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs">v{v.version}</span>
                                    {v.version === productVersion && (
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] h-4 px-1",
                                          (selectedChangelogVersion || allVersions[0]?.version) === v.version
                                            ? "border-primary-foreground/50 text-primary-foreground"
                                            : ""
                                        )}
                                      >
                                        current
                                      </Badge>
                                    )}
                                  </div>
                                  {v.metadata.releaseDate && (
                                    <p className={cn(
                                      "text-[10px] mt-0.5",
                                      (selectedChangelogVersion || allVersions[0]?.version) === v.version
                                        ? "text-primary-foreground/70"
                                        : "text-muted-foreground"
                                    )}>
                                      {v.metadata.releaseDate}
                                    </p>
                                  )}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>

                        {/* Changelog Content - wider */}
                        <div className="lg:col-span-4">
                          <ScrollArea className="h-80 lg:h-[500px] rounded-lg border bg-muted/30 p-4">
                            {(() => {
                              const version = selectedChangelogVersion || allVersions[0]?.version;
                              const changelog = getProductChangelog(patchNotesType, version);
                              if (!changelog) {
                                return (
                                  <div className="flex flex-col items-center justify-center h-full text-center">
                                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground text-sm">
                                      No changelog available for this version
                                    </p>
                                  </div>
                                );
                              }
                              return isMarkdownContent(changelog) ? (
                                <MarkdownRenderer content={changelog} />
                              ) : (
                                <div className="prose dark:prose-invert max-w-none">
                                  {changelog}
                                </div>
                              );
                            })()}
                          </ScrollArea>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
