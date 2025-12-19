"use client";
import { useEffect, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { HeroSection } from "@/components/ui/hero-section";

// ICO Theme hex colors for particles/orbs
const ICO_COLORS = {
  primary: "#14b8a6", // teal-500
  secondary: "#06b6d4", // cyan-500
};

export default function OfferingDetailPage() {
  const t = useTranslations("ext_admin");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [flagNotes, setFlagNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
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
    emergencyCancelOffering,
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
  const handleEmergencyCancel = async () => {
    if (!offering) return;
    setProcessingAction("cancel");
    try {
      const result = await emergencyCancelOffering(offering.id, cancelReason);
      toast({
        title: "ICO Cancelled Successfully",
        description: `Successfully cancelled and refunded ${result?.data?.successfulRefunds || 0} investors`,
      });
      setCancelDialogOpen(false);
      // Optionally redirect to list or refresh
      await fetchCurrentOffer(id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel ICO offering",
        variant: "destructive",
      });
    }
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
            {tCommon("back_to_offerings")}
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
      {/* Hero Section */}
      <HeroSection
        title={offering.name}
        titleClassName="text-3xl md:text-4xl"
        description={
          offering.tokenDetail?.description || "No description available."
        }
        descriptionClassName="text-base md:text-lg max-w-2xl"
        layout="split"
        maxWidth="max-w-full"
        paddingTop="pt-20"
        paddingBottom="pb-6"
        showBorder={false}
        background={{
          orbs: [
            {
              color: ICO_COLORS.primary,
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: ICO_COLORS.secondary,
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: [ICO_COLORS.primary, ICO_COLORS.secondary],
          size: 8,
        }}
        titleLeftContent={
          <div className="relative">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-primary/10 p-1 shadow-lg">
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
        }
        rightContent={
          <Link href="/admin/ico/offer">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {tCommon("back_to_offerings")}
            </Button>
          </Link>
        }
        rightContentAlign="start"
        bottomSlot={
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <Layers className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {tExt("token_price")}
                  </p>
                  <p className="font-semibold">
                    ${offering.tokenPrice?.toFixed(4) ?? "0.0000"}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {offering.purchaseWalletCurrency ?? "N/A"}
                    </span>
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <Users className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {tExt("participants")}
                  </p>
                  <p className="font-semibold">{offering.participants ?? 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <Calendar className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {tExt("start_date")}
                  </p>
                  <p className="font-semibold">
                    {offering.startDate
                      ? formatDate(offering.startDate)
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <Clock className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {tCommon("end_date")}
                  </p>
                  <p className="font-semibold">
                    {offering.endDate ? formatDate(offering.endDate) : "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{t("fundraising_progress")}</span>
                  <Badge variant="outline">
                    {progressPercentage.toFixed(1)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">
                      ${(offerMetrics?.currentRaised ?? 0).toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {tCommon("of")} $
                      {(offering.targetAmount ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={progressPercentage}
                    className="h-3 bg-primary/10"
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>{tExt("blockchain")}:</span>
                    <span className="font-medium text-foreground">
                      {offering.tokenDetail?.blockchain || "Not specified"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Star className="h-4 w-4" />
                    <span>{tExt("token_type")}:</span>
                    <span className="font-medium text-foreground capitalize">
                      {offering.tokenDetail?.tokenType || "Not specified"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 px-2.5 py-1">
            {offering.symbol}
          </Badge>
          {offering.website && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(offering.website, "_blank")}
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tExt("visit_website")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </HeroSection>

      {/* Main Content */}
      <div className="container mx-auto pt-6 pb-8 space-y-6">
        <div className="flex flex-col gap-6">
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
              <CardTitle>{tCommon("admin_actions")}</CardTitle>
              <CardDescription>{t("manage_this_ico_offering")}</CardDescription>
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
                      {processingAction === "approve"
                        ? "Approving..."
                        : "Approve Offering"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={processingAction === "reject"}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {t("reject_offering")}
                    </Button>
                  </>
                )}

                {["APPROVED", "ACTIVE"].includes(offering.status) && (
                  <Button
                    variant={offering.isPaused ? "default" : "outline"}
                    onClick={handlePauseResume}
                    disabled={
                      processingAction === "pause" ||
                      processingAction === "resume"
                    }
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {processingAction === "pause" ||
                    processingAction === "resume"
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
                    {tCommon("flag_for_review")}
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

                {/* Emergency Cancel - SuperAdmin Only */}
                {["ACTIVE", "APPROVED"].includes(offering.status) && (
                  <Button
                    variant="destructive"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={processingAction === "cancel"}
                    className="bg-red-600 hover:bg-red-700 border-red-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {t("emergency_cancel_refund")}
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
                  <span>{tExt("funding_progress")}</span>
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
                      {tCommon("show_less")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {tCommon("show_more")}
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                {t("database_driven_metrics_compared_platform_averages")}
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
            placeholder={tCommon("enter_rejection_reason")}
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              {tCommon("cancel")}
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
            placeholder={t("enter_flag_reason_ellipsis")}
            value={flagNotes}
            onChange={(e) => setFlagNotes(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              {tCommon("cancel")}
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

      {/* Emergency Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t("emergency_cancel_ico")}
            </DialogTitle>
            <DialogDescription>
              {t("this_will_immediately_cancel_the_ico")}{" "}
              {t("this_action_is_irreversible_and_should")}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              SuperAdmin only. Requires detailed reason for audit trail.
            </AlertDescription>
          </Alert>
          <Textarea
            placeholder={t("enter_detailed_reason_for_emergency_cancellation")}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="min-h-[120px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEmergencyCancel}
              disabled={
                cancelReason.trim().length < 10 || processingAction === "cancel"
              }
            >
              {processingAction === "cancel"
                ? "Cancelling..."
                : "Emergency Cancel & Refund All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
