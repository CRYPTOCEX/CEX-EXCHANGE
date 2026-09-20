"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { statusTone } from "@/lib/status-tone";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Shield,
  Info,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  FileCheck,
  FileWarning,
  AlertOctagon,
  Check,
  X,
  Sparkles,
  Zap,
} from "lucide-react";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
interface VerificationTabProps {
  applicationId: string;
  level: any;
  /** The application's CURRENT status, so the tab can tell a recommendation
   *  that still needs acting on from one that has already been applied. */
  applicationStatus?: string;
  /** Raises the page's existing status-confirmation panel. Running the check
   *  and acting on its verdict are two decisions; this is the second one. */
  onRequestDecision?: (status: "APPROVED" | "REJECTED") => void;
}

// Update the type for VerificationStatus to include the new status values
type VerificationStatus =
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "MANUAL_REVIEW"
  | "VERIFIED"
  | "FAILED"
  | "NOT_STARTED";
/**
 * How a tone paints the non-pill surfaces of this tab (banner wash, solid tile,
 * progress fill, step labels). This is NOT a status decision — `statusTone()`
 * owns which tone a status gets; this only says what a tone looks like here.
 *
 * `fill` was `gradient: "from-{tone} to-{tone}"`, and NONE of its call sites
 * carried a `bg-gradient-*` utility — so the status tile, the progress bar fill
 * and the completed step circles all painted NOTHING, in both themes, while the
 * `text-overlay-foreground` glyphs they carried sat on the bare card. A
 * degenerate two-stop gradient is a solid colour anyway; `fill` says so.
 *
 * `ink` is the ink for glyphs sitting ON that fill and has to travel with it:
 * `--{tone}-foreground` is the token the design system pairs with each fill,
 * which also fixes `neutral`/`secondary` — near-white grounds in light mode
 * where the old hardcoded white glyph vanished.
 */
const TONE_PAINT: Record<
  BadgeTone,
  {
    text: string;
    bg: string;
    border: string;
    fill: string;
    ink: string;
  }
> = {
  primary: {
    text: "text-primary-ink",
    bg: "bg-primary/10",
    border: "border-primary/30",
    fill: "bg-primary",
    ink: "text-primary-foreground",
  },
  secondary: {
    text: "text-secondary-foreground",
    bg: "bg-secondary",
    border: "border-border-strong",
    fill: "bg-secondary",
    ink: "text-secondary-foreground",
  },
  success: {
    text: "text-success-ink",
    bg: "bg-success/10",
    border: "border-success/30",
    fill: "bg-success",
    ink: "text-success-foreground",
  },
  warning: {
    text: "text-warning-ink",
    bg: "bg-warning/10",
    border: "border-warning/30",
    fill: "bg-warning",
    ink: "text-warning-foreground",
  },
  destructive: {
    text: "text-destructive-ink",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    fill: "bg-destructive",
    ink: "text-destructive-foreground",
  },
  info: {
    text: "text-info-ink",
    bg: "bg-info/10",
    border: "border-info/30",
    fill: "bg-info",
    ink: "text-info-foreground",
  },
  neutral: {
    text: "text-subtle-foreground",
    bg: "bg-muted",
    border: "border-border-strong",
    fill: "bg-muted",
    ink: "text-foreground",
  },
};

const paintFor = (status?: string | null) => TONE_PAINT[statusTone(status)];

interface VerificationResult {
  id: string;
  applicationId: string;
  status: VerificationStatus;
  score?: number;
  service?: {
    name: string;
  };
  checks?: any;
  documentVerifications?: any; // Using any to handle both object and array types
  createdAt: string;
  updatedAt?: string;
}
export function VerificationTab({
  applicationId,
  level,
  applicationStatus,
  onRequestDecision,
}: VerificationTabProps) {
  const tDashboardAdmin = useTranslations("dashboard_admin");
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  // Parse verification service from level if it's a string
  const verificationService = level.verificationService
    ? typeof level.verificationService === "string"
      ? JSON.parse(level.verificationService)
      : level.verificationService
    : null;

  // Update the fetchVerificationResult function to handle the new response format
  const fetchVerificationResult = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await $fetch({
      url: `/api/admin/crm/kyc/service/${applicationId}/result`,
      silent: true,
    });
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }

    // Handle the case where data is an array
    if (Array.isArray(data) && data.length > 0) {
      try {
        const result = {
          ...data[0],
        };

        // Parse checks if it's a string
        if (typeof result.checks === "string") {
          result.checks = JSON.parse(result.checks);
        }

        // Parse documentVerifications if it's a string
        if (typeof result.documentVerifications === "string") {
          result.documentVerifications = JSON.parse(
            result.documentVerifications
          );
        }
        setVerificationResult(result);
      } catch (parseError) {
        console.error("Error parsing verification result:", parseError);
        setError(tDashboardAdmin("failed_to_parse_verification_result_data"));
      }
    } else if (data) {
      // Handle single object response
      try {
        const result = {
          ...data,
        };

        // Parse checks if it's a string
        if (typeof result.checks === "string") {
          result.checks = JSON.parse(result.checks);
        }

        // Parse documentVerifications if it's a string
        if (typeof result.documentVerifications === "string") {
          result.documentVerifications = JSON.parse(
            result.documentVerifications
          );
        }
        setVerificationResult(result);
      } catch (parseError) {
        console.error("Error parsing verification result:", parseError);
        setError(tDashboardAdmin("failed_to_parse_verification_result_data"));
      }
    } else {
      setVerificationResult(null);
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchVerificationResult();
  }, [applicationId, verificationService]);

  // Update the startVerification function to handle the new response format
  const startVerification = async () => {
    // Check if verification service is configured
    if (!verificationService || !verificationService.id) {
      toast({
        title: tCommon("error"),
        description: tDashboardAdmin("verification_service_is_not_configured"),
        variant: "destructive",
      });
      return;
    }
    setVerifying(true);
    setError(null);
    const { data, error } = await $fetch({
      url: `/api/admin/crm/kyc/service/${verificationService.id}/verify`,
      method: "POST",
      body: {
        applicationId,
      },
      silent: true,
    });
    if (error) {
      setError(error);
      setVerifying(false);
      return;
    }

    // Handle the response data
    try {
      let result;
      if (Array.isArray(data)) {
        // If it's an array, take the first item
        result = {
          ...data[0],
        };
      } else {
        // If it's a single object
        result = {
          ...data,
        };
      }

      // Parse checks if it's a string
      if (typeof result.checks === "string") {
        result.checks = JSON.parse(result.checks);
      }

      // Parse documentVerifications if it's a string
      if (typeof result.documentVerifications === "string") {
        result.documentVerifications = JSON.parse(result.documentVerifications);
      }
      setVerificationResult(result);
    } catch (parseError) {
      console.error("Error parsing verification result:", parseError);
      setError(tDashboardAdmin("failed_to_parse_verification_result_data"));
    }
    setVerifying(false);
  };

  // Icon, label and copy stay local; the hue comes from `statusTone()`.
  const getStatusInfo = (status: VerificationStatus) => {
    const paint = paintFor(status);
    const colors = {
      color: paint.text,
      bgColor: paint.bg,
      borderColor: paint.border,
    };
    switch (status) {
      case "VERIFIED":
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          ...colors,
          label: tCommon("verified"),
          description: tDashboardAdmin("all_verification_checks_passed_successfully"),
        };
      case "FAILED":
        return {
          icon: <XCircle className="h-5 w-5" />,
          ...colors,
          label: tCommon("failed"),
          description: tDashboardAdmin("one_or_more_verification_checks_failed"),
        };
      case "MANUAL_REVIEW":
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          ...colors,
          label: tDashboardAdmin("manual_review_required"),
          description:
            tDashboardAdmin("this_application_requires_manual_review_by"),
        };
      case "PENDING":
        return {
          icon: <Clock className="h-5 w-5" />,
          ...colors,
          label: tCommon("pending"),
          description: tDashboardAdmin("verification_is_in_progress"),
        };
      case "APPROVED":
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          ...colors,
          label: tCommon("approved"),
          description: tDashboardAdmin("this_verification_has_been_approved"),
        };
      case "REJECTED":
        return {
          icon: <XCircle className="h-5 w-5" />,
          ...colors,
          label: tCommon("rejected"),
          description: tDashboardAdmin("this_verification_has_been_rejected"),
        };
      case "NOT_STARTED":
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          ...colors,
          label: tCommon("not_started"),
          description: tDashboardAdmin("verification_has_not_been_initiated_yet"),
        };
    }
  };

  // Update the getVerificationProgress function to include the VERIFIED status
  const getVerificationProgress = (result: VerificationResult) => {
    if (!result) return 0;
    switch (result.status) {
      case "VERIFIED":
      case "APPROVED":
        return 100;
      case "FAILED":
      case "REJECTED":
        return 100;
      case "MANUAL_REVIEW":
        return 75;
      case "PENDING":
      case "PROCESSING":
        return 50;
      case "NOT_STARTED":
      default:
        return 0;
    }
  };

  // Format the AI response with proper line breaks and styling
  const formatAIResponse = (data: any) => {
  const t = useTranslations("dashboard_admin");
    if (!data) return null;

    // If data is a string, just display it directly
    if (typeof data === "string") {
      return <div className="whitespace-pre-wrap text-sm">{data}</div>;
    }

    // Otherwise, handle it as an object
    return (
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => {
          // Handle nested objects
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            return (
              <div key={key} className="mt-3">
                <h4 className="text-sm font-medium mb-2 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </h4>
                <div className="bg-muted p-3 rounded-md">
                  {Object.entries(value as Record<string, any>).map(
                    ([subKey, subValue]) => (
                      <div
                        key={subKey}
                        className="flex justify-between text-sm py-1 border-b border-border-strong last:border-0"
                      >
                        <span className="font-medium capitalize">
                          {subKey.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span>{String(subValue)}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          }

          // Handle arrays
          if (Array.isArray(value)) {
            return (
              <div key={key} className="mt-3">
                <h4 className="text-sm font-medium mb-2 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </h4>
                {value.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {value.map((item, idx) => (
                      <li key={idx} className="text-sm">
                        {String(item)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("no_issues_detected")}
                  </div>
                )}
              </div>
            );
          }

          // Handle boolean values
          if (typeof value === "boolean") {
            return (
              <div
                key={key}
                className="flex items-center justify-between text-sm py-2"
              >
                <span className="font-medium capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </span>
                <Badge
                  variant="outline"
                  className={
                    value
                      ? "bg-success/10 text-foreground border-success/30"
                      : "bg-destructive/10 text-foreground border-destructive/30"
                  }
                >
                  {value ? (
                    <>
                      <Check className="h-3 w-3 mr-1" /> Yes
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" /> No
                    </>
                  )}
                </Badge>
              </div>
            );
          }

          // Handle other primitive values
          return (
            <div
              key={key}
              className="flex items-center justify-between text-sm py-2"
            >
              <span className="font-medium capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <span>{String(value)}</span>
            </div>
          );
        })}
      </div>
    );
  };
  /**
   * THE SKELETON THAT USED TO STAND HERE WAS A SECOND, UNRELATED PAGE.
   * ==========================================================================
   *
   * `if (loading) return (...)` opened this component with 22 hand-sized boxes:
   * an `h-12 w-12` circle where the real tile is `h-14 w-14` and a ROUNDED
   * RECTANGLE, an `h-6 w-48` bar for a `text-xl` heading, and — the giveaway —
   * a 2x2 grid of four cards that appears NOWHERE in this component in any
   * state. It was a plausible-looking KYC panel that this tab has never
   * rendered, so the "skeleton" was not a low-fidelity preview of what was
   * coming; it was a different screen, and every pixel of it moved when the
   * result landed. That is the failure mode a duplicate tree always reaches,
   * because nothing keeps it in sync with the tree it imitates.
   *
   * Three states are now told apart properly, and the order matters:
   *
   *  1. NO SERVICE CONFIGURED — hoisted ABOVE what used to be the loading gate,
   *     because it is derived from `level.verificationService`, a PROP. It is
   *     knowable on the first render, before any request exists. The old order
   *     meant a level with no verification service still showed the 22-box
   *     skeleton for the length of a round trip to `/service/{id}/result`, and
   *     then replaced it with a panel that only ever says "this level does not
   *     use a service" — information the component was holding the whole time.
   *
   *  2. NO RESULT YET — the EMPTY state, and it is a conclusion. It may only be
   *     drawn once the fetch has answered, hence the `!loading` in the derived
   *     boolean; naming the boolean rather than writing `{!loading && ...}` at
   *     the JSX is deliberate, because inline is the shape that means "content
   *     withheld while pending", which is the opposite of what this is.
   *
   *  3. Everything else — pending or resolved — is ONE tree below, with the
   *     status, the progress figure and the check rows as the only values that
   *     wait. The service NAME does not: it comes from the same prop as (1).
   */

  // If no verification service is configured.
  //
  // This panel was `from-primary via-primary to-primary` in LIGHT mode — a fully
  // saturated azure card — carrying raw `text-primary` body copy and a
  // `bg-clip-text text-transparent bg-primary` heading, i.e. primary ink on a
  // primary ground: 1:1, unreadable. Dark mode only differed by
  // `dark:from-primary/30`. One tinted panel now, the same way in both themes.
  if (!verificationService) {
    return (
      <CardContent className="pt-6">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-primary/10 rounded-lg p-8 text-center border border-primary/30"
        >
          <div className="relative">
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="relative bg-primary p-5 rounded-full">
                  <Info className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-semibold leading-tight tracking-tight text-primary-ink mb-3">
              {t("no_verification_service")}
            </h3>
            <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
              {t("this_kyc_level_doesnt_have_a")}{" "}
              {t("verification_is_not_required_for_this_application_1")}
            </p>
            <div className="mt-6 inline-flex items-center gap-3 bg-card px-5 py-3 rounded-lg border border-primary/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Shield className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">
                  {tCommon("level")}
                </p>
                <p className="font-semibold text-foreground">
                  Level {level.level}: {level.name}
                </p>
              </div>
            </div>
          </div>
        </m.div>
      </CardContent>
    );
  }

  // If verification result is not available — see (2) above. "Nothing has been
  // run yet" is an answer; "we have not asked yet" is not, and this panel used
  // to be reachable only because the loading gate above happened to shadow it.
  const showStartPanel = !loading && !verificationResult;
  if (showStartPanel) {
    return (
      <CardContent className="pt-6">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-success/10 rounded-lg p-8 text-center border border-success/30"
        >
          <div className="relative">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="relative bg-success p-6 rounded-full">
                  <ShieldCheck className="h-12 w-12 text-success-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 bg-card rounded-full p-1.5 shadow-md">
                  <Sparkles className="h-4 w-4 text-warning-ink" />
                </div>
              </div>
            </div>
            <h3 className="text-2xl font-semibold leading-tight tracking-tight text-success-ink mb-3">
              {t("verification_not_started")}
            </h3>
            <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed mb-2">
              {t("this_application_has_not_been_verified_yet_1")}{" "}
              {t("click_the_button_process_using")}
            </p>
            <Badge className="bg-card text-success-ink border border-success/30 px-3 py-1 text-sm font-medium">
              <Zap className="h-3.5 w-3.5 mr-1.5 text-warning-ink" />
              {verificationService.serviceName}
            </Badge>

            <div className="mt-8">
              <Button
                onClick={startVerification}
                disabled={verifying}
                tone="success"
                className="shadow-lg shadow-success/25 px-8 py-3 h-auto text-base font-medium transition-all duration-300 hover:shadow-xl hover:shadow-success/30 hover:scale-105"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />{" "}
                    {t("starting_verification")}…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5 mr-2" />{" "}
                    {tCommon("start_verification")}
                  </>
                )}
              </Button>
            </div>
            {error && (
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-destructive-ink bg-destructive/10 p-4 rounded-xl inline-flex items-center gap-3 border border-destructive/30"
              >
                <div className="bg-destructive text-destructive-foreground p-2 rounded-full">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="font-medium">{error}</span>
              </m.div>
            )}
          </div>
        </m.div>
      </CardContent>
    );
  }

  // Display verification result.
  //
  // `verificationResult` is null only while the fetch is in flight now — the
  // resolved-and-empty case returned above — so every read below is optional and
  // resolves to the neutral, zero-progress rendering of the SAME markup. That is
  // the whole trick: there is no second tree to keep in step, so the pending
  // panel cannot disagree with the resolved one about the size of anything.
  const statusInfo = getStatusInfo(verificationResult?.status as VerificationStatus);
  const progress = verificationResult
    ? getVerificationProgress(verificationResult)
    : 0;
  // Not deferred, and worth saying why: the service name comes from the LEVEL,
  // which arrived as a prop. It is knowable on the first paint, so skeletoning
  // it would have been withholding something we already had.
  const serviceName =
    verificationResult?.service?.name || verificationService.serviceName;

  // Fill/ink for the tinted surfaces, derived from the one status table.
  // `statusTone(undefined)` is `neutral`, so the tile and the rail paint the
  // muted fill while pending instead of claiming a verdict.
  const statusPaint = paintFor(verificationResult?.status);
  const statusTile = cn(statusPaint.fill, statusPaint.ink);

  /**
   * The one thing in the status header with no text metrics of its own.
   *
   * `SkeletonBlock` cannot measure itself, so it is given the SAME `h-5 w-5` the
   * real status icons carry rather than a separately-invented size — otherwise
   * it is the old hardcoded guess with a new name. Everything else in this
   * header is type, and type gets `Loadable`.
   *
   * Written as a value rather than as a branch in the JSX so the tile itself —
   * the 56px rounded square that sets the header's height — is emitted exactly
   * once, for both states.
   */
  const statusGlyph = loading ? (
    <SkeletonBlock className="h-5 w-5 rounded-sm" />
  ) : (
    statusInfo.icon
  );

  // What the service would decide, and whether that is still outstanding.
  // Running the check no longer writes the application: this used to approve or
  // reject an applicant on one unconfirmed click, straight from the model's
  // verdict, without telling them.
  const suggestedDecision: "APPROVED" | "REJECTED" | null =
    verificationResult?.status === "VERIFIED"
      ? "APPROVED"
      : verificationResult?.status === "FAILED"
        ? "REJECTED"
        : null;
  const decisionOutstanding =
    suggestedDecision !== null &&
    applicationStatus !== suggestedDecision &&
    typeof onRequestDecision === "function";

  return (
    <CardContent className="pt-6 print:p-0">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {decisionOutstanding && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 print:hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning-ink mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">
                    {t("this_is_a_recommendation_not_a_decision")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {suggestedDecision === "APPROVED"
                      ? t("the_service_suggests_approving_this_application")
                      : t("the_service_suggests_rejecting_this_application")}{" "}
                    {t("applying_it_emails_the_applicant_and_is_recorded")}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onRequestDecision?.(suggestedDecision!)}
                tone={suggestedDecision === "APPROVED" ? "success" : "destructive"}
                className="shrink-0"
              >
                {suggestedDecision === "APPROVED"
                  ? tCommon("approve")
                  : tCommon("reject")}
              </Button>
            </div>
          </div>
        )}

        {/* Premium Verification Status Header */}
        <div
          className={cn(
            "relative overflow-hidden rounded-lg p-6 border print:border-none print:rounded-none print:p-2",
            statusInfo.bgColor,
            statusInfo.borderColor
          )}
        >
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl",
                  statusTile
                )}
              >
                <div className="scale-125">{statusGlyph}</div>
              </div>
              {/* The `h3` and the `p` are the elements that carry the type scale,
                  so the placeholders go INSIDE them: the heading's box is then
                  produced by `text-xl leading-tight` in both states and the
                  caption's by `text-sm`, with no line-height table to maintain.
                  The old skeleton put an `h-6` bar next to a `text-xl` heading
                  and an `h-4` bar next to `text-sm` — two guesses, both of which
                  stop tracking the moment either class changes. */}
              <div>
                <h3 className={cn("text-xl font-semibold leading-tight tracking-tight", statusInfo.color)}>
                  <Loadable loading={loading} placeholder={tDashboardAdmin("manual_review_required")}>
                    {statusInfo.label}
                  </Loadable>
                </h3>
                <p className="text-muted-foreground print:text-foreground text-sm">
                  <Loadable
                    loading={loading}
                    placeholder={tDashboardAdmin("all_verification_checks_passed_successfully")}
                  >
                    {statusInfo.description}
                  </Loadable>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-card text-muted-foreground border border-border-strong flex items-center gap-1.5 px-3 py-1.5 print:bg-transparent">
                <Zap className="h-3.5 w-3.5 text-warning-ink" />
                {serviceName}
              </Badge>
              {verificationResult?.status === "PENDING" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-card border-border-strong hover:bg-muted print:hidden"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Premium Verification Progress */}
        <div className="bg-card rounded-lg border border-border-strong p-5 print:border-none print:p-0 print:pt-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center",
                  statusTile
                )}
              >
                <CheckCircle className="h-3.5 w-3.5" />
              </div>
              {tCommon("verification_progress")}
            </h3>
            {/* "Verification progress", the rail, the four step circles and
                their labels are all static chrome and render in both states —
                only the figure waits. `font-mono tabular-nums` is what makes the
                three-character placeholder exactly as wide as "100", so the
                percent sign does not slide. */}
            <span className="font-mono text-2xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
              <Loadable loading={loading} placeholder="100" chars={3}>
                {progress}
              </Loadable>
              %
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden print:bg-muted">
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-3 rounded-full",
                  statusPaint.fill,
                  "print:bg-black"
                )}
              />
            </div>

            {/* Progress steps */}
            <div className="flex justify-between mt-4">
              {[
                { label: tCommon("started"), threshold: 25 },
                { label: tCommon("processing"), threshold: 50 },
                { label: tDashboardAdmin("reviewing"), threshold: 75 },
                { label: tCommon("complete"), threshold: 100 },
              ].map((step, index) => (
                <div key={step.label} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all duration-300",
                      progress >= step.threshold
                        ? cn("border-transparent", statusTile)
                        : "bg-muted text-subtle-foreground border-border"
                    )}
                  >
                    {progress >= step.threshold ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs mt-2 font-medium",
                      progress >= step.threshold
                        ? statusPaint.text
                        : "text-subtle-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Premium Verification Score.

            Still gated on the SCORE, not on `loading`, and that is the right
            call rather than an oversight: plenty of services return a verdict
            with no numeric score, so reserving this card unconditionally would
            trade a card that appears for a card that disappears — the same
            shift, in the other direction, on a different set of records. It is
            genuinely per-record optional, which is a different thing from
            content withheld because a request has not answered. */}
        {verificationResult?.score !== undefined &&
          verificationResult?.score !== null &&
          (() => {
            // One tone decision for the tile, the bar and the number.
            const scorePaint =
              verificationResult.score > 80
                ? TONE_PAINT.success
                : verificationResult.score > 60
                  ? TONE_PAINT.warning
                  : TONE_PAINT.destructive;
            return (
            <div className="bg-card rounded-lg border border-border-strong p-5 print:border-none print:p-0 print:pt-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  {/* Score tile: the three arms were `from-{tone} to-{tone}`
                      with no `bg-gradient-*` utility, so the tile painted
                      nothing and its `text-warning-foreground` glyph — a
                      near-black ink meant for a solid amber fill — sat on the
                      bare card. Solid fill plus its own paired ink, and the ink
                      now follows the arm instead of being amber in all three. */}
                  <div
                    className={cn(
                      "h-16 w-16 rounded-2xl flex items-center justify-center",
                      scorePaint.fill,
                      scorePaint.ink
                    )}
                  >
                    <AlertOctagon className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground">
                      {t("verification_score")}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-semibold leading-tight tracking-tight tabular-nums text-foreground">
                        {verificationResult.score}
                      </span>
                      <span className="font-mono text-sm tabular-nums text-subtle-foreground">
                        /100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 max-w-xs">
                  <div className="flex justify-between text-xs text-subtle-foreground mb-1.5">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: `${verificationResult.score}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn(
                        "h-3 rounded-full",
                        scorePaint.fill,
                        "print:bg-black"
                      )}
                    />
                  </div>
                  <div className="flex justify-center mt-2">
                    <Badge
                      className={cn(
                        "px-3 py-1 text-foreground",
                        scorePaint.bg,
                        scorePaint.border
                      )}
                    >
                      {verificationResult.score > 80
                        ? tCommon("excellent")
                        : verificationResult.score > 60
                          ? tCommon("moderate")
                          : tDashboardAdmin("needs_review")}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

        {/* Verification Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-primary-ink">
              {t("verification_results")}
            </span>
          </h3>

          {/* Verification Checks.

              The card SHELL — border, the muted header strip, the shield tile,
              the "Verification summary" title, the status pill — is the same
              markup whether the result is here or not, so it renders in both
              states and only the check ROWS wait. This is the block that carries
              the panel's body height, and it is also the one the deleted
              skeleton got most wrong: it drew a 2x2 grid of four cards where
              this is a single full-width card.

              The row COUNT is genuinely unknowable (it is one row per boolean
              key the service happened to return), so this reserves the container
              at four rows and lets the count settle, which is what SKELETONS.md
              asks for on a list. */}
          {verificationResult?.checks || loading ? (
            <Card className="overflow-hidden rounded-lg border-border print:border-none print:shadow-none">
              <CardHeader className="py-4 px-5 bg-muted print:bg-transparent print:p-0 print:pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                      <Shield className="h-3.5 w-3.5" />
                    </span>
                    {t("verification_summary")}
                  </CardTitle>
                  <StatusBadge
                    status={verificationResult?.status}
                    icon={statusGlyph}
                    label={
                      <Loadable loading={loading} placeholder="Verified">
                        {statusInfo.label}
                      </Loadable>
                    }
                    className="gap-1.5 px-3 py-1 print:bg-transparent"
                  />
                </div>
              </CardHeader>
              <CardContent className="py-4 px-5 print:p-0 print:py-2">
                {!verificationResult?.checks ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[0, 1, 2, 3].map((row) => (
                      <div
                        key={row}
                        className="flex items-center justify-between bg-muted p-2 rounded-md"
                      >
                        <span className="text-sm font-medium">
                          <SkeletonText placeholder={tDashboardAdmin("document_authenticity")} />
                        </span>
                        <Badge variant="outline">
                          <SkeletonText placeholder="Yes" chars={3} />
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                <div className="space-y-4">
                  {/* Display summary if it exists */}
                  {verificationResult.checks.summary &&
                    typeof verificationResult.checks.summary === "string" && (
                      <div className="bg-muted p-3 rounded-md print:bg-transparent print:p-0">
                        <p className="text-sm whitespace-pre-wrap">
                          {verificationResult.checks.summary}
                        </p>
                      </div>
                    )}

                  {/* Display boolean values */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(verificationResult.checks)
                      .filter(([key, value]) => typeof value === "boolean")
                      .map(([key, value]) => {
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between bg-muted p-2 rounded-md print:bg-transparent print:p-1"
                          >
                            <span className="text-sm font-medium capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <Badge
                              variant="outline"
                              className={
                                value
                                  ? "bg-success/10 text-foreground border-success/30 print:bg-transparent"
                                  : "bg-destructive/10 text-foreground border-destructive/30 print:bg-transparent"
                              }
                            >
                              {value ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" /> Yes
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3 mr-1" /> No
                                </>
                              )}
                            </Badge>
                          </div>
                        );
                      })}
                  </div>

                  {/* Display confidence score */}
                  {verificationResult.checks.confidenceScore !== undefined && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium">
                          {tCommon("confidence_score")}
                        </h4>
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {typeof verificationResult.checks.confidenceScore ===
                            "number" &&
                          verificationResult.checks.confidenceScore <= 1
                            ? `${verificationResult.checks.confidenceScore * 100}%`
                            : `${verificationResult.checks.confidenceScore}%`}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 print:bg-muted">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            (
                              typeof verificationResult.checks
                                .confidenceScore === "number" &&
                              verificationResult.checks.confidenceScore <= 1
                                ? verificationResult.checks.confidenceScore >
                                  0.8
                                : verificationResult.checks.confidenceScore > 80
                            )
                              ? "bg-success"
                              : (
                                    typeof verificationResult.checks
                                      .confidenceScore === "number" &&
                                    verificationResult.checks.confidenceScore <=
                                      1
                                      ? verificationResult.checks
                                          .confidenceScore > 0.6
                                      : verificationResult.checks
                                          .confidenceScore > 60
                                  )
                                ? "bg-warning"
                                : "bg-destructive",
                            "print:bg-black"
                          )}
                          style={{
                            width: `${typeof verificationResult.checks.confidenceScore === "number" && verificationResult.checks.confidenceScore <= 1 ? verificationResult.checks.confidenceScore * 100 : verificationResult.checks.confidenceScore}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Display issues */}
                  {verificationResult.checks.issues && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <FileWarning className="h-4 w-4 text-warning-ink" />
                        {t("detected_issues")}
                      </h4>
                      {Array.isArray(verificationResult.checks.issues) &&
                      verificationResult.checks.issues.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {verificationResult.checks.issues.map(
                            (issue, idx) => (
                              <li key={idx} className="text-sm text-destructive-ink">
                                {issue}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {t("no_issues_detected")}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Display extracted info */}
                  {verificationResult.checks.extractedInfo && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium mb-2">
                        {tCommon("extracted_information")}
                      </h4>
                      <div className="bg-muted p-3 rounded-md print:bg-transparent print:p-0">
                        {Object.entries(
                          verificationResult.checks.extractedInfo
                        ).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between text-sm py-1 border-b border-border-strong last:border-0"
                          >
                            <span className="font-medium capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Document Verification Results */}
          {verificationResult?.documentVerifications && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary-ink" />
                <span>{t("document_verification")}</span>
              </h3>

              <Card className="overflow-hidden print:border-none print:shadow-none">
                <CardHeader className="py-3 px-4 bg-muted print:bg-transparent print:p-0 print:pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-medium">
                      {t("document_analysis")}
                    </CardTitle>
                    <StatusBadge
                      status={verificationResult.status}
                      icon={statusInfo.icon}
                      label={statusInfo.label}
                      className="print:bg-transparent"
                    />
                  </div>
                </CardHeader>
                <CardContent className="py-3 px-4 print:p-0 print:py-2">
                  {Array.isArray(verificationResult.documentVerifications) ? (
                    // Handle array of document verifications
                    <div className="space-y-4">
                      {verificationResult.documentVerifications.map(
                        (doc, index) => {
                          return (
                            <div
                              key={index}
                              className="border rounded-lg p-3 print:border-none print:p-0 print:py-1"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">
                                  Document {index + 1}
                                </h4>
                              </div>

                              {doc.message && (
                                <div className="text-sm mt-2">
                                  <p className="font-medium">
                                    {tCommon("message")}:
                                  </p>
                                  <p className="whitespace-pre-wrap">
                                    {doc.message}
                                  </p>
                                </div>
                              )}

                              {doc.details && (
                                <div className="text-sm mt-2 bg-muted p-3 rounded-md print:bg-transparent print:p-0">
                                  <p className="font-medium mb-1">
                                    {tCommon("details")}:
                                  </p>
                                  <p className="whitespace-pre-wrap">
                                    {doc.details}
                                  </p>
                                </div>
                              )}

                              {doc.aiResponse && (
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                                    <Shield className="h-4 w-4 text-primary-ink" />
                                    {t("ai_analysis")}
                                  </h4>
                                  <div className="bg-primary/10 p-4 rounded-lg text-sm print:bg-transparent print:p-0">
                                    {formatAIResponse(doc.aiResponse)}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    // Handle single document verification object
                    <div className="border rounded-lg p-3 print:border-none print:p-0 print:py-1">
                      {verificationResult.documentVerifications &&
                        verificationResult.documentVerifications.message && (
                          <div className="text-sm mt-2">
                            <p className="font-medium">{tCommon("message")}:</p>
                            <p className="whitespace-pre-wrap">
                              {verificationResult.documentVerifications.message}
                            </p>
                          </div>
                        )}

                      {verificationResult.documentVerifications &&
                        verificationResult.documentVerifications.details && (
                          <div className="text-sm mt-2 bg-muted p-3 rounded-md print:bg-transparent print:p-0">
                            <p className="font-medium mb-1">
                              {tCommon("details")}:
                            </p>
                            <p className="whitespace-pre-wrap">
                              {verificationResult.documentVerifications.details}
                            </p>
                          </div>
                        )}

                      {verificationResult.documentVerifications &&
                        verificationResult.documentVerifications.aiResponse && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                              <Shield className="h-4 w-4 text-primary-ink" />
                              {t("ai_analysis")}
                            </h4>
                            <div className="bg-primary/10 p-4 rounded-lg text-sm print:bg-transparent print:p-0">
                              {formatAIResponse(
                                verificationResult.documentVerifications
                                  .aiResponse
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Verification Metadata */}
          <div className="mt-6 bg-muted rounded-lg p-4 print:bg-transparent print:p-0 print:pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* The three LABELS are static and always here; only the id and
                  the timestamps wait. This strip is a `flex-col sm:flex-row`, so
                  on a narrow viewport an empty value collapses each line and the
                  block loses ~60px — reserving the text keeps the footer the
                  same height at every breakpoint. */}
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{t("verification_id_1")}:</span>{" "}
                <Loadable loading={loading} placeholder="00000000-0000-0000">
                  {verificationResult?.id}
                </Loadable>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{tCommon("created")}:</span>{" "}
                <Loadable loading={loading} placeholder="1/1/2026, 12:00:00 PM">
                  {verificationResult?.createdAt
                    ? new Date(verificationResult.createdAt).toLocaleString()
                    : "—"}
                </Loadable>
              </div>
              {verificationResult?.updatedAt && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{tCommon("updated")}:</span>{" "}
                  {new Date(verificationResult.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </m.div>
    </CardContent>
  );
}
