"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useExtensionStore } from "@/store/extension";
import {
  usePatchNotesStore,
  getTypeFromProductId,
  type ProductPatchNotesData,
  type PatchNoteVersion,
} from "@/store/patch-notes";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getProductShowcase,
  type ProductShowcase,
} from "@/lib/product-features";
import * as LucideIcons from "lucide-react";
import {
  ChevronLeft,
  Sparkles,
  Check,
  ArrowRight,
  ExternalLink,
  Star,
  Zap,
  Shield,
  TrendingUp,
  Key,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  Settings,
  Activity,
  Loader2,
  Info,
  LayoutDashboard,
  History,
} from "lucide-react";
import { MarkdownRenderer, isMarkdownContent } from "@/lib/markdown-renderer";

// Dynamic icon component
function DynamicIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) {
    return <LucideIcons.Box className={className} />;
  }
  return <IconComponent className={className} />;
}

// ===== SHOWCASE VIEW FOR UNLICENSED PRODUCTS =====
function ProductShowcaseView({
  extension,
  showcase,
}: {
  extension: any;
  showcase: ProductShowcase;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/system/extension")}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("back_to_products")}
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
                {extension.image ? (
                  <Image
                    src={extension.image}
                    alt={extension.title}
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                ) : (
                  <Sparkles className="h-12 w-12 text-primary" />
                )}
              </motion.div>
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold mb-3"
                >
                  {extension.title}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl text-primary font-medium mb-3"
                >
                  {showcase.tagline}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-muted-foreground max-w-2xl"
                >
                  {extension.description}
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
                Version {extension.version}
              </Badge>
              <Button
                size="lg"
                className="gap-2 text-base shadow-lg"
                onClick={() =>
                  router.push(
                    `/admin/system/license?productId=${extension.productId}`
                  )
                }
              >
                <Key className="h-5 w-5" />
                {tCommon("activate_license")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              {extension.link && (
                <a
                  href={extension.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {t("view_on_envato")}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
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
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">{tCommon("key_features")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {showcase.features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <DynamicIcon
                          name={feature.icon}
                          className="h-6 w-6 text-primary"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Benefits & Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold">{t("business_benefits")}</h2>
            </div>
            <div className="space-y-4">
              {showcase.benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <Card className="overflow-hidden border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1 text-emerald-600">
                        {benefit.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {benefit.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Highlights */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold">Highlights</h2>
            </div>
            <Card>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {showcase.highlights.map((highlight, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.05 }}
                      className="flex items-start gap-3"
                    >
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{highlight}</span>
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Admin & User Routes */}
        {(showcase.adminRoutes || showcase.userRoutes) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold">{t("what_you_get")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {showcase.adminRoutes && showcase.adminRoutes.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-violet-500/10 text-violet-600 border-violet-500/20"
                      >
                        Admin
                      </Badge>
                      {t("admin_dashboard_pages")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {showcase.adminRoutes.map((route, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <ArrowRight className="h-3 w-3 text-violet-500" />
                          <code className="bg-muted px-2 py-0.5 rounded text-xs">
                            {route.path}
                          </code>
                          <span>- {route.label}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {showcase.userRoutes && showcase.userRoutes.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-600 border-blue-500/20"
                      >
                        User
                      </Badge>
                      {t("user_facing_pages")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {showcase.userRoutes.map((route, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                          <ArrowRight className="h-3 w-3 text-blue-500" />
                          <code className="bg-muted px-2 py-0.5 rounded text-xs">
                            {route.path}
                          </code>
                          <span>- {route.label}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: "spring", stiffness: 200 }}
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Key className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {t("ready_to_unlock")} {extension.title}?
                </h3>
                <p className="text-muted-foreground max-w-lg mx-auto mb-6">
                  {t("activate_your_license_to_start_using")}
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Button
                    size="lg"
                    className="gap-2 text-base px-8 shadow-lg"
                    onClick={() =>
                      router.push(
                        `/admin/system/license?productId=${extension.productId}`
                      )
                    }
                  >
                    <Key className="h-5 w-5" />
                    {t("activate_license_now")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {extension.link && (
                    <a
                      href={extension.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="lg" className="gap-2">
                        {t("purchase_on_envato")}
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// ===== FALLBACK SHOWCASE FOR PRODUCTS WITHOUT DETAILED DATA =====
function FallbackShowcaseView({ extension }: { extension: any }) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/system/extension")}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("back_to_products")}
            </Button>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Key className="h-3 w-3 mr-1" />
              {t("license_required")}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {extension.image ? (
                    <Image
                      src={extension.image}
                      alt={extension.title}
                      width={96}
                      height={96}
                      className="object-cover"
                    />
                  ) : (
                    <Sparkles className="h-12 w-12 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-3">{extension.title}</h1>
                  <p className="text-muted-foreground mb-4 max-w-2xl">
                    {extension.description || "No description available."}
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge variant="outline">Version {extension.version}</Badge>
                    <Button
                      size="lg"
                      className="gap-2"
                      onClick={() =>
                        router.push(
                          `/admin/system/license?productId=${extension.productId}`
                        )
                      }
                    >
                      <Key className="h-5 w-5" />
                      {tCommon("activate_license")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {extension.link && (
                      <a
                        href={extension.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="gap-2">
                          {t("view_on_envato")}
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// ===== LICENSED PRODUCT MANAGEMENT VIEW =====
function LicensedProductView({
  extension,
  showcase,
  updateData,
  isUpdating,
  isUpdateChecking,
  checkForUpdates,
  updateExtension,
  toggleExtension,
  patchNotesData,
  isPatchNotesLoading,
}: {
  extension: any;
  showcase: ProductShowcase | null;
  updateData: any;
  isUpdating: boolean;
  isUpdateChecking: boolean;
  checkForUpdates: () => Promise<void>;
  updateExtension: () => Promise<void>;
  toggleExtension: (id: string) => void;
  patchNotesData: ProductPatchNotesData | null;
  isPatchNotesLoading: boolean;
}) {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isToggling, setIsToggling] = useState(false);
  const [selectedChangelogVersion, setSelectedChangelogVersion] = useState<string | null>(null);

  // Get all versions from patch notes data
  const allVersions = useMemo(() => patchNotesData?.versions || [], [patchNotesData]);

  // Get changelog content for a specific version
  const getChangelogContent = (version?: string): string | null => {
    if (!patchNotesData?.versions) return updateData?.changelog || null;

    const targetVersion = version || updateData?.version || extension.version;
    const versionData = patchNotesData.versions.find((v) => v.version === targetVersion);
    return versionData?.content || updateData?.changelog || null;
  };

  const handleToggle = async () => {
    setIsToggling(true);
    await toggleExtension(extension.id);
    setIsToggling(false);
  };

  const hasUpdate = updateData?.status && updateData?.update_id;
  const isUpToDate = !updateData?.status && updateData?.message?.includes("latest version");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/system/extension")}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("back_to_products")}
            </Button>
            <div className="flex items-center gap-3">
              {hasUpdate && (
                <Badge className="bg-orange-500 text-white animate-pulse">
                  <Download className="h-3 w-3 mr-1" />
                  {t("update_available")}
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
              <div className="h-40 w-80 rounded-xl from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
                {extension.image ? (
                  <Image
                    src={extension.image}
                    alt={extension.title}
                    width={590}
                    height={300}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <Package className="h-12 w-12 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{extension.title}</h1>
                  <Badge
                    variant="outline"
                    className={cn(
                      extension.status
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                    )}
                  >
                    {extension.status ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {showcase && (
                  <p className="text-lg text-primary font-medium mb-1">
                    {showcase.tagline}
                  </p>
                )}
                <p className="text-muted-foreground max-w-xl">
                  {extension.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end shrink-0">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  v{extension.version}
                </Badge>
                {extension.link && (
                  <a
                    href={extension.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Envato
                    </Button>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3 bg-card border rounded-lg px-4 py-2">
                <span className="text-sm font-medium">
                  {extension.status ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={extension.status}
                  onCheckedChange={handleToggle}
                  disabled={isToggling}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="updates" className="gap-2 relative">
              <Download className="h-4 w-4" />
              Updates
              {hasUpdate && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="changelog" className="gap-2">
              <History className="h-4 w-4" />
              Changelog
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Zap className="h-4 w-4" />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Version</p>
                      <p className="font-semibold">{extension.version}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      extension.status ? "bg-emerald-500/10" : "bg-zinc-500/10"
                    )}>
                      <Activity className={cn(
                        "h-5 w-5",
                        extension.status ? "text-emerald-600" : "text-zinc-500"
                      )} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-semibold">{extension.status ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">License</p>
                      <p className="font-semibold text-emerald-600">Verified</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      hasUpdate ? "bg-orange-500/10" : "bg-emerald-500/10"
                    )}>
                      <Download className={cn(
                        "h-5 w-5",
                        hasUpdate ? "text-orange-600" : "text-emerald-600"
                      )} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Updates</p>
                      <p className={cn(
                        "font-semibold",
                        hasUpdate ? "text-orange-600" : "text-emerald-600"
                      )}>
                        {hasUpdate ? "Available" : "Up to Date"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {tCommon("quick_actions")}
                </CardTitle>
                <CardDescription>
                  {t("manage_your_extension_settings_and_updates")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex-col gap-2"
                    onClick={checkForUpdates}
                    disabled={isUpdateChecking}
                  >
                    {isUpdateChecking ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-5 w-5" />
                    )}
                    <span>{tCommon("check_for_updates")}</span>
                  </Button>
                  {hasUpdate && (
                    <Button
                      className="h-auto py-4 flex-col gap-2 bg-orange-500 hover:bg-orange-600"
                      onClick={updateExtension}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                      <span>{isUpdating ? "Updating..." : `Update to v${updateData.version}`}</span>
                    </Button>
                  )}
                  {showcase?.adminRoutes?.[0] && (
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2"
                      onClick={() => router.push(showcase.adminRoutes![0].path)}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      <span>{tCommon("go_to_dashboard")}</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Admin Routes */}
            {showcase?.adminRoutes && showcase.adminRoutes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5" />
                    {t("admin_pages")}
                  </CardTitle>
                  <CardDescription>
                    {t("access_the_management_pages_for_this_extension")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {showcase.adminRoutes.map((route, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start gap-2"
                        onClick={() => router.push(route.path)}
                      >
                        <ArrowRight className="h-4 w-4" />
                        {route.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent value="updates" className="space-y-6">
            {/* Update Alert */}
            {hasUpdate && (
              <Alert className="border-orange-500/50 bg-orange-500/10">
                <Download className="h-4 w-4 text-orange-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    <strong>Version {updateData.version}</strong> {t("is_available_for_download")}
                  </span>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={updateExtension}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("updating_ellipsis")}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        {t("update_now")}
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {isUpToDate && (
              <Alert className="border-emerald-500/50 bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription>
                  {t("you_have_the_latest_version_of")} {extension.title}.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Update Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    {tCommon("update_actions")}
                  </CardTitle>
                  <CardDescription>
                    {t("check_and_install_updates_for_this_extension")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={checkForUpdates}
                    disabled={isUpdateChecking}
                  >
                    {isUpdateChecking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {tCommon("checking_ellipsis")}
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {tCommon("check_for_updates")}
                      </>
                    )}
                  </Button>
                  {hasUpdate && (
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={updateExtension}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("installing_update_ellipsis")}
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          {t("install_update")}
                        </>
                      )}
                    </Button>
                  )}
                  <Alert variant="default" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {t("always_backup_your_database_before_updating")}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Changelog */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {hasUpdate ? `What's New in ${updateData.version}` : "Release Notes"}
                  </CardTitle>
                  <CardDescription>
                    {hasUpdate
                      ? "Review the changes before updating"
                      : `Current version (${extension.version}) release notes`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80 rounded-lg border bg-muted/30 p-4">
                    {isPatchNotesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading changelog...</span>
                      </div>
                    ) : (() => {
                      const changelog = getChangelogContent(hasUpdate ? updateData.version : extension.version);
                      if (!changelog) {
                        return (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p>{t("no_changelog_available")}</p>
                            <p className="text-xs mt-1">
                              {t("check_for_updates_to_see_the_latest_changes")}
                            </p>
                          </div>
                        );
                      }
                      return isMarkdownContent(changelog) ? (
                        <MarkdownRenderer content={changelog} className="text-sm" />
                      ) : (
                        <div className="prose dark:prose-invert prose-sm max-w-none">
                          {changelog}
                        </div>
                      );
                    })()}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Version History Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t("version_information")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{tCommon("current_version")}</p>
                    <p className="text-lg font-semibold">{extension.version}</p>
                  </div>
                  {hasUpdate && (
                    <div className="p-4 rounded-lg bg-orange-500/10">
                      <p className="text-xs text-muted-foreground mb-1">{t("latest_version")}</p>
                      <p className="text-lg font-semibold text-orange-600">{updateData.version}</p>
                    </div>
                  )}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">{t("product_id")}</p>
                    <code className="text-sm font-mono">{extension.productId}</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Changelog Tab */}
          <TabsContent value="changelog" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Version History
                      </CardTitle>
                      <CardDescription>
                        Browse all release notes and changelogs for {extension.title}
                      </CardDescription>
                    </div>
                    {allVersions.length > 0 && (
                      <Select
                        value={selectedChangelogVersion || allVersions[0]?.version || ""}
                        onValueChange={setSelectedChangelogVersion}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                        <SelectContent>
                          {allVersions.map((v) => (
                            <SelectItem key={v.version} value={v.version}>
                              v{v.version}
                              {v.version === extension.version && (
                                <span className="ml-2 text-xs text-muted-foreground">(current)</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                        Changelog data is not available for this extension. Please check back later.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
                      {/* Version List */}
                      <div className="lg:col-span-1">
                        <ScrollArea className="h-64 lg:h-125 rounded-lg border p-2">
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
                                <div className="flex items-center justify-between">
                                  <span className="font-mono">v{v.version}</span>
                                  {v.version === extension.version && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs h-5",
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
                                    "text-xs mt-0.5",
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

                      {/* Changelog Content */}
                      <div className="lg:col-span-4">
                        <ScrollArea className="h-80 lg:h-125 rounded-lg border bg-muted/30 p-4">
                          {(() => {
                            const version = selectedChangelogVersion || allVersions[0]?.version;
                            const changelog = getChangelogContent(version);
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

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            {showcase ? (
              <>
                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {showcase.features.map((feature, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                            <DynamicIcon
                              name={feature.icon}
                              className="h-6 w-6 text-primary"
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Benefits & Highlights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        {t("business_benefits")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {showcase.benefits.map((benefit, index) => (
                        <div key={index} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                          <h4 className="font-medium text-emerald-600 mb-1">{benefit.title}</h4>
                          <p className="text-sm text-muted-foreground">{benefit.description}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-600" />
                        Highlights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {showcase.highlights.map((highlight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-primary mt-0.5" />
                            <span className="text-sm">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">{t("feature_details_coming_soon")}</h3>
                  <p className="text-muted-foreground">
                    {t("detailed_feature_information_for_this_extension")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====
export default function ExtensionDetailsPage() {
  const { id } = useParams();
  const updateCheckedRef = useRef<string | null>(null);
  const patchNotesFetchedRef = useRef<string | null>(null);
  const [patchNotesData, setPatchNotesData] = useState<ProductPatchNotesData | null>(null);
  const [isPatchNotesLoading, setIsPatchNotesLoading] = useState(false);

  const {
    extensions,
    currentExtension,
    setCurrentExtension,
    licenseVerified,
    isLoading,
    fetchExtensions,
    updateData,
    isUpdating,
    isUpdateChecking,
    checkForUpdates,
    updateExtension,
    toggleExtension,
  } = useExtensionStore();

  const { fetchProductPatchNotes } = usePatchNotesStore();

  useEffect(() => {
    if (id && extensions.length === 0) {
      fetchExtensions();
    }
  }, [id, extensions.length, fetchExtensions]);

  useEffect(() => {
    if (id && extensions.length > 0) {
      const extension = extensions.find((ext) => ext.productId === id);
      if (extension) {
        setCurrentExtension(extension);
        updateCheckedRef.current = null;
      }
    }
  }, [id, extensions, setCurrentExtension]);

  // Check for updates when licensed
  useEffect(() => {
    if (
      currentExtension &&
      licenseVerified &&
      !isUpdateChecking &&
      updateCheckedRef.current !== currentExtension.productId
    ) {
      updateCheckedRef.current = currentExtension.productId;
      checkForUpdates();
    }
  }, [currentExtension, licenseVerified, checkForUpdates, isUpdateChecking]);

  // Fetch patch notes for the current extension
  useEffect(() => {
    const fetchPatchNotes = async () => {
      if (
        currentExtension &&
        licenseVerified &&
        patchNotesFetchedRef.current !== currentExtension.productId
      ) {
        patchNotesFetchedRef.current = currentExtension.productId;
        setIsPatchNotesLoading(true);

        // Try fetching by product ID first, then by type
        let data = await fetchProductPatchNotes(currentExtension.productId);
        if (!data) {
          const type = getTypeFromProductId(currentExtension.productId);
          if (type !== currentExtension.productId) {
            data = await fetchProductPatchNotes(type);
          }
        }

        setPatchNotesData(data);
        setIsPatchNotesLoading(false);
      }
    };

    fetchPatchNotes();
  }, [currentExtension, licenseVerified, fetchProductPatchNotes]);

  // Loading state
  if (isLoading || !currentExtension) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container py-4">
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="container py-8">
          <div className="flex items-start gap-6 mb-8">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-96" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Get showcase data
  const showcase = getProductShowcase(currentExtension.productId);

  // Show appropriate view based on license status
  if (!licenseVerified) {
    if (showcase) {
      return <ProductShowcaseView extension={currentExtension} showcase={showcase} />;
    }
    return <FallbackShowcaseView extension={currentExtension} />;
  }

  // Licensed product view
  return (
    <LicensedProductView
      extension={currentExtension}
      showcase={showcase}
      updateData={updateData}
      isUpdating={isUpdating}
      isUpdateChecking={isUpdateChecking}
      checkForUpdates={checkForUpdates}
      updateExtension={updateExtension}
      toggleExtension={toggleExtension}
      patchNotesData={patchNotesData}
      isPatchNotesLoading={isPatchNotesLoading}
    />
  );
}
