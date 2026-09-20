"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  FileText,
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  LockKeyhole,
  Fingerprint,
  UserCheck,
  Wallet,
  CreditCard,
  DollarSign,
  Landmark,
  AlertTriangle,
  LayersIcon,
  ShieldCheck,
  Zap,
  ChevronLeft,
  Settings,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loadable, SkeletonText } from "@/components/ui/skeleton";
import { $fetch } from "@/lib/api";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { useConfigStore } from "@/store/config";
import { useUserStore } from "@/store/user";

// Define the KycLevel type

interface KycLevel {
  id: string;
  level: number;
  name: string;
  description?: string;
  fields: any[];
  features: any[];
}

/**
 * The rows the levels list renders while the fetch is in flight.
 *
 * A list has no knowable length before it arrives, so the honest reservation is
 * a FIXED SMALL COUNT of rows inside the real container — not a guess at the
 * real one, and not nothing. Three is what the removed skeleton branch reserved,
 * so the amount of space held is unchanged — only its shape is, and the count
 * settles when the real levels land.
 *
 * These are real `KycLevel` objects rather than a separate markup branch on
 * purpose: they go through the SAME `.map()` as the real levels, so the card
 * chrome — border, icon tile, header, status row, footer button — is produced
 * by one piece of JSX in both states and cannot drift from itself. Only the
 * values inside are swapped, by `<Loadable>`.
 *
 * `fields: []` is deliberate and harmless: it makes `levelHasFields` false, so
 * a pending row falls through every status branch to the disabled footer
 * button, which is exactly the inert control a pending row should have.
 */
const PENDING_LEVELS: KycLevel[] = [1, 2, 3].map((level) => ({
  id: `pending-level-${level}`,
  level,
  name: "",
  description: "",
  fields: [],
  features: [],
}));

// Define the KycApplication type
interface KycApplication {
  id: string;
  levelId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Add other properties as needed
}

export function UserKycClient() {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { settings } = useConfigStore();
  const { setUser } = useUserStore();
  const [levels, setLevels] = useState<KycLevel[]>([]);
  const [applications, setApplications] = useState<KycApplication[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if KYC is enabled in settings (handle both string and boolean values)
  const kycEnabled =
    settings?.kycStatus === true || settings?.kycStatus === "true";

  const fetchLevelsData = async () => {
    const { data, error } = await $fetch({
      url: "/api/user/kyc/level",
      silentSuccess: true,
    });
    if (!error && data) {
      // Parse the JSON strings in the response
      return Array.isArray(data)
        ? data.map((level) => ({
            ...level,
            fields:
              typeof level.fields === "string"
                ? (() => {
                    try {
                      return JSON.parse(level.fields);
                    } catch (e) {
                      console.error("Failed to parse level fields:", e);
                      return [];
                    }
                  })()
                : level.fields || [],
            features:
              typeof level.features === "string"
                ? (() => {
                    try {
                      return JSON.parse(level.features);
                    } catch (e) {
                      console.error("Failed to parse level features:", e);
                      return [];
                    }
                  })()
                : level.features || [],
          }))
        : [];
    }
    return [];
  };
  const fetchApplicationsData = async () => {
    const { data, error } = await $fetch({
      url: "/api/user/kyc/application",
      silentSuccess: true,
    });
    if (!error) {
      return data || [];
    }
    return [];
  };
  const fetchData = async () => {
    try {
      const [levelsData, applicationsData] = await Promise.all([
        fetchLevelsData(),
        fetchApplicationsData(),
      ]);

      // Ensure levelsData and applicationsData are arrays before using array methods
      const levelsArray = Array.isArray(levelsData) ? levelsData : [];
      const applicationsArray = Array.isArray(applicationsData)
        ? applicationsData
        : [];
      setLevels(levelsArray);
      setApplications(applicationsArray);

      // Find the highest approved level
      const approvedApplications = applicationsArray.filter(
        (app) => app.status === "APPROVED"
      );
      if (approvedApplications.length > 0) {
        const highestLevel = Math.max(
          ...approvedApplications.map(
            (app) => levelsArray.find((l) => l.id === app.levelId)?.level || 0
          )
        );
        setCurrentLevel(highestLevel);
      }

      // Fire-and-forget: keep the global user store in sync so feature-gated
      // pages (e.g. /trade) reflect KYC approval without requiring a hard reload.
      $fetch({ url: "/api/user/profile", method: "GET", silentSuccess: true })
        .then(({ data: profileData }) => {
          if (profileData) setUser(profileData);
        })
        .catch(() => {
          // non-fatal — store will refresh on next navigation
        });

      setIsLoading(false);
      setError(null);
    } catch (error) {
      console.error("Error in data fetching:", error);
      setIsLoading(false);
      setError(t("failed_to_load_data_please_try_again_later"));
    }
  };
  useEffect(() => {
    if (kycEnabled) {
      fetchData();
    }
  }, [kycEnabled]);

  // If KYC is disabled, show a message with button to go to profile
  if (!kycEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4">
        <div className="relative">
          {/* Background gradient circle */}
          {/* A blurred bloom, not a gradient — both stops were `warning/20`. */}
          <div className="absolute inset-0 bg-warning/20 rounded-full blur-3xl w-64 h-64 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" />

          {/* Main content container */}
          <div className="relative bg-background/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 max-w-lg mx-auto shadow-2xl">
            {/* Icon container */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* `` with NO stops is a dead class: it emits an
                    invalid `linear-gradient(to right, )` the browser drops. */}
                <div className="bg-warning p-4 rounded-full">
                  <Settings className="w-8 h-8 text-warning-foreground" />
                </div>
                {/* Ink follows its OWN fill: this badge is destructive, so the
                    glyph was wearing the wrong tone's ink token. */}
                <div className="absolute -top-1 -right-1 bg-destructive rounded-full p-1">
                  <AlertTriangle className="w-3 h-3 text-destructive-foreground" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-foreground mb-2">
                {t("kyc_verification_disabled")}
              </h2>
              <div className="w-16 h-1 bg-warning rounded-full mx-auto" />
            </div>

            {/* Description */}
            <div className="text-center mb-8">
              <p className="text-muted-foreground leading-relaxed">
                {t("kyc_verification_is_currently")}
              </p>
            </div>

            {/* Info Alert */}
            {/* The Alert's own `tone`/`appearance` axis paints exactly this
                tint AND picks the AA-safe on-tint ink. Hand-rolling it left the
                copy on raw `--warning`, which measures 2.99:1 on its own tint. */}
            <Alert tone="warning" appearance="soft" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("kyc_verification_features_are")}
              </AlertDescription>
            </Alert>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3">
              <Link href="/user/profile">
                <Button
                  size="lg"
                  className="w-full bg-warning hover:bg-warning/90 text-warning-foreground font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  {t("go_to_profile")}
                </Button>
              </Link>
              <Link href="/">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-warning/30 text-warning hover:bg-warning/10 hover:text-warning-ink dark:hover:bg-warning/20"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  {tCommon("back_to_dashboard")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Only the SHAPE of the pill (this page uses a roomier, fully-rounded chip),
  // its icon and its translated label are decided here. Which hue a status wears
  // comes from the canonical map in `lib/status-tone.ts`.
  const STATUS_PILL = "px-3 py-1 rounded-full";
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <StatusBadge
            status={status}
            label={tCommon("approved")}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            className={STATUS_PILL}
          />
        );
      case "PENDING":
        return (
          <StatusBadge
            status={status}
            label={tCommon("pending")}
            icon={<Clock className="h-3.5 w-3.5" />}
            className={STATUS_PILL}
          />
        );
      case "REJECTED":
        return (
          <StatusBadge
            status={status}
            label={tCommon("rejected")}
            icon={<XCircle className="h-3.5 w-3.5" />}
            className={STATUS_PILL}
          />
        );
      case "ADDITIONAL_INFO_REQUIRED":
        return (
          <StatusBadge
            status={status}
            label={tCommon("info_required")}
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            className={STATUS_PILL}
          />
        );
      default:
        return <StatusBadge status={status} className={STATUS_PILL} />;
    }
  };
  const getLevelIcon = (level: number) => {
    const icons = [
      <UserCheck key="1" className="h-3.5 w-3.5" />,
      <Fingerprint key="2" className="h-3.5 w-3.5" />,
      <Wallet key="3" className="h-3.5 w-3.5" />,
      <CreditCard key="4" className="h-3.5 w-3.5" />,
      <DollarSign key="5" className="h-3.5 w-3.5" />,
      <Landmark key="6" className="h-3.5 w-3.5" />,
    ];
    return icons[(level - 1) % icons.length];
  };
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
    } catch (e) {
      return "Invalid date";
    }
  };
  // Check if a level has fields defined
  const levelHasFields = (level: KycLevel) => {
    return (
      level.fields &&
      Array.isArray(level.fields) &&
      level.fields.length > 0
    );
  };

  // Find the next available level (not necessarily currentLevel + 1)
  // Only consider levels that have fields defined
  const getNextAvailableLevel = () => {
    if (!Array.isArray(levels) || levels.length === 0) return null;
    const sortedLevels = [...levels].sort((a, b) => a.level - b.level);
    return (
      sortedLevels.find(
        (l) => l.level > currentLevel && levelHasFields(l)
      ) || null
    );
  };

  const canApplyForLevel = (levelNumber: number) => {
    // Can apply if it's the next available level after current level
    // and the level has fields defined
    const nextLevel = getNextAvailableLevel();
    return nextLevel?.level === levelNumber;
  };

  const getApplicationForLevel = (levelId: string) => {
    return Array.isArray(applications)
      ? applications.find((app) => app.levelId === levelId)
      : undefined;
  };

  // Check if there's a pending application for the next available level
  const hasNextLevelPendingApplication = () => {
    if (!Array.isArray(applications) || applications.length === 0) return false;
    const nextLevel = getNextAvailableLevel();
    if (!nextLevel) return false;
    return applications.some(
      (app) =>
        app.levelId === nextLevel.id &&
        (app.status === "PENDING" || app.status === "ADDITIONAL_INFO_REQUIRED")
    );
  };
  /*
    THE PENDING STATE IS THIS PAGE, WITH THE VALUES WITHHELD.

    What used to be here was `if (isLoading) return <grey boxes/>`: a second,
    hand-maintained copy of the page made of an `h-8 w-64` bar, three `h-40`
    rectangles and one `h-96` rectangle. It agreed with the real layout nowhere:
    the `h-8` bar stood in for a hero that is a padded slab carrying a heading,
    a paragraph, a status row and a progress panel; the single `h-96` rectangle
    stood in for the whole levels list AND the benefits panel below it. Every
    band of the page therefore reflowed the instant the fetch landed — and those
    four numbers were typed once, against a layout that has been redesigned
    since, with nothing to report that they had stopped matching.

    There is one tree below now. Chrome (headings, icons, borders, the grid, the
    copy in the benefits panel) renders immediately and never moves; only the
    figures and the level rows wait, via `<Loadable>` and `PENDING_LEVELS`.
  */

  // Calculate verification progress
  const totalLevels = levels.length;
  const verificationProgress =
    totalLevels > 0 ? (currentLevel / totalLevels) * 100 : 0;

  // Count applications by status
  const approvedCount = Array.isArray(applications)
    ? applications.filter((app) => app.status === "APPROVED").length
    : 0;
  const pendingCount = Array.isArray(applications)
    ? applications.filter(
        (app) =>
          app.status === "PENDING" || app.status === "ADDITIONAL_INFO_REQUIRED"
      ).length
    : 0;
  const rejectedCount = Array.isArray(applications)
    ? applications.filter((app) => app.status === "REJECTED").length
    : 0;

  // Check if next level application is pending
  const nextLevelPending = hasNextLevelPendingApplication();

  /* The rows the levels list renders. `PENDING_LEVELS` while the fetch is in
     flight, the real levels after — one array feeding one `.map()`, so there is
     no second copy of a level card to drift out of sync. `.slice()` because the
     sort below is in-place and `levels` is state. */
  const visibleLevels: KycLevel[] = isLoading
    ? PENDING_LEVELS
    : Array.isArray(levels)
      ? levels
      : [];

  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        {/* Hero Section */}
        {/* Hero ground: a flat `--primary` slab. `from-primary to-primary` was
            two identical stops, i.e. a solid fill written as a gradient (R3). */}
        <div className="relative bg-primary rounded-xl p-8 text-primary-foreground overflow-hidden">
          {/* `.bg-grid-white` is a plain CSS class in globals.css, not a colour
              utility, so the `/[0.05]` alpha modifier produced a class name that
              matches NOTHING — the texture never painted. */}
          <div className="absolute inset-0 bg-grid-white bg-[size:20px_20px]"></div>
          <div className="absolute right-0 top-0 h-full w-2/5 bg-card/10 transform skew-x-12 -mr-20 hidden lg:block"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Link href="/user/profile">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="bg-card/20 hover:bg-card/30 dark:bg-card/10 dark:hover:bg-card/20"
                  >
                    <ChevronLeft className="h-5 w-5 text-primary-foreground" />
                  </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">
                  {tCommon("identity_verification")}
                </h1>
              </div>
              <p className="text-primary max-w-md">
                {t("complete_verification_to_transaction_limits")}
              </p>

              {/* Both branches are one icon-bubble row of identical height, so
                  which one shows costs no layout. The COPY is the unknown: while
                  the fetch is in flight `currentLevel` is still 0, so the
                  unverified branch would assert "Not verified" about a user who
                  may well be verified. The label waits; the row does not. */}
              {currentLevel > 0 ? (
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-card/20 rounded-full p-1.5">
                    <BadgeCheck className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium">
                    {tCommon("level")}
                    {currentLevel}
                    {tCommon("verified")}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <div className="bg-card/20 rounded-full p-1.5">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <span>
                    <Loadable loading={isLoading} placeholder={tCommon("not_verified")}>
                      {tCommon("not_verified")}
                    </Loadable>
                  </span>
                </div>
              )}
            </div>

            <div className="bg-card/10 backdrop-blur-sm rounded-lg p-4 w-full md:w-auto">
              <div className="text-sm text-primary mb-1">
                {tCommon("verification_progress")}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-full md:w-48">
                  <Progress
                    value={verificationProgress}
                    className="h-2.5 bg-card/20"
                    indicatorClassName="bg-primary"
                  />
                </div>
                <span className="text-sm font-medium">
                  <Loadable loading={isLoading} placeholder="0%">
                    {Math.round(verificationProgress)}%
                  </Loadable>
                </span>
              </div>
              {/* The caption is one line in every state, so it renders in both.
                  Only its text is unknown — and it is a CONCLUSION about the
                  user's progress ("All levels completed!"), which is the last
                  thing that should be guessed at while the answer is in flight. */}
              <div className="text-xs text-primary mt-2">
                <Loadable
                  loading={isLoading}
                  placeholder={`0 ${tCommon('of_3_levels_completed')}`}
                >
                  {currentLevel === 0
                    ? t("start_verification_to_unlock_features")
                    : currentLevel === totalLevels
                      ? t("all_levels_completed")
                      : t("of_levels_completed", { currentLevel: String(currentLevel), totalLevels: String(totalLevels) })}
                </Loadable>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-warning/10 border border-warning/30 rounded-md p-3 mt-2 text-warning-ink flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* KYC Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* R3: these three stat cards used `bg-gradient-to-br from-<tone> to-card`
              to fake a tinted surface. In light mode the top-left corner was the
              saturated token at FULL opacity with `text-<tone>` copy on it — the
              headline was unreadable exactly where the number lives. A tonal card
              is a flat `/10` tint plus the derived on-tint ink. */}
          <Card
            className="overflow-hidden border border-primary/20 bg-primary/10"
            data-tour="kyc-status"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-2 text-primary-ink">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                  <Shield className="h-3.5 w-3.5" />
                </span>
                {t("current_level")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {/* "Level 2" / "Unverified" is prose, so no monospace here.
                    The placeholder is measured INSIDE this element, so it
                    carries `text-2xl leading-tight` and cannot disagree with
                    the figure it stands in for. */}
                <div className="text-2xl font-semibold leading-tight tracking-tight text-primary-ink">
                  <Loadable loading={isLoading} placeholder={tCommon("level") + " 2"}>
                    {currentLevel > 0 ? t("level", { currentLevel: String(currentLevel) }) : tCommon("unverified")}
                  </Loadable>
                </div>
                {currentLevel > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary-ink border-primary/30 px-3 py-1 rounded-full"
                  >
                    {levels.find((l) => l.level === currentLevel)?.name || ""}
                  </Badge>
                )}
              </div>
              {/* The caption line renders in BOTH states, and that is the fix:
                  it used to be gated on `currentLevel > 0`, so a verified user's
                  card grew by a line the moment the fetch landed — and because
                  the two sibling cards ALWAYS render their caption, the grid row
                  is measured by them and this card was the odd one out. The
                  unverified copy is borrowed verbatim from the hero above so no
                  new string enters the page. */}
              <p className="text-[11px] text-primary-ink mt-2">
                <Loadable
                  loading={isLoading}
                  placeholder={t("continue_verification_to_unlock_more_features")}
                >
                  {currentLevel === 0
                    ? t("start_verification_to_unlock_features")
                    : currentLevel < totalLevels
                      ? t("continue_verification_to_unlock_more_features")
                      : t("all_verification_levels_completed")}
                </Loadable>
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-success/20 bg-success/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-2 text-success-ink">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-success/15 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                {tCommon("approved")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold leading-tight tracking-tight text-success-ink font-mono tabular-nums">
                  <Loadable loading={isLoading} placeholder="0">
                    {approvedCount}
                  </Loadable>
                </div>
                <div className="text-[11px] text-success-ink">
                  {tCommon("of")}
                  <Loadable loading={isLoading} placeholder="0">
                    {Array.isArray(applications) ? applications.length : 0}
                  </Loadable>{" "}
                  {tCommon("total")}
                </div>
              </div>
              <div className="mt-2 text-[11px] text-success-ink">
                <Loadable
                  loading={isLoading}
                  placeholder={t("no_verifications_completed_yet")}
                >
                  {approvedCount > 0
                    ? `${approvedCount} verification level${approvedCount > 1 ? "s" : ""} completed`
                    : t("no_verifications_completed_yet")}
                </Loadable>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border border-warning/20 bg-warning/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-2 text-warning-ink">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                {tCommon("pending")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold leading-tight tracking-tight text-warning-ink font-mono tabular-nums">
                  <Loadable loading={isLoading} placeholder="0">
                    {pendingCount}
                  </Loadable>
                </div>
                {pendingCount > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-warning/10 text-warning-ink border-warning/30 px-3 py-1 rounded-full"
                  >
                    {tCommon("in_review")}
                  </Badge>
                )}
              </div>
              <div className="mt-2 text-[11px] text-warning-ink">
                <Loadable
                  loading={isLoading}
                  placeholder={tCommon("no_pending_applications")}
                >
                  {pendingCount > 0
                    ? `${pendingCount} application${pendingCount > 1 ? "s" : ""} awaiting review`
                    : tCommon("no_pending_applications")}
                </Loadable>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Verification Levels */}
        <div className="w-full">
          <div
            className="flex justify-between items-center mb-6"
            data-tour="kyc-submit"
          >
            <h2 className="text-xl font-semibold flex items-center text-foreground">
              <LayersIcon className="mr-2 h-5 w-5 text-primary" />
              {t("available_verification_levels")}
            </h2>

            {(() => {
              const nextLevel = getNextAvailableLevel();

              /*
                Two different states, ONE rendered control.

                While the fetch is in flight `levels` is empty, so
                `getNextAvailableLevel()` answers null and this slot rendered
                nothing — then a 40px button (`size="default"` is `h-10`)
                appeared beside a `text-xl` heading whose line box is 28px, and
                grew the row. It is also the same control as the
                already-applied case: a disabled button with an icon and a
                label. Naming that shared condition keeps it to one branch and
                keeps the row one height in every state; only the LABEL waits.
              */
              const ctaInert = isLoading || nextLevelPending;
              if (!ctaInert && !nextLevel) return null;

              if (ctaInert) {
                return (
                  <Button
                    className="bg-primary hover:bg-primary text-primary-foreground"
                    disabled
                    title={
                      isLoading
                        ? undefined
                        : t("you_already_have_a_pending_application")
                    }
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    <Loadable
                      loading={isLoading}
                      placeholder={t("start_next_level")}
                    >
                      {tCommon("application_pending")}
                    </Loadable>
                  </Button>
                );
              }

              return (
                <Link href={`/user/kyc/apply/${nextLevel!.id}`}>
                  <Button className="bg-primary hover:bg-primary text-primary-foreground">
                    <Upload className="mr-2 h-4 w-4" />
                    {t("start_next_level")}
                  </Button>
                </Link>
              );
            })()}
          </div>

          <div className="space-y-8">
            {/* Keep only the levels content here.

                The container and its `gap-6` are chrome and render in both
                states; only the ROWS wait. `PENDING_LEVELS` feeds the very same
                `.map()` below, so there is no second copy of a level card to
                drift — see the comment on that constant. */}
            <div className="grid gap-6" data-tour="kyc-level">
              {visibleLevels
                  .slice()
                  .sort((a, b) => a.level - b.level)
                  .map((level) => {
                    const application = getApplicationForLevel(level.id);
                    const isApproved = application?.status === "APPROVED";
                    const isPending =
                      application?.status === "PENDING" ||
                      application?.status === "ADDITIONAL_INFO_REQUIRED";
                    const isRejected = application?.status === "REJECTED";
                    const isAvailable = canApplyForLevel(level.level);
                    const hasNoFields = !levelHasFields(level);
                    /* "Locked" is a CONCLUSION about a level the user cannot
                       reach yet. A pending row has no fields because none have
                       arrived, which is not the same thing — without the guard
                       every pending row wore the padlock glyph and `opacity-70`
                       and claimed the level was closed to them. */
                    const isLocked =
                      !isLoading &&
                      (level.level > currentLevel + 1 || hasNoFields);
                    return (
                      <Card
                        key={level.id}
                        className={`
                        overflow-hidden transition-all duration-300 border-border-strong
                        ${isApproved ? "border-success bg-success/30" : ""}
                        ${isPending ? "border-warning/30 bg-warning/30" : ""}
                        ${isRejected ? "border-destructive bg-destructive/30" : ""}
                        ${isAvailable ? "border-primary/30 bg-primary/30" : ""}
                        ${isLocked ? "opacity-70" : ""}
                      `}
                      >
                        <CardHeader className="pb-2 relative">
                          <div className="absolute top-0 right-0 mt-4 mr-4">
                            {application && getStatusBadge(application.status)}
                          </div>
                          <div className="flex items-start gap-4">
                            <span
                              className={`
                              grid h-7 w-7 shrink-0 place-items-center rounded-sm
                              ${isApproved ? "bg-success/10 text-success-ink" : ""}
                              ${isPending ? "bg-warning/10 text-warning-ink" : ""}
                              ${isRejected ? "bg-destructive/10 text-destructive-ink" : ""}
                              ${isAvailable ? "bg-primary/15 text-primary-ink" : ""}
                              ${isLocked ? "bg-muted text-subtle-foreground" : ""}
                              ${isLoading ? "bg-muted text-subtle-foreground" : ""}`}
                            >
                              {isLocked ? (
                                <LockKeyhole className="h-3.5 w-3.5" />
                              ) : (
                                getLevelIcon(level.level)
                              )}
                            </span>
                            <div>
                              <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                                <Loadable
                                  loading={isLoading}
                                  placeholder={t("level_1_identity")}
                                >
                                  {tCommon("level")} {level.level}: {level.name}
                                </Loadable>
                                {isApproved && (
                                  <BadgeCheck className="h-5 w-5 text-success ml-1" />
                                )}
                              </CardTitle>
                              <CardDescription className="mt-1 text-muted-foreground">
                                <Loadable
                                  loading={isLoading}
                                  placeholder={t("complete_level_1_verification")}
                                >
                                  {level.description ||
                                    t("complete_level_verification", { level: String(level.level) })}
                                </Loadable>
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pb-2">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2 mt-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {tCommon("application_status")}:
                                </span>
                                <span className="font-medium text-foreground">
                                  <Loadable
                                    loading={isLoading}
                                    placeholder={tCommon("not_started")}
                                  >
                                    {application?.status === "APPROVED" &&
                                      tCommon("approved")}
                                    {application?.status === "PENDING" &&
                                      tCommon("under_review")}
                                    {application?.status ===
                                      "ADDITIONAL_INFO_REQUIRED" &&
                                      t("additional_info_required")}
                                    {application?.status === "REJECTED" &&
                                      tCommon("rejected")}
                                    {!application && tCommon("not_started")}
                                  </Loadable>
                                </span>
                              </div>

                              {application?.status === "PENDING" && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      {tCommon("verification_progress")}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {(application as any)
                                        ?.verificationProgress || 30}
                                      %
                                    </span>
                                  </div>
                                  <Progress
                                    value={
                                      (application as any)
                                        ?.verificationProgress || 30
                                    }
                                    className="h-2"
                                  />
                                </div>
                              )}

                              {application?.createdAt && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {tCommon("submitted")}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {formatDate(
                                      application.createdAt.toString()
                                    )}
                                  </span>
                                </div>
                              )}

                              {application?.updatedAt &&
                                application?.status !== "PENDING" && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      {tCommon("last_updated")}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {formatDate(
                                        application.updatedAt.toString()
                                      )}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="pt-2 pb-4">
                          {isApproved ? (
                            <Button
                              variant="outline"
                              className="w-full bg-success/10 border-success/30 text-foreground hover:bg-success/10 hover:text-foreground"
                              disabled
                            >
                              <BadgeCheck className="mr-2 h-4 w-4" />
                              {tCommon("verified")}
                            </Button>
                          ) : isPending ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() =>
                                router.push(
                                  `/user/kyc/application/${application?.id}`
                                )
                              }
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              {tCommon("view_application")}
                            </Button>
                          ) : isRejected ? (
                            <Button
                              variant="outline"
                              className="w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() =>
                                router.push(`/user/kyc/apply/${level.id}`)
                              }
                            >
                              <ArrowUpRight className="mr-2 h-4 w-4" />
                              {t("apply_again")}
                            </Button>
                          ) : isAvailable ? (
                            <Link
                              href={`/user/kyc/apply/${level.id}`}
                              className="w-full"
                            >
                              <Button className="w-full bg-primary hover:bg-primary text-primary-foreground">
                                <Upload className="mr-2 h-4 w-4" />
                                {tCommon("start_verification")}
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              variant="outline"
                              className="w-full"
                              disabled
                            >
                              {/* The button, its border and its height are the
                                  same in every state — only the label is
                                  unknown. A pending row falls through to this
                                  branch (no application, no fields yet), and
                                  "Level not configured" is a conclusion it has
                                  no business asserting while the level is still
                                  loading. */}
                              {isLoading ? (
                                <SkeletonText placeholder={tCommon("start_verification")} />
                              ) : hasNoFields ? (
                                <>
                                  <AlertCircle className="mr-2 h-4 w-4" />
                                  {t("level_not_configured")}
                                </>
                              ) : isLocked ? (
                                <>
                                  <LockKeyhole className="mr-2 h-4 w-4" />
                                  {t("complete_previous_level")}
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {tCommon("already_completed")}
                                </>
                              )}
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
            </div>

            {/* Benefits section */}
            <div className="bg-muted rounded-xl p-6 mt-8">
              <h3 className="text-lg font-medium mb-4 text-foreground">
                {t("benefits_of_verification")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/15 p-2 rounded-full text-primary-ink">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">
                      {t("higher_limits")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t("increase_your_transaction_and_withdrawal_limits")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-success/10 p-2 rounded-full text-success-ink">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">
                      {t("enhanced_security")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t("protect_your_account_with_verified_identity")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/15 p-2 rounded-full text-primary-ink">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">
                      {t("exclusive_features")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t("access_premium_features_and_opportunities")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
