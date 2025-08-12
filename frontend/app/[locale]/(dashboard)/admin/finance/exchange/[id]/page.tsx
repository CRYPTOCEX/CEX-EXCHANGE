"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
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
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface ExchangeProvider {
  id: string;
  name: string;
  title: string;
  status: boolean;
  licenseStatus: boolean;
  version: string;
  productId: string;
}

interface ConnectionResult {
  status: boolean;
  message: string;
}

const ExchangeProviderPage = () => {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [exchange, setExchange] = useState<ExchangeProvider | null>(null);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchExchangeDetails(productId);
    }
  }, [productId]);

  const fetchExchangeDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/exchange/provider/${id}`,
        silent: true,
      });

      if (!error) {
        setExchange(data.exchange);
        setResult(data.result);
      } else {
        toast.error("Failed to fetch exchange details");
      }
    } catch (error) {
      toast.error("An error occurred while fetching exchange details");
    } finally {
      setLoading(false);
    }
  };

  const verifyCredentials = async () => {
    if (!exchange) return;

    setVerifying(true);
    try {
      const { data, error } = await $fetch({
        url: `/api/admin/finance/exchange/provider/${productId}/verify`,
        method: "POST",
        silent: true,
      });

      if (!error) {
        setResult(data);
        toast.success(
          data.status
            ? "Credentials verified successfully"
            : "Credential verification failed"
        );
      } else {
        toast.error("Failed to verify credentials");
      }
    } catch (error) {
      toast.error("An error occurred while verifying credentials");
    } finally {
      setVerifying(false);
    }
  };

  const exchangeDetails: Record<string, any> = {
    binance: {
      imgSrc: "/img/exchanges/binance.svg",
      supportedCountries: "Countries and Regions",
      link: "https://www.binance.com/en/country-region-selector",
      description:
        "Binance Holdings Ltd., branded Binance, is a global company that operates the largest cryptocurrency exchange in terms of daily trading volume of cryptocurrencies. Binance was founded in 2017 by Changpeng Zhao, a developer who had previously created high-frequency trading software.",
      color: "from-yellow-400 to-orange-500",
    },
    kucoin: {
      imgSrc: "/img/exchanges/kucoin.svg",
      restrictedCountries:
        "The United States, North Korea, Singapore, Hong Kong, Iran, The Crimean region",
      description:
        "KuCoin is a large cryptocurrency exchange offering the ability to buy, sell, and trade cryptocurrencies. In addition to basic trading options, the platform offers margin, futures, and peer-to-peer (P2P) trading. Users can also choose to stake or lend their crypto to earn rewards.",
      color: "from-green-400 to-emerald-500",
    },
    xt: {
      imgSrc: "/img/exchanges/xt.png",
      restrictedCountries:
        "United States, Canada, Mainland China, Cuba, North Korea, Singapore, Sudan, Syria, Venezuela, Indonesia, Crimea",
      description:
        "XT is a global cryptocurrency exchange that provides a platform for trading more than 100 cryptocurrencies. Since early 2018, XT has been providing a secure, reliable, and advanced digital asset trading platform for global users.",
      color: "from-blue-400 to-indigo-500",
    },
  };

  const details = exchange
    ? exchangeDetails[exchange.name?.toLowerCase()]
    : null;

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96 flex-col gap-5">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">
            {t("loading_exchange_provider")}.
          </span>
        </div>
      </div>
    );
  }

  if (!exchange) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            {t("exchange_provider_not_found")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("the_requested_exchange_provider_could_not_be_found")}.
          </p>
          <Link href="/admin/finance/exchange">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back_to_exchange_providers")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header with Gradient Background */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-muted/20 border border-border/40 p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/admin/finance/exchange">
                <Button
                  variant="ghost"
                  size="default"
                  className="hover:bg-muted/50 border border-border/40 bg-background/50 backdrop-blur-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("back_to_exchange_providers")}
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="default"
                onClick={verifyCredentials}
                disabled={verifying}
                className="bg-background/80 backdrop-blur-sm border border-border/40 hover:bg-muted/80 shadow-sm"
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t("verify_credentials")}
              </Button>
              {!exchange.licenseStatus && (
                <Link
                  href={`/admin/finance/exchange/${exchange.productId}/license`}
                >
                  <Button
                    size="default"
                    className="shadow-sm bg-primary hover:bg-primary/90"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {t("activate_license")}
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-start gap-8">
            {/* Exchange Logo and Basic Info */}
            <div className="flex items-center gap-6">
              {details?.imgSrc && (
                <div className="relative">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${details.color} opacity-20 rounded-2xl blur-xl`}
                  />
                  <div className="relative p-4 bg-background border border-border/40 rounded-2xl shadow-lg">
                    <img
                      src={details.imgSrc}
                      alt={exchange.title}
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {exchange.title}
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    {t("exchange_provider_management")}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="px-3 py-1">
                    <Activity className="h-3 w-3 mr-1" />
                    {exchange.version}
                  </Badge>
                  <Badge
                    variant={exchange.status ? "default" : "destructive"}
                    className="px-3 py-1"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {exchange.status ? "Active" : "Inactive"}
                  </Badge>
                  <Badge
                    variant={exchange.licenseStatus ? "default" : "secondary"}
                    className="px-3 py-1"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    {exchange.licenseStatus ? "Licensed" : "Unlicensed"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
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
              {t("Overview")}
            </TabsTrigger>
            <TabsTrigger
              value="regions"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4 mr-2" />
              {t("Regions")}
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t("Settings")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="border-border/40 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t("exchange_information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {details?.description && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                      {t("DESCRIPTION")}
                    </h4>
                    <p className="text-foreground leading-relaxed">
                      {details.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {details?.supportedCountries && (
                <Card className="border-border/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      {t("supported_regions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={details.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
                    >
                      <Globe className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-700 dark:text-green-400">
                        {details.supportedCountries}
                      </span>
                      <ExternalLink className="h-3 w-3 text-green-600" />
                    </Link>
                  </CardContent>
                </Card>
              )}

              {details?.restrictedCountries && (
                <Card className="border-border/40 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      {t("restricted_regions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-red-700 dark:text-red-400 text-sm leading-relaxed">
                        {details.restrictedCountries}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="border-border/40 shadow-sm">
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
                      <span className="font-medium text-sm">{t("Status")}</span>
                    </div>
                    <Badge
                      variant={exchange.status ? "default" : "destructive"}
                    >
                      {exchange.status ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {t("License")}
                      </span>
                    </div>
                    <Badge
                      variant={exchange.licenseStatus ? "default" : "secondary"}
                    >
                      {exchange.licenseStatus ? "Licensed" : "Unlicensed"}
                    </Badge>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">
                        {t("Version")}
                      </span>
                    </div>
                    <Badge variant="outline">{exchange.version}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Connection Status */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Alert
            variant={result.status ? "default" : "destructive"}
            className="border-border/40 shadow-sm"
          >
            <div className="flex items-center gap-2">
              {result.status ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <XCircle className="h-5 w-5" />
              )}
              <AlertTitle className="text-lg">
                {result.status
                  ? "Connection Successful!"
                  : "Connection Failed!"}
              </AlertTitle>
            </div>
            <AlertDescription className="mt-4">
              <div className="space-y-4">
                <p className="text-base">{result.message}</p>
                {!result.status && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/40">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-primary/10 rounded">
                          <AlertTriangle className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-1">
                            {t("environment_configuration")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("please_check_your_credentials_in_the")}.{" "}
                            {t("env_file_and_try_again")}.{" "}
                            {t("note_that_any_changes_to_the")}.{" "}
                            {t("env_file_will_require_a_server_restart")}.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-blue-500/10 rounded">
                          <Settings className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-1">
                            {t("api_credentials_required")}
                          </p>
                          <p className="text-sm text-muted-foreground mb-3">
                            {t("if_you_dont_(if_required)")}.
                          </p>
                          <div className="bg-zinc-900 dark:bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                            <p className="text-xs text-zinc-400 mb-2">
                              {t("environment_variables")}
                            </p>
                            <div className="font-mono text-sm space-y-1">
                              <div className="text-green-400">
                                APP_
                                {exchange.name?.toUpperCase()}
                                _API_KEY=
                              </div>
                              <div className="text-green-400">
                                APP_
                                {exchange.name?.toUpperCase()}
                                _API_SECRET=
                              </div>
                              {exchange.name?.toLowerCase() === "kucoin" && (
                                <div className="text-green-400">
                                  APP_
                                  {exchange.name?.toUpperCase()}
                                  _API_PASSPHRASE=
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-yellow-500/10 rounded">
                          <Shield className="h-4 w-4 text-yellow-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-2">
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
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t("quick_actions")}</h2>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            icon={TrendingUp}
            label="Markets"
            href={`/admin/finance/exchange/${productId}/market`}
            description="Manage trading pairs and market data"
            color="from-blue-500 to-indigo-600"
          />
          <QuickActionCard
            icon={DollarSign}
            label="Currencies"
            href="/admin/finance/currency/spot"
            description="Configure supported currencies"
            color="from-green-500 to-emerald-600"
          />
          <QuickActionCard
            icon={Wallet}
            label="Balances"
            href={`/admin/finance/exchange/${productId}/balance`}
            description="View exchange wallet balances"
            disabled={result?.status === false}
            disabledMessage="Please verify credentials first"
            color="from-purple-500 to-violet-600"
          />
          <QuickActionCard
            icon={CreditCard}
            label="Fees"
            href={`/admin/finance/exchange/${productId}/fee`}
            description="Configure trading fees"
            disabled={result?.status === false}
            disabledMessage="Please verify credentials first"
            color="from-orange-500 to-red-600"
          />
        </div>
      </motion.div>
    </div>
  );
};

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
  color = "from-primary to-primary",
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
    <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/40 hover:border-primary/20 hover:-translate-y-1">
      <Link href={href}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div
                className={`absolute inset-0 bg-gradient-to-br ${color} opacity-20 rounded-full blur-lg group-hover:opacity-30 transition-opacity`}
              />
              <div className="relative p-4 rounded-full bg-gradient-to-br from-background to-muted/20 border border-border/40 group-hover:border-primary/30 transition-colors">
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

export default ExchangeProviderPage;
