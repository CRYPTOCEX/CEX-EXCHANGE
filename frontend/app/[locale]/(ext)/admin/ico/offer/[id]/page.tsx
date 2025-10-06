"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Layers,
  Users,
  Globe,
  Shield,
  Star,
  Calendar,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { TokenDetailsSection } from "@/app/[locale]/(ext)/admin/ico/offer/components/manage/details";
import { OfferingTimeline } from "@/app/[locale]/(ext)/admin/ico/offer/components/manage/timeline";
import { OfferingFundingChart } from "@/app/[locale]/(ext)/admin/ico/offer/components/manage/funding";
import { Link, useRouter } from "@/i18n/routing";
import { formatDate } from "@/lib/ico/utils";
import { useAdminOfferStore } from "@/store/ico/admin/admin-offer-store";
import { OfferingComparisonMetrics } from "@/app/[locale]/(ext)/admin/ico/offer/components/manage/metrics";
import { cn } from "@/lib/utils";
import { Lightbox } from "@/components/ui/lightbox";
import OfferingLoading from "./loading";
import { useTranslations } from "next-intl";

export default function OfferingDetailPage() {
  const t = useTranslations("ext");
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [flagNotes, setFlagNotes] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const {
    offering,
    offerMetrics,
    fetchCurrentOffer,
    approveOffering,
    rejectOffering,
    pauseOffering,
    resumeOffering,
    flagOffering,
    unflagOffering,
    errorOffer,
  } = useAdminOfferStore();
  useEffect(() => {
    fetchCurrentOffer(id);
  }, []);
  const handleApprove = async () => {
    if (!offering) return;
    setProcessingAction("approve");
    await approveOffering(offering.id);
    setProcessingAction(null);
  };
  const handleReject = async () => {
    if (!offering) return;
    setProcessingAction("reject");
    await rejectOffering(offering.id, rejectNotes);
    setRejectDialogOpen(false);
    setProcessingAction(null);
  };
  const handlePauseResume = async () => {
    if (!offering) return;
    const action = offering.isPaused ? "resume" : "pause";
    setProcessingAction(action);
    offering.isPaused
      ? await resumeOffering(offering.id)
      : await pauseOffering(offering.id);
    setProcessingAction(null);
  };
  const handleFlagUnflag = async () => {
    if (!offering) return;
    const action = offering.isFlagged ? "unflag" : "flag";
    setProcessingAction(action);
    offering.isFlagged
      ? await unflagOffering(offering.id)
      : await flagOffering(offering.id, flagNotes);
    setFlagDialogOpen(false);
    setProcessingAction(null);
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500/50 border-green-500/40";
      case "PENDING":
        return "bg-yellow-500/50 border-yellow-500/40";
      case "COMPLETED":
        return "bg-blue-500/50 border-blue-500/40";
      case "REJECTED":
        return "bg-red-500/50 border-red-500/40";
      default:
        return "bg-gray-500/50 border-gray-500/40";
    }
  };
  if (errorOffer) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorOffer}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/admin/ico/offer")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("back_to_offerings")}
          </Button>
        </div>
      </div>
    );
  }
  if (!offering) {
    return <OfferingLoading />;
  }
  const progressPercentage =
    ((offerMetrics?.currentRaised ?? 0) / (offering.targetAmount || 1)) * 100;
  return (
    <>
      <div className="min-h-screen pb-24">
        {/* Hero section with gradient background */}
        <div className="relative overflow-hidden mb-12 bg-gradient-to-br from-primary via-primary/90 to-primary/70 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto relative z-10 pt-8 pb-12"
          >
            <Link
              href="/admin/ico/offer"
              className="text-sm text-white/80 hover:text-white mb-4 flex items-center w-fit"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("back_to_offerings")}
            </Link>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Token Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-background/20 backdrop-blur-sm p-1 shadow-xl">
                  <div className="w-full h-full rounded-xl overflow-hidden bg-background flex items-center justify-center">
                    {offering.icon ? (
                      <Lightbox
                        src={offering.icon || "/img/placeholder.svg"}
                        alt={offering.name}
                        width={100}
                        height={100}
                        className="object-cover rounded-lg"
                      />
                    ) : (
                      <Layers className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <Badge
                  className={cn(
                    "absolute -bottom-2 right-0 px-3 py-1 font-medium border shadow-sm",
                    getStatusColor(offering.status)
                  )}
                  variant="default"
                >
                  {offering.status}
                </Badge>
              </div>
              {/* Token Info */}
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      {offering.name}
                    </h1>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-white/20 backdrop-blur-sm text-white border-white/20 px-2.5 py-1"
                      >
                        {offering.symbol}
                      </Badge>
                      {offering.website && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 bg-white/20 backdrop-blur-sm border-white/20 text-white hover:bg-white/30"
                                onClick={() =>
                                  window.open(offering.website, "_blank")
                                }
                              >
                                <Globe className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("visit_website")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-white/90 max-w-2xl">
                  {offering.tokenDetail?.description ||
                    "No description available."}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <div className="text-white/80 text-sm flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{t("token_price")}</span>
                    </div>
                    <div className="text-white font-semibold mt-1 text-lg">
                      $
                      {offering.tokenPrice?.toFixed(4) ?? "0.0000"}{" "}
                      <span className="text-sm font-normal">
                        {offering.purchaseWalletCurrency ?? "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <div className="text-white/80 text-sm flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{t("Participants")}</span>
                    </div>
                    <div className="text-white font-semibold mt-1 text-lg">
                      {offering.participants ?? 0}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <div className="text-white/80 text-sm flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{t("start_date")}</span>
                    </div>
                    <div className="text-white font-semibold mt-1 text-lg">
                      {offering.startDate ? formatDate(offering.startDate) : "N/A"}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                    <div className="text-white/80 text-sm flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{t("end_date")}</span>
                    </div>
                    <div className="text-white font-semibold mt-1 text-lg">
                      {offering.endDate ? formatDate(offering.endDate) : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">
                    {t("fundraising_progress")}
                  </h3>
                  <Badge
                    variant="outline"
                    className="bg-white/20 text-white border-white/20"
                  >
                    {progressPercentage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-white flex items-center gap-1.5">
                  <span className="font-semibold">
                    $
                    {(offerMetrics?.currentRaised ?? 0).toLocaleString()}
                  </span>
                  <span className="text-white/80">
                    {t("of_$")}
                    {(offering.targetAmount ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <Progress
                value={progressPercentage}
                className="h-2.5 bg-white/20"
              />
              <div className="flex flex-wrap gap-4 mt-4 justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Shield className="h-4 w-4" />
                    <span>{t("blockchain")}</span>
                    <span className="font-medium text-white">
                      {offering.tokenDetail?.blockchain || "Not specified"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Star className="h-4 w-4" />
                    <span>{t("token_type")}</span>
                    <span className="font-medium text-white capitalize">
                      {offering.tokenDetail?.tokenType || "Not specified"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        <div className="container mx-auto flex flex-col gap-6 relative z-20">
          {/* Alert for review notes */}
          {offering.reviewNotes && (
            <Alert
              variant={
                offering.status === "REJECTED" ? "destructive" : "default"
              }
              className="border-l-4 border-l-red-500"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("review_notes")}</AlertTitle>
              <AlertDescription className="mt-1">
                {offering.reviewNotes}
              </AlertDescription>
            </Alert>
          )}

          {/* Admin Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>
                Manage this ICO offering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {offering.status === "PENDING" && (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={processingAction === "approve"}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {processingAction === "approve" ? "Approving..." : "Approve Offering"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={processingAction === "reject"}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Reject Offering
                    </Button>
                  </>
                )}

                {["APPROVED", "ACTIVE"].includes(offering.status) && (
                  <Button
                    variant={offering.isPaused ? "default" : "outline"}
                    onClick={handlePauseResume}
                    disabled={processingAction === "pause" || processingAction === "resume"}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {processingAction === "pause" || processingAction === "resume"
                      ? "Processing..."
                      : offering.isPaused
                      ? "Resume Offering"
                      : "Pause Offering"}
                  </Button>
                )}

                {!offering.isFlagged ? (
                  <Button
                    variant="outline"
                    onClick={() => setFlagDialogOpen(true)}
                    disabled={processingAction === "flag"}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Flag for Review
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleFlagUnflag}
                    disabled={processingAction === "unflag"}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {processingAction === "unflag" ? "Unflagging..." : "Unflag"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Funding progress chart */}
          {["ACTIVE", "SUCCESS", "FAILED"].includes(offering.status) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>{t("funding_progress")}</span>
                  <Badge variant="outline" className="ml-2">
                    {offering.status === "ACTIVE" ? "Live" : "Final"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {offering.status === "ACTIVE"
                    ? "Real-time funding progress and daily contributions"
                    : "Final funding results and contribution history"}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                <OfferingFundingChart />
              </CardContent>
              <CardFooter className="text-sm text-muted-foreground border-t pt-4">
                {offering.status === "ACTIVE"
                  ? "Last updated just now. Data refreshes automatically every 5 minutes."
                  : `Final data as of ${formatDate(offering.endDate)}.`}
              </CardFooter>
            </Card>
          )}
          {/* Key metrics and comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("key_performance_metrics")}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllMetrics(!showAllMetrics)}
                  className="h-8 text-xs"
                >
                  {showAllMetrics ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      {t("show_less")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {t("show_more")}
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                {t("database-driven_metrics_compared_platform_averages")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OfferingComparisonMetrics expanded={showAllMetrics} />
            </CardContent>
          </Card>
          {/* Tabbed content */}
          <TokenDetailsSection />
          {/* Activity timeline */}
          <OfferingTimeline />
        </div>
      </div>
      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reject_offering")}</DialogTitle>
            <DialogDescription>
              {t("please_provide_a_this_offering")}.{" "}
              {t("this_information_will_project_team")}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectNotes.trim() || processingAction === "reject"}
            >
              {t("reject_offering")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("flag_offering")}</DialogTitle>
            <DialogDescription>
              {t("please_provide_a_reason_for_flagging_this_offering")}.{" "}
              {t("this_will_mark_the_offering_for_review")}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter flag reason..."
            value={flagNotes}
            onChange={(e) => setFlagNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleFlagUnflag}
              disabled={!flagNotes.trim() || processingAction === "flag"}
            >
              {t("flag_offering")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
