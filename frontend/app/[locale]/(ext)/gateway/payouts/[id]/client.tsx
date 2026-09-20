"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Loadable } from "@/components/ui/skeleton";
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
import { statusTone } from "@/lib/status-tone";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAddonDisplayName } from "@/hooks/use-addon-display-name";
import { MoneyFigure } from "@/components/ui/money-figure";

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

/**
 * Icon + label only; the hue comes from `statusTone()`. Decided locally before,
 * and it disagreed with the shared table on two of five: `PROCESSING` wore the
 * accent (R2 reserves it for things you click) and `CANCELLED` was grey where
 * the platform says destructive.
 */
const STATUS_CONFIG: Record<string, { icon: any; label: string }> = {
  PENDING: { icon: Clock, label: "Pending" },
  PROCESSING: { icon: RefreshCcw, label: "Processing" },
  COMPLETED: { icon: CheckCircle2, label: "Completed" },
  FAILED: { icon: XCircle, label: "Failed" },
  CANCELLED: { icon: XCircle, label: "Cancelled" },
};

/** The `soft` chip recipe, for the status chips that are not Badges. */
const TONE_SURFACE: Record<BadgeTone, string> = {
  primary: "bg-primary/10 border-primary/20",
  secondary: "bg-secondary border-transparent",
  success: "bg-success/10 border-success/20",
  warning: "bg-warning/10 border-warning/20",
  destructive: "bg-destructive/10 border-destructive/20",
  info: "bg-info/10 border-info/20",
  neutral: "bg-muted border-transparent",
};

const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary-ink",
  secondary: "text-secondary-foreground",
  success: "text-success-ink",
  warning: "text-warning-ink",
  destructive: "text-destructive-ink",
  info: "text-info-ink",
  neutral: "text-muted-foreground",
};

const DEFAULT_WALLET_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  FIAT: { label: "Fiat Wallet", icon: Banknote, color: "text-success" },
  SPOT: { label: "Spot Wallet", icon: Coins, color: "text-warning" },
  ECO: { label: "Ecosystem Wallet", icon: CircleDollarSign, color: "text-primary" },
};

export default function PayoutDetailClient() {
  const t = useTranslations("ext_gateway");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const params = useParams();
  const payoutId = params.id as string;
  const { getWalletTypeLabel } = useAddonDisplayName();

  const WALLET_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
    FIAT: { ...DEFAULT_WALLET_CONFIG.FIAT },
    SPOT: { ...DEFAULT_WALLET_CONFIG.SPOT },
    ECO: { ...DEFAULT_WALLET_CONFIG.ECO, label: getWalletTypeLabel("ECO", "Ecosystem") + tCommon("wallet") },
  };

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
      setError(fetchError || t("failed_to_load_payout_details"));
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
    toast.success(tExt("copied_to_clipboard", { label: String(label) }));
  };

  /**
   * The `if (loading)` block that used to stand here drew six grey rectangles
   * in the page's grid — `h-48`, `h-64`, then two more `h-48` — and swapped the
   * whole page for them.
   *
   * Three things were wrong with it beyond it being a second tree: it was
   * `pt-header` where the real page has no top padding, so the entire layout
   * jumped vertically the moment the data landed; its heights were guesses that
   * no longer match the cards they stood for; and it withheld a page that is
   * mostly literals — "Payout Details", "Gross"/"Fees"/"Net", "Timeline",
   * "Quick Actions", "Copy payout ID" — none of which needs the fetch.
   *
   * `error || !payout` now needs the `!loading` guard: `!payout` is also true
   * while the request is in flight, so without it every visit to this page
   * would read "Payout not found" until the response arrived.
   */
  if (!loading && (error || !payout)) {
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
          <AlertDescription>{error || tExt("payout_not_found")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[payout?.status ?? ""] || STATUS_CONFIG.PENDING;
  /* Neutral while pending — a status chip is a claim about the payout, and
     falling back to PENDING paints a real, possibly wrong one. */
  const tone = loading ? ("neutral" as BadgeTone) : statusTone(payout!.status);
  const StatusIcon = loading ? Clock : statusConfig.icon;
  const walletConfig = (payout && WALLET_CONFIG[payout.walletType]) || WALLET_CONFIG.FIAT;
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
              <code className="text-sm text-muted-foreground font-mono">
                <Loadable loading={loading} chars={24}>
                  {payout?.id}
                </Loadable>
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={loading}
                onClick={() => payout && copyToClipboard(payout.id, "Payout ID")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${TONE_SURFACE[tone]}`}>
          <StatusIcon className={`h-5 w-5 ${TONE_INK[tone]}`} />
          <span className={`font-semibold ${TONE_INK[tone]}`}>
            <Loadable loading={loading} placeholder="Completed">
              {statusConfig.label}
            </Loadable>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Hero Card */}
          <Card className="overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                    <DollarSign className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("net_payout_amount")}</p>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground"><MoneyFigure loading={loading} figurePlaceholder="1,234.00" value={formatCurrency(payout?.netAmount ?? 0, payout?.currency ?? "USD")} /></p>
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
                <div className="p-4 rounded-lg bg-surface-3 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-xs font-medium">Gross</span>
                  </div>
                  <p className="text-lg font-semibold leading-tight tracking-tight text-foreground"><MoneyFigure loading={loading} figurePlaceholder="1,234.00" value={formatCurrency(payout?.grossAmount ?? 0, payout?.currency ?? "USD")} /></p>
                </div>
                <div className="p-4 rounded-lg bg-surface-3 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Receipt className="h-4 w-4" />
                    <span className="text-xs font-medium">Fees</span>
                  </div>
                  <p className="text-lg font-semibold leading-tight tracking-tight text-warning"><MoneyFigure loading={loading} figurePlaceholder="12.00" value={`-${formatCurrency(payout?.feeAmount ?? 0, payout?.currency ?? "USD")}`} /></p>
                </div>
                <div className="p-4 rounded-lg bg-surface-3 border border-success/20">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-xs font-medium">Net</span>
                  </div>
                  <p className="text-lg font-semibold leading-tight tracking-tight text-success"><MoneyFigure loading={loading} figurePlaceholder="1,222.00" value={formatCurrency(payout?.netAmount ?? 0, payout?.currency ?? "USD")} /></p>
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
                    <p className="text-xs font-medium text-muted-foreground">{tCommon("period_start")}</p>
                    <p className="font-medium"><Loadable loading={loading} placeholder={tCommon("january_1") + " 2026"}>{payout ? formatDate(payout.periodStart) : null}</Loadable></p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{tCommon("period_end")}</p>
                    <p className="font-medium"><Loadable loading={loading} placeholder={t("january_31") + " 2026"}>{payout ? formatDate(payout.periodEnd) : null}</Loadable></p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 text-success mb-1">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-xs font-medium">Payments</span>
                    </div>
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums"><Loadable loading={loading} chars={3}>{payout?.paymentCount}</Loadable></p>
                  </div>
                  {/* Gated on the DATA, not on `!loading`: a refunds tile only
                      exists for a payout that has refunds, so reserving it for
                      every payout would trade one shift for a more common
                      one. */}
                  {payout && payout.refundCount > 0 && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2 text-destructive mb-1">
                        <RefreshCcw className="h-4 w-4" />
                        <span className="text-xs font-medium">Refunds</span>
                      </div>
                      <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">{payout!.refundCount}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Info */}
          {payout?.status === "PENDING" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t("this_payout_is_pending_approval_and")} {t("once_approved_funds_will_be_transferred_to_your")} {walletConfig.label.toLowerCase()}.
              </AlertDescription>
            </Alert>
          )}

          {payout?.status === "PROCESSING" && (
            <Alert className="border-primary/20 bg-primary/5">
              <RefreshCcw className="h-4 w-4 text-primary" />
              <AlertDescription>
                {t("this_payout_is_currently_being_processed")} {t("funds_will_be_available_in_your_wallet_shortly")}
              </AlertDescription>
            </Alert>
          )}

          {payout?.status === "COMPLETED" && (
            <Alert className="border-success/20 bg-success/5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                {t("this_payout_has_been_completed_successfully")} {walletConfig.label.toLowerCase()}.
              </AlertDescription>
            </Alert>
          )}

          {payout?.status === "FAILED" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {t("this_payout_failed_to_process_please")}
              </AlertDescription>
            </Alert>
          )}

          {/* Included Payments */}
          {payout?.payments && payout.payments.length > 0 && (
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
                      className="flex items-center justify-between p-3 rounded-lg border border-border transition-colors hover:border-border-strong hover:bg-surface-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-success/10">
                          <ArrowDownRight className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <code className="text-sm font-mono">{payment.id.slice(-12)}</code>
                          <p className="text-xs text-muted-foreground">{formatDateTime(payment.createdAt)}</p>
                        </div>
                      </div>
                      <p className="font-medium text-success"><MoneyFigure value={`+${formatCurrency(payment.amount, payment.currency)}`} /></p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Included Refunds */}
          {payout?.refunds && payout.refunds.length > 0 && (
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
                      className="flex items-center justify-between p-3 rounded-lg border border-border transition-colors hover:border-border-strong hover:bg-surface-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-destructive/10">
                          <ArrowUpRight className="h-4 w-4 text-destructive" />
                        </div>
                        <div>
                          <code className="text-sm font-mono">{refund.id.slice(-12)}</code>
                          <p className="text-xs text-muted-foreground">{formatDateTime(refund.createdAt)}</p>
                        </div>
                      </div>
                      <p className="font-medium text-destructive"><MoneyFigure value={`-${formatCurrency(refund.amount, refund.currency)}`} /></p>
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
                  <code className="font-mono text-sm">
                    <Loadable loading={loading} chars={24}>
                      {payout?.id}
                    </Loadable>
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={loading}
                    onClick={() => payout && copyToClipboard(payout.id, "Payout ID")}
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
                <p className="font-medium"><Loadable loading={loading} placeholder="USD">{payout?.currency}</Loadable></p>
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
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                    <Clock className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground"><Loadable loading={loading} placeholder={t("january_1_2026_at_12_00_pm")}>{payout ? formatDateTime(payout.createdAt) : null}</Loadable></p>
                  </div>
                </div>

                {payout?.status === "COMPLETED" && payout.updatedAt && (
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(payout!.updatedAt!)}</p>
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
              {/* The action buttons carry their own labels, so they render
                  in both states — disabled until there is a payout to act
                  on. */}
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={loading}
                onClick={() => payout && copyToClipboard(payout.id, "Payout ID")}
              >
                <Copy className="h-4 w-4 mr-2" />
                {t("copy_payout_id")}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={loading}
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
