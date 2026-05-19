"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowRightLeft,
  Info,
  Shield,
  Sparkles,
  ArrowRight,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { cn } from "@/lib/utils";
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

const getStatusInfo = (status: string) => {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
      return {
        label: "Completed",
        icon: <CheckCircle className="h-4 w-4" />,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800/50",
        gradient: "from-green-500 to-emerald-600",
      };
    case "PENDING":
      return {
        label: "Pending",
        icon: <Clock className="h-4 w-4" />,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800/50",
        gradient: "from-amber-500 to-orange-600",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        icon: <XCircle className="h-4 w-4" />,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800/50",
        gradient: "from-red-500 to-rose-600",
      };
    case "FAILED":
      return {
        label: "Failed",
        icon: <XCircle className="h-4 w-4" />,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800/50",
        gradient: "from-red-500 to-rose-600",
      };
    case "PROCESSING":
      return {
        label: "Processing",
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        borderColor: "border-blue-200 dark:border-blue-800/50",
        gradient: "from-blue-500 to-indigo-600",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        icon: <XCircle className="h-4 w-4" />,
        color: "text-zinc-600 dark:text-zinc-400",
        bgColor: "bg-zinc-50 dark:bg-zinc-950/30",
        borderColor: "border-zinc-200 dark:border-zinc-800/50",
        gradient: "from-zinc-500 to-zinc-600",
      };
    default:
      return {
        label: status || "Unknown",
        icon: <AlertCircle className="h-4 w-4" />,
        color: "text-zinc-600 dark:text-zinc-400",
        bgColor: "bg-zinc-50 dark:bg-zinc-950/30",
        borderColor: "border-zinc-200 dark:border-zinc-800/50",
        gradient: "from-zinc-500 to-zinc-600",
      };
  }
};

export default function TransferDetailClient() {
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
  const [rejectionMessage, setRejectionMessage] = useState(
    "Please provide a reason for rejection."
  );
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const fetchTransaction = useCallback(async () => {
    if (!params.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await $fetch({
        url: `/api/admin/finance/transaction/${params.id}`,
        silent: true,
      });

      if (fetchError) {
        setError(fetchError);
        return;
      }

      if (!data) {
        setError("Transaction not found");
        return;
      }

      setTransaction(data);
      setAmount(String(data.amount));
      setFee(String(data.fee));
      setDescription(data.description || "");
      setReferenceId(data.referenceId || "");
    } catch (err: any) {
      setError(err.message || "Failed to load transaction");
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
        referenceId,
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
        url: `/api/admin/finance/transfer/${transaction.id}`,
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
        description: err.message || "Failed to update transaction",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-12 h-12 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary" />
          </motion.div>
          <p className="text-sm text-muted-foreground">
            {tCommon("loading_transaction_details")}...
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error || !transaction) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <motion.div
          className="flex flex-col items-center gap-4 text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold">
            {error || t("transaction_not_found")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("the_requested_transaction_could_not_be_located")}
          </p>
          <div className="flex gap-2">
            <Link href="/admin/finance/transfer">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("back_to_transfers")}
              </Button>
            </Link>
            {error && (
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tCommon("retry")}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(transaction.status);
  const userName =
    `${transaction.user?.firstName || ""} ${transaction.user?.lastName || ""}`.trim() ||
    "User";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase();
  const isEditable = ["PENDING", "PROCESSING"].includes(transaction.status);

  // Parse metadata
  let metadata: Record<string, any> = {};
  try {
    metadata = transaction.metadata ? JSON.parse(transaction.metadata) : {};
  } catch (e) {
    metadata = {};
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Premium Header */}
      <motion.div variants={itemVariants} className="sticky top-0 z-50">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl"
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />
          </div>

          <div className="relative container mx-auto px-4 md:px-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left side */}
              <div className="flex items-center gap-4">
                <Link href="/admin/finance/transfer">
                  <motion.div
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  </motion.div>
                </Link>

                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-600 flex items-center justify-center shadow-lg">
                      <ArrowRightLeft className="h-6 w-6 text-white" />
                    </div>
                  </motion.div>

                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">
                      {t("transfer_transaction")}
                    </h1>
                    <div className="flex items-center gap-3 text-slate-400 text-sm">
                      <span className="font-mono">
                        #{transaction.id.slice(0, 8)}
                      </span>
                      <span>•</span>
                      <span>
                        {transaction.wallet?.currency} ({transaction.wallet?.type})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Status & Actions */}
              <div className="flex items-center gap-3">
                <Badge
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium",
                    transaction.status === "COMPLETED"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : transaction.status === "REJECTED" ||
                          transaction.status === "FAILED"
                        ? "bg-red-500/20 text-red-300 border-red-500/30"
                        : transaction.status === "PROCESSING"
                          ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  )}
                >
                  {statusInfo.icon}
                  <span className="ml-1.5">{statusInfo.label}</span>
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {tCommon("print")}
                </Button>
              </div>
            </div>

            {/* Quick Info Row */}
            <motion.div
              className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 pt-4 border-t border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {tCommon("created")}{" "}
                  <span className="text-white font-medium">
                    {format(new Date(transaction.createdAt), "PPP")}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                <DollarSign className="h-4 w-4 text-purple-400" />
                <span className="text-sm">
                  {tCommon("amount")}{" "}
                  <span className="text-white font-medium">
                    {transaction.amount} {transaction.wallet?.currency}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-400">
                <User className="h-4 w-4" />
                <span className="text-sm">{userName}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-6">
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-green-800 dark:text-green-200">
                    {t("transaction_updated_successfully")}
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t("the_transaction_status_has_been_updated")}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Banner */}
        <motion.div variants={itemVariants} className="mb-6">
          <div
            className={cn(
              "relative overflow-hidden rounded-xl p-5 border",
              statusInfo.bgColor,
              statusInfo.borderColor
            )}
          >
            <div
              className={cn(
                "absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 -translate-y-1/2 translate-x-1/4 bg-gradient-to-br",
                statusInfo.gradient
              )}
            />
            <div className="relative flex items-center gap-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                  statusInfo.gradient
                )}
              >
                <div className="text-white scale-125">{statusInfo.icon}</div>
              </div>
              <div>
                <h3 className={cn("font-bold text-lg", statusInfo.color)}>
                  {statusInfo.label}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  {transaction.status === "COMPLETED"
                    ? t("this_transfer_has_been_completed_successfully")
                    : transaction.status === "PENDING"
                      ? t("this_transfer_is_awaiting_review")
                      : transaction.status === "REJECTED"
                        ? t("this_transfer_has_been_rejected")
                        : t("transaction_status_description")}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-6 pt-4 pb-2">
                <TabsList className="grid grid-cols-4 w-full h-12">
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
                </TabsList>
              </div>

              <CardContent className="px-6 pb-6 pt-4">
                {/* Details Tab */}
                <TabsContent value="details" className="mt-0 space-y-6">
                  {/* Transfer Amount Card */}
                  <div className="bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-950/20 dark:to-cyan-950/20 rounded-xl p-6 border border-purple-200/50 dark:border-purple-800/50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-600 flex items-center justify-center shadow-lg">
                          <Send className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {t("transfer_amount")}
                          </p>
                          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            {transaction.amount}{" "}
                            <span className="text-lg text-zinc-500">
                              {transaction.wallet?.currency}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {tCommon("fee")}
                        </p>
                        <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                          {transaction.fee} {transaction.wallet?.currency}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Transfer Flow Visualization */}
                  {metadata.fromWallet && metadata.toWallet && (
                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-xl p-6 border border-zinc-200/60 dark:border-zinc-700/60">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        {t("transfer_flow")}
                      </h3>
                      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                        <div className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl p-4 text-center border border-blue-200/50 dark:border-blue-800/50">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                            {t("from_wallet")}
                          </p>
                          <p className="font-mono text-sm font-medium">
                            {metadata.fromWallet}
                          </p>
                          {metadata.fromCurrency && (
                            <Badge variant="secondary" className="mt-2">
                              {metadata.fromCurrency}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-600 flex items-center justify-center shadow-lg">
                            <ArrowRight className="h-5 w-5 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-xl p-4 text-center border border-green-200/50 dark:border-green-800/50">
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                            {t("to_wallet")}
                          </p>
                          <p className="font-mono text-sm font-medium">
                            {metadata.toWallet}
                          </p>
                          {metadata.toCurrency && (
                            <Badge variant="secondary" className="mt-2">
                              {metadata.toCurrency}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transaction ID */}
                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                            <Hash className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {tCommon("transaction_id")}
                            </p>
                            <p className="font-mono text-sm">{transaction.id}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(transaction.id, "txId")
                          }
                        >
                          {copiedField === "txId" ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Reference ID */}
                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {tCommon("reference_id")}
                            </p>
                            <p className="font-mono text-sm">
                              {transaction.referenceId || "-"}
                            </p>
                          </div>
                        </div>
                        {transaction.referenceId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(transaction.referenceId!, "refId")
                            }
                          >
                            {copiedField === "refId" ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60 md:col-span-2">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {tCommon("description")}
                          </p>
                          <p className="text-sm mt-1">
                            {transaction.description || t("no_description_provided")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {tCommon("created_at")}
                          </p>
                          <p className="text-sm">
                            {format(
                              new Date(transaction.createdAt),
                              "PPP 'at' p"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {transaction.updatedAt && (
                      <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-xl p-5 border border-zinc-200/60 dark:border-zinc-700/60">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Info className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        {t("transaction_metadata")}
                      </h3>
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4">
                        <pre className="text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* User Tab */}
                <TabsContent value="user" className="mt-0 space-y-6">
                  <div className="bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-950/20 dark:to-cyan-950/20 rounded-xl p-6 border border-purple-200/50 dark:border-purple-800/50">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-white dark:border-zinc-700 shadow-lg">
                        <AvatarImage src={transaction.user?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-cyan-600 text-white text-xl font-medium">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                          {userName}
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                          {transaction.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {tCommon("user_id")}
                          </p>
                          <p className="font-mono text-sm">
                            {transaction.user?.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {t("transfer_amount")}
                          </p>
                          <p className="text-lg font-semibold">
                            {transaction.amount} {transaction.wallet?.currency}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Wallet Tab */}
                <TabsContent value="wallet" className="mt-0 space-y-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-6 border border-green-200/50 dark:border-green-800/50">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                        <Wallet className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                          {transaction.wallet?.currency} {tCommon("wallet")}
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400">
                          {tCommon("type")}: {transaction.wallet?.type}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                          <Hash className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {tCommon("wallet_id")}
                          </p>
                          <p className="font-mono text-sm">
                            {transaction.walletId}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {tCommon("currency")}
                          </p>
                          <p className="text-lg font-semibold">
                            {transaction.wallet?.currency}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-lg p-4 border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {tCommon("type")}
                          </p>
                          <p className="text-lg font-semibold">
                            {transaction.wallet?.type}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Manage Tab */}
                <TabsContent value="manage" className="mt-0 space-y-6">
                  {!isEditable ? (
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-6 text-center border border-zinc-200/60 dark:border-zinc-700/60">
                      <div className="h-16 w-16 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center mb-4">
                        <Shield className="h-8 w-8 text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                        {t("transaction_locked")}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                        {t("this_transaction_cannot_be_modified_because_it_has_already_been_processed")}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-amber-800 dark:text-amber-200">
                              {tCommon("pending_transaction")}
                            </h4>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
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
                              className="bg-white dark:bg-zinc-800"
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
                              className="bg-white dark:bg-zinc-800"
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
                            className="bg-white dark:bg-zinc-800"
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
                            className="bg-white dark:bg-zinc-800"
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                        <Button
                          onClick={() => updateTransaction("COMPLETED")}
                          disabled={isUpdating}
                          className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-lg"
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
              </CardContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="dark:bg-zinc-900 dark:border-zinc-700">
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
              className="bg-white dark:bg-zinc-800"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-zinc-800 dark:hover:bg-zinc-700">
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateTransaction("REJECTED")}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isUpdating}
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
    </motion.div>
  );
}
