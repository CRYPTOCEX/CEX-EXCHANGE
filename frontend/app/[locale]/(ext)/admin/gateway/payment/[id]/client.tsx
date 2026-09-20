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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MoneyFigure } from "@/components/ui/money-figure";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  FileText,
  Hash,
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
  Receipt,
  Timer,
  Building2,
  Globe,
  Mail,
  ExternalLink,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import $fetch from "@/lib/api";
import { statusTone } from "@/lib/status-tone";
import { toast } from "sonner";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";
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
  refundId: string;
  amount: number;
  status: string;
  reason?: string;
  createdAt: string;
}

interface Webhook {
  id: string;
  event: string;
  status: string;
  attempts: number;
  lastAttempt?: string;
  createdAt: string;
}

interface WalletAllocation {
  walletId: string;
  walletType: string;
  currency: string;
  amount: number;
  equivalentInPaymentCurrency: number;
}

interface Merchant {
  id: string;
  name: string;
  slug: string;
  email: string;
  logo?: string;
}

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

interface PaymentDetails {
  id: string;
  paymentIntentId: string;
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
  merchant?: Merchant;
  customer?: Customer;
  gatewayRefunds?: Refund[];
  gatewayWebhooks?: Webhook[];
}

/**
 * Icon + label only; the hue comes from `statusTone()`.
 *
 * Locally decided before, and it disagreed with the shared table on four of
 * eight: `PROCESSING`, `REFUNDED` and `PARTIALLY_REFUNDED` all wore the accent
 * (R2 reserves it for things you click) and `CANCELLED` was grey. Worse,
 * `PARTIALLY_REFUNDED` was accent HERE and warning in `admin/gateway/page.tsx`,
 * so the same payment changed colour between the list and its detail page.
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

/** The `soft` chip recipe, for the status pill that is not a Badge. */
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

/**
 * Webhook delivery states. `SENT` is not a key in `lib/status-tone.ts` (it would
 * resolve to `neutral`), so the tone is stated here rather than looked up — but
 * it is stated as a TONE, so `TONE_INK` still decides how it is painted.
 */
const WEBHOOK_STATUS_CONFIG: Record<string, { tone: BadgeTone; label: string }> =
  {
    PENDING: { tone: "warning", label: "Pending" },
    SENT: { tone: "success", label: "Sent" },
    FAILED: { tone: "destructive", label: "Failed" },
  };

const REFUND_REASONS = [
  { value: "REQUESTED_BY_CUSTOMER", label: "Requested by customer" },
  { value: "DUPLICATE", label: "Duplicate payment" },
  { value: "FRAUDULENT", label: "Fraudulent" },
  { value: "OTHER", label: "Other" },
];

export default function AdminPaymentDetailsClient() {
  const t = useTranslations("ext_admin");
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
      url: `/api/admin/gateway/payment/${paymentId}`,
      silent: true,
    });

    if (fetchError) {
      setError(typeof fetchError === 'string' ? fetchError : tExt("failed_to_load_payment_details"));
    } else if (data) {
      setPayment(data);
    }
    setLoading(false);
  };

  const getRemainingRefundable = () => {
    if (!payment) return 0;
    const totalRefunded = payment.gatewayRefunds?.reduce((sum, r) => sum + r.amount, 0) || 0;
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
      url: `/api/admin/gateway/payment/${payment.id}/refund`,
      method: "POST",
      body: {
        amount: amount,
        reason: refundReason,
        description: refundDescription || undefined,
      },
    });

    if (refundError) {
      toast.error(typeof refundError === 'string' ? refundError : tExt("failed_to_process_refund"));
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

  /*
    THE SAME SIX-GUESS SKELETON AS THE MERCHANT PAGE, WITH THE SAME FAULTS.
    ==========================================================================
    A bare `space-y-6` root against a real `container ${PAGE_PADDING} pt-20`,
    so the page moved 80px and gained its gutters on arrival before a single
    content difference is counted; then `h-10 w-10`, `h-6`, `h-4` and four
    fixed-height boxes standing in for a heading block and four cards whose
    height is set by their contents.

    Deleted. `error || !payment` becomes `paymentUnavailable`: `!payment` is
    true during the fetch too, and only the ordering of the two returns was
    keeping "Payment not found" off the screen on every load.
  */
  const paymentUnavailable = !loading && (error || !payment);

  if (paymentUnavailable) {
    return (
      /* The same container the loaded page opens with. A bare `space-y-6` root
         has no gutters and none of the clearance the `fixed top-0` header
         needs, so "Payment not found" rendered behind the navbar. */
      <div className={`container ${PAGE_PADDING} pt-20 space-y-6`}>
        <Link href="/admin/gateway/payment">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tExt("back_to_payments")}
          </Button>
        </Link>
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || tExt("payment_not_found")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  /*
    ONE PENDING VIEW OBJECT, NOT FORTY OPTIONAL CHAINS.
    --------------------------------------------------------------------------
    Removing the early return removes TypeScript's narrowing with it, and the
    tempting repair — `payment?.` everywhere — is the wrong one: an optional
    chain yields `undefined` silently, exactly where a figure should be showing
    a placeholder. `Partial<PaymentDetails>` makes every field explicitly
    optional so the compiler names each site that assumed a value, and each of
    those gets a `<Loadable>` rather than a `?? 0`. The empty object IS the
    pending payload.
  */
  const pmt: Partial<PaymentDetails> = payment ?? {};

  /* `formatCurrency` here is a plain template string, not `Intl` — it appends
     the code verbatim — so an empty code degrades to a bare number rather than
     throwing. That matters only for the list rows below, which do not render at
     all while pending; the four headline figures are behind `<Loadable>`. */
  const currency = pmt.currency ?? "";

  const statusConfig = STATUS_CONFIG[pmt.status ?? ""] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  const statusToneName = statusTone(pmt.status);
  const allocations = getAllocations();
  const WalletIcon = WALLET_ICONS[pmt.walletType ?? ""] || Wallet;

  const customMetadata = pmt.metadata
    ? Object.fromEntries(
        Object.entries(pmt.metadata).filter(
          ([k]) => !["isTestMode", "transactionIds"].includes(k)
        )
      )
    : {};

  return (
    <div className={`container ${PAGE_PADDING} pt-20 space-y-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/gateway/payment">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{tCommon("payment_details")}</h1>
              {pmt.testMode && (
                <Badge
                  variant="outline"
                  className="bg-warning/10 text-warning-ink border-warning/30"
                >
                  <TestTube className="h-3 w-3 mr-1" />
                  TEST
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm text-muted-foreground font-mono">
                <Loadable loading={loading} placeholder="pi_0000000000000000">
                  {pmt.paymentIntentId}
                </Loadable>
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={loading}
                onClick={() =>
                  pmt.paymentIntentId &&
                  copyToClipboard(pmt.paymentIntentId, "Payment ID")
                }
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${TONE_SURFACE[statusToneName]}`}
        >
          {/* The chip renders in both states — its box, border and padding are
              chrome. `statusToneName` resolves off an undefined status to the
              neutral tone while pending, so the pill does not paint a verdict
              (least of all `success`) on a payment nobody has read yet. */}
          <StatusIcon className={`h-5 w-5 ${TONE_INK[statusToneName]}`} />
          <span className={`font-semibold ${TONE_INK[statusToneName]}`}>
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
                    {/* `?? 0` is safe HERE because the figure is inside a
                        `<Loadable>` and is therefore never rendered while
                        pending. Outside one, the same expression would be the
                        confident-zero bug: a payment of $0.00. */}
                    <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                      <Loadable loading={loading} placeholder="0,000.00 USD">
                        <MoneyFigure
                          value={formatCurrency(pmt.amount ?? 0, currency)}
                        />
                      </Loadable>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <WalletIcon className="h-4 w-4" />
                    <span className="text-sm">{pmt.walletType} Wallet</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-border bg-surface-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-xs font-medium">Gross</span>
                  </div>
                  <p className="text-lg font-semibold">
                    <Loadable loading={loading} placeholder="0,000.00 USD">
                      <MoneyFigure
                        value={formatCurrency(pmt.amount ?? 0, currency)}
                      />
                    </Loadable>
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-surface-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Receipt className="h-4 w-4" />
                    <span className="text-xs font-medium">Fee</span>
                  </div>
                  <p className="text-lg font-semibold text-warning">
                    <Loadable loading={loading} placeholder="-0.00 USD">
                      <MoneyFigure
                        value={`-${formatCurrency(pmt.feeAmount ?? 0, currency)}`}
                      />
                    </Loadable>
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-success/20 bg-surface-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-xs font-medium">Net</span>
                  </div>
                  <p className="text-lg font-semibold text-success">
                    <Loadable loading={loading} placeholder="0,000.00 USD">
                      <MoneyFigure
                        value={formatCurrency(pmt.netAmount ?? 0, currency)}
                      />
                    </Loadable>
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
                    const AllocationIcon =
                      WALLET_ICONS[allocation.walletType] || Wallet;
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border"
                      >
                        <div className="flex items-center gap-4">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                            <AllocationIcon className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {allocation.walletType}
                              </Badge>
                              <span className="font-medium">
                                {allocation.currency}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            <MoneyFigure
                              value={`${allocation.amount.toFixed(8)} ${allocation.currency}`}
                            />
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ≈{" "}
                            <MoneyFigure
                              value={formatCurrency(
                                allocation.equivalentInPaymentCurrency,
                                currency
                              )}
                            />
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
          {pmt.lineItems && pmt.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <ShoppingCart className="h-3.5 w-3.5" />
                  </span>
                  {tExt("order_items")}
                </CardTitle>
                <CardDescription>
                  {pmt.lineItems.length} item
                  {pmt.lineItems.length > 1 ? "s" : ""} in this order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pmt.lineItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border"
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
                          <p className="text-sm text-muted-foreground truncate">
                            {item.description}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {tExt("qty")}: {item.quantity} ×{" "}
                          {formatCurrency(item.unitPrice, currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">
                          <MoneyFigure
                            value={formatCurrency(
                              item.quantity * item.unitPrice,
                              currency
                            )}
                          />
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refunds */}
          {pmt.gatewayRefunds && pmt.gatewayRefunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </span>
                  Refunds
                </CardTitle>
                <CardDescription>
                  {pmt.gatewayRefunds.length} refund
                  {pmt.gatewayRefunds.length > 1 ? "s" : ""} processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pmt.gatewayRefunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/10"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-muted-foreground">
                            {refund.refundId}
                          </code>
                          <Badge variant="outline" className="text-xs">
                            {refund.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {refund.reason || tCommon("no_reason_provided")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatShortDate(refund.createdAt)}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-destructive">
                        <MoneyFigure
                          value={`-${formatCurrency(refund.amount, currency)}`}
                        />
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Webhooks */}
          {pmt.gatewayWebhooks && pmt.gatewayWebhooks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                  </span>
                  Webhooks
                </CardTitle>
                <CardDescription>
                  {t("webhook_delivery_attempts_for_this_payment")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pmt.gatewayWebhooks.map((webhook) => {
                    const webhookConfig =
                      WEBHOOK_STATUS_CONFIG[webhook.status] ||
                      WEBHOOK_STATUS_CONFIG.PENDING;
                    return (
                      <div
                        key={webhook.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{webhook.event}</Badge>
                            <span
                              className={`text-sm font-medium ${TONE_INK[webhookConfig.tone]}`}
                            >
                              {webhookConfig.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {webhook.attempts} attempt
                            {webhook.attempts !== 1 ? "s" : ""}
                            {webhook.lastAttempt &&
                              ` • Last: ${formatShortDate(webhook.lastAttempt)}`}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(webhook.createdAt)}
                        </p>
                      </div>
                    );
                  })}
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
          {/* Merchant Card */}
          {pmt.merchant && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                  </span>
                  Merchant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {pmt.merchant.logo ? (
                    <img
                      src={pmt.merchant.logo}
                      alt={pmt.merchant.name}
                      className="h-12 w-12 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{pmt.merchant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{pmt.merchant.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{pmt.merchant.email}</span>
                </div>
                <Link href={`/admin/gateway/merchant/${pmt.merchant.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("view_merchant")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

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
              {pmt.orderId && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{tExt("order_id")}</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm">{pmt.orderId}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        copyToClipboard(pmt.orderId!, "Order ID")
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {pmt.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{pmt.description}</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground">{tCommon("payment_method")}</p>
                <div className="flex items-center gap-2 mt-1">
                  <WalletIcon className="h-4 w-4" />
                  <span className="font-medium">{pmt.walletType} Wallet</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Card */}
          {(pmt.customer ||
            pmt.customerName ||
            pmt.customerEmail ||
            pmt.billingAddress) && (
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
                {pmt.customer ? (
                  <div>
                    <p className="font-medium">
                      {pmt.customer.firstName} {pmt.customer.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pmt.customer.email}
                    </p>
                    <Link href={`/admin/crm/user/${pmt.customer.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t("view_user")}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  (pmt.customerName || pmt.customerEmail) && (
                    <div>
                      {pmt.customerName && (
                        <p className="font-medium">
                          <Loadable loading={loading} chars={14}>
                            {pmt.customerName}
                          </Loadable>
                        </p>
                      )}
                      {pmt.customerEmail && (
                        <p className="text-sm text-muted-foreground">
                          <Loadable loading={loading} chars={20}>
                            {pmt.customerEmail}
                          </Loadable>
                        </p>
                      )}
                    </div>
                  )
                )}

                {pmt.billingAddress && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        <span>{tExt("billing_address")}</span>
                      </div>
                      <div className="text-sm space-y-0.5">
                        <p>{pmt.billingAddress.line1}</p>
                        {pmt.billingAddress.line2 && (
                          <p>{pmt.billingAddress.line2}</p>
                        )}
                        <p>
                          {pmt.billingAddress.city}
                          {pmt.billingAddress.state &&
                            `, ${pmt.billingAddress.state}`}{" "}
                          {pmt.billingAddress.postalCode}
                        </p>
                        <p className="font-medium">
                          {pmt.billingAddress.country}
                        </p>
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
                      <Loadable loading={loading} placeholder="Jan 1, 2026, 00:00">
                        {pmt.createdAt ? formatDate(pmt.createdAt) : null}
                      </Loadable>
                    </p>
                  </div>
                </div>

                {pmt.completedAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-success/10">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(pmt.completedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {pmt.expiresAt &&
                  !pmt.completedAt &&
                  pmt.status !== "EXPIRED" && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-full bg-warning/10">
                        <Timer className="h-3 w-3 text-warning" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Expires</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(pmt.expiresAt)}
                        </p>
                      </div>
                    </div>
                  )}

                {pmt.status === "EXPIRED" && pmt.expiresAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-muted/10">
                      <Timer className="h-3 w-3 text-subtle-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Expired</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(pmt.expiresAt)}
                      </p>
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
            <CardContent className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={loading}
                onClick={() =>
                  pmt.paymentIntentId &&
                  copyToClipboard(pmt.paymentIntentId, "Payment ID")
                }
              >
                <Copy className="h-4 w-4 mr-2" />
                {tExt("copy_payment_id")}
              </Button>
              {pmt.orderId && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => copyToClipboard(pmt.orderId!, "Order ID")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {tExt("copy_order_id")}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start"
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
              <Label htmlFor="refund-amount">Refund Amount ({pmt.currency})</Label>
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
                {tExt("maximum_refundable")}: {formatCurrency(getRemainingRefundable(), currency)}
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
