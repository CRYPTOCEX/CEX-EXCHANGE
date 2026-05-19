"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Coins,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  Hash,
  Key,
  Link2,
  Mail,
  MapPin,
  MoreVertical,
  Percent,
  Phone,
  RefreshCcw,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  TestTube,
  TrendingUp,
  User,
  Wallet,
  XCircle,
  AlertCircle,
  Ban,
  Play,
  Zap,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { toast } from "sonner";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

interface AllowedWalletTypesConfig {
  [walletType: string]: {
    enabled: boolean;
    currencies: string[];
  };
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastFourChars: string;
  type: string;
  mode: string;
  permissions: string[];
  ipWhitelist?: string[];
  allowedWalletTypes?: AllowedWalletTypesConfig;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  lastUsedAt?: string;
  lastUsedIp?: string;
  status: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface MerchantBalance {
  id: string;
  currency: string;
  walletType: string;
  available: number;
  pending: number;
  reserved: number;
  totalReceived: number;
  totalRefunded: number;
  totalFees: number;
  totalPaidOut: number;
}

interface MerchantUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
}

interface MerchantStats {
  paymentCount: number;
  totalVolume: number;
  refundCount: number;
  payoutCount: number;
  totalPaidOut: number;
}

interface MerchantDetails {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  testMode: boolean;
  allowedCurrencies: string[];
  allowedWalletTypes: string[];
  defaultCurrency: string;
  feeType: string;
  feePercentage: number;
  feeFixed: number;
  payoutSchedule: string;
  payoutThreshold: number;
  status: string;
  verificationStatus: string;
  dailyLimit: number;
  monthlyLimit: number;
  transactionLimit: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  user?: MerchantUser;
  gatewayMerchantBalances?: MerchantBalance[];
  gatewayApiKeys?: ApiKey[];
  stats?: MerchantStats;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: any; label: string }
> = {
  PENDING: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
    icon: Clock,
    label: "Pending",
  },
  ACTIVE: {
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/20",
    icon: CheckCircle2,
    label: "Active",
  },
  SUSPENDED: {
    color: "text-red-600",
    bgColor: "bg-red-500/10 border-red-500/20",
    icon: Ban,
    label: "Suspended",
  },
  REJECTED: {
    color: "text-gray-600",
    bgColor: "bg-gray-500/10 border-gray-500/20",
    icon: XCircle,
    label: "Rejected",
  },
};

const VERIFICATION_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: any; label: string }
> = {
  UNVERIFIED: {
    color: "text-gray-500",
    bgColor: "bg-gray-500/10 border-gray-500/20",
    icon: ShieldX,
    label: "Unverified",
  },
  PENDING: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
    icon: ShieldAlert,
    label: "Pending Verification",
  },
  VERIFIED: {
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/20",
    icon: ShieldCheck,
    label: "Verified",
  },
};

const WALLET_ICONS: Record<string, any> = {
  FIAT: Banknote,
  SPOT: Coins,
  ECO: CircleDollarSign,
};

const WALLET_COLORS: Record<string, string> = {
  FIAT: "text-green-600",
  SPOT: "text-orange-600",
  ECO: "text-blue-600",
};

export default function AdminMerchantDetailsClient() {
  const params = useParams();
  const merchantId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<MerchantDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [mode, setMode] = useState<"LIVE" | "TEST">("LIVE");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (merchantId) {
      fetchMerchantDetails();
    }
  }, [merchantId, mode]);

  const fetchMerchantDetails = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await $fetch({
      url: `/api/admin/gateway/merchant/${merchantId}?mode=${mode}`,
      silent: true,
    });

    if (fetchError) {
      setError(fetchError || "Failed to load merchant details");
    } else if (data) {
      setMerchant(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleKeyExpanded = (keyId: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(keyId)) {
      newExpanded.delete(keyId);
    } else {
      newExpanded.add(keyId);
    }
    setExpandedKeys(newExpanded);
  };

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    const { error } = await $fetch({
      url: `/api/admin/gateway/merchant/${merchantId}/status`,
      method: "PUT",
      body: { status: newStatus },
    });

    if (error) {
      toast.error(typeof error === 'string' ? error : "Failed to update status");
    } else {
      toast.success("Status updated successfully");
      fetchMerchantDetails();
    }
    setActionLoading(false);
  };

  const handleVerify = async () => {
    setActionLoading(true);
    const { error } = await $fetch({
      url: `/api/admin/gateway/merchant/${merchantId}/verify`,
      method: "PUT",
      body: { verificationStatus: "VERIFIED" },
    });

    if (error) {
      toast.error(typeof error === 'string' ? error : "Failed to verify merchant");
    } else {
      toast.success("Merchant verified successfully");
      fetchMerchantDetails();
    }
    setActionLoading(false);
  };

  const isTestMode = mode === "TEST";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="space-y-6">
        <Link href="/admin/gateway/merchant">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Merchants
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Merchant not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[merchant.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  const verificationConfig =
    VERIFICATION_CONFIG[merchant.verificationStatus] ||
    VERIFICATION_CONFIG.UNVERIFIED;
  const VerificationIcon = verificationConfig.icon;

  const totalBalance =
    merchant.gatewayMerchantBalances?.reduce(
      (sum, b) => sum + b.available + b.pending,
      0
    ) || 0;
  const totalAvailable =
    merchant.gatewayMerchantBalances?.reduce((sum, b) => sum + b.available, 0) ||
    0;
  const totalPending =
    merchant.gatewayMerchantBalances?.reduce((sum, b) => sum + b.pending, 0) ||
    0;

  return (
    <div className={`container ${PAGE_PADDING} pt-20 space-y-6`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/admin/gateway/merchant">
            <Button variant="ghost" size="icon" className="shrink-0 mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-start gap-4">
            {merchant.logo ? (
              <img
                src={merchant.logo}
                alt={merchant.name}
                className="h-16 w-16 rounded-xl object-cover border-2 border-border shadow-lg"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-lg">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{merchant.name}</h1>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusConfig.bgColor}`}
                >
                  <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
                  <span className={statusConfig.color}>
                    {statusConfig.label}
                  </span>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${verificationConfig.bgColor}`}
                >
                  <VerificationIcon
                    className={`h-3.5 w-3.5 ${verificationConfig.color}`}
                  />
                  <span className={verificationConfig.color}>
                    {verificationConfig.label}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <code className="text-sm font-mono">@{merchant.slug}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(merchant.slug, "Slug")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {merchant.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  {merchant.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions + Mode Toggle */}
        <div className="flex items-center gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                isTestMode
                  ? "bg-yellow-500/20 text-yellow-600"
                  : "bg-green-500/20 text-green-600"
              }`}
            >
              {isTestMode ? (
                <TestTube className="h-3 w-3" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
              {isTestMode ? "Test" : "Live"}
            </div>
            <Switch
              checked={!isTestMode}
              onCheckedChange={(checked) => setMode(checked ? "LIVE" : "TEST")}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-yellow-500"
            />
          </div>

          {merchant.verificationStatus !== "VERIFIED" && (
            <Button
              variant="outline"
              onClick={handleVerify}
              disabled={actionLoading}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={actionLoading}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {merchant.status !== "ACTIVE" && (
                <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
                  <Play className="h-4 w-4 mr-2" />
                  Activate
                </DropdownMenuItem>
              )}
              {merchant.status === "ACTIVE" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("SUSPENDED")}
                  className="text-red-600"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend
                </DropdownMenuItem>
              )}
              {merchant.status === "SUSPENDED" && (
                <DropdownMenuItem onClick={() => handleStatusChange("ACTIVE")}>
                  <Play className="h-4 w-4 mr-2" />
                  Reactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => copyToClipboard(merchant.id, "Merchant ID")}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Merchant ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold text-green-600">
                  ${formatNumber(merchant.stats?.totalVolume || 0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payments</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(merchant.stats?.paymentCount || 0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-yellow-600">
                  ${formatNumber(totalAvailable)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Wallet className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Refunds</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(merchant.stats?.refundCount || 0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <RefreshCcw className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs for different sections */}
          <Tabs defaultValue="api-keys" className="space-y-6">
            <TabsList>
              <TabsTrigger value="api-keys">API Keys</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
            </TabsList>

            <TabsContent value="api-keys" className="space-y-6">
              {/* API Keys */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Keys ({mode})
                  </CardTitle>
                  <CardDescription>
                    {isTestMode ? "Test" : "Live"} mode API keys and their configurations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {merchant.gatewayApiKeys && merchant.gatewayApiKeys.length > 0 ? (
                    <div className="space-y-4">
                      {merchant.gatewayApiKeys.map((apiKey) => (
                        <Collapsible
                          key={apiKey.id}
                          open={expandedKeys.has(apiKey.id)}
                          onOpenChange={() => toggleKeyExpanded(apiKey.id)}
                        >
                          <div className="border rounded-lg">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg ${apiKey.status ? "bg-green-500/10" : "bg-gray-500/10"}`}>
                                    <Key className={`h-5 w-5 ${apiKey.status ? "text-green-600" : "text-gray-500"}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">{apiKey.name}</span>
                                      <Badge variant={apiKey.type === "SECRET" ? "destructive" : "secondary"}>
                                        {apiKey.type}
                                      </Badge>
                                      <Badge variant={apiKey.status ? "default" : "secondary"}>
                                        {apiKey.status ? "Active" : "Inactive"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <code className="text-xs text-muted-foreground font-mono">
                                        {apiKey.keyPrefix}...{apiKey.lastFourChars}
                                      </code>
                                    </div>
                                  </div>
                                </div>
                                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedKeys.has(apiKey.id) ? "rotate-180" : ""}`} />
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t p-4 space-y-4 bg-muted/20">
                                {/* URLs */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {apiKey.successUrl && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Success URL</p>
                                      <div className="flex items-center gap-2">
                                        <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <code className="text-xs truncate">{apiKey.successUrl}</code>
                                      </div>
                                    </div>
                                  )}
                                  {apiKey.cancelUrl && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Cancel URL</p>
                                      <div className="flex items-center gap-2">
                                        <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <code className="text-xs truncate">{apiKey.cancelUrl}</code>
                                      </div>
                                    </div>
                                  )}
                                  {apiKey.webhookUrl && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Webhook URL</p>
                                      <div className="flex items-center gap-2">
                                        <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <code className="text-xs truncate">{apiKey.webhookUrl}</code>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Allowed Wallet Types */}
                                {apiKey.allowedWalletTypes && Object.keys(apiKey.allowedWalletTypes).length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">Accepted Payment Methods</p>
                                    <div className="space-y-2">
                                      {Object.entries(apiKey.allowedWalletTypes).map(([walletType, config]) => {
                                        if (!config.enabled) return null;
                                        const WalletIcon = WALLET_ICONS[walletType] || Wallet;
                                        const walletColor = WALLET_COLORS[walletType] || "text-gray-600";
                                        return (
                                          <div key={walletType} className="flex items-center gap-3 p-2 rounded-lg bg-background border">
                                            <WalletIcon className={`h-4 w-4 ${walletColor}`} />
                                            <span className="font-medium text-sm">{walletType}</span>
                                            <div className="flex flex-wrap gap-1">
                                              {config.currencies.map((currency) => (
                                                <Badge key={currency} variant="outline" className="text-xs">
                                                  {currency}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* IP Whitelist */}
                                {apiKey.ipWhitelist && apiKey.ipWhitelist.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">IP Whitelist</p>
                                    <div className="flex flex-wrap gap-1">
                                      {apiKey.ipWhitelist.map((ip) => (
                                        <Badge key={ip} variant="outline" className="text-xs font-mono">
                                          {ip}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Permissions */}
                                {apiKey.permissions && apiKey.permissions.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">Permissions</p>
                                    <div className="flex flex-wrap gap-1">
                                      {apiKey.permissions.map((perm) => (
                                        <Badge key={perm} variant="secondary" className="text-xs">
                                          {perm}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Last Used & Expiry */}
                                <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2 border-t">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Created: {formatShortDate(apiKey.createdAt)}
                                  </div>
                                  {apiKey.lastUsedAt && (
                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      Last used: {formatShortDate(apiKey.lastUsedAt)}
                                      {apiKey.lastUsedIp && ` from ${apiKey.lastUsedIp}`}
                                    </div>
                                  )}
                                  {apiKey.expiresAt && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Expires: {formatShortDate(apiKey.expiresAt)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No {isTestMode ? "test" : "live"} API keys found</p>
                      <p className="text-sm">This merchant hasn't created any API keys for {mode.toLowerCase()} mode yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview" className="space-y-6">
              {/* Business Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-medium">{merchant.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${merchant.email}`} className="font-medium hover:underline">
                          {merchant.email}
                        </a>
                      </div>
                    </div>
                    {merchant.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{merchant.phone}</span>
                        </div>
                      </div>
                    )}
                    {merchant.website && (
                      <div>
                        <p className="text-sm text-muted-foreground">Website</p>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={merchant.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline flex items-center gap-1"
                          >
                            {merchant.website.replace(/^https?:\/\//, "")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {(merchant.address || merchant.city || merchant.country) && (
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="font-medium">
                            {merchant.address && <p>{merchant.address}</p>}
                            <p>
                              {[merchant.city, merchant.state, merchant.postalCode]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            {merchant.country && <p>{merchant.country}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatShortDate(merchant.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Transaction Limits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Per Transaction</p>
                        <span className="font-medium">${merchant.transactionLimit.toLocaleString()}</span>
                      </div>
                      <Progress value={30} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Daily Limit</p>
                        <span className="font-medium">${merchant.dailyLimit.toLocaleString()}</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Monthly Limit</p>
                        <span className="font-medium">${merchant.monthlyLimit.toLocaleString()}</span>
                      </div>
                      <Progress value={25} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Merchant Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Fees & Payout Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Fee Structure</p>
                      <p className="font-medium mt-1">
                        {merchant.feePercentage}%
                        {merchant.feeFixed > 0 && ` + $${merchant.feeFixed.toFixed(2)}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payout Schedule</p>
                      <Badge variant="outline" className="mt-1">{merchant.payoutSchedule}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payout Threshold</p>
                      <p className="font-medium mt-1">${merchant.payoutThreshold.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balances" className="space-y-6">
              {/* Balance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Balance Summary
                  </CardTitle>
                  <CardDescription>Total balance across all wallet types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="text-2xl font-bold text-green-600">${totalAvailable.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">${totalPending.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-sm text-muted-foreground">Total Balance</p>
                      <p className="text-2xl font-bold text-blue-600">${totalBalance.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Balance by Wallet Type */}
                  {merchant.gatewayMerchantBalances && merchant.gatewayMerchantBalances.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-medium">By Wallet Type</h4>
                      {merchant.gatewayMerchantBalances.map((balance) => {
                        const WalletIcon = WALLET_ICONS[balance.walletType] || Wallet;
                        const walletColor = WALLET_COLORS[balance.walletType] || "text-gray-600";
                        return (
                          <div
                            key={balance.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-background">
                                <WalletIcon className={`h-5 w-5 ${walletColor}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{balance.walletType} Wallet</span>
                                  <Badge variant="outline">{balance.currency}</Badge>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                  <span>Received: ${balance.totalReceived.toLocaleString()}</span>
                                  <span>Fees: ${balance.totalFees.toLocaleString()}</span>
                                  <span>Paid Out: ${balance.totalPaidOut.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">${balance.available.toLocaleString()} {balance.currency}</p>
                              {balance.pending > 0 && (
                                <p className="text-sm text-yellow-600">+${balance.pending.toLocaleString()} pending</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No balance records found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Account Owner */}
          {merchant.user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Account Owner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={merchant.user.avatar} alt={merchant.user.firstName} />
                    <AvatarFallback>
                      {merchant.user.firstName?.[0]}
                      {merchant.user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {merchant.user.firstName} {merchant.user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{merchant.user.email}</p>
                  </div>
                </div>
                <Link href={`/admin/user/${merchant.user.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View User Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Quick Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className={`inline-flex items-center gap-1.5 mt-1 ${statusConfig.color}`}>
                  <StatusIcon className="h-4 w-4" />
                  <span className="font-medium">{statusConfig.label}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verification</p>
                <div className={`inline-flex items-center gap-1.5 mt-1 ${verificationConfig.color}`}>
                  <VerificationIcon className="h-4 w-4" />
                  <span className="font-medium">{verificationConfig.label}</span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatShortDate(merchant.createdAt)}</p>
              </div>
              {merchant.updatedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatShortDate(merchant.updatedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Link href={`/admin/gateway/payment?merchantId=${merchant.id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Payments
                </Button>
              </Link>
              <Link href={`/admin/gateway/payout?merchantId=${merchant.id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Wallet className="h-4 w-4 mr-2" />
                  View Payouts
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => copyToClipboard(merchant.id, "Merchant ID")}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Merchant ID
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const data = JSON.stringify(merchant, null, 2);
                  copyToClipboard(data, "Merchant data");
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
