"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loadable } from "@/components/ui/skeleton";
import PaymentErrorState from "./error-state";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Package,
  RefreshCcw,
  ShoppingCart,
  TestTube,
  TrendingUp,
  User,
  Wallet,
  XCircle,
  AlertCircle,
  Banknote,
  Coins,
  CircleDollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  Timer,
  RotateCcw,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { statusTone } from "@/lib/status-tone";
import { toast } from "sonner";
import { MoneyFigure } from "@/components/ui/money-figure";
import { useTranslations } from "next-intl";

interface LineItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

interface Refund {
  id: string;
  amount: number;
  status: string;
  reason?: string;
  createdAt: string;
}

interface WalletAllocation {
  walletId: string;
  walletType: string;
  currency: string;
  amount: number;
  equivalentInPaymentCurrency: number;
}

interface PaymentDetails {
  id: string;
  orderId?: string;
  amount: number;
  currency: string;
  walletType: string;
  feeAmount: number;
  netAmount: number;
  status: string;
  description?: string;
  metadata?: Record<string, any>;
  allocations?: WalletAllocation[];
  lineItems?: LineItem[];
  customerEmail?: string;
  customerName?: string;
  billingAddress?: BillingAddress;
  testMode: boolean;
  expiresAt?: string;
  completedAt?: string;
  createdAt: string;
  refunds?: Refund[];
}

/**
 * Icon + label only; the hue comes from `statusTone()`. Decided locally before,
 * and it disagreed with the shared table on four of eight: `PROCESSING`,
 * `REFUNDED` and `PARTIALLY_REFUNDED` all wore the accent (R2 reserves it for
 * things you click) and `CANCELLED` was grey where the platform says
 * destructive.
 */
const STATUS_CONFIG: Record<string, { icon: any; label: string }> = {
  PENDING: { icon: Clock, label: "Pending" },
  PROCESSING: { icon: RefreshCcw, label: "Processing" },
  COMPLETED: { icon: CheckCircle2, label: "Completed" },
  FAILED: { icon: XCircle, label: "Failed" },
  CANCELLED: { icon: XCircle, label: "Cancelled" },
  EXPIRED: { icon: Timer, label: "Expired" },
  REFUNDED: { icon: RefreshCcw, label: "Refunded" },
  PARTIALLY_REFUNDED: { icon: RefreshCcw, label: "Partially Refunded" },
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

const WALLET_ICONS: Record<string, any> = {
  FIAT: Banknote,
  SPOT: Coins,
  ECO: CircleDollarSign,
};

const REFUND_REASONS = [
  { value: "REQUESTED_BY_CUSTOMER", label: "Requested by customer" },
  { value: "DUPLICATE", label: "Duplicate payment" },
  { value: "FRAUDULENT", label: "Fraudulent" },
  { value: "OTHER", label: "Other" },
];

export default function PaymentDetailsClient() {
  const t = useTranslations("ext_gateway");
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const params = useParams();
  const paymentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refund state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("REQUESTED_BY_CUSTOMER");
  const [refundDescription, setRefundDescription] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await $fetch({
      url: `/api/gateway/payment/${paymentId}`,
      silent: true,
    });

    if (fetchError) {
      setError(fetchError || tExt("failed_to_load_payment_details"));
    } else if (data) {
      setPayment(data);
    }
    setLoading(false);
  };

  const getRemainingRefundable = () => {
    if (!payment) return 0;
    const totalRefunded = payment.refunds?.reduce((sum, r) => sum + r.amount, 0) || 0;
    return payment.amount - totalRefunded;
  };

  const canRefund = () => {
    if (!payment) return false;
    return (
      (payment.status === "COMPLETED" || payment.status === "PARTIALLY_REFUNDED") &&
      getRemainingRefundable() > 0
    );
  };

  const handleRefund = async () => {
    if (!payment) return;

    const amount = refundAmount ? parseFloat(refundAmount) : getRemainingRefundable();
    if (isNaN(amount) || amount <= 0) {
      toast.error(tExt("please_enter_a_valid_refund_amount"));
      return;
    }

    if (amount > getRemainingRefundable()) {
      toast.error(`Amount exceeds remaining refundable amount (${formatCurrency(getRemainingRefundable(), payment.currency)})`);
      return;
    }

    setRefundLoading(true);
    const { data, error: refundError } = await $fetch({
      url: `/api/gateway/payment/${payment.id}/refund`,
      method: "POST",
      body: {
        amount: amount,
        reason: refundReason,
        description: refundDescription || undefined,
      },
    });

    if (refundError) {
      toast.error(refundError || tExt("failed_to_process_refund"));
    } else {
      toast.success(`Refund of ${formatCurrency(amount, payment.currency)} processed successfully`);
      setRefundDialogOpen(false);
      setRefundAmount("");
      setRefundDescription("");
      setRefundReason("REQUESTED_BY_CUSTOMER");
      fetchPaymentDetails();
    }
    setRefundLoading(false);
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

  const formatCurrency = (amount: number, currency: string, decimals = 2) => {
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${currency}`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(tExt("copied_to_clipboard", { label: String(label) }));
  };

  const getAllocations = (): WalletAllocation[] => {
    if (!payment?.allocations) return [];
    return Array.isArray(payment.allocations) ? payment.allocations : [];
  };

  /**
   * NO `if (loading) return <PaymentDetailsLoading/>`.
   *
   * `./loading.tsx` is a header bar and four grey rectangles in a 2/1 grid. The
   * real page is a header with a back button, a title, a copyable id and a
   * status chip; an amount card with three labelled cells; and a sidebar of
   * four cards whose headings ("Order Information", "Timeline", "Quick
   * Actions") and buttons ("Copy Payment ID", "Export as JSON") are literals in
   * this file. All of that is knowable before the fetch, and all of it was
   * being replaced by an approximation of itself that lives in another file and
   * cannot follow this one when it changes.
   *
   * `error || !payment` is the FAILURE state and it now has to say so: `!payment`
   * is also true while loading, so without the `!loading` guard removing the
   * swap above would have turned every page load into "Payment not found" for
   * the length of the request.
   */
  if (!loading && (error || !payment)) {
    return <PaymentErrorState error={error || "Payment not found"} onRetry={fetchPaymentDetails} />;
  }

  const statusConfig = STATUS_CONFIG[payment?.status ?? ""] || STATUS_CONFIG.PENDING;
  /* Neutral while pending: the status chip is the loudest thing on this page
     and PENDING is a real, wrong answer to paint an unknown one with. */
  const tone = loading ? ("neutral" as BadgeTone) : statusTone(payment!.status);
  const StatusIcon = loading ? Clock : statusConfig.icon;
  const allocations = getAllocations();
  const WalletIcon = (payment && WALLET_ICONS[payment.walletType]) || Wallet;

  const customMetadata = payment?.metadata
    ? Object.fromEntries(
        Object.entries(payment.metadata).filter(
          ([k]) => !["isTestMode", "transactionIds"].includes(k)
        )
      )
    : {};

  return (
    <div className="container pt-24 pb-16 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/gateway/payment">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{tCommon("payment_details")}</h1>
              {payment?.testMode && (
                <Badge variant="outline" className="bg-warning/10 text-warning-ink border-warning/30">
                  <TestTube className="h-3 w-3 mr-1" />
                  TEST
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm text-muted-foreground font-mono">
                <Loadable loading={loading} chars={24}>
                  {payment?.id}
                </Loadable>
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={loading}
                onClick={() => payment && copyToClipboard(payment.id, "Payment ID")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        {/* The status chip renders in both states — it is the right-hand half
            of the header row — with only its label pending. */}
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
        {/* Main Content - Left Side */}
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
                    <p className="text-xs font-medium text-muted-foreground">{tCommon("total_amount")}</p>
                    {/* `MoneyFigure` holds back the digits and keeps the
                        currency code, which the row already knows — and the
                        placeholder sits inside the same `text-2xl` element the
                        amount will use, so the card cannot change height. */}
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                      <MoneyFigure
                        loading={loading}
                        figurePlaceholder="1,234.00"
                        value={formatCurrency(payment?.amount ?? 0, payment?.currency ?? "USD")}
                      />
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <WalletIcon className="h-4 w-4" />
                    <span className="text-sm">
                      <Loadable loading={loading} placeholder="FIAT">
                        {payment?.walletType}
                      </Loadable>{" "}
                      Wallet
                    </span>
                  </div>
                </div>
              </div>

              {/* The three cells are the page's headline breakdown. Labels,
                  icons, borders and the grid render in both states; only the
                  three figures wait. */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-border bg-surface-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-xs font-medium">Gross</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    <MoneyFigure
                      loading={loading}
                      figurePlaceholder="1,234.00"
                      value={formatCurrency(payment?.amount ?? 0, payment?.currency ?? "USD")}
                    />
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-surface-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Receipt className="h-4 w-4" />
                    <span className="text-xs font-medium">Fee</span>
                  </div>
                  <p className="text-lg font-semibold text-warning">
                    <MoneyFigure
                      loading={loading}
                      figurePlaceholder="12.00"
                      value={`-${formatCurrency(payment?.feeAmount ?? 0, payment?.currency ?? "USD")}`}
                    />
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-success/20 bg-surface-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-xs font-medium">Net</span>
                  </div>
                  <p className="text-lg font-semibold text-success">
                    <MoneyFigure
                      loading={loading}
                      figurePlaceholder="1,222.00"
                      value={formatCurrency(payment?.netAmount ?? 0, payment?.currency ?? "USD")}
                    />
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Allocations */}
          {allocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                  </span>
                  {tExt("payment_wallets")}
                </CardTitle>
                <CardDescription>
                  {tExt("wallets_used_for_this_payment")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allocations.map((allocation, index) => {
                    const AllocationIcon = WALLET_ICONS[allocation.walletType] || Wallet;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface-2"
                      >
                        <div className="flex items-center gap-4">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                            <AllocationIcon className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{allocation.walletType}</Badge>
                              <span className="font-medium">{allocation.currency}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-foreground">
                            <MoneyFigure
                              value={`${allocation.amount.toFixed(8)} ${allocation.currency}`}
                            />
                          </p>
                          <p className="text-[11px] text-subtle-foreground">
                            ≈ <MoneyFigure value={formatCurrency(allocation.equivalentInPaymentCurrency, payment?.currency ?? "USD")} />
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          {payment?.lineItems && payment.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <ShoppingCart className="h-3.5 w-3.5" />
                  </span>
                  {tExt("order_items")}
                </CardTitle>
                <CardDescription>
                  {payment.lineItems.length} item{payment.lineItems.length > 1 ? "s" : ""} in this order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payment.lineItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface-2"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        )}
                        <p className="text-[11px] text-subtle-foreground mt-1">
                          {tExt("qty")}: {item.quantity} × {formatCurrency(item.unitPrice, payment!.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">
                          <MoneyFigure value={formatCurrency(item.quantity * item.unitPrice, payment!.currency)} />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refunds */}
          {payment?.refunds && payment.refunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </span>
                  Refunds
                </CardTitle>
                <CardDescription>
                  {payment.refunds.length} refund{payment.refunds.length > 1 ? "s" : ""} processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payment.refunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/10"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-muted-foreground">{refund.id}</code>
                          <Badge variant="outline" className="text-xs">
                            {refund.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {refund.reason || tCommon("no_reason_provided")}
                        </p>
                        <p className="text-[11px] text-subtle-foreground mt-1">
                          {formatShortDate(refund.createdAt)}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-destructive">
                        <MoneyFigure value={`-${formatCurrency(refund.amount, payment!.currency)}`} />
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Metadata */}
          {Object.keys(customMetadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  {tExt("custom_metadata")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-48 font-mono">
                  {JSON.stringify(customMetadata, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-6">
          {/* Order Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                </span>
                {tExt("order_information")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payment?.orderId && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{tExt("order_id")}</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm">{payment.orderId}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(payment!.orderId!, "Order ID")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {payment?.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{payment.description}</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">{tCommon("payment_method")}</p>
                <div className="flex items-center gap-2 mt-1">
                  <WalletIcon className="h-4 w-4" />
                  <span className="font-medium">
                    <Loadable loading={loading} placeholder="FIAT">
                      {payment?.walletType}
                    </Loadable>{" "}
                    Wallet
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Card */}
          {(payment?.customerName || payment?.customerEmail || payment?.billingAddress) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(payment!.customerName || payment!.customerEmail) && (
                  <div>
                    {payment!.customerName && (
                      <p className="font-medium">{payment!.customerName}</p>
                    )}
                    {payment!.customerEmail && (
                      <p className="text-sm text-muted-foreground">{payment!.customerEmail}</p>
                    )}
                  </div>
                )}

                {payment!.billingAddress && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        <span>{tExt("billing_address")}</span>
                      </div>
                      <div className="text-sm space-y-0.5">
                        <p>{payment!.billingAddress!.line1}</p>
                        {payment!.billingAddress!.line2 && <p>{payment!.billingAddress!.line2}</p>}
                        <p>
                          {payment!.billingAddress!.city}
                          {payment!.billingAddress!.state && `, ${payment!.billingAddress!.state}`}{" "}
                          {payment!.billingAddress!.postalCode}
                        </p>
                        <p className="font-medium">{payment!.billingAddress!.country}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                </span>
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-full bg-primary/10">
                    <Clock className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">
                      <Loadable loading={loading} placeholder={t("january_1_2026_at_12_00_pm")}>
                        {payment ? formatDate(payment.createdAt) : null}
                      </Loadable>
                    </p>
                  </div>
                </div>

                {payment?.completedAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-success/10">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">{formatDate(payment!.completedAt!)}</p>
                    </div>
                  </div>
                )}

                {payment?.expiresAt && !payment.completedAt && payment.status !== "EXPIRED" && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-warning/10">
                      <Timer className="h-3 w-3 text-warning" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Expires</p>
                      <p className="text-xs text-muted-foreground">{formatDate(payment!.expiresAt!)}</p>
                    </div>
                  </div>
                )}

                {payment?.status === "EXPIRED" && payment.expiresAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-surface-3">
                      <Timer className="h-3 w-3 text-subtle-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Expired</p>
                      <p className="text-xs text-muted-foreground">{formatDate(payment!.expiresAt!)}</p>
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
              {/* The action buttons carry their own labels, so they render in
                  both states — disabled until there is a payment to act on. */}
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={loading}
                onClick={() => payment && copyToClipboard(payment.id, "Payment ID")}
              >
                <Copy className="h-4 w-4 mr-2" />
                {tExt("copy_payment_id")}
              </Button>
              {payment?.orderId && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => copyToClipboard(payment!.orderId!, "Order ID")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {tExt("copy_order_id")}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={loading}
                onClick={() => {
                  const data = JSON.stringify(payment, null, 2);
                  copyToClipboard(data, "Payment data");
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                {tCommon("export_as_json")}
              </Button>
              {canRefund() && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-warning hover:text-warning hover:bg-warning/5 dark:hover:bg-warning/20"
                  onClick={() => {
                    setRefundAmount(getRemainingRefundable().toString());
                    setRefundDialogOpen(true);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {tExt("issue_refund")}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tExt("issue_refund")}</DialogTitle>
            <DialogDescription>
              {t("refund_all_or_part_of_this")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount ({payment?.currency})</Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                min="0"
                max={getRemainingRefundable()}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={`Max: ${getRemainingRefundable()}`}
              />
              <p className="text-xs text-muted-foreground">
                {tExt("maximum_refundable")}: {formatCurrency(getRemainingRefundable(), payment?.currency ?? "USD")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger id="refund-reason">
                  <SelectValue placeholder={tCommon("select_a_reason")} />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-description">Description (optional)</Label>
              <Textarea
                id="refund-description"
                value={refundDescription}
                onChange={(e) => setRefundDescription(e.target.value)}
                placeholder={`${tExt("add_any_additional_notes_about_this")}…`}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
              disabled={refundLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefund}
              disabled={refundLoading}
              className="bg-warning hover:bg-warning text-warning-foreground"
            >
              {refundLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tCommon("processing")}…
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {tExt("issue_refund")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
