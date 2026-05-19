"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { toast } from "sonner";
import { PAGE_PADDING } from "@/app/[locale]/(dashboard)/theme-config";

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
  PROCESSING: {
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    icon: RefreshCcw,
    label: "Processing",
  },
  COMPLETED: {
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/20",
    icon: CheckCircle2,
    label: "Completed",
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
    bgColor: "bg-gray-400/10 border-gray-400/20",
    icon: Timer,
    label: "Expired",
  },
  REFUNDED: {
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-500/20",
    icon: RefreshCcw,
    label: "Refunded",
  },
  PARTIALLY_REFUNDED: {
    color: "text-purple-500",
    bgColor: "bg-purple-400/10 border-purple-400/20",
    icon: RefreshCcw,
    label: "Partially Refunded",
  },
};

const WALLET_ICONS: Record<string, any> = {
  FIAT: Banknote,
  SPOT: Coins,
  ECO: CircleDollarSign,
};

const WEBHOOK_STATUS_CONFIG: Record<string, { color: string; label: string }> =
  {
    PENDING: { color: "text-yellow-600", label: "Pending" },
    SENT: { color: "text-green-600", label: "Sent" },
    FAILED: { color: "text-red-600", label: "Failed" },
  };

const REFUND_REASONS = [
  { value: "REQUESTED_BY_CUSTOMER", label: "Requested by customer" },
  { value: "DUPLICATE", label: "Duplicate payment" },
  { value: "FRAUDULENT", label: "Fraudulent" },
  { value: "OTHER", label: "Other" },
];

export default function AdminPaymentDetailsClient() {
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
      setError(typeof fetchError === 'string' ? fetchError : "Failed to load payment details");
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
      toast.error("Please enter a valid refund amount");
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
      toast.error(typeof refundError === 'string' ? refundError : "Failed to process refund");
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
    toast.success(`${label} copied to clipboard`);
  };

  const getAllocations = (): WalletAllocation[] => {
    if (!payment?.allocations) return [];
    return Array.isArray(payment.allocations) ? payment.allocations : [];
  };

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

  if (error || !payment) {
    return (
      <div className="space-y-6">
        <Link href="/admin/gateway/payment">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payments
          </Button>
        </Link>
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Payment not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  const allocations = getAllocations();
  const WalletIcon = WALLET_ICONS[payment.walletType] || Wallet;

  const customMetadata = payment.metadata
    ? Object.fromEntries(
        Object.entries(payment.metadata).filter(
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
              <h1 className="text-2xl font-bold">Payment Details</h1>
              {payment.testMode && (
                <Badge
                  variant="outline"
                  className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                >
                  <TestTube className="h-3 w-3 mr-1" />
                  TEST
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm text-muted-foreground font-mono">
                {payment.paymentIntentId}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() =>
                  copyToClipboard(payment.paymentIntentId, "Payment ID")
                }
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${statusConfig.bgColor}`}
        >
          <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
          <span className={`font-semibold ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
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
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <WalletIcon className="h-4 w-4" />
                    <span className="text-sm">{payment.walletType} Wallet</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="text-xs">Gross</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Receipt className="h-4 w-4" />
                    <span className="text-xs">Fee</span>
                  </div>
                  <p className="text-lg font-semibold text-orange-600">
                    -{formatCurrency(payment.feeAmount, payment.currency)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-green-500/20">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-xs">Net</span>
                  </div>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(payment.netAmount, payment.currency)}
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
                  <CreditCard className="h-5 w-5" />
                  Payment Wallets
                </CardTitle>
                <CardDescription>
                  Wallets used for this payment
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
                          <div className="p-2 rounded-lg bg-background">
                            <AllocationIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
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
                          <p className="font-bold text-lg">
                            {allocation.amount.toFixed(8)} {allocation.currency}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ≈{" "}
                            {formatCurrency(
                              allocation.equivalentInPaymentCurrency,
                              payment.currency
                            )}
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
          {payment.lineItems && payment.lineItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Items
                </CardTitle>
                <CardDescription>
                  {payment.lineItems.length} item
                  {payment.lineItems.length > 1 ? "s" : ""} in this order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payment.lineItems.map((item, index) => (
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
                          Qty: {item.quantity} ×{" "}
                          {formatCurrency(item.unitPrice, payment.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {formatCurrency(
                            item.quantity * item.unitPrice,
                            payment.currency
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Refunds */}
          {payment.gatewayRefunds && payment.gatewayRefunds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCcw className="h-5 w-5" />
                  Refunds
                </CardTitle>
                <CardDescription>
                  {payment.gatewayRefunds.length} refund
                  {payment.gatewayRefunds.length > 1 ? "s" : ""} processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payment.gatewayRefunds.map((refund) => (
                    <div
                      key={refund.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-red-500/5 border border-red-500/10"
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
                          {refund.reason || "No reason provided"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatShortDate(refund.createdAt)}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-red-600">
                        -{formatCurrency(refund.amount, payment.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Webhooks */}
          {payment.gatewayWebhooks && payment.gatewayWebhooks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Webhooks
                </CardTitle>
                <CardDescription>
                  Webhook delivery attempts for this payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payment.gatewayWebhooks.map((webhook) => {
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
                              className={`text-sm font-medium ${webhookConfig.color}`}
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
                  <FileText className="h-5 w-5" />
                  Custom Metadata
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
          {payment.merchant && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Merchant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {payment.merchant.logo ? (
                    <img
                      src={payment.merchant.logo}
                      alt={payment.merchant.name}
                      className="h-12 w-12 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{payment.merchant.name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{payment.merchant.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{payment.merchant.email}</span>
                </div>
                <Link href={`/admin/gateway/merchant/${payment.merchant.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Merchant
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Order Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payment.orderId && (
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm">{payment.orderId}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() =>
                        copyToClipboard(payment.orderId!, "Order ID")
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {payment.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{payment.description}</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <div className="flex items-center gap-2 mt-1">
                  <WalletIcon className="h-4 w-4" />
                  <span className="font-medium">{payment.walletType} Wallet</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Card */}
          {(payment.customer ||
            payment.customerName ||
            payment.customerEmail ||
            payment.billingAddress) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {payment.customer ? (
                  <div>
                    <p className="font-medium">
                      {payment.customer.firstName} {payment.customer.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.customer.email}
                    </p>
                    <Link href={`/admin/user/${payment.customer.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View User
                      </Button>
                    </Link>
                  </div>
                ) : (
                  (payment.customerName || payment.customerEmail) && (
                    <div>
                      {payment.customerName && (
                        <p className="font-medium">{payment.customerName}</p>
                      )}
                      {payment.customerEmail && (
                        <p className="text-sm text-muted-foreground">
                          {payment.customerEmail}
                        </p>
                      )}
                    </div>
                  )
                )}

                {payment.billingAddress && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        <span>Billing Address</span>
                      </div>
                      <div className="text-sm space-y-0.5">
                        <p>{payment.billingAddress.line1}</p>
                        {payment.billingAddress.line2 && (
                          <p>{payment.billingAddress.line2}</p>
                        )}
                        <p>
                          {payment.billingAddress.city}
                          {payment.billingAddress.state &&
                            `, ${payment.billingAddress.state}`}{" "}
                          {payment.billingAddress.postalCode}
                        </p>
                        <p className="font-medium">
                          {payment.billingAddress.country}
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
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>

                {payment.completedAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-green-500/10">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.completedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {payment.expiresAt &&
                  !payment.completedAt &&
                  payment.status !== "EXPIRED" && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-full bg-yellow-500/10">
                        <Timer className="h-3 w-3 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Expires</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.expiresAt)}
                        </p>
                      </div>
                    </div>
                  )}

                {payment.status === "EXPIRED" && payment.expiresAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-gray-500/10">
                      <Timer className="h-3 w-3 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Expired</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.expiresAt)}
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
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() =>
                  copyToClipboard(payment.paymentIntentId, "Payment ID")
                }
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Payment ID
              </Button>
              {payment.orderId && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => copyToClipboard(payment.orderId!, "Order ID")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Order ID
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
                Export as JSON
              </Button>
              {canRefund() && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                  onClick={() => {
                    setRefundAmount(getRemainingRefundable().toString());
                    setRefundDialogOpen(true);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Issue Refund
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
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Refund all or part of this payment. The customer will receive the refund to their original wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Refund Amount ({payment.currency})</Label>
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
                Maximum refundable: {formatCurrency(getRemainingRefundable(), payment.currency)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger id="refund-reason">
                  <SelectValue placeholder="Select a reason" />
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
                placeholder="Add any additional notes about this refund..."
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
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {refundLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Issue Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
