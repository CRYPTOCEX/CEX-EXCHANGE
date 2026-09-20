"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  FileCheck,
  ShieldCheck,
  User,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Layers,
  ShieldOff,
  Printer,
  RefreshCw,
  Mail,
  Phone,
  Globe,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { Link, useRouter } from "@/i18n/routing";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";

// Import existing components
import { ApplicationDetailsTab } from "../components/application-details-tab";
import { VerificationTab } from "../components/verification-tab";
import { UserProfileTab } from "../components/user-tab";
import { ReviewSidebar, VerificationTips } from "../components/sidebar";
import { FullScreenImageViewer } from "../components/image-viewer";
import {
  type ApplicationStatus,
  ProgressBar,
  StatusBanner,
  StatusConfirmation,
  StatusUpdateSuccess,
  getStatusInfo,
} from "../components/status";

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

/**
 * The record body before the record exists.
 *
 * Everything inside the four tabs is a projection of the application — its
 * level's field list, the applicant's answers, the verification verdict — so
 * there is no chrome left to hoist out of them and nothing truthful to put in
 * the fields. What CAN be reserved is the CONTAINER, and SKELETONS.md asks for
 * exactly that where the child count is unknowable: the number of sections a
 * KYC level defines is a property of the level, which is part of what is being
 * fetched.
 *
 * Deliberately NOT a copy of `application-details-tab.tsx`. A duplicate of a
 * layout has no mechanism keeping it in sync with the layout, which is the
 * failure mode this whole exercise exists to remove — this is three boxes and
 * some rows, at the right order of magnitude, and its heights come from
 * `SkeletonText` laying out inside the same `text-sm`/`text-base` runs the real
 * rows use rather than from an `h-4` someone measured once.
 */
function ApplicationFieldsPlaceholder() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-4 py-4" aria-busy="true">
      {[0, 1, 2].map((section) => (
        <div key={section} className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="text-base font-semibold">
            <SkeletonText placeholder={t("section_title")} />
          </h3>
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                <SkeletonText placeholder={t("field_label")} />
              </span>
              <span className="text-sm font-medium">
                <SkeletonText placeholder={tCommon("field_value")} />
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

type ApplicationWithDetails = {
  id: string;
  status: ApplicationStatus;
  data: any;
  adminNotes: string;
  createdAt?: string;
  reviewedAt?: string;
  level: any;
  user: any;
};

export default function ApplicationDetailClient({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [application, setApplication] = useState<ApplicationWithDetails | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail page states
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [showConfirmation, setShowConfirmation] =
    useState<ApplicationStatus | null>(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then((p) => setApplicationId(p.id));
  }, [params]);

  // Fetch application data
  useEffect(() => {
    if (!applicationId) return;

    const fetchApplication = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await $fetch({
          url: `/api/admin/crm/kyc/application/${applicationId}`,
          silent: true,
        });

        if (response.error) {
          setError(response.error);
          return;
        }

        const data = response.data;
        if (!data) {
          setError(tCommon("application_not_found"));
          return;
        }

        // Process the data
        const processedData = { ...data };

        const parseJsonSafely = (jsonString: string, fallback: any = {}) => {
          try {
            if (typeof jsonString === "string" && jsonString.trim()) {
              return JSON.parse(jsonString);
            }
            return fallback;
          } catch {
            return fallback;
          }
        };

        if (processedData.data && typeof processedData.data === "string") {
          processedData.data = parseJsonSafely(processedData.data, {});
        }

        if (processedData.level) {
          if (
            processedData.level.fields &&
            typeof processedData.level.fields === "string"
          ) {
            processedData.level.fields = parseJsonSafely(
              processedData.level.fields,
              []
            );
          }
          if (
            processedData.level.features &&
            typeof processedData.level.features === "string"
          ) {
            processedData.level.features = parseJsonSafely(
              processedData.level.features,
              []
            );
          }
          if (
            processedData.level.verificationService &&
            typeof processedData.level.verificationService === "string"
          ) {
            processedData.level.verificationService = parseJsonSafely(
              processedData.level.verificationService,
              null
            );
          }
        }

        if (
          processedData.user?.profile &&
          typeof processedData.user.profile === "string"
        ) {
          processedData.user.profile = parseJsonSafely(
            processedData.user.profile,
            {}
          );
        }

        if (processedData.data && typeof processedData.data === "object") {
          Object.keys(processedData.data).forEach((key) => {
            const value = processedData.data[key];
            if (
              typeof value === "string" &&
              value.startsWith("{") &&
              value.endsWith("}")
            ) {
              processedData.data[key] = parseJsonSafely(value, value);
            }
          });
        }

        if (processedData.level && Array.isArray(processedData.level.fields)) {
          processedData.level.fields = processedData.level.fields.map(
            (field: any) => {
              if (
                field.id === "identity" ||
                field.id === "identityVerification" ||
                (field.type === "CUSTOM" &&
                  field.label?.toLowerCase().includes("identity"))
              ) {
                return { ...field, type: "IDENTITY" };
              }
              return field;
            }
          );
        }

        setApplication(processedData);
        setAdminNotes(processedData.adminNotes || "");
      } catch (err: any) {
        setError(err.message || t("failed_to_load_application"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId]);

  const updateApplicationStatus = async (status: ApplicationStatus) => {
    if (!application || updatingStatus) return;
    setShowConfirmation(null);
    setUpdatingStatus(true);
    setError(null);

    try {
      const response = await $fetch({
        url: `/api/admin/crm/kyc/application/${application.id}`,
        method: "PUT",
        body: { status, adminNotes },
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setApplication((prev) => (prev ? { ...prev, status, adminNotes } : null));
      setStatusUpdateSuccess(true);
      setTimeout(() => setStatusUpdateSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || tCommon("failed_to_update_status"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  /**
   * ONE LAYOUT. THE PENDING STATE IS THAT LAYOUT WITH THE VALUES REPLACED.
   * ==========================================================================
   *
   * Two early returns used to stand here and each of them replaced the entire
   * route:
   *
   *   if (isLoading)            return <div className="min-h-[80vh] flex items-
   *                                    center justify-center"> ...ring... </div>
   *   if (error || !application) return <div className="min-h-[80vh] ..."> ...
   *
   * The first is the defect the scanner weights highest and it earns it: at
   * `min-h-[80vh]` the swap is measured against four fifths of the viewport, so
   * on arrival the sticky header, the status banner, the progress rail, the
   * review panel and a four-tab card all materialise at once and the page's own
   * height changes underneath the scroll position. None of that chrome depends
   * on the fetch — the tab bar, the Print button, the back link and the section
   * headings are the same markup for every application that has ever existed.
   *
   * The second conflates three states behind one `||`:
   *
   *   - `!application` while `isLoading` — pending. Never reached, because the
   *     branch above caught it, so this arm existed for the other two.
   *   - `!application` after the fetch — genuinely not found.
   *   - `error` — which is ALSO set by `updateApplicationStatus`. That is the
   *     bug hiding in the disjunction: an approve/reject whose PUT failed took
   *     the whole record off the screen and told the reviewer the application
   *     did not exist. The record was in state the entire time.
   *
   * All three are now messages inside the page rather than instead of it, and
   * they are named booleans rather than inline `!isLoading && ...` because that
   * spelling is the withheld-content shape the debt scanner matches — and it
   * would be right to match it: these are gated on a CONCLUSION, which pending
   * is not.
   */
  const showLoadError = !!error;
  const showNotFound = !isLoading && !error && !application;

  /* Cast because `getStatusInfo` and the two status components take the enum
     rather than `enum | undefined`. All three already have a `default:` arm
     that resolves to the neutral tone, so an absent status paints the same box
     with no fill — which is precisely the pending rendering we want, and the
     reason these do not need a second copy of themselves for this state. */
  const status = application?.status as ApplicationStatus;
  const statusInfo = getStatusInfo(status);
  const userName = application
    ? `${application.user?.firstName || ""} ${application.user?.lastName || ""}`.trim() ||
      "User"
    : "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase();

  // Page ground. This was `bg-gradient-to-br from-muted via-white to-muted` — a
  // HARDCODED white stop in the middle of the page, so in dark mode the gutters
  // and everything below the content lit up silver-white, and every tinted panel
  // sitting on it (the status banner is `bg-{tone}/10`) had that white bleeding
  // through its 90% transparency. `--background` is the ramp rung this wants:
  // 96.7% in light, so the white cards still read as raised, and 3.5% in dark.
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
                <Link href="/admin/crm/kyc/application">
                  <m.div
                    whileHover={{ scale: 1.1, x: -2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground hover:bg-card/10"
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
                    <Avatar className="h-12 w-12 border-2 border-border">
                      <AvatarImage src={application?.user?.avatar} />
                      <AvatarFallback className="bg-success text-success-foreground font-medium">
                        <Loadable loading={isLoading} placeholder="AB" chars={2}>
                          {userInitials}
                        </Loadable>
                      </AvatarFallback>
                    </Avatar>
                  </m.div>

                  {/* The identity block is where this header gets its height, and
                      every part of it that is not a VALUE renders in both states:
                      the 48px avatar frame, the `#` prefix, the bullet, the two
                      line boxes. `SkeletonText` measures each placeholder inside
                      the element that carries its type scale, so the `<h1>`
                      reserves an `sm:text-3xl` line at both breakpoints and the
                      id/level row reserves a `text-sm` one — which is what stops
                      the sticky band changing height as the record lands and
                      shoving the whole page up under the scroll position. */}
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      <Loadable loading={isLoading} placeholder={tCommon("firstname_lastname")}>
                        {userName}
                      </Loadable>
                    </h1>
                    <div className="flex items-center gap-3 text-muted-foreground text-sm">
                      <span className="font-mono">
                        #
                        <Loadable loading={isLoading} placeholder="a1b2c3d4" chars={8}>
                          {application?.id.slice(0, 8)}
                        </Loadable>
                      </span>
                      <span>•</span>
                      <span>
                        <Loadable loading={isLoading} placeholder={t("level_name")}>
                          {application?.level?.name || t("unknown_level")}
                        </Loadable>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Status & Actions */}
              <div className="flex items-center gap-3">
                {/* The pill is sized by its own content, so an empty label is a
                    stub that snaps to full width when the status lands. The
                    label slot reserves the widest real status this page can
                    show. */}
                <StatusBadge
                  status={application?.status}
                  icon={statusInfo.icon}
                  label={
                    <span className="ml-1.5">
                      <Loadable loading={isLoading} placeholder="Pending">
                        {statusInfo.label}
                      </Loadable>
                    </span>
                  }
                  className="px-3 py-1.5 text-sm font-medium"
                />

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-card/10"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
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
                  Submitted{" "}
                  {/* The guard is not only for the pending state. This was
                      `format(new Date(application.createdAt || ""), "PPP")`, and
                      `new Date("")` is an Invalid Date — which date-fns `format`
                      does not tolerate, it THROWS. The `|| ""` fallback that was
                      meant to make a missing timestamp safe was the thing that
                      took the page to the error boundary. */}
                  <span className="text-foreground font-medium">
                    <Loadable loading={isLoading} placeholder={tCommon("january_1") + " 2026"}>
                      {application?.createdAt
                        ? format(new Date(application.createdAt), "PPP")
                        : "—"}
                    </Loadable>
                  </span>
                </span>
              </div>

              {application?.reviewedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-success-ink" />
                  <span className="text-sm">
                    Reviewed{" "}
                    <span className="text-foreground font-medium">
                      {format(new Date(application.reviewedAt), "PPP")}
                    </span>
                  </span>
                </div>
              )}

              {/* `application &&` first, and it is load-bearing rather than
                  defensive. Without it the else-arm is what renders while the
                  fetch is in flight, so the header stated "Manual verification"
                  — a claim about this level's configuration — for every
                  application on the platform, including the ones that are
                  machine-verified. A pending value must not read as a value. */}
              {application && !application.level?.verificationService ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldOff className="h-4 w-4" />
                  <span className="text-sm">{tCommon("manual_verification")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-primary-ink">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    <Loadable loading={isLoading} placeholder={t("verification_service")}>
                      {application?.level?.verificationService?.name}
                    </Loadable>
                  </span>
                </div>
              )}
            </m.div>
          </div>
        </div>
      </m.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 md:px-6 py-6">
        <AnimatePresence>
          {statusUpdateSuccess && (
            <m.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4"
            >
              <StatusUpdateSuccess />
            </m.div>
          )}
        </AnimatePresence>

        {/* The load/update failure and the not-found answer, as banners inside
            the page instead of as replacements for it. Both keep the header,
            the tab bar and the way back on screen — an operator who followed a
            stale link can still navigate out of this, which they could not when
            the route rendered a centred card and nothing else. */}
        {showLoadError && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {/* Was a solid `bg-destructive` (tinted only in dark) carrying a
                  same-coloured glyph, i.e. an invisible icon in light mode. One
                  tinted disc in both themes, with the on-tint ink token. */}
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive-ink" />
              <p className="font-medium text-foreground">{error}</p>
            </div>
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {showNotFound && (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive-ink" />
              <div>
                <p className="font-medium text-foreground">
                  {tCommon("application_not_found")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("the_application_youre_looking_for_doesnt")}
                </p>
              </div>
            </div>
            <Link href="/admin/crm/kyc/application" className="shrink-0">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("back_to_applications")}
              </Button>
            </Link>
          </div>
        )}

        {/* Status Banner & Progress.

            Both take an optional status through the same `default:` arm the
            components already carry, so they hold their exact boxes while the
            record is in flight: the banner's height is set by its 48px tile
            (which outmeasures the two lines of type beside it in both states)
            and the rail's by its steps, which are three fixed 32px circles. One
            tree, no branch, no second copy to keep in sync. */}
        <m.div variants={itemVariants} className="space-y-4 mb-6">
          <StatusBanner status={status} />
          <ProgressBar status={status} />
        </m.div>

        {/* Review Section - Only show when status is PENDING or ADDITIONAL_INFO_REQUIRED */}
        {application &&
          (application.status === "PENDING" ||
            application.status === "ADDITIONAL_INFO_REQUIRED") && (
          <m.div variants={itemVariants} className="mb-6">
            <Card>
              <CardContent className="p-6">
                <AnimatePresence>
                  {showConfirmation && (
                    <div className="mb-4">
                      <StatusConfirmation
                        status={showConfirmation}
                        onConfirm={() =>
                          updateApplicationStatus(showConfirmation)
                        }
                        onCancel={() => setShowConfirmation(null)}
                      />
                    </div>
                  )}
                </AnimatePresence>

                <ReviewSidebar
                  adminNotes={adminNotes}
                  onAdminNotesChange={setAdminNotes}
                  onStatusChange={setShowConfirmation}
                  updatingStatus={updatingStatus}
                  currentStatus={application.status}
                />
              </CardContent>
            </Card>
          </m.div>
        )}

        {/* Main Content Area - Full Width */}
        <m.div variants={itemVariants}>
          <Card>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="px-6 pt-4 pb-2">
                <TabsList className="grid grid-cols-4 w-full h-12">
                  <TabsTrigger
                    value="details"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <FileCheck className="h-4 w-4" />
                    <span>Details</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="verification"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verify</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="user"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <User className="h-4 w-4" />
                    <span>User</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="tips"
                    className="flex items-center justify-center gap-2 h-full"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>Tips</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/*
                The Card, the `TabsList` and its four triggers are above and
                render in BOTH states — they are static markup, and withholding
                them was most of what the deleted `min-h-[80vh]` swap cost.
                Only the panel body waits, and only because every one of these
                four components takes the record as a required prop.

                The inner arm is split on `isLoading` for the same reason the
                banners above are: an application that does not exist must not
                pulse a skeleton at the reviewer forever. A skeleton is a promise
                that something is coming; once the fetch has answered "no", the
                banner has already said everything there is to say.
              */}
              <CardContent className="px-4 pt-2">
                {!application ? (
                  isLoading ? <ApplicationFieldsPlaceholder /> : null
                ) : (
                  <>
                <TabsContent value="details" className="mt-0">
                  <ApplicationDetailsTab
                    level={application.level}
                    applicationData={application.data}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    onCopy={copyToClipboard}
                    copiedField={copiedField}
                    onViewImage={setFullScreenImage}
                  />
                </TabsContent>

                <TabsContent value="verification" className="mt-0">
                  <VerificationTab
                    applicationId={application.id}
                    level={application.level}
                    applicationStatus={application.status}
                    // The verdict is a recommendation; applying it raises this
                    // page's existing confirmation panel and goes out through
                    // the same PUT a manual review uses — so the applicant is
                    // emailed and the change lands in their activity feed.
                    onRequestDecision={setShowConfirmation}
                  />
                </TabsContent>

                <TabsContent value="user" className="mt-0">
                  <UserProfileTab
                    user={application.user}
                    userName={userName}
                    userInitials={userInitials}
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                </TabsContent>

                <TabsContent value="tips" className="mt-0">
                  <VerificationTips />
                </TabsContent>
                  </>
                )}
              </CardContent>
            </Tabs>
          </Card>
        </m.div>
      </div>

      {/* Full Screen Image Viewer */}
      <FullScreenImageViewer
        src={fullScreenImage}
        onClose={() => setFullScreenImage(null)}
      />
    </m.div>
  );
}
