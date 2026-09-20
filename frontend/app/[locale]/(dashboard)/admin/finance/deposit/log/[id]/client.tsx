"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BadgeTone } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { statusLabel, statusTone } from "@/lib/status-tone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordAuditTab } from "@/components/blocks/audit/record-audit-tab";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  DollarSign,
  Wallet,
  User,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hash,
  RefreshCw,
  Printer,
  Copy,
  Check,
  CreditCard,
  ArrowDownCircle,
  Info,
  Shield,
  Sparkles,
  ScrollText,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { MoneyFigure } from "@/components/ui/money-figure";
import { Loadable } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

interface Transaction {
  id: string;
  status: string;
  type: string;
  amount: number;
  fee: number;
  description?: string;
  referenceId?: string;
  trxId?: string;
  metadata?: string;
  createdAt: string;
  updatedAt?: string;
  walletId: string;
  wallet?: {
    id: string;
    currency: string;
    type: string;
    balance?: number;
  };
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string;
  };
}

/**
 * Which glyph a status wears is still this page's call — the HUE is not. The
 * old `getStatusInfo` bundled both, and its colour half is what made PROCESSING
 * wear the brand accent here while every other module read it as informational.
 */
const getStatusIcon = (status: string) => {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4" />;
    case "PENDING":
      return <Clock className="h-4 w-4" />;
    case "REJECTED":
    case "FAILED":
    case "CANCELLED":
      return <XCircle className="h-4 w-4" />;
    case "PROCESSING":
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

/**
 * The status banner is a panel, not a pill, so it cannot become a `<Badge>`.
 * It derives its tone from the one status table and maps that tone to the same
 * tint / rule / ink recipe the Badge primitive uses. Tailwind cannot see class
 * names built at runtime, so each tone is spelled out.
 */
const TONE_BANNER: Record<
  BadgeTone,
  { tint: string; border: string; ink: string; fill: string; onFill: string }
> = {
  primary: {
    tint: "bg-primary/10",
    border: "border-primary/20",
    ink: "text-primary",
    fill: "bg-primary",
    onFill: "text-primary-foreground",
  },
  secondary: {
    tint: "bg-secondary",
    border: "border-border",
    ink: "text-secondary-foreground",
    fill: "bg-secondary",
    onFill: "text-secondary-foreground",
  },
  success: {
    tint: "bg-success/10",
    border: "border-success/20",
    ink: "text-success",
    fill: "bg-success",
    onFill: "text-success-foreground",
  },
  warning: {
    tint: "bg-warning/10",
    border: "border-warning/20",
    ink: "text-warning",
    fill: "bg-warning",
    onFill: "text-warning-foreground",
  },
  destructive: {
    tint: "bg-destructive/10",
    border: "border-destructive/20",
    ink: "text-destructive",
    fill: "bg-destructive",
    onFill: "text-destructive-foreground",
  },
  info: {
    tint: "bg-info/10",
    border: "border-info/20",
    ink: "text-info",
    fill: "bg-info",
    onFill: "text-info-foreground",
  },
  neutral: {
    tint: "bg-muted",
    border: "border-border",
    ink: "text-muted-foreground",
    fill: "bg-muted",
    onFill: "text-foreground",
  },
};

export default function DepositDetailClient() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Editable fields
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [description, setDescription] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Dialogs
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  // Empty, NOT the prompt text. Pre-filling this with "Please provide a
  // reason for rejection." meant an admin who clicked straight through stored
  // that sentence as the rejection reason AND emailed it to the customer as the
  // explanation. The confirm button is disabled until a real reason is typed.
  const [rejectionMessage, setRejectionMessage] = useState("");
  const rejectionReasonValid = rejectionMessage.trim().length >= 3;
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const fetchTransaction = useCallback(async () => {
    if (!params.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await $fetch({
        url: `/api/admin/finance/deposit/log/${params.id}`,
        silent: true,
      });

      if (fetchError) {
        setError(fetchError);
        return;
      }

      if (!data) {
        setError(tCommon("transaction_not_found"));
        return;
      }

      setTransaction(data);
      setAmount(String(data.amount));
      setFee(String(data.fee));
      setDescription(data.description || "");
      setReferenceId(data.referenceId || "");
    } catch (err: any) {
      setError(err.message || t("failed_to_load_transaction"));
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const updateTransaction = async (newStatus: string) => {
    if (!transaction) return;
    setIsUpdating(true);

    try {
      const payload: any = {
        status: newStatus,
        amount: parseFloat(amount),
        fee: parseFloat(fee),
        description,
        ...(referenceId && { referenceId }),
      };

      if (newStatus === "REJECTED") {
        let currentMeta = {};
        try {
          currentMeta = transaction?.metadata
            ? JSON.parse(transaction.metadata)
            : {};
        } catch (err) {
          console.error("Failed to parse metadata", err);
        }
        payload.metadata = { ...currentMeta, message: rejectionMessage };
      } else {
        try {
          payload.metadata = transaction?.metadata
            ? JSON.parse(transaction.metadata)
            : {};
        } catch (err) {
          payload.metadata = {};
        }
      }

      const { error: updateError } = await $fetch({
        method: "PUT",
        url: `/api/admin/finance/deposit/log/${transaction.id}`,
        body: payload,
      });

      if (!updateError) {
        setTransaction((prev) =>
          prev
            ? {
                ...prev,
                ...payload,
                status: newStatus,
                metadata: JSON.stringify(payload.metadata),
              }
            : prev
        );
        setShowRejectDialog(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        toast({
          title: t("transaction_updated"),
          description: t("the_transaction_has_been_successfully_updated"),
        });
      } else {
        toast({
          title: tCommon("error"),
          description: updateError,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: tCommon("error"),
        description: err.message || t("failed_to_update_transaction"),
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * PENDING AND NOT-FOUND ARE DIFFERENT ANSWERS, AND THIS PAGE GAVE ONE.
   * ==========================================================================
   *
   * What stood here was `if (isLoading) return <ring spinner/>` followed by
   * `if (error || !transaction) return <full-viewport panel/>`. Between them
   * they threw the whole page away — the sticky header, the status banner, the
   * five-tab card, every label and border in it — and put a 48px rotating ring
   * in the middle of a `min-h-[80vh]` box in its place. So 100% of the layout
   * arrived as movement, and because the fallback set its own viewport height
   * the DOCUMENT height changed as well.
   *
   * The page now renders ONCE, in one tree, and only the values wait.
   *
   * `awaitingRecord` is deliberately `isLoading && !transaction`, not plain
   * `isLoading`: approving or rejecting refetches, and blanking a record the
   * operator is already looking at back to placeholders for that round trip
   * would be a second flash on top of the one they just caused.
   *
   * `loadFailed` is the OTHER state — a CONCLUSION, not a wait — and it is a
   * banner inside the page frame now rather than a takeover of it. It covers
   * both halves of the old `error || !transaction` guard, including the case the
   * old guard handled badly: a failed REFETCH, where the previous record is
   * still on screen and the page used to be replaced anyway.
   */
  const awaitingRecord = isLoading && !transaction;
  const loadFailed = !isLoading && (!!error || !transaction);

  const statusIcon = getStatusIcon(transaction?.status ?? "");
  const statusText = statusLabel(transaction?.status) || "Unknown";
  const banner = TONE_BANNER[statusTone(transaction?.status)];
  const userName =
    `${transaction?.user?.firstName || ""} ${transaction?.user?.lastName || ""}`.trim() ||
    "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase();
  const isEditable = transaction?.status === "PENDING";

  /* `format()` throws on `new Date(undefined)`, so the dates are resolved here
     where the record can be tested once, rather than guarded at each of the
     places they are printed. */
  const createdAtShort = transaction
    ? format(new Date(transaction.createdAt), "PPP")
    : "";
  const createdAtFull = transaction
    ? format(new Date(transaction.createdAt), "PPP 'at' p")
    : "";
  const walletSummary = transaction
    ? `${transaction.wallet?.currency ?? ""} (${transaction.wallet?.type ?? ""})`
    : "";

  // Parse metadata
  let metadata: Record<string, any> = {};
  try {
    metadata = transaction?.metadata ? JSON.parse(transaction.metadata) : {};
  } catch (e) {
    metadata = {};
  }

  return (
    <m.div
      className="min-h-screen bg-background"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Premium Header */}
      <m.div variants={itemVariants} className="sticky top-0 z-50">
        <div className="bg-linear-to-r from-surface-2 via-muted to-surface-2">
          <div className="relative container mx-auto px-4 md:px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left side */}
              <div className="flex items-center gap-4">
                <Link href="/admin/finance/deposit/log">
                  <m.div
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-overlay-foreground/80 hover:text-overlay-foreground hover:bg-card/10"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </m.div>
                </Link>

                <div className="flex items-center gap-4">
                  <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                      <ArrowDownCircle className="h-6 w-6 text-primary-foreground" />
                    </div>
                  </m.div>

                  <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      {t("deposit_transaction")}
                    </h1>
                    {/* The `#` and the bullet are chrome — knowable before the
                        fetch, so they render in both states. Only the id
                        fragment and the wallet summary wait, inside the very
                        elements that carry their typography. */}
                    <div className="flex items-center gap-3 text-muted-foreground text-sm">
                      <span className="font-mono">
                        #
                        <Loadable loading={awaitingRecord} placeholder="a1b2c3d4">
                          {transaction?.id.slice(0, 8)}
                        </Loadable>
                      </span>
                      <span>•</span>
                      <span>
                        <Loadable loading={awaitingRecord} placeholder="USDT (SPOT)">
                          {walletSummary}
                        </Loadable>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Status & Actions */}
              <div className="flex items-center gap-3">
                {/* The pill keeps its icon and its box in both states; only the
                    word inside it waits. `statusTone(undefined)` is `neutral`,
                    so a pending pill is grey rather than guessing an outcome. */}
                <StatusBadge
                  status={transaction?.status}
                  icon={statusIcon}
                  label={
                    <Loadable loading={awaitingRecord} placeholder="Completed">
                      {statusText}
                    </Loadable>
                  }
                  className="px-3 py-1.5 text-sm"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-overlay-foreground/80 hover:text-overlay-foreground hover:bg-card/10"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {tCommon("print")}
                </Button>
              </div>
            </div>

            {/* Quick Info Row */}
            <m.div
              className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 pt-4 border-t border-border"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {tCommon("created")}{" "}
                  <span className="text-foreground font-medium">
                    <Loadable
                      loading={awaitingRecord}
                      placeholder={t("january_30") + " 2026"}
                    >
                      {createdAtShort}
                    </Loadable>
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="text-sm">
                  {tCommon("amount")}{" "}
                  <span className="text-foreground font-medium">
                    {/* MoneyFigure skeletons the DIGITS and keeps the currency
                        code, so the two halves of this line never swap width. */}
                    <MoneyFigure
                      value={`${transaction?.amount ?? 0} ${transaction?.wallet?.currency ?? ""}`}
                      loading={awaitingRecord}
                      figurePlaceholder="1,234.00"
                    />
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="text-sm">
                  <Loadable loading={awaitingRecord} placeholder={tCommon("jane_doe")}>
                    {userName}
                  </Loadable>
                </span>
              </div>
            </m.div>
          </div>
        </div>
      </m.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-6">
        <AnimatePresence>
          {showSuccessMessage && (
            <m.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              <div className="bg-success/30 border border-success/30 rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-sm bg-success/50 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <h4 className="font-medium text-success">
                    {t("transaction_updated_successfully")}
                  </h4>
                  <p className="text-sm text-success">
                    {t("the_transaction_status_has_been_updated")}
                  </p>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/*
          NOT FOUND / LOAD FAILED — a banner INSIDE the page, not instead of it.

          This used to be a `min-h-[80vh]` centred column that replaced the
          entire route, so a failed fetch and a slow fetch produced two
          different documents and neither was the one the operator was on. The
          frame stays; the banner says what went wrong and offers the two things
          there are to do about it. `loadFailed` is named above the JSX because
          "there is no such deposit" is a CONCLUSION — only reachable once the
          request has finished — and pending is not.
        */}
        {loadFailed && (
          <m.div variants={itemVariants} className="mb-6">
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">
                      {error || tCommon("transaction_not_found")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("the_requested_transaction_could_not_be_located")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href="/admin/finance/deposit/log">
                    <Button variant="outline">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t("back_to_deposits")}
                    </Button>
                  </Link>
                  {error && (
                    <Button onClick={() => window.location.reload()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {tCommon("retry")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </m.div>
        )}

        {/* Status Banner */}
        <m.div variants={itemVariants} className="mb-6">
          <div
            className={cn(
              "relative overflow-hidden rounded-xl p-5 border",
              banner.tint,
              banner.border
            )}
          >
            <div className="relative flex items-center gap-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center",
                  banner.fill
                )}
              >
                <div className={cn("scale-125", banner.onFill)}>{statusIcon}</div>
              </div>
              {/* Both lines here are CONCLUSIONS about the record, so both wait
                  — but the panel, its tile and its icon are chrome and do not.
                  The old code reached this markup only after the record landed,
                  so the whole 88px band appeared at once. */}
              <div>
                <h3 className={cn("text-lg font-semibold", banner.ink)}>
                  <Loadable loading={awaitingRecord} placeholder="Completed">
                    {statusText}
                  </Loadable>
                </h3>
                <p className="text-muted-foreground text-sm">
                  <Loadable
                    loading={awaitingRecord}
                    placeholder={t("this_deposit_is_awaiting_review")}
                  >
                    {transaction?.status === "COMPLETED"
                      ? t("this_deposit_has_been_completed_successfully")
                      : transaction?.status === "PENDING"
                        ? t("this_deposit_is_awaiting_review")
                        : transaction?.status === "REJECTED"
                          ? t("this_deposit_has_been_rejected")
                          : t("transaction_status_description")}
                  </Loadable>
                </p>
              </div>
            </div>
          </div>
        </m.div>

        {/* Main Content Area */}
        <m.div variants={itemVariants}>
          <Card className=" bg-card border border-border-strong">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-6 pt-4 pb-2">
                <TabsList className="grid grid-cols-5 w-full h-12">
                  <TabsTrigger
                    value="details"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <FileText className="h-4 w-4" />
                    <span>{tCommon("details")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="user"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <User className="h-4 w-4" />
                    <span>{tCommon("user")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="wallet"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>{tCommon("wallet")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="manage"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <Shield className="h-4 w-4" />
                    <span>{tCommon("manage")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="audit"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <ScrollText className="h-4 w-4" />
                    <span>{tCommon("audit_trail")}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="px-6 pb-6 pt-4">
                {/* Details Tab */}
                <TabsContent value="details" className="mt-0 space-y-6">
                  {/* Amount Card */}
                  <div className="bg-primary/20 rounded-xl p-6 border border-primary/50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                          <DollarSign className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {tCommon("deposit_amount")}
                          </p>
                          {/* The placeholder sits INSIDE the `text-2xl
                              leading-tight` paragraph, so its box is produced by
                              the same text layout the real figure will use — and
                              it follows a typography change on its own. */}
                          <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                            <span className="font-mono tabular-nums">
                              <Loadable
                                loading={awaitingRecord}
                                placeholder="1,234.00"
                              >
                                {transaction?.amount}
                              </Loadable>
                            </span>{" "}
                            <span className="text-sm font-normal text-subtle-foreground">
                              <Loadable loading={awaitingRecord} placeholder="USDT">
                                {transaction?.wallet?.currency}
                              </Loadable>
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground">
                          {tCommon("fee")}
                        </p>
                        <p className="text-xl font-semibold leading-tight tracking-tight text-foreground">
                          <span className="font-mono tabular-nums">
                            <Loadable loading={awaitingRecord} placeholder="1.00">
                              {transaction?.fee}
                            </Loadable>
                          </span>{" "}
                          <Loadable loading={awaitingRecord} placeholder="USDT">
                            {transaction?.wallet?.currency}
                          </Loadable>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transaction ID */}
                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-sm bg-surface-3 flex items-center justify-center">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              {tCommon("transaction_id")}
                            </p>
                            <p className="font-mono text-sm">
                              <Loadable
                                loading={awaitingRecord}
                                placeholder="3f9a2c1e-7b04-4d6a-9f11-2c8e5a0b7d33"
                              >
                                {transaction?.id}
                              </Loadable>
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(transaction?.id ?? "", "txId")
                          }
                        >
                          {copiedField === "txId" ? (
                            <Check className="h-4 w-4 text-success" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Reference ID */}
                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-sm bg-surface-3 flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              {tCommon("reference_id")}
                            </p>
                            <p className="font-mono text-sm">
                              <Loadable
                                loading={awaitingRecord}
                                placeholder="REF-000000"
                              >
                                {transaction?.referenceId || "-"}
                              </Loadable>
                            </p>
                          </div>
                        </div>
                        {transaction?.referenceId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(transaction.referenceId!, "refId")
                            }
                          >
                            {copiedField === "refId" ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Transaction Hash — genuinely optional data: an off-chain
                        deposit has none, so there is nothing to reserve. */}
                    {transaction?.trxId && (
                      <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-sm bg-primary/30 flex items-center justify-center">
                              <Hash className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                {tCommon("transaction_hash")}
                              </p>
                              <p className="font-mono text-sm break-all">
                                {transaction.trxId}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(transaction?.trxId ?? "", "trxId")
                            }
                          >
                            {copiedField === "trxId" ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60 md:col-span-2">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-sm bg-surface-3 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {tCommon("description")}
                          </p>
                          <p className="text-sm mt-1">
                            <Loadable
                              loading={awaitingRecord}
                              placeholder={tCommon("no_description_provided")}
                            >
                              {transaction?.description ||
                                tCommon("no_description_provided")}
                            </Loadable>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-sm bg-surface-3 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {tCommon("created_at")}
                          </p>
                          <p className="text-sm">
                            <Loadable
                              loading={awaitingRecord}
                              placeholder={t("january_30_2026_at_4_05_pm")}
                            >
                              {createdAtFull}
                            </Loadable>
                          </p>
                        </div>
                      </div>
                    </div>

                    {transaction?.updatedAt && (
                      <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-sm bg-surface-3 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              {tCommon("updated_at")}
                            </p>
                            <p className="text-sm">
                              {format(
                                new Date(transaction.updatedAt),
                                "PPP 'at' p"
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata Section */}
                  {Object.keys(metadata).length > 0 && (
                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-xl p-5 border border-border/60 dark:border-border-strong/60">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                          <Info className="h-3.5 w-3.5" />
                        </span>
                        {t("transaction_metadata")}
                      </h3>
                      <div className="bg-muted dark:bg-surface-2/50 rounded-lg p-4">
                        <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* User Tab */}
                <TabsContent value="user" className="mt-0 space-y-6">
                  <div className="bg-primary/20 rounded-xl p-6 border border-primary/50">
                    <div className="flex items-center gap-4">
                      {/* Fixed 64px tile in both states, so the avatar
                          resolving late cannot move anything beside it. */}
                      <Avatar className="h-16 w-16 border-2 border-border-strong shadow-lg">
                        <AvatarImage src={transaction?.user?.avatar} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                          <Loadable loading={awaitingRecord} placeholder={tCommon("jane_doe")}>
                            {userName}
                          </Loadable>
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          <Loadable
                            loading={awaitingRecord}
                            placeholder="jane.doe@example.com"
                          >
                            {transaction?.user?.email}
                          </Loadable>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-sm bg-primary/15 dark:bg-primary/30 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {tCommon("user_id")}
                          </p>
                          <p className="font-mono text-sm">
                            <Loadable
                              loading={awaitingRecord}
                              placeholder="3f9a2c1e-7b04-4d6a-9f11-2c8e5a0b7d33"
                            >
                              {transaction?.user?.id}
                            </Loadable>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-sm bg-success/30 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {tCommon("deposit_amount")}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            <span className="font-mono tabular-nums">
                              <Loadable
                                loading={awaitingRecord}
                                placeholder="1,234.00"
                              >
                                {transaction?.amount}
                              </Loadable>
                            </span>{" "}
                            <Loadable loading={awaitingRecord} placeholder="USDT">
                              {transaction?.wallet?.currency}
                            </Loadable>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Wallet Tab */}
                <TabsContent value="wallet" className="mt-0 space-y-6">
                  <div className="bg-success/20 rounded-xl p-6 border border-success/50">
                    <div className="flex items-center gap-4">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                        <Wallet className="h-7 w-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                          <Loadable loading={awaitingRecord} placeholder="USDT">
                            {transaction?.wallet?.currency}
                          </Loadable>{" "}
                          {tCommon("wallet")}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tCommon("type")}:{" "}
                          <Loadable loading={awaitingRecord} placeholder="SPOT">
                            {transaction?.wallet?.type}
                          </Loadable>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-sm bg-surface-3 flex items-center justify-center">
                          <Hash className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {tCommon("wallet_id")}
                          </p>
                          <p className="font-mono text-sm">
                            <Loadable
                              loading={awaitingRecord}
                              placeholder="3f9a2c1e-7b04-4d6a-9f11-2c8e5a0b7d33"
                            >
                              {transaction?.walletId}
                            </Loadable>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-sm bg-warning/15 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {tCommon("currency")}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            <Loadable loading={awaitingRecord} placeholder="USDT">
                              {transaction?.wallet?.currency}
                            </Loadable>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-card/70 dark:bg-muted/70 backdrop-blur-sm rounded-lg p-4 border border-border/60 dark:border-border-strong/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-sm bg-primary/30 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {tCommon("type")}
                          </p>
                          <p className="text-lg font-semibold text-foreground">
                            <Loadable loading={awaitingRecord} placeholder="SPOT">
                              {transaction?.wallet?.type}
                            </Loadable>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Manage Tab */}
                <TabsContent value="manage" className="mt-0 space-y-6">
                  {!isEditable ? (
                    /*
                      The locked panel is also what a page with no record yet
                      shows, because it is the smaller of the two manage states
                      and the only one that is honest about not being able to
                      act. Its shell — tinted box, shield tile, padding — is
                      chrome and renders either way; the two sentences are
                      CONCLUSIONS about the deposit's status, so they wait.
                      Printing "this transaction cannot be modified" over a
                      record still in flight is a claim we have not earned.
                    */
                    <div className="bg-muted dark:bg-muted/50 rounded-xl p-6 text-center border border-border/60 dark:border-border-strong/60">
                      <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                        <Shield className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        <Loadable
                          loading={awaitingRecord}
                          placeholder={t("transaction_locked")}
                        >
                          {t("transaction_locked")}
                        </Loadable>
                      </h3>
                      <p className="text-sm text-subtle-foreground max-w-md mx-auto">
                        <Loadable
                          loading={awaitingRecord}
                          placeholder={t("this_transaction_cannot_be_modified_because_it_has_already_been_processed")}
                        >
                          {t("this_transaction_cannot_be_modified_because_it_has_already_been_processed")}
                        </Loadable>
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-warning/10 dark:bg-warning/20 rounded-xl p-4 border border-warning/30 dark:border-warning/50">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                          <div>
                            <h4 className="font-medium text-warning">
                              {tCommon("pending_transaction")}
                            </h4>
                            <p className="text-sm text-warning mt-1">
                              {t("you_can_modify_and_approve_or_reject_this_transaction")}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Edit Form */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="amount">{tCommon("amount")}</Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.00000001"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="bg-muted"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="fee">{tCommon("fee")}</Label>
                            <Input
                              id="fee"
                              type="number"
                              step="0.00000001"
                              value={fee}
                              onChange={(e) => setFee(e.target.value)}
                              className="bg-muted"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="referenceId">
                            {tCommon("reference_id")}
                          </Label>
                          <Input
                            id="referenceId"
                            value={referenceId}
                            onChange={(e) => setReferenceId(e.target.value)}
                            className="bg-muted"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">
                            {tCommon("description")}
                          </Label>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="bg-muted"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border-strong">
                        <Button
                          onClick={() => updateTransaction("COMPLETED")}
                          disabled={isUpdating}
                          className="flex-1 bg-success hover:bg-success text-success-foreground shadow-lg"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {t("complete_transaction")}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setShowRejectDialog(true)}
                          disabled={isUpdating}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {tCommon("reject_transaction")}
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Audit — who touched this deposit and why, plus the balance
                    ledger for the wallet it moved. Both read from append-only
                    tables; nothing on this tab can write. */}
                {/* `useAuditFeed` no-ops while every filter value is falsy, so
                    the panels mount with their own chrome and simply do not
                    fetch until the record's ids exist. */}
                <TabsContent value="audit" className="space-y-6 mt-0">
                  <RecordAuditTab
                    targetId={transaction?.id}
                    walletId={transaction?.walletId}
                  />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </m.div>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="border-border-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("reject_transaction")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tCommon("please_provide_a_reason_for_rejecting_this_transaction")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              value={rejectionMessage}
              onChange={(e) => setRejectionMessage(e.target.value)}
              placeholder={tCommon("enter_rejection_reason")}
              rows={4}
              className="bg-muted"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted dark:hover:bg-muted">
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateTransaction("REJECTED")}
              className="bg-destructive hover:bg-destructive text-destructive-foreground"
              disabled={isUpdating || !rejectionReasonValid}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t("rejecting")}...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {tCommon("reject")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </m.div>
  );
}
