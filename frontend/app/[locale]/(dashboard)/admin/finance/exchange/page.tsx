"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loadable, SkeletonBlock } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Wallet,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Zap,
  Globe,
  Activity,
  Settings,
  BarChart3,
  LineChart,
  RefreshCw,
  Clock,
  Users,
  AlertCircle,
  Network,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";

interface ExchangeProvider {
  id: string;
  name: string;
  title: string;
  status: boolean;
  licenseStatus: boolean;
  version: string;
  productId: string;
  proxyUrl?: string;
}

interface ConnectionResult {
  status: boolean;
  message: string;
}

export default function ExchangeProviderPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [exchange, setExchange] = useState<ExchangeProvider | null>(null);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [noProvider, setNoProvider] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [savingProxy, setSavingProxy] = useState(false);
  const [testingProxy, setTestingProxy] = useState(false);

  useEffect(() => {
    fetchActiveExchange();
  }, []);

  const fetchActiveExchange = async () => {
    setLoading(true);
    try {
      const { data, error } = await $fetch({
        url: "/api/admin/finance/exchange/provider/active",
        silent: true,
      });

      if (!error && data?.exchange) {
        const exchangeData = data.exchange;

        // Cross-check license status with extensions API if DB says unlicensed
        if (!exchangeData.licenseStatus && exchangeData.productId) {
          try {
            const { data: extData } = await $fetch({
              url: "/api/admin/system/extension",
              silent: true,
            });
            if (extData?.exchangeProviders) {
              const provider = extData.exchangeProviders.find(
                (p: any) => p.productId === exchangeData.productId
              );
              if (provider?.licenseVerified) {
                exchangeData.licenseStatus = true;
                // Sync the DB so other pages get the correct status
                $fetch({
                  url: `/api/admin/finance/exchange/provider/${exchangeData.id}`,
                  method: "PUT",
                  body: {
                    name: exchangeData.name,
                    title: exchangeData.title,
                    licenseStatus: true,
                  },
                  silent: true,
                }).catch(() => {});
              }
            }
          } catch {
            /* Best-effort license sync. The screen renders from exchangeData
               either way, so a failed lookup must not block it. */
          }
        }

        setExchange(exchangeData);
        setResult(data.result);
        setProxyUrl(exchangeData.proxyUrl || "");
        setNoProvider(false);
      } else if (data?.noActiveProvider) {
        setNoProvider(true);
      } else {
        toast.error(t("failed_to_fetch_exchange_details"));
      }
    } catch (error) {
      toast.error(t("an_error_occurred_while_fetching_exchange_details"));
    } finally {
      setLoading(false);
    }
  };

  const verifyCredentials = async () => {
    if (!exchange) return;

    setVerifying(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/exchange/provider/${exchange.productId}/verify`,
        method: "POST",
        silent: true,
      });

      if (!error) {
        setResult(data);
        toast.success(
          data.status
            ? t("credentials_verified_successfully")
            : t("credential_verification_failed")
        );
      } else {
        toast.error(t("failed_to_verify_credentials"));
      }
    } catch (error) {
      toast.error(t("an_error_occurred_while_verifying_credentials"));
    } finally {
      setVerifying(false);
    }
  };

  const saveProxySettings = async () => {
    if (!exchange) return;

    setSavingProxy(true);
    try {
      const { error } = await $fetch({
        url: `/api/admin/finance/exchange/provider/${exchange.id}`,
        method: "PUT",
        body: {
          name: exchange.name,
          title: exchange.title,
          proxyUrl: proxyUrl || null,
        },
        silent: true,
      });

      if (!error) {
        setExchange({ ...exchange, proxyUrl: proxyUrl || undefined });
        toast.success(t("proxy_settings_saved_successfully"));
      } else {
        toast.error(t("failed_to_save_proxy_settings"));
      }
    } catch (error) {
      toast.error(t("an_error_occurred_while_saving_proxy_settings"));
    } finally {
      setSavingProxy(false);
    }
  };

  const testProxyConnection = async () => {
    if (!exchange) return;

    if (!proxyUrl) {
      toast.error(t("please_enter_a_proxy_url_to_test"));
      return;
    }

    setTestingProxy(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/exchange/provider/${exchange.id}/test-proxy`,
        method: "POST",
        body: { proxyUrl },
        silent: true,
      });

      if (!error && data) {
        if (data.status) {
          toast.success(data.message);
        } else {
          toast.error(data.message);
        }
      } else {
        toast.error(t("failed_to_test_proxy_connection"));
      }
    } catch (error) {
      toast.error(t("an_error_occurred_while_testing_proxy_connection"));
    } finally {
      setTestingProxy(false);
    }
  };

  const exchangeDetails: Record<string, any> = {
    binance: {
      imgSrc: "/img/exchanges/binance.svg",
      supportedCountries: "Countries and Regions",
      link: "https://www.binance.com/en/country-region-selector",
      description:
        t("binance_holdings_ltd_branded_binance_is"),
      color: "bg-warning",
    },
    kucoin: {
      imgSrc: "/img/exchanges/kucoin.svg",
      restrictedCountries:
        "The United States, North Korea, Singapore, Hong Kong, Iran, The Crimean region",
      description:
        t("kucoin_is_a_large_cryptocurrency_exchange"),
      color: "bg-success",
    },
    xt: {
      imgSrc: "/img/exchanges/xt.png",
      restrictedCountries:
        "United States, Canada, Mainland China, Cuba, North Korea, Singapore, Sudan, Syria, Venezuela, Indonesia, Crimea",
      description:
        t("xt_is_a_global_cryptocurrency_exchange"),
      color: "bg-primary",
    },
  };

  const details = exchange
    ? exchangeDetails[exchange.name?.toLowerCase()]
    : null;

  // Literal names, read verbatim by the backend as
  // `process.env[APP_${provider.toUpperCase()}_API_KEY]`. They used to be
  // assembled from localised labels, which rendered "APP_BINANCEAPI Key".
  const envVarPrefix = `APP_${exchange?.name?.toUpperCase() ?? ""}`;
  const envVarNames = [
    `${envVarPrefix}_API_KEY`,
    `${envVarPrefix}_API_SECRET`,
    ...(exchange?.name?.toLowerCase() === "kucoin"
      ? [`${envVarPrefix}_API_PASSPHRASE`]
      : []),
  ];

  /**
   * THE SKELETON WAS A SECOND, WRONGER COPY OF THIS PAGE.
   * ==========================================================================
   *
   * What was here was `if (loading) return <PageShell>` wrapping ten
   * hand-sized `<Skeleton>` boxes — `h-10 w-32`, `h-24 w-24`, `h-10 w-80`,
   * `h-64 w-full` — arranged in an approximation of the real header. Every one
   * of those numbers is a guess about typography it cannot see: `h-10` for an
   * `h1` that is `text-2xl sm:text-3xl` (two different heights, neither of them
   * 40px), and one `h-64` rectangle standing in for a tab bar plus a card. And
   * the imitation had already drifted — the real page renders the whole
   * connection Alert and a five-card Quick Actions grid that the skeleton has
   * no equivalent for at all, so the page grew by most of its own height when
   * the fetch landed.
   *
   * None of it was necessary. The back button, the verify button, the tab bar,
   * the three settings tiles, the proxy form and the entire Quick Actions grid
   * are literals in this file. The provider's title, version and two status
   * badges are the only unknowns, and each of them now waits inside the element
   * that will carry it.
   *
   * `notFound` is split out of the same way `loading` used to swallow it: with
   * the loading bail-out gone, a null `exchange` no longer means "not yet", so
   * the not-found screen needs to say explicitly that the fetch is over. It is
   * also written as a named boolean rather than `if (!loading && !exchange)`
   * because an `if` whose test mentions loading and whose body returns JSX is
   * the full-swap defect this whole change removes, however true the condition.
   */
  const notFound = !loading && !noProvider && !exchange;
  const showActivateLicense = !loading && exchange !== null && !exchange.licenseStatus;
  /* Only the three providers in `exchangeDetails` have artwork, so a provider
     without an entry has genuinely no tile — but that is something we can only
     know once we know WHICH provider it is. */
  const showLogoTile = loading || Boolean(details?.imgSrc);
  const showDescription = loading || Boolean(details?.description);

  if (noProvider) {
    return (
      <PageShell rhythm="lg">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-linear-to-br from-background via-background to-muted/20 border border-border/40 p-8"
        >
          <div className="relative z-10 text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-warning/10 border border-warning/20">
                <AlertCircle className="h-12 w-12 text-warning-ink" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-2">
                {t("no_active_exchange_provider")}
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t("no_exchange_provider_is_currently_enabled")}. Please enable and configure an exchange provider to access trading features.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Link href="/admin/system/extension?type=exchange">
                <Button size="lg" className="gap-2">
                  <Settings className="h-4 w-4" />
                  {tCommon("manage_extensions")}
                </Button>
              </Link>
            </div>
          </div>
        </m.div>
      </PageShell>
    );
  }

  if (notFound) {
    return (
      <PageShell rhythm="lg">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-destructive">
            {t("exchange_provider_not_found")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("the_requested_exchange_provider_could_not_be_found")}.
          </p>
          <Link href="/admin/system/extension?type=exchange">
            <Button className="mt-4">
              <Settings className="h-4 w-4 mr-2" />
              {tCommon("manage_extensions")}
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell rhythm="lg">
      {/* Header with Gradient Background */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-background via-background to-muted/20 border border-border/40 p-8"
      >
        <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/admin/system/extension?type=exchange">
                <Button
                  variant="ghost"
                  size="default"
                  className="hover:bg-muted/50 border border-border/40 bg-background/50 backdrop-blur-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {tCommon("back")}
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="default"
                onClick={verifyCredentials}
                loading={verifying}
                disabled={loading}
                className="bg-background/80 backdrop-blur-sm border border-border/40 hover:bg-muted/80 shadow-sm"
              >
                {!verifying && <RefreshCw className="h-4 w-4 mr-2" />}
                {tCommon("verify_credentials")}
              </Button>
              {/* "Unlicensed" is a conclusion about a provider we may not have
                  yet, and `!exchange?.licenseStatus` is true of a null one — so
                  an inline gate offers "Activate License" to every owner for
                  the length of the fetch, including the ones who already have.
                  It sits in a horizontal row, so waiting costs no vertical
                  space. */}
              {showActivateLicense && exchange && (
                <Link
                  href={`/admin/system/license?productId=${exchange.productId}&return=/admin/finance/exchange`}
                >
                  <Button
                    size="default"
                    className="shadow-sm bg-primary hover:bg-primary/90"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {tCommon("activate_license")}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-start gap-8">
            {/* Exchange Logo and Basic Info */}
            <div className="flex items-center gap-6">
              {/* The tile renders in both states — it is a 96px square in a
                  horizontal flex row, so omitting it while pending slides the
                  whole title block 120px sideways when the logo arrives.
                  `SkeletonBlock` gets the IMAGE's own sizing classes, not an
                  invented approximation, because a logo has no text metrics to
                  measure itself against. */}
              {showLogoTile && (
                <div className="relative">
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${details?.color ?? "bg-muted"} opacity-20 rounded-2xl blur-xl`}
                  />
                  <div className="relative p-4 bg-background border border-border/40 rounded-2xl shadow-lg">
                    {details?.imgSrc ? (
                      <img
                        src={details.imgSrc}
                        alt={exchange?.title ?? ""}
                        className="w-16 h-16 object-contain"
                      />
                    ) : (
                      <SkeletonBlock className="w-16 h-16 rounded-lg" />
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  {/* `bg-clip-text` without `text-transparent` is dead paint:
                      the gradient is clipped behind opaque text and never
                      renders. Dropped rather than completed — a transparent
                      heading measured 1.03:1. */}
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    <Loadable loading={loading} placeholder="Binance">
                      {exchange?.title}
                    </Loadable>
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    {t("exchange_provider_management")}
                  </p>
                </div>
                {/* All three badges render in both states: they are the second
                    line of the header, and a row that appears is a row that
                    pushes the tabs and everything under them down. Only the
                    label inside each one waits. */}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="px-3 py-1">
                    <Activity className="h-3 w-3 mr-1" />
                    <Loadable loading={loading} placeholder="1.0.0">
                      {exchange?.version}
                    </Loadable>
                  </Badge>
                  <Badge
                    variant={
                      loading
                        ? "outline"
                        : exchange?.status
                          ? "default"
                          : "destructive"
                    }
                    className="px-3 py-1"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    <Loadable loading={loading} placeholder="Active">
                      {exchange?.status ? tCommon("active") : tCommon("inactive")}
                    </Loadable>
                  </Badge>
                  <Badge
                    variant={
                      loading
                        ? "outline"
                        : exchange?.licenseStatus
                          ? "default"
                          : "secondary"
                    }
                    className="px-3 py-1"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    <Loadable loading={loading} placeholder="Licensed">
                      {exchange?.licenseStatus ? t("licensed") : t("unlicensed")}
                    </Loadable>
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </m.div>

      {/* Main Content Tabs */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-fit">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Globe className="h-4 w-4 mr-2" />
              {tCommon("overview")}
            </TabsTrigger>
            <TabsTrigger
              value="regions"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4 mr-2" />
              {t("regions")}
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="h-4 w-4 mr-2" />
              {tCommon("settings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("exchange_information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showDescription && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                      {tCommon("description")}
                    </h4>
                    {/* Prose, so `chars` reserves an AVERAGE rather than an
                        identity — the three real blurbs run 300-390 characters
                        and the box settles by a line at most. That is still the
                        right trade against rendering nothing and then inserting
                        four lines of text into the card. */}
                    <p className="text-foreground leading-relaxed">
                      <Loadable loading={loading} chars={330}>
                        {details?.description}
                      </Loadable>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {details?.supportedCountries && (
                <Card className="border-border/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-success">
                      <CheckCircle className="h-5 w-5" />
                      {t("supported_regions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* The tonal recipe is `/10` fill + `/20` rule: `-ink` is
                        measured against a 10% tint, and a `/20` ground pulls
                        further toward the ink. The old hover also went the
                        wrong way in light mode (/20 → /10, i.e. lighter). */}
                    <Link
                      href={details.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 p-4 bg-success/10 rounded-lg border border-success/20 hover:bg-success/20 transition-colors"
                    >
                      <Globe className="h-4 w-4 text-success-ink" />
                      <span className="font-medium text-success-ink">
                        {details.supportedCountries}
                      </span>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {details?.restrictedCountries && (
                <Card className="border-border/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      {t("restricted_regions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                      <p className="text-destructive-ink text-sm leading-relaxed">
                        {details.restrictedCountries}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {t("exchange_configuration")}
                </CardTitle>
                <CardDescription>
                  {t("current_exchange_provider_settings_and_status")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
                    <div className="flex items-center gap-3 mb-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{tCommon("status")}</span>
                    </div>
                    <Badge
                      variant={
                        loading
                          ? "outline"
                          : exchange?.status
                            ? "default"
                            : "destructive"
                      }
                    >
                      <Loadable loading={loading} placeholder="Active">
                        {exchange?.status ? tCommon("active") : tCommon("inactive")}
                      </Loadable>
                    </Badge>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {t("license")}
                      </span>
                    </div>
                    <Badge
                      variant={
                        loading
                          ? "outline"
                          : exchange?.licenseStatus
                            ? "default"
                            : "secondary"
                      }
                    >
                      <Loadable loading={loading} placeholder="Licensed">
                        {exchange?.licenseStatus ? t("licensed") : t("unlicensed")}
                      </Loadable>
                    </Badge>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {tCommon("version")}
                      </span>
                    </div>
                    <Badge variant="outline">
                      <Loadable loading={loading} placeholder="1.0.0">
                        {exchange?.version}
                      </Loadable>
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Proxy Configuration Card */}
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  {t("proxy_configuration")}
                </CardTitle>
                <CardDescription>
                  {t("configure_a_proxy_server_for_exchange")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="proxyUrl">{tCommon("proxy_url")}</Label>
                  <Input
                    id="proxyUrl"
                    type="text"
                    placeholder="http://user:pass@host:port or socks5://host:port"
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    disabled={loading}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Supported formats: http://, https://, socks4://, socks5://. Leave empty to disable proxy.
                  </p>
                </div>

                <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning-ink shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-warning-ink">
                        {tCommon("important_notes")}
                      </p>
                      <ul className="text-sm text-warning-ink space-y-1 list-disc list-inside">
                        <li>{t("click_test_proxy_first_to_verify")}</li>
                        <li>{t("the_test_uses_a_separate_connection")}</li>
                        <li>{t("only_save_the_proxy_after_a_successful_test")}</li>
                        <li>{t("the_proxy_server_must_support_https_connections")}</li>
                        <li>{t("for_socks_proxies_ensure_your_proxy")}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    {exchange?.proxyUrl && (
                      <Badge variant="outline" className="gap-1">
                        <Network className="h-3 w-3" />
                        {t("proxy_active")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={testProxyConnection}
                      loading={testingProxy}
                      disabled={!proxyUrl}
                      className="gap-2"
                    >
                      {!testingProxy && <Activity className="h-4 w-4" />}
                      {t("test_proxy")}
                    </Button>
                    <Button
                      onClick={saveProxySettings}
                      loading={savingProxy}
                      disabled={!proxyUrl}
                      className="gap-2"
                    >
                      {!savingProxy && <Save className="h-4 w-4" />}
                      {t("save_proxy_settings")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </m.div>

      {/* Connection Status */}
      {result && (
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/*
            `tone` (tinted ground + derived ink), NOT `variant` (saturated
            fill). Everything nested below — the `text-muted-foreground` body
            copy, the neutral guidance card, the mono env-var block — is tuned
            for the page surface, so on a solid `bg-destructive` it collapsed to
            grey-on-red and a near-black code box inside a red panel.
          */}
          <Alert
            tone={result.status ? "success" : "destructive"}
            className="shadow-sm"
          >
            {result.status ? <CheckCircle /> : <XCircle />}
            <AlertTitle className="text-base font-semibold">
              {result.status ? t("connection_successful") : t("connection_failed")}
            </AlertTitle>
            <AlertDescription className="mt-1 w-full">
              <div className="w-full space-y-4">
                <p className="text-sm">{result.message}</p>
                {!result.status && (
                  <div className="w-full space-y-4 p-4 bg-background/60 rounded-lg border border-border">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-warning/10 rounded">
                          <AlertTriangle className="h-4 w-4 text-warning-ink" />
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-1 text-foreground">
                            {t("environment_configuration")}
                          </p>
                          {/* The four keys split around a literal ".env", so the
                              separator belongs BEFORE each fragment, not after
                              the one that precedes it. */}
                          <p className="text-sm text-muted-foreground">
                            {`${t("please_check_your_credentials_in_the")} .${t(
                              "env_file_and_try_again"
                            )}. ${t("note_that_any_changes_to_the")} .${t(
                              "env_file_will_require_a_server_restart"
                            )}.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-primary/10 rounded">
                          <Settings className="h-4 w-4 text-primary-ink" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm mb-1 text-foreground">
                            {t("api_credentials_required")}
                          </p>
                          <p className="text-sm text-muted-foreground mb-3">
                            {t("if_you_dont_if_required")}.
                          </p>
                          <div className="bg-muted p-4 rounded-lg border border-border-strong">
                            <p className="text-xs text-muted-foreground mb-2">
                              {tCommon("environment_contract")}
                            </p>
                            {/* Literal env-var names — these are read verbatim
                                by the backend (`APP_${PROVIDER}_API_KEY`), so
                                they must never come from a translation: the
                                localised labels rendered as
                                "APP_BINANCEAPI Key". */}
                            <div className="font-mono text-sm space-y-1 break-words">
                              {envVarNames.map((name) => (
                                <div key={name} className="text-success-ink">
                                  {name}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-warning/10 rounded">
                          <Shield className="h-4 w-4 text-warning-ink" />
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-2 text-foreground">
                            {t("security_requirements")}
                          </p>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-current mt-2 flex-shrink-0" />
                              <span>
                                {t("whitelist_your_server_api_settings")}
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-current mt-2 flex-shrink-0" />
                              <span>
                                {t("enable_all_necessary_unlisted_addresses")}
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-current mt-2 flex-shrink-0" />
                              <span>
                                {t("ensure_your_exchange_kyc_completed")}
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </m.div>
      )}

      {/* Quick Actions */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{tCommon("quick_actions")}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <QuickActionCard
            icon={TrendingUp}
            label="Markets"
            href="/admin/finance/exchange/market"
            description={t("manage_trading_pairs_and_market_data")}
            color="bg-primary"
          />
          <QuickActionCard
            icon={BarChart3}
            label="Charts"
            href="/admin/finance/exchange/chart"
            description={t("manage_historical_chart_data_cache")}
            color="bg-primary"
          />
          <QuickActionCard
            icon={DollarSign}
            label="Currencies"
            href="/admin/finance/currency/spot"
            description={t("configure_supported_currencies")}
            color="bg-success"
          />
          <QuickActionCard
            icon={Wallet}
            label="Balances"
            href="/admin/finance/exchange/balance"
            description={t("view_exchange_wallet_balances")}
            disabled={result?.status === false}
            disabledMessage="Please verify credentials first"
            color="bg-primary"
          />
          <QuickActionCard
            icon={CreditCard}
            label="Fees"
            href="/admin/finance/exchange/fee"
            description={t("configure_trading_fees")}
            disabled={result?.status === false}
            disabledMessage="Please verify credentials first"
            color="from-warning to-destructive"
          />
        </div>
      </m.div>
    </PageShell>
  );
}

interface QuickActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  description: string;
  disabled?: boolean;
  disabledMessage?: string;
  color?: string;
}

const QuickActionCard = ({
  icon: Icon,
  label,
  href,
  description,
  disabled = false,
  disabledMessage,
  color = "bg-primary",
}: QuickActionCardProps) => {
  if (disabled) {
    return (
      <Card className="cursor-not-allowed opacity-50 border-border/40">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-muted/50 border border-border/40">
              <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-base">{label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {disabledMessage || description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group cursor-pointer transition-all duration-300 border-border/40 hover:border-primary/20 hover:-translate-y-1">
      <Link href={href}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div
                className={`absolute inset-0 bg-linear-to-br ${color} opacity-20 rounded-full blur-lg group-hover:opacity-30 transition-opacity`}
              />
              <div className="relative p-4 rounded-full bg-linear-to-br from-background to-muted/20 border border-border/40 group-hover:border-primary/30 transition-colors">
                <Icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                {label}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};
