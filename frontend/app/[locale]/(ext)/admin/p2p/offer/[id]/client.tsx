"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  User,
  Clock,
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit3,
  Flag,
  Ban,
  FileText,
  Activity,
  MessageSquare,
  Hash,
  Calendar,
  MapPin,
  Globe,
  Percent,
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  Play,
  Pause,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { adminOffersStore } from "@/store/p2p/admin-offers-store";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { format } from "date-fns";

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
} as const;

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

interface OfferViewClientProps {
  id: string;
}

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "bg-linear-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:text-green-400 dark:border-green-800";
    case "PENDING":
    case "PENDING_APPROVAL":
      return "bg-linear-to-r from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200 dark:from-yellow-950 dark:to-amber-950 dark:text-yellow-400 dark:border-yellow-800";
    case "COMPLETED":
      return "bg-linear-to-r from-blue-50 to-cyan-50 text-blue-700 border-blue-200 dark:from-blue-950 dark:to-cyan-950 dark:text-blue-400 dark:border-blue-800";
    case "DISABLED":
    case "REJECTED":
      return "bg-linear-to-r from-red-50 to-rose-50 text-red-700 border-red-200 dark:from-red-950 dark:to-rose-950 dark:text-red-400 dark:border-red-800";
    case "PAUSED":
      return "bg-linear-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200 dark:from-amber-950 dark:to-orange-950 dark:text-amber-400 dark:border-amber-800";
    case "FLAGGED":
      return "bg-linear-to-r from-orange-50 to-red-50 text-orange-700 border-orange-200 dark:from-orange-950 dark:to-red-950 dark:text-orange-400 dark:border-orange-800";
    default:
      return "bg-linear-to-r from-zinc-50 to-slate-50 text-zinc-700 border-zinc-200 dark:from-zinc-800 dark:to-slate-800 dark:text-zinc-400 dark:border-zinc-700";
  }
};

const getOfferTypeColor = (type: string) => {
  return type?.toUpperCase() === "BUY"
    ? "bg-linear-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25"
    : "bg-linear-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25";
};

const getStatusInfo = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return {
        label: "Active",
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800/50",
        gradient: "from-green-500 to-emerald-600",
      };
    case "PENDING":
    case "PENDING_APPROVAL":
      return {
        label: "Pending",
        icon: <Clock className="h-4 w-4" />,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800/50",
        gradient: "from-amber-500 to-orange-600",
      };
    case "DISABLED":
    case "REJECTED":
      return {
        label: status === "DISABLED" ? "Disabled" : "Rejected",
        icon: <XCircle className="h-4 w-4" />,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800/50",
        gradient: "from-red-500 to-rose-600",
      };
    case "PAUSED":
      return {
        label: "Paused",
        icon: <Pause className="h-4 w-4" />,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        borderColor: "border-amber-200 dark:border-amber-800/50",
        gradient: "from-amber-500 to-orange-600",
      };
    case "FLAGGED":
      return {
        label: "Flagged",
        icon: <Flag className="h-4 w-4" />,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-950/30",
        borderColor: "border-orange-200 dark:border-orange-800/50",
        gradient: "from-orange-500 to-red-600",
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

export default function OfferViewClient({ id }: OfferViewClientProps) {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const router = useRouter();
  const {
    offer,
    isLoadingOffer,
    offerError,
    getOfferById,
    approveOffer,
    rejectOffer,
    flagOffer,
    disableOffer,
    pauseOffer,
    activateOffer,
    addNote
  } = adminOffersStore();

  const [activeTab, setActiveTab] = useState("details");
  const [actionDialog, setActionDialog] = useState({
    open: false,
    type: "",
    reason: "",
    notes: "",
  });
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getOfferById(id);
    }
  }, [id, getOfferById]);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAction = async () => {
    if (!id) return;

    try {
      switch (actionDialog.type) {
        case "approve":
          await approveOffer(id, actionDialog.notes);
          toast({
            title: "Offer Approved",
            description: "The offer has been approved successfully.",
          });
          break;
        case "reject":
          await rejectOffer(id, actionDialog.reason);
          toast({
            title: "Offer Rejected",
            description: "The offer has been rejected.",
          });
          break;
        case "flag":
          await flagOffer(id, actionDialog.reason);
          toast({
            title: "Offer Flagged",
            description: "The offer has been flagged for review.",
          });
          break;
        case "disable":
          await disableOffer(id, actionDialog.reason);
          toast({
            title: "Offer Disabled",
            description: "The offer has been disabled.",
          });
          break;
        case "pause":
          await pauseOffer(id);
          toast({
            title: "Offer Paused",
            description: "The offer has been paused.",
          });
          break;
        case "activate":
          await activateOffer(id);
          toast({
            title: "Offer Activated",
            description: "The offer has been activated.",
          });
          break;
      }

      setActionDialog({ open: false, type: "", reason: "", notes: "" });
      getOfferById(id);
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;

    setIsAddingNote(true);
    try {
      await addNote(id, newNote);
      setNewNote("");
      toast({
        title: "Note Added",
        description: "Your note has been added successfully.",
      });
      getOfferById(id);
    } catch (error) {
      toast({
        title: "Failed to Add Note",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAddingNote(false);
    }
  };

  // Loading state
  if (isLoadingOffer) {
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
            <div className="w-12 h-12 rounded-full border-2 border-blue-500/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-blue-500" />
          </motion.div>
          <p className="text-sm text-muted-foreground">
            {tCommon("loading")}...
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (offerError || !offer) {
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
            {offerError || tExt("offer_not_found")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("the_requested_offer_could_not_be_found")}
          </p>
          <div className="flex gap-2">
            <Link href="/admin/p2p/offer">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("back_to_offers")}
              </Button>
            </Link>
            {offerError && (
              <Button onClick={() => getOfferById(id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tCommon("retry")}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(offer.status);
  const userName = `${offer.user?.firstName || ""} ${offer.user?.lastName || ""}`.trim() || "User";

  return (
    <motion.div
      className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Premium Header */}
      <motion.div variants={itemVariants} className="sticky top-0 z-50">
        <div className="bg-linear-to-r from-blue-600 via-violet-600 to-blue-700 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"
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
                <Link href="/admin/p2p/offer">
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
                    <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                  </motion.div>

                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">
                      {offer.type} {offer.currency} {tExt("offer")}
                    </h1>
                    <div className="flex items-center gap-3 text-slate-300 text-sm">
                      <span className="font-mono">
                        #{offer.id.slice(0, 8)}
                      </span>
                      <span>•</span>
                      <span>
                        {format(new Date(offer.createdAt), "PPP")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Status & Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={`${getOfferTypeColor(offer.type)} text-xs`}>
                  {offer.type}
                </Badge>
                <Badge className={`${getStatusColor(offer.status)} text-xs`} variant="outline">
                  {offer.status}
                </Badge>

                {/* Action Buttons */}
                {(offer.status === "PENDING" || offer.status === "PENDING_APPROVAL") && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                      onClick={() => setActionDialog({ open: true, type: "approve", reason: "", notes: "" })}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1 text-green-400" />
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                      onClick={() => setActionDialog({ open: true, type: "reject", reason: "", notes: "" })}
                    >
                      <XCircle className="h-4 w-4 mr-1 text-red-400" />
                      Reject
                    </Button>
                  </>
                )}
                {offer.status === "ACTIVE" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                      onClick={() => setActionDialog({ open: true, type: "pause", reason: "", notes: "" })}
                    >
                      <Pause className="h-4 w-4 mr-1 text-amber-400" />
                      Pause
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                      onClick={() => setActionDialog({ open: true, type: "flag", reason: "", notes: "" })}
                    >
                      <Flag className="h-4 w-4 mr-1 text-orange-400" />
                      Flag
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/10"
                      onClick={() => setActionDialog({ open: true, type: "disable", reason: "", notes: "" })}
                    >
                      <Ban className="h-4 w-4 mr-1 text-red-400" />
                      Disable
                    </Button>
                  </>
                )}
                {(offer.status === "PAUSED" || offer.status === "DISABLED" || offer.status === "REJECTED") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => setActionDialog({ open: true, type: "activate", reason: "", notes: "" })}
                  >
                    <Play className="h-4 w-4 mr-1 text-green-400" />
                    Activate
                  </Button>
                )}

                <Link href={`/admin/p2p/offer/${id}/edit`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    {tCommon("edit")}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Info Row */}
            <motion.div
              className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 pt-4 border-t border-white/10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 text-slate-300">
                <DollarSign className="h-4 w-4 text-blue-400" />
                <span className="text-sm">
                  {tCommon("price")}{" "}
                  <span className="text-white font-medium">
                    {offer.price} {offer.fiatCurrency}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">
                  {tCommon("available")}{" "}
                  <span className="text-white font-medium">
                    {offer.availableAmount} {offer.currency}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <User className="h-4 w-4" />
                <span className="text-sm">{userName}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-6">
        {/* Status Banner */}
        <motion.div variants={itemVariants} className="mb-6">
          <div
            className={`relative overflow-hidden rounded-xl p-5 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}
          >
            <div
              className={`absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 -translate-y-1/2 translate-x-1/4 bg-linear-to-br ${statusInfo.gradient}`}
            />
            <div className="relative flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center bg-linear-to-br shadow-lg ${statusInfo.gradient}`}
              >
                <div className="text-white scale-125">{statusInfo.icon}</div>
              </div>
              <div>
                <h3 className={`font-bold text-lg ${statusInfo.color}`}>
                  {statusInfo.label}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  {offer.status === "ACTIVE"
                    ? t("this_offer_is_currently_active_and_visible")
                    : offer.status === "PENDING" || offer.status === "PENDING_APPROVAL"
                      ? t("this_offer_is_awaiting_approval")
                      : offer.status === "DISABLED"
                        ? t("this_offer_has_been_disabled")
                        : offer.status === "REJECTED"
                          ? t("this_offer_has_been_rejected")
                          : offer.status === "PAUSED"
                            ? t("this_offer_is_currently_paused")
                            : offer.status === "FLAGGED"
                              ? t("this_offer_has_been_flagged_for_review")
                              : t("offer_status_description")}
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
                    <span>{t("user_info")}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Activity</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Notes</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="px-6 pb-6 pt-4">
                {/* Details Tab */}
                <TabsContent value="details" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Offer Information */}
                    <Card className="border-0 bg-white/80 dark:bg-zinc-800/80 shadow-lg backdrop-blur-sm rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-blue-500" />
                          {tExt("offer_information")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Type</p>
                            <p className="font-semibold">{offer.type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Currency</p>
                            <p className="font-semibold">{offer.currency}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Price</p>
                            <p className="font-semibold">{offer.price} {offer.fiatCurrency}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{tExt("market_diff")}</p>
                            <p className="font-semibold flex items-center gap-1">
                              {(offer.margin ?? 0) > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                              )}
                              {Math.abs(offer.margin ?? 0)}%
                            </p>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("amount_range")}</p>
                            <p className="font-semibold">
                              {offer.minAmount} - {offer.maxAmount} {offer.currency}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{tExt("available_amount")}</p>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={((offer.availableAmount ?? 0) / (offer.maxAmount ?? 1)) * 100}
                                className="flex-1"
                              />
                              <span className="text-sm font-medium">
                                {offer.availableAmount} {offer.currency}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Payment Methods */}
                    <Card className="border-0 bg-white/80 dark:bg-zinc-800/80 shadow-lg backdrop-blur-sm rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-blue-500" />
                          {tExt("payment_methods")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {offer.paymentMethods?.map((method: any) => (
                          <div key={method.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <div className="w-10 h-10 bg-white dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                              {method.icon ? (
                                <img src={method.icon} alt={method.name} className="w-6 h-6" />
                              ) : (
                                <CreditCard className="h-5 w-5 text-zinc-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{method.name}</p>
                              {method.details && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {Object.entries(method.details).map(([key, value]) => (
                                    <span key={key}>{key}: {String(value)} </span>
                                  ))}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {(!offer.paymentMethods || offer.paymentMethods.length === 0) && (
                          <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                            {tCommon("no_payment_methods")}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Trading Terms */}
                    <Card className="border-0 bg-white/80 dark:bg-zinc-800/80 shadow-lg backdrop-blur-sm rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-500" />
                          {tCommon('trade_terms')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("payment_time_limit")}</p>
                          <p className="font-semibold">{offer.paymentTimeLimit || 15} minutes</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("auto_reply_message")}</p>
                          <p className="text-sm p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            {offer.autoReplyMessage || "No auto-reply message set"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{tExt("terms_conditions")}</p>
                          <p className="text-sm p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            {offer.terms || "Standard platform terms apply"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Statistics */}
                    <Card className="border-0 bg-white/80 dark:bg-zinc-800/80 shadow-lg backdrop-blur-sm rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-500" />
                          Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {offer.stats?.totalTrades || 0}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{tExt("total_trades")}</p>
                          </div>
                          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {offer.stats?.completedTrades || 0}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Completed</p>
                          </div>
                          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {offer.stats?.avgCompletionTime || 0}m
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("avg_time")}</p>
                          </div>
                          <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {offer.stats?.successRate || 0}%
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{tCommon("success_rate")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* User Tab */}
                <TabsContent value="user" className="mt-0 space-y-6">
                  <Card className="border-0 bg-white/80 dark:bg-zinc-800/80 shadow-lg backdrop-blur-sm rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-500" />
                        {tCommon("user_information")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                          <AvatarImage src={offer.user?.avatar} />
                          <AvatarFallback className="bg-linear-to-r from-blue-500 to-violet-500 text-white text-lg">
                            {offer.user?.firstName?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {userName}
                          </h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{offer.user?.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              KYC {offer.user?.kycStatus || "PENDING"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {tCommon("member_since")} {new Date(offer.user?.createdAt || Date.now()).getFullYear()}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {offer.user?.stats?.totalOffers || 0}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("total_offers")}</p>
                        </div>
                        <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            {offer.user?.stats?.completedTrades || 0}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{tExt("completed_trades")}</p>
                        </div>
                        <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                            {offer.user?.stats?.rating || 0}★
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Rating</p>
                        </div>
                        <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {offer.user?.stats?.disputes || 0}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Disputes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="mt-0 space-y-6">
                  <Card className="border-0 bg-white/80 dark:bg-zinc-800/80 shadow-lg backdrop-blur-sm rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        {t("activity_log")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {offer.activityLog?.map((activity: any, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.type}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {activity.notes || "No description"}
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                              {new Date(activity.createdAt).toLocaleString()}
                              {activity.adminName && ` by ${activity.adminName}`}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(!offer.activityLog || offer.activityLog.length === 0) && (
                        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                          {t("no_activity_recorded_yet")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="mt-0 space-y-6">
                  <Card className="border-0 bg-white/80 dark:bg-zinc-800/80 shadow-lg backdrop-blur-sm rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        {tCommon("admin_notes")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {offer.adminNotes && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm">{offer.adminNotes}</p>
                        </div>
                      )}

                      <div className="space-y-3">
                        <Textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder={t("add_a_note_about_this_offer_ellipsis")}
                          className="min-h-[100px]"
                        />
                        <Button
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || isAddingNote}
                          className="w-full"
                        >
                          {isAddingNote ? "Adding..." : "Add Note"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, type: "", reason: "", notes: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "approve" && "Approve Offer"}
              {actionDialog.type === "reject" && "Reject Offer"}
              {actionDialog.type === "flag" && "Flag Offer"}
              {actionDialog.type === "disable" && "Disable Offer"}
              {actionDialog.type === "pause" && "Pause Offer"}
              {actionDialog.type === "activate" && "Activate Offer"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "approve" && "Are you sure you want to approve this offer? It will become active on the platform."}
              {actionDialog.type === "reject" && "Please provide a reason for rejecting this offer."}
              {actionDialog.type === "flag" && "Please provide a reason for flagging this offer for review."}
              {actionDialog.type === "disable" && "Please provide a reason for disabling this offer."}
              {actionDialog.type === "pause" && "Are you sure you want to pause this offer? It can be reactivated later."}
              {actionDialog.type === "activate" && "Are you sure you want to activate this offer?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {actionDialog.type === "approve" ? (
              <div>
                <Label htmlFor="notes">{t("notes_optional")}</Label>
                <Textarea
                  id="notes"
                  value={actionDialog.notes}
                  onChange={(e) => setActionDialog({ ...actionDialog, notes: e.target.value })}
                  placeholder={t("add_any_notes_about_the_approval_ellipsis")}
                />
              </div>
            ) : actionDialog.type !== "pause" && actionDialog.type !== "activate" ? (
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={actionDialog.reason}
                  onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
                  placeholder={t("enter_the_reason_ellipsis")}
                  required
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: "", reason: "", notes: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionDialog.type !== "approve" && actionDialog.type !== "pause" && actionDialog.type !== "activate" && !actionDialog.reason.trim()}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
