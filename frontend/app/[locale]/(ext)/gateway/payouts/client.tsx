"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PayoutsLoading from "./loading";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Eye,
  Info,
  RefreshCcw,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { useMerchantMode } from "../context/merchant-mode";
import { useTranslations } from "next-intl";
import { PayoutHero } from "./components/payout-hero";

interface Balance {
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

interface Payout {
  id: string;
  amount: number;
  currency: string;
  walletType: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  paymentCount: number;
  refundCount: number;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  PENDING: { color: "text-yellow-600", bgColor: "bg-yellow-500/10 border-yellow-500/20", icon: Clock, label: "Pending" },
  PROCESSING: { color: "text-blue-600", bgColor: "bg-blue-500/10 border-blue-500/20", icon: RefreshCcw, label: "Processing" },
  COMPLETED: { color: "text-green-600", bgColor: "bg-green-500/10 border-green-500/20", icon: CheckCircle2, label: "Completed" },
  FAILED: { color: "text-red-600", bgColor: "bg-red-500/10 border-red-500/20", icon: XCircle, label: "Failed" },
  CANCELLED: { color: "text-gray-600", bgColor: "bg-gray-500/10 border-gray-500/20", icon: XCircle, label: "Cancelled" },
};

const WALLET_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  FIAT: { label: "Fiat", icon: Banknote, color: "text-green-600" },
  SPOT: { label: "Spot", icon: Coins, color: "text-orange-600" },
  ECO: { label: "Ecosystem", icon: CircleDollarSign, color: "text-blue-600" },
};

export default function PayoutsClient() {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const { mode } = useMerchantMode();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchData();
  }, [mode]);

  const fetchData = async () => {
    setLoading(true);

    // Check merchant first
    const merchantRes = await $fetch({
      url: "/api/gateway/merchant",
      silent: true,
    });

    if (merchantRes.error || !merchantRes.data?.merchant) {
      setNeedsRegistration(true);
      setLoading(false);
      return;
    }

    // Fetch balances and payouts in parallel
    const [balancesRes, payoutsRes] = await Promise.all([
      $fetch({ url: "/api/gateway/merchant/balance", silent: true }),
      $fetch({ url: "/api/gateway/payout", silent: true }),
    ]);

    if (balancesRes.data) {
      setBalances(balancesRes.data.balances || balancesRes.data || []);
    }

    if (payoutsRes.data) {
      setPayouts(payoutsRes.data.items || payoutsRes.data || []);
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number, currency: string, decimals = 2) => {
    return `${amount.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: Math.max(decimals, 8)
    })} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // Calculate totals
  const totalAvailable = balances.reduce((sum, b) => sum + b.available, 0);
  const totalPending = balances.reduce((sum, b) => sum + b.pending, 0);
  const totalPaidOut = balances.reduce((sum, b) => sum + b.totalPaidOut, 0);

  // Filter payouts by status
  const filteredPayouts = activeTab === "all"
    ? payouts
    : payouts.filter(p => p.status === activeTab.toUpperCase());

  if (loading) {
    return <PayoutsLoading />;
  }

  if (needsRegistration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="p-6 rounded-full bg-primary/10">
          <CreditCard className="h-16 w-16 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{t("become_a_merchant")}</h1>
          <p className="text-muted-foreground max-w-md">
            {t("register_as_a_payment_gateway_merchant_1")}
          </p>
        </div>
        <Link href="/gateway/register">
          <Button size="lg">{t("register_as_merchant")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hero Section */}
      <PayoutHero
        rightContent={
          <Button variant="outline" onClick={fetchData}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
        bottomSlot={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-linear-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tCommon("available_balance")}</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${totalAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t("ready_for_payout")}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Wallet className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border-yellow-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("pending_balance")}</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{t("processing_payments")}</p>
                  </div>
                  <div className="p-3 rounded-full bg-yellow-500/10">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("total_paid_out")}</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{tCommon("all_time")}</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        }
      />

      <div className="container mx-auto space-y-6 pb-6 pt-8">

      {/* Balance Breakdown by Wallet Type */}
      {balances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("balance_by_wallet")}
            </CardTitle>
            <CardDescription>{t("your_balance_breakdown_across_different_wallet")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {balances.map((balance) => {
                const walletConfig = WALLET_CONFIG[balance.walletType] || WALLET_CONFIG.FIAT;
                const WalletIcon = walletConfig.icon;

                return (
                  <div
                    key={balance.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg bg-background`}>
                        <WalletIcon className={`h-5 w-5 ${walletConfig.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{walletConfig.label} Wallet</span>
                          <Badge variant="outline">{balance.currency}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{t("received")}: {formatCurrency(balance.totalReceived, balance.currency)}</span>
                          <span>{tCommon("fees")}: {formatCurrency(balance.totalFees, balance.currency)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(balance.available, balance.currency)}</p>
                      {balance.pending > 0 && (
                        <p className="text-sm text-yellow-600">
                          +{formatCurrency(balance.pending, balance.currency)} pending
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Schedule Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t("payouts_are_processed_automatically_based_on")} {t("available_balance_is_transferred_to_your")}
        </AlertDescription>
      </Alert>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("payout_history")}
          </CardTitle>
          <CardDescription>{t("your_past_and_pending_payouts")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {filteredPayouts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">{t("no_payouts_found")}</p>
                  <p className="text-sm">
                    {activeTab === "all"
                      ? "Payouts will appear here once you start receiving payments."
                      : `No ${activeTab} payouts at the moment.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPayouts.map((payout) => {
                    const statusConfig = STATUS_CONFIG[payout.status] || STATUS_CONFIG.PENDING;
                    const StatusIcon = statusConfig.icon;
                    const walletConfig = WALLET_CONFIG[payout.walletType] || WALLET_CONFIG.FIAT;
                    const WalletIcon = walletConfig.icon;

                    return (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${statusConfig.bgColor} border`}>
                            <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{`${t("payout")} #`}{payout.id.slice(-8)}</span>
                              <Badge variant="outline" className={statusConfig.bgColor}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateRange(payout.periodStart, payout.periodEnd)}
                              </span>
                              <span className="flex items-center gap-1">
                                <WalletIcon className="h-3 w-3" />
                                {walletConfig.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{payout.paymentCount} payments</span>
                              {payout.refundCount > 0 && (
                                <span className="text-red-500">{payout.refundCount} refunds</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(payout.netAmount, payout.currency)}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{t("gross")}: {formatCurrency(payout.grossAmount, payout.currency)}</span>
                              <span className="text-red-500">-{formatCurrency(payout.feeAmount, payout.currency)}</span>
                            </div>
                          </div>
                          <Link href={`/gateway/payouts/${payout.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
