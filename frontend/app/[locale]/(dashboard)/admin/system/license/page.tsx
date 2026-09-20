"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { $fetch } from "@/lib/api";
import {
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  FileText,
  ArrowLeft,
  Shield,
  Sparkles,
  Lock,
  Unlock,
  Package,
  Boxes,
  Cpu,
  Globe,
  ShoppingCart,
  Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter, useLocale, addLocalePrefix } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { clearLicenseCache } from "@/hooks/useLicenseGate";
import { useTranslations } from "next-intl";

interface ProductInfo {
  productId: string;
  name: string;
  title: string;
  description?: string;
  type: "core" | "extension" | "blockchain" | "exchange";
  image?: string;
  link?: string;
}

export default function LicenseActivationPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const productId = searchParams.get("productId");
  // Only accept same-app absolute paths ("/x", not "//host" or "https://...")
  // — the return param feeds window.location.href below
  const rawReturnPath = searchParams.get("return");
  const returnPath =
    rawReturnPath && /^\/(?!\/)/.test(rawReturnPath) ? rawReturnPath : null;
  const needsActivation = searchParams.get("needsActivation") === "true";
  const isCore = !productId;

  const [purchaseCode, setPurchaseCode] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [activeMethod, setActiveMethod] = useState<"code" | "file">("code");
  const [licenseAlreadyActive, setLicenseAlreadyActive] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (isCore) {
          const response = await $fetch({
            url: "/api/admin/system/license/status",
            method: "GET",
            silent: true,
          });

          // If license is valid, either redirect or show "already active" state
          if (response.data?.isValid) {
            if (!needsActivation) {
              // Auto-redirect if we didn't come from a license failure
              router.replace("/admin");
              return;
            } else {
              // License is now valid but user came from needsActivation=true
              // Show them that license is already active
              setLicenseAlreadyActive(true);
            }
          }

          setProductInfo({
            productId: response.data?.productId || "core",
            name: "bicrypto",
            title: response.data?.productName || "BiCrypto",
            description: t("complete_cryptocurrency_exchange_platform_with_spot"),
            type: "core",
            link: "https://mashdiv.com/products/bicrypto",
          });
        } else {
          // Use unified products API to find the product
          const productsResponse = await $fetch({
            url: "/api/admin/system/extension",
            method: "GET",
            silent: true,
          });

          let foundProduct = false;

          if (productsResponse.data) {
            const { extensions, blockchains, exchangeProviders } = productsResponse.data;

            // Check extensions
            const extension = extensions?.find((ext: any) => ext.productId === productId);
            if (extension) {
              foundProduct = true;
              setProductInfo({
                productId: extension.productId,
                name: extension.name,
                title: extension.title || extension.name,
                description: extension.description,
                type: "extension",
                image: extension.image,
                link: extension.link,
              });

              // licenseVerified only means a .lic file exists on disk; confirm
              // with the license server before leaving the activation form
              if (extension.licenseVerified && (await confirmLicenseWithServer(productId))) {
                const redirectTo = returnPath || getProductReturnPath(extension.name, "extension");
                router.replace(redirectTo);
                return;
              }
            }

            // Check blockchains
            if (!foundProduct) {
              const blockchain = blockchains?.find((bc: any) => bc.productId === productId);
              if (blockchain) {
                foundProduct = true;
                setProductInfo({
                  productId: blockchain.productId,
                  name: blockchain.chain || blockchain.name,
                  title: blockchain.title || t("blockchain", { chain: String(blockchain.chain) }),
                  description: blockchain.description,
                  type: "blockchain",
                  image: blockchain.image,
                  link: blockchain.link,
                });

                // licenseVerified only means a .lic file exists on disk; confirm
                // with the license server before leaving the activation form
                if (blockchain.licenseVerified && (await confirmLicenseWithServer(productId))) {
                  const redirectTo = returnPath || `/admin/ecosystem`;
                  router.replace(redirectTo);
                  return;
                }
              }
            }

            // Check exchange providers
            if (!foundProduct) {
              const exchange = exchangeProviders?.find((ex: any) => ex.productId === productId);
              if (exchange) {
                foundProduct = true;
                setProductInfo({
                  productId: exchange.productId,
                  name: exchange.name,
                  title: exchange.title || exchange.name,
                  description: t("exchange_provider_integration", { title: String(exchange.title) }),
                  type: "exchange",
                  image: exchange.image,
                  link: exchange.link,
                });

                // licenseVerified only means a .lic file exists on disk; confirm
                // with the license server before leaving the activation form
                if (exchange.licenseVerified && (await confirmLicenseWithServer(productId))) {
                  const redirectTo = returnPath || `/admin/finance/exchange`;
                  router.replace(redirectTo);
                  return;
                }
              }
            }
          }

          // Fallback if product not found anywhere
          if (!foundProduct) {
            setProductInfo({
              productId: productId,
              name: productId,
              title: tCommon("product"),
              type: "extension",
            });
          }
        }
      } catch (err) {
        console.debug("License status check failed:", err);
      } finally {
        setCheckingStatus(false);
      }
    };

    initialize();
  }, [productId, isCore, router, returnPath]);

  const getRedirectPath = () => {
    if (returnPath) return returnPath;
    if (isCore) return "/admin";
    if (productInfo?.name && productInfo?.type) {
      return getProductReturnPath(productInfo.name, productInfo.type);
    }
    return "/admin";
  };

  const handleActivate = async () => {
    if (!purchaseCode.trim()) {
      setActivationError("Please enter your purchase code");
      return;
    }

    setActivating(true);
    setActivationError(null);

    try {
      const body: any = { purchaseCode: purchaseCode.trim() };
      if (!isCore && productId) {
        body.productId = productId;
      }
      if (notificationEmail.trim()) {
        body.notificationEmail = notificationEmail.trim();
      }

      const response = await $fetch({
        url: "/api/admin/system/license/activate",
        method: "POST",
        body,
        silent: true,
      });

      if (response.data?.success) {
        // useLicenseGate memoises "not licensed" for 5 minutes. The hard reload
        // below drops it, but clear it explicitly so any gate that renders
        // before the navigation lands does not bounce us back here.
        clearLicenseCache();
        setActivationSuccess(true);
        setTimeout(() => {
          // Hard reload so server config/menus pick up the new license, but
          // keep the locale prefix — bare paths bypass the app's routes
          window.location.href = addLocalePrefix(getRedirectPath(), locale);
        }, 2000);
      } else {
        const errorMsg = response.error || response.data?.message || "Activation failed";
        setActivationError(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.data?.message || err.message || "Failed to activate license";
      setActivationError(errorMsg);
    } finally {
      setActivating(false);
    }
  };

  const handleActivateFromFile = async () => {
    setActivating(true);
    setActivationError(null);

    try {
      const body: any = {};
      if (!isCore && productId) {
        body.productId = productId;
      }

      const response = await $fetch({
        url: "/api/admin/system/license/activate-from-file",
        method: "POST",
        body,
        silent: true,
      });

      if (response.data?.success) {
        // See handleActivate: drop the gate's 5-minute "not licensed" memo.
        clearLicenseCache();
        setActivationSuccess(true);
        setTimeout(() => {
          // Hard reload so server config/menus pick up the new license, but
          // keep the locale prefix — bare paths bypass the app's routes
          window.location.href = addLocalePrefix(getRedirectPath(), locale);
        }, 2000);
      } else {
        setActivationError(
          response.error || response.data?.message || "No license file found in /lic folder"
        );
      }
    } catch (err: any) {
      setActivationError(err.message || "Failed to activate from file");
    } finally {
      setActivating(false);
    }
  };

  const handleBack = () => {
    // Use return path if provided
    if (returnPath) {
      router.push(returnPath);
    } else if (productInfo?.type === "core") {
      // For core product, go to system update page
      router.push("/admin/system/update");
    } else if (productId) {
      // If we have a productId, go back to the product showcase page
      router.push(`/admin/system/extension/${productId}`);
    } else {
      // Default fallback to home
      router.push("/");
    }
  };

  const getProductIcon = () => {
    switch (productInfo?.type) {
      case "blockchain":
        return <Cpu className="h-8 w-8" />;
      case "extension":
        return <Boxes className="h-8 w-8" />;
      case "exchange":
        return <Globe className="h-8 w-8" />;
      default:
        return <Package className="h-8 w-8" />;
    }
  };

  const getProductTypeLabel = () => {
    switch (productInfo?.type) {
      case "blockchain":
        return "Blockchain Integration";
      case "extension":
        return "Extension";
      case "exchange":
        return "Exchange Provider";
      default:
        return "Core Platform";
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute inset-0 h-20 w-20 rounded-full border-2 border-primary/20 border-t-primary animate-spin mx-auto" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{t("verifying_license")}</h2>
            <p className="text-muted-foreground">{t("please_wait_while_we_check_your")}…</p>
          </div>
        </div>
      </div>
    );
  }

  if (activationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-success/5">
        <div className="text-center space-y-8 p-8">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-success animate-pulse" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-success">{t("license_activated")}</h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              {t("your_license_for")}{" "}
              <span className="font-semibold text-foreground">{productInfo?.title}</span>{" "}
              {t("has_been_successfully_activated")}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("redirecting_you_now")}…</span>
          </div>
        </div>
      </div>
    );
  }

  if (licenseAlreadyActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-success/5">
        <div className="text-center space-y-8 p-8 max-w-lg">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <Shield className="absolute -top-2 -right-2 h-8 w-8 text-success" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-success">{t("license_already_active") || t("license_already_active")}</h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              {t("your_license_for")}{" "}
              <span className="font-semibold text-foreground">{productInfo?.title}</span>{" "}
              {t("is_already_activated") || t("is_already_activated_and_valid")}
            </p>
          </div>
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={() => {
                const redirectTo = returnPath || "/admin";
                window.location.href = addLocalePrefix(redirectTo, locale);
              }}
              size="lg"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("go_to_admin") || t("go_to_admin_panel")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("license_valid_message") || t("your_license_has_been_verified_and_is_active")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              {t("secure_license_activation")}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left Side - Product Info */}
          <div className="space-y-8">
            {/* Product Header */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning-ink text-sm font-medium">
                <Key className="h-4 w-4" />
                {tCommon("license_required")}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {productInfo?.image ? (
                    <img
                      src={productInfo.image}
                      alt={productInfo.title}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                      {getProductIcon()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {productInfo?.title || tCommon("product")}
                    </h1>
                    <p className="text-muted-foreground mt-1">{getProductTypeLabel()}</p>
                  </div>
                </div>

                <p className="text-lg text-muted-foreground max-w-lg">
                  {productInfo?.description ||
                    (isCore
                      ? t("activate_your_license_to_unlock_all")
                      : t("this_feature_requires_a_separate_license"))}
                </p>
              </div>
            </div>

            {/* Purchase Link Card */}
            {productInfo?.link && (
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t("dont_have_a_license")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("purchase_this_product_on_envato_market")}
                        </p>
                      </div>
                    </div>
                    <a
                      href={productInfo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {tCommon("buy_now")}
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product ID Card */}
            {productId && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{tCommon("product_id")}</p>
                      <code className="text-sm font-mono font-medium tabular-nums text-foreground">{productId}</code>
                    </div>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Features Preview */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {t("what_you_get_with_activation")}
              </h3>
              <div className="grid gap-3">
                {[
                  { icon: Unlock, text: "Full access to all features" },
                  { icon: Shield, text: "Regular updates & security patches" },
                  { icon: Sparkles, text: "Premium support access" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Activation Form */}
          <div className="lg:sticky lg:top-24">
            <Card className="overflow-hidden">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">{t("activate_your_license")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("choose_your_preferred_activation_method")}
                </p>
              </div>

              <CardContent className="space-y-6">
                {activationError && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-ink text-sm flex items-start gap-3">
                    <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">{t("activation_failed")}</p>
                      <p className="text-destructive/80">{activationError}</p>
                    </div>
                  </div>
                )}

                {/* Method Tabs */}
                <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                  <button
                    onClick={() => setActiveMethod("code")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all",
                      activeMethod === "code"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Key className="h-4 w-4" />
                    {t("purchase_code")}
                  </button>
                  <button
                    onClick={() => setActiveMethod("file")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all",
                      activeMethod === "file"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    {t("license_file")}
                  </button>
                </div>

                {/* Purchase Code Method */}
                {activeMethod === "code" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t("purchase_code")}</label>
                      <Input
                        type="text"
                        value={purchaseCode}
                        onChange={(e) => setPurchaseCode(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        disabled={activating}
                        className="h-12 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <ExternalLink className="h-3 w-3" />
                        {t("find_your_code_in")}{" "}
                        <a
                          href="https://mashdiv.com/dashboard/licenses"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          {t("envato_downloads")}
                        </a>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t("notification_email")}
                        <span className="text-xs text-muted-foreground font-normal">({tCommon("optional")})</span>
                      </label>
                      <Input
                        type="email"
                        value={notificationEmail}
                        onChange={(e) => setNotificationEmail(e.target.value)}
                        placeholder="your@email.com"
                        disabled={activating}
                        className="h-12 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("receive_update_notifications")}
                      </p>
                    </div>

                    <Button
                      onClick={handleActivate}
                      loading={activating}
                      disabled={!purchaseCode.trim()}
                      className="w-full h-12 text-base font-semibold"
                      size="lg"
                    >
                      {activating ? (
                        tCommon('enable')
                      ) : (
                        <>
                          <Unlock className="h-5 w-5 mr-2" />
                          {tCommon("activate_license")}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* License File Method */}
                {activeMethod === "file" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 border border-dashed space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">{t("upload_instructions")}</p>
                          <p className="text-muted-foreground">
                            {t("download_your_license_certificate_from_envato")}{" "}
                            <code className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">
                              license.txt
                            </code>{" "}
                            {t("file_in_the")}{" "}
                            <code className="px-1.5 py-0.5 bg-background rounded text-xs font-mono">
                              /lic
                            </code>{" "}
                            {t("folder")}
                          </p>
                        </div>
                      </div>
                      {productId && (
                        <div className="pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground">
                            {t("expected_product_id")}:{" "}
                            <code className="px-1.5 py-0.5 bg-background rounded font-mono font-medium">
                              {productId}
                            </code>
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleActivateFromFile}
                      loading={activating}
                      className="w-full h-12 text-base font-semibold"
                      size="lg"
                    >
                      {activating ? (
                        `${t("scanning")}…`
                      ) : (
                        <>
                          <FileText className="h-5 w-5 mr-2" />
                          {t("activate_from_file")}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Help Link */}
                <div className="pt-4 border-t text-center">
                  <a
                    href="https://mashdiv.com/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("how_to_find_your_purchase_code")}
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Times out to false so a hung license server can't trap the admin on the
// loading screen before the activation form renders
async function confirmLicenseWithServer(productId: string | null): Promise<boolean> {
  if (!productId) return false;
  const timeout = new Promise<{ data?: { status?: boolean } }>((resolve) =>
    setTimeout(() => resolve({}), 10000)
  );
  const response = await Promise.race([
    $fetch({
      url: "/api/admin/system/license/verify",
      method: "POST",
      body: { productId },
      silent: true,
    }),
    timeout,
  ]);
  return !!response.data?.status;
}

function getProductReturnPath(productName: string, productType: string): string {
  if (productType === "blockchain") {
    return "/admin/ecosystem";
  }

  if (productType === "exchange") {
    return "/admin/finance/exchange";
  }

  // Extension paths
  const pathMap: Record<string, string> = {
    ecosystem: "/admin/ecosystem",
    staking: "/admin/staking",
    p2p: "/admin/p2p",
    ico: "/admin/ico",
    forex: "/admin/forex",
    forex_trading: "/admin/forex-trading",
    futures: "/admin/futures",
    copy_trading: "/admin/copy-trading",
    affiliate: "/admin/affiliate",
    ecommerce: "/admin/ecommerce",
    nft: "/admin/nft",
    ai_investment: "/admin/ai/investment",
    ai_market_maker: "/admin/ai/market-maker",
    bot: "/admin/ai/market-maker",
    mailwizard: "/admin/mailwizard/campaign",
    faq: "/admin/faq",
    knowledge_base: "/admin/faq",
    gateway: "/admin/gateway",
    mlm: "/admin/affiliate",
    wallet_connect: "/admin/system/extension", // No admin page - redirect to extensions list
    binary_pro: "/admin/finance/binary/settings",
    chart_engine: "/admin/finance/binary/settings",
    binary_ai_engine: "/admin/ai/binary-engine",
    trading_bot: "/admin/trading-bot",
    hummingbot: "/admin/hb",
  };

  return pathMap[productName] || "/admin/system/extension";
}
