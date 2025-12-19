"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GatewayDashboardLoading from "./loading";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Key,
  Settings,
  FileText,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Banknote,
  Coins,
  CircleDollarSign,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import $fetch from "@/lib/api";
import { useMerchantMode } from "../context/merchant-mode";
import { GatewayDashboardHero } from "./components/dashboard-hero";
import { PremiumStats } from "./components/premium-stats";

interface MerchantDashboard {
  merchant: {
    id: string;
    name: string;
    slug: string;
    email: string;
    logo?: string;
    status: string;
    verificationStatus: string;
    testMode: boolean;
    createdAt: string;
  };
  balances: Array<{
    currency: string;
    walletType: string;
    available: number;
    pending: number;
    reserved: number;
  }>;
  stats: {
    last30Days: {
      paymentCount: number;
      totalAmount: number;
      totalRefunded: number;
      totalFees: number;
      totalNet: number;
    };
    pendingRefunds: number;
  };
  recentPayments: Array<{
    id: string;
    orderId?: string;
    amount: number;
    currency: string;
    walletType: string;
    feeAmount: number;
    description?: string;
    status: string;
    customer?: {
      name: string;
      email: string;
      avatar?: string;
    };
    createdAt: string;
  }>;
  mode: "LIVE" | "TEST";
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  ACTIVE: "bg-green-500",
  SUSPENDED: "bg-red-500",
  REJECTED: "bg-gray-500",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500",
  CANCELLED: "bg-gray-500",
};

const STATUS_CONFIG: Record<
  string,
  { color: string; bgColor: string; icon: any; label: string }
> = {
  COMPLETED: {
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/20",
    icon: CheckCircle,
    label: "Completed",
  },
  PENDING: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
    icon: Clock,
    label: "Pending",
  },
  PROCESSING: {
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    icon: Clock,
    label: "Processing",
  },
  FAILED: {
    color: "text-red-600",
    bgColor: "bg-red-500/10 border-red-500/20",
    icon: XCircle,
    label: "Failed",
  },
  CANCELLED: {
    color: "text-gray-600",
    bgColor: "bg-gray-500/10 border-gray-500/20",
    icon: XCircle,
    label: "Cancelled",
  },
  EXPIRED: {
    color: "text-gray-500",
    bgColor: "bg-gray-500/10 border-gray-500/20",
    icon: AlertCircle,
    label: "Expired",
  },
  REFUNDED: {
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    icon: RefreshCcw,
    label: "Refunded",
  },
  PARTIALLY_REFUNDED: {
    color: "text-orange-600",
    bgColor: "bg-orange-500/10 border-orange-500/20",
    icon: RefreshCcw,
    label: "Partially Refunded",
  },
};

const WALLET_ICONS: Record<string, any> = {
  FIAT: Banknote,
  SPOT: Coins,
  ECO: CircleDollarSign,
};

const WALLET_COLORS: Record<string, string> = {
  FIAT: "text-green-600 bg-green-500/10",
  SPOT: "text-orange-600 bg-orange-500/10",
  ECO: "text-blue-600 bg-blue-500/10",
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function MerchantDashboardClient() {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { mode, isTestMode } = useMerchantMode();
  const [dashboard, setDashboard] = useState<MerchantDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, [mode]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await $fetch({
        url: `/api/gateway/merchant?mode=${mode}`,
        silent: true,
      });

      if (fetchError || !data?.merchant) {
        setNeedsRegistration(true);
        return;
      }

      setDashboard(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <GatewayDashboardLoading />;
  }

  if (needsRegistration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 pt-20">
        <div className="p-6 rounded-full bg-primary/10">
          <CreditCard className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t("become_a_merchant")}</h1>
          <p className="text-muted-foreground max-w-md">
            {t("register_as_a_payment_gateway_merchant")}
          </p>
        </div>
        <Link href="/gateway/register">
          <Button size="lg">{t("register_as_merchant")}</Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <h2 className="text-xl font-semibold">{tCommon('error_loading_dashboard')}</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchDashboard}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const totalBalance = dashboard?.balances.reduce((sum, b) => sum + b.available, 0) || 0;

  // Calculate stats for hero
  const totalPayments = dashboard?.stats.last30Days.paymentCount || 0;
  const totalRevenue = dashboard?.stats.last30Days.totalNet || 0;
  const pendingAmount = dashboard?.balances.reduce((sum, b) => sum + b.pending, 0) || 0;
  const successRate = totalPayments > 0
    ? Math.round(((totalPayments - (dashboard?.stats.pendingRefunds || 0)) / totalPayments) * 100)
    : 0;

  return (
    <div className="w-full">
      {/* Hero Section */}
      <GatewayDashboardHero
        totalPayments={totalPayments}
        totalRevenue={totalRevenue}
        pendingAmount={pendingAmount}
        successRate={successRate}
        merchantStatus={dashboard?.merchant.status || "PENDING"}
        rightContent={
          <div className="flex gap-2">
            <Link href="/gateway/settings">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            <Link href="/gateway/settings?tab=api-keys">
              <Button variant="outline">
                <Key className="h-4 w-4 mr-2" />
                API Keys
              </Button>
            </Link>
          </div>
        }
        bottomSlot={
          <PremiumStats
            availableBalance={totalBalance}
            currencyCount={dashboard?.balances.length || 0}
            payments30d={dashboard?.stats.last30Days.paymentCount || 0}
            totalAmount30d={dashboard?.stats.last30Days.totalAmount || 0}
            netRevenue30d={dashboard?.stats.last30Days.totalNet || 0}
            fees30d={dashboard?.stats.last30Days.totalFees || 0}
            pendingRefunds={dashboard?.stats.pendingRefunds || 0}
          />
        }
      />

      <div className="container mx-auto space-y-6 pb-6 pt-8">

      {/* Status Warning */}
      {dashboard?.merchant.status === "PENDING" && (
        <Card className="border-yellow-500 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-600">{t("account_pending_approval")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("your_merchant_account_is_pending_approval")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Recent Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{tExt("recent_payments")}</CardTitle>
            <CardDescription>{t("your_latest_payment_transactions")}</CardDescription>
          </div>
          <Link href="/gateway/payment">
            <Button variant="outline" size="sm">
              {tCommon("view_all")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {dashboard?.recentPayments && dashboard.recentPayments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {dashboard.recentPayments.map((payment) => {
                const statusConfig =
                  STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusConfig.icon;
                const WalletIcon = WALLET_ICONS[payment.walletType] || Wallet;
                const walletColor =
                  WALLET_COLORS[payment.walletType] || "text-gray-600 bg-gray-500/10";

                return (
                  <Link
                    key={payment.id}
                    href={`/gateway/payment/${payment.id}`}
                  >
                    <div className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all cursor-pointer">
                      {/* Status Indicator */}
                      <div
                        className={`p-2 rounded-lg ${statusConfig.bgColor} border`}
                      >
                        <StatusIcon
                          className={`h-5 w-5 ${statusConfig.color}`}
                        />
                      </div>

                      {/* Payment Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-lg">
                            {payment.amount.toFixed(2)} {payment.currency}
                          </span>
                          <Badge
                            variant="outline"
                            className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                          >
                            {statusConfig.label}
                          </Badge>
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${walletColor}`}
                          >
                            <WalletIcon className="h-3 w-3" />
                            {payment.walletType}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {payment.id}
                          </code>
                          {payment.description && (
                            <span className="truncate max-w-[200px]">
                              {payment.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Customer */}
                      {payment.customer && (
                        <div className="hidden md:flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={payment.customer.avatar}
                              alt={payment.customer.name}
                            />
                            <AvatarFallback>
                              {payment.customer.name?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-right">
                            <p className="text-sm font-medium truncate max-w-[120px]">
                              {payment.customer.name || "Guest"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Customer
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Fee & Time */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-muted-foreground">
                          {tExt("fee_1")}{payment.feeAmount?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(payment.createdAt)}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <CreditCard className="h-12 w-12 opacity-50" />
              </div>
              <p className="font-medium">{tExt("no_payments_yet")}</p>
              <p className="text-sm mt-1">
                {t("payments_will_appear_here_once_you")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      </div>
    </div>
  );
}
