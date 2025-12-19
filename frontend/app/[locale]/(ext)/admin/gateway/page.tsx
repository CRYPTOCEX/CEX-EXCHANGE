"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import {
  Store,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowRight,
  Banknote,
  Coins,
  CircleDollarSign,
  Wallet,
  AlertCircle,
  Building2,
  User,
  ExternalLink,
  RefreshCcw,
} from "lucide-react";
import $fetch from "@/lib/api";
import { useAdminGatewayMode } from "./context/admin-gateway-mode";
import { useTranslations } from "next-intl";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

interface DashboardStats {
  mode: "LIVE" | "TEST";
  merchants: {
    total: number;
    active: number;
    pending: number;
  };
  payments: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    refunded: number;
    partiallyRefunded: number;
    totalVolume: number;
    totalRefunded: number;
    netVolume: number;
    totalFees: number;
  };
  payouts: {
    pending: number;
    pendingAmount: number;
  };
  recentPayments: Array<{
    id: string;
    amount: number;
    currency: string;
    walletType: string;
    status: string;
    feeAmount: number;
    description?: string;
    merchantId: string;
    merchantName: string;
    merchantLogo?: string;
    customer?: {
      name: string;
      email: string;
      avatar?: string;
    };
    createdAt: string;
  }>;
}

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

export default function GatewayAdminDashboard() {
  const t = useTranslations("ext_admin");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const { mode } = useAdminGatewayMode();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, [mode]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await $fetch({
        url: `/api/admin/gateway/stats?mode=${mode}`,
        silent: true,
      });

      if (!error && data) {
        setStats(data);
      }
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("payment_gateway")}</h1>
          <p className="text-muted-foreground">
            {t("overview_of_your_payment_gateway")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className={`container ${PAGE_PADDING} pt-20 space-y-6`}>
      <div>
        <h1 className="text-2xl font-bold">{t("payment_gateway")}</h1>
        <p className="text-muted-foreground">
          {t("overview_of_your_payment_gateway")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("total_merchants")}
            </CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.merchants.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.merchants.active || 0} {tCommon("active")},{" "}
              {stats?.merchants.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("total_payments")}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.payments.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.payments.completed || 0} {tCommon("completed")},{" "}
              {stats?.payments.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("net_volume")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.payments.netVolume || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(stats?.payments.totalFees || 0).toLocaleString()} fees
              {(stats?.payments.totalRefunded || 0) > 0 && (
                <>, ${(stats?.payments.totalRefunded || 0).toLocaleString()} refunded</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("pending_payouts")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.payouts.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              ${(stats?.payouts.pendingAmount || 0).toLocaleString()} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/gateway/merchant">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardContent className="h-full flex items-center py-6">
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{t("manage_merchants")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("review_and_approve_merchant_accounts")}
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/gateway/payment">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardContent className="h-full flex items-center py-6">
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{t("view_payments")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("monitor_all_gateway_transactions")}
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/gateway/payout">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardContent className="h-full flex items-center py-6">
              <div className="flex items-center gap-4 w-full">
                <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{t("process_payouts")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("manage_merchant_payouts")}
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Payments - Redesigned */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{tExt("recent_payments")}</CardTitle>
            <CardDescription>
              {t("latest_payment_transactions_across_all_merchants")}
            </CardDescription>
          </div>
          <Link href="/admin/gateway/payment">
            <Button variant="outline" size="sm">
              {tCommon("view_all")}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {stats?.recentPayments && stats.recentPayments.length > 0 ? (
            <div className="flex flex-col gap-3">
              {stats.recentPayments.map((payment) => {
                const statusConfig =
                  STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
                const StatusIcon = statusConfig.icon;
                const WalletIcon = WALLET_ICONS[payment.walletType] || Wallet;
                const walletColor =
                  WALLET_COLORS[payment.walletType] || "text-gray-600 bg-gray-500/10";

                return (
                  <Link
                    key={payment.id}
                    href={`/admin/gateway/payment/${payment.id}`}
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

                      {/* Merchant & Customer */}
                      <div className="hidden md:flex items-center gap-6">
                        {/* Merchant */}
                        <div className="flex items-center gap-2">
                          {payment.merchantLogo ? (
                            <img
                              src={payment.merchantLogo}
                              alt={payment.merchantName}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className="text-right">
                            <p className="text-sm font-medium truncate max-w-[120px]">
                              {payment.merchantName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Merchant
                            </p>
                          </div>
                        </div>

                        {/* Customer */}
                        {payment.customer && (
                          <div className="flex items-center gap-2">
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
                      </div>

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
                {t("payments_will_appear_here_once_merchants")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
