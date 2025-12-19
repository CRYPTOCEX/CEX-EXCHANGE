"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Coins,
  Copy,
  CreditCard,
  DollarSign,
  FileText,
  Hash,
  Info,
  Receipt,
  RefreshCcw,
  TrendingUp,
  Wallet,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface PayoutPayment {
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
}

interface PayoutRefund {
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
}

interface PayoutDetail {
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
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  payments?: PayoutPayment[];
  refunds?: PayoutRefund[];
}

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  PENDING: { color: "text-yellow-600", bgColor: "bg-yellow-500/10 border-yellow-500/20", icon: Clock, label: "Pending" },
  PROCESSING: { color: "text-blue-600", bgColor: "bg-blue-500/10 border-blue-500/20", icon: RefreshCcw, label: "Processing" },
  COMPLETED: { color: "text-green-600", bgColor: "bg-green-500/10 border-green-500/20", icon: CheckCircle2, label: "Completed" },
  FAILED: { color: "text-red-600", bgColor: "bg-red-500/10 border-red-500/20", icon: XCircle, label: "Failed" },
  CANCELLED: { color: "text-gray-600", bgColor: "bg-gray-500/10 border-gray-500/20", icon: XCircle, label: "Cancelled" },
};

const WALLET_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  FIAT: { label: "Fiat Wallet", icon: Banknote, color: "text-green-600" },
  SPOT: { label: "Spot Wallet", icon: Coins, color: "text-orange-600" },
  ECO: { label: "Ecosystem Wallet", icon: CircleDollarSign, color: "text-blue-600" },
};

export default function PayoutDetailClient() {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const params = useParams();
  const payoutId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [payout, setPayout] = useState<PayoutDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payoutId) {
      fetchPayoutDetails();
    }
  }, [payoutId]);

  const fetchPayoutDetails = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await $fetch({
      url: `/api/gateway/payout/${payoutId}`,
      silent: true,
    });

    if (fetchError) {
      setError(fetchError || "Failed to load payout details");
    } else if (data) {
      setPayout(data);
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
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) {
    return (
      <div className="space-y-6 pt-16">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
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

  if (error || !payout) {
    return (
      <div className="space-y-6">
        <Link href="/gateway/payouts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back_to_payouts")}
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Payout not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[payout.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  const walletConfig = WALLET_CONFIG[payout.walletType] || WALLET_CONFIG.FIAT;
  const WalletIcon = walletConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/gateway/payouts">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{tExt("payout_details")}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm text-muted-foreground font-mono">{payout.id}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(payout.id, "Payout ID")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${statusConfig.bgColor}`}>
          <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
          <span className={`font-semibold ${statusConfig.color}`}>{statusConfig.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Hero Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("net_payout_amount")}</p>
                    <p className="text-3xl font-bold">{formatCurrency(payout.netAmount, payout.currency)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <WalletIcon className="h-4 w-4" />
                    <span className="text-sm">{walletConfig.label}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-xs">Gross</span>
                  </div>
                  <p className="text-lg font-semibold">{formatCurrency(payout.grossAmount, payout.currency)}</p>
                </div>
                <div className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Receipt className="h-4 w-4" />
                    <span className="text-xs">Fees</span>
                  </div>
                  <p className="text-lg font-semibold text-orange-600">-{formatCurrency(payout.feeAmount, payout.currency)}</p>
                </div>
                <div className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-green-500/20">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-xs">Net</span>
                  </div>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(payout.netAmount, payout.currency)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Period & Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {tExt("payout_period")}
              </CardTitle>
              <CardDescription>
                {t("summary_of_transactions_included_in_this_payout")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{tCommon("period_start")}</p>
                    <p className="font-medium">{formatDate(payout.periodStart)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{tCommon("period_end")}</p>
                    <p className="font-medium">{formatDate(payout.periodEnd)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm font-medium">Payments</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{payout.paymentCount}</p>
                  </div>
                  {payout.refundCount > 0 && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-2 text-red-600 mb-1">
                        <RefreshCcw className="h-4 w-4" />
                        <span className="text-sm font-medium">Refunds</span>
                      </div>
                      <p className="text-2xl font-bold text-red-600">{payout.refundCount}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Info */}
          {payout.status === "PENDING" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t("this_payout_is_pending_approval_and")} {t("once_approved_funds_will_be_transferred_to_your")} {walletConfig.label.toLowerCase()}.
              </AlertDescription>
            </Alert>
          )}

          {payout.status === "PROCESSING" && (
            <Alert className="border-blue-500/20 bg-blue-500/5">
              <RefreshCcw className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                {t("this_payout_is_currently_being_processed")} {t("funds_will_be_available_in_your_wallet_shortly")}
              </AlertDescription>
            </Alert>
          )}

          {payout.status === "COMPLETED" && (
            <Alert className="border-green-500/20 bg-green-500/5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                {t("this_payout_has_been_completed_successfully")} {walletConfig.label.toLowerCase()}.
              </AlertDescription>
            </Alert>
          )}

          {payout.status === "FAILED" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {t("this_payout_failed_to_process_please")}
              </AlertDescription>
            </Alert>
          )}

          {/* Included Payments */}
          {payout.payments && payout.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t("included_payments")}
                </CardTitle>
                <CardDescription>
                  {t("payments_processed_during_this_payout_period")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payout.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <ArrowDownRight className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <code className="text-sm font-mono">{payment.id.slice(-12)}</code>
                          <p className="text-xs text-muted-foreground">{formatDateTime(payment.createdAt)}</p>
                        </div>
                      </div>
                      <p className="font-medium text-green-600">+{formatCurrency(payment.amount, payment.currency)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Included Refunds */}
          {payout.refunds && payout.refunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCcw className="h-5 w-5" />
                  {tExt("refunds_deducted")}
                </CardTitle>
                <CardDescription>
                  {t("refunds_processed_during_this_payout_period")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payout.refunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <ArrowUpRight className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <code className="text-sm font-mono">{refund.id.slice(-12)}</code>
                          <p className="text-xs text-muted-foreground">{formatDateTime(refund.createdAt)}</p>
                        </div>
                      </div>
                      <p className="font-medium text-red-600">-{formatCurrency(refund.amount, refund.currency)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payout Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" />
                {tCommon("payout_information")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{tExt("payout_id")}</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm">{payout.id}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(payout.id, "Payout ID")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">{tCommon("wallet_type")}</p>
                <div className="flex items-center gap-2 mt-1">
                  <WalletIcon className={`h-4 w-4 ${walletConfig.color}`} />
                  <span className="font-medium">{walletConfig.label}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Currency</p>
                <p className="font-medium">{payout.currency}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-full bg-blue-500/10">
                    <Clock className="h-3 w-3 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(payout.createdAt)}</p>
                  </div>
                </div>

                {payout.status === "COMPLETED" && payout.updatedAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(payout.updatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tCommon("quick_actions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => copyToClipboard(payout.id, "Payout ID")}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t("copy_payout_id")}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const data = JSON.stringify(payout, null, 2);
                  copyToClipboard(data, "Payout data");
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                {tCommon("export_as_json")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
