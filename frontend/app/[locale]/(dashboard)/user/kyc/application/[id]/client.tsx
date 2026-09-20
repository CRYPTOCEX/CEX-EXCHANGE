"use client";

import type React from "react";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Shield,
  FileText,
  Info,
  Calendar,
  CheckSquare,
  MessageSquare,
  HelpCircle,
  Download,
  Layers,
  ArrowUpRight,
  Fingerprint,
  Lock,
  ChevronRight,
  Camera,
  CreditCard,
  Landmark,
  MapPin,
  User,
  CheckCheck,
  ShieldCheck,
  BadgeCheck,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { statusTone } from "@/lib/status-tone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loadable } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { m, AnimatePresence } from "framer-motion";
import { Lightbox } from "@/components/ui/lightbox";
import { $fetch } from "@/lib/api";
import {
  isKycDocumentValue,
  isLegacyKycDocumentPath,
} from "@/utils/kyc-upload";
import { useRouter, Link } from "@/i18n/routing";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Define the KycApplication type

interface KycApplication {
  id: string;
  status: string;
  level: {
    name: string;
    fields: any[];
    features: any[];
  };
  data: any;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  verificationResult?: VerificationResult;
}
type VerificationStatus =
  | "VERIFIED"
  | "FAILED"
  | "MANUAL_REVIEW"
  | "PENDING"
  | "NOT_STARTED"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED";
interface VerificationResult {
  status: VerificationStatus;
  score: number;
  checks: Record<string, any> | string;
}

/**
 * The shape the page renders against while the fetch is in flight.
 *
 * NOT a second layout: the same JSX reads this and the real application, with
 * `<Loadable>` withholding each value, so the pending page and the resolved
 * page cannot be different trees — which is the failure this whole file used to
 * demonstrate, with a `max-w-4xl` spinner page standing in for a `max-w-5xl`
 * one.
 *
 * Every field here is inert filler that never reaches the screen: `Loadable`
 * renders its placeholder INSTEAD of its children, so the empty id and the
 * unparseable dates are evaluated and discarded, never painted. `status` is
 * `PENDING` because the panel's tone has to resolve to something, and pending
 * is the honest one.
 */
const PENDING_APPLICATION: KycApplication = {
  id: "",
  status: "PENDING",
  level: { name: "", fields: [], features: [] },
  data: {},
  createdAt: "",
  updatedAt: "",
};

// Improved verification score chart component with better rendering
const VerificationScoreChart = ({
  score = 0,
  checks = {},
  passedChecks = 0,
  totalChecks = 0,
  pending = false,
}: {
  score: number;
  checks: Record<string, any>;
  passedChecks: number;
  totalChecks: number;
  /**
   * The score is not in yet. The gauge keeps its 192px box — it already has a
   * pre-hydration placeholder of exactly that size — instead of painting a
   * confident "0%" at the user while the fetch is in flight.
   */
  pending?: boolean;
}) => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if dark mode is active
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    // Watch for dark mode changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isClient || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /**
     * A canvas cannot take a class or resolve `var(--x)`, so the tokens have to
     * be read as real values off <html>. They are re-read on every draw — this
     * effect re-runs when `isDarkMode` flips — because caching them at mount is
     * what leaves a gauge painted for dark mode after a switch to light.
     *
     * Tokens are stored as bare `H S% L%` triples, so they are wrapped here.
     * `hsl(<triple> / <a>)` is the ONLY correct way to get a translucent token:
     * appending hex alpha to the wrapped string produces a value that
     * `addColorStop` THROWS on, taking the whole draw call with it.
     */
    const cs = getComputedStyle(document.documentElement);
    const token = (name: string, alpha = 1) => {
      const triple = cs.getPropertyValue(`--${name}`).trim();
      if (!triple) return "transparent";
      return alpha === 1 ? `hsl(${triple})` : `hsl(${triple} / ${alpha})`;
    };

    // Set canvas dimensions with device pixel ratio for high-resolution rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw background circle
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Draw background circle with gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    bgGradient.addColorStop(0, token("muted"));
    bgGradient.addColorStop(1, token("border"));
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = bgGradient;
    ctx.fill();

    // Draw progress arc with gradient
    const startAngle = -0.5 * Math.PI; // Start at top
    const endAngle = startAngle + 2 * Math.PI * (score / 100);
    // Status ramp (R2): pass / partial / fail. The two stops are the SAME token
    // at two alphas, so the sheen follows the token in both themes instead of
    // hardcoding a second, unrelated hue.
    const statusToken =
      score >= 70 ? "success" : score >= 40 ? "warning" : "destructive";
    const progressGradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    progressGradient.addColorStop(0, token(statusToken));
    progressGradient.addColorStop(1, token(statusToken, 0.78));
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fillStyle = progressGradient;
    ctx.fill();

    // Add shadow to the progress arc. `--shadow` is the panel's shadow-colour
    // token — the same one every `shadow-*` utility rides — so a canvas drop
    // shadow must read it too or the owner can recolour the whole app's depth
    // and this one gauge keeps painting black.
    ctx.shadowColor = token("shadow", 0.1);
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw inner circle (to create donut) with subtle gradient
    const innerGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      radius * 0.5,
      centerX,
      centerY,
      radius * 0.7
    );
    // The donut hole has to read as the card showing through, so it starts on
    // --card and steps one rung along the surface ramp.
    innerGradient.addColorStop(0, token("card"));
    innerGradient.addColorStop(1, token("surface-2"));
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.7, 0, 2 * Math.PI);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw text with subtle shadow
    ctx.fillStyle = token("card-foreground"); // sits on the --card donut hole
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add subtle text shadow. In light this is a shadow (--shadow); in dark it
    // flips to a white sheen, which is a BEVEL HIGHLIGHT rather than a shadow —
    // and a highlight is white in both themes, which is exactly what
    // --overlay-foreground is. Two different tracks, so two different tokens.
    ctx.shadowColor = isDarkMode
      ? token("overlay-foreground", 0.1)
      : token("shadow", 0.1);
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(`${Math.round(score)}%`, centerX, centerY);
    /* `pending` is in here because it decides whether the canvas is MOUNTED at
       all. Without it the draw would be skipped while the placeholder is up
       (no ref yet) and never re-run if the score happened to land on the same
       value it defaults to — a permanently blank gauge on any application
       scoring 0. */
  }, [isClient, score, isDarkMode, pending]);
  /* One boolean, named, so the branch below stays a plain value swap between
     two same-sized boxes: the canvas only draws once we are on the client AND
     there is a score to draw. */
  const showGauge = isClient && !pending;
  return (
    <div className="flex flex-col items-center p-4">
      <div className="relative w-48 h-48">
        {showGauge ? (
          <m.div
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
          >
            <canvas
              ref={canvasRef}
              width={192}
              height={192}
              style={{
                width: "192px",
                height: "192px",
              }}
            />
          </m.div>
        ) : (
          <div className="w-48 h-48 rounded-full bg-muted animate-pulse" />
        )}
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          {/* "No verification checks performed yet" is a CONCLUSION about a
              finished fetch. While one is in flight the caption reserves its
              line and says nothing. */}
          <Loadable loading={pending} placeholder={`0 ${tCommon('of_2_checks_passed')}`}>
            {totalChecks > 0
              ? t("of_checks_passed", { passedChecks: String(passedChecks), totalChecks: String(totalChecks) })
              : t("no_verification_checks_performed_yet")}
          </Loadable>
        </p>
      </div>
    </div>
  );
};

// Document preview component with improved styling
const DocumentPreview = ({
  document,
  type,
  path,
}: {
  document: any;
  type: string;
  path?: string;
}) => {
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  /*
   * A document the storage migration has not moved does NOT render the old
   * way — 6.7.2 refuses that path at both doors, so it 404s. Rendering it
   * would show the applicant a broken image with nothing explaining it, which
   * reads as "my documents were lost". It takes the unavailable state instead,
   * and loses its download link, because the download 404s too.
   */
  const awaitingMigration = isLegacyKycDocumentPath(path);
  const servablePath = awaitingMigration ? undefined : path;
  // The hover lift is motion's. There is no hover ELEVATION any more: the
  // Ledger card shell carries no shadow, so the `hover:shadow-md` this used
  // to wear (and the JS `boxShadow` before it, which hardcoded the shadow
  // colour past --shadow) are both gone. The lift alone reads the affordance.
  return (
    <m.div
      whileHover={{
        y: -5,
      }}
      transition={{
        duration: 0.2,
      }}
      className="border border-border rounded-lg overflow-hidden transition-all duration-200"
    >
      {/* Two identical stops = a flat `--muted` header strip, not a gradient. */}
      <div className="bg-muted p-3 flex justify-between items-center border-b">
        <div className="flex items-center">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
            <FileText className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium text-sm capitalize">
            {type.replace(/-/g, " ")}
          </span>
        </div>
        {servablePath && (
          <a
            href={servablePath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button variant="ghost" size="sm" className="rounded-full">
              <Download className="h-4 w-4 mr-1" />
              <span className="text-xs">{tCommon("download")}</span>
            </Button>
          </a>
        )}
      </div>
      <div className="aspect-[3/2] bg-muted relative">
        {servablePath ? (
          <Lightbox
            src={servablePath}
            alt={type}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {awaitingMigration
                  ? tDashboard("document_temporarily_unavailable")
                  : tDashboard("document_preview_protected")}
              </p>
            </div>
          </div>
        )}
      </div>
    </m.div>
  );
};

// Add this function to parse JSON strings safely
const safeJsonParse = (
  jsonString: string | null | undefined,
  fallback: any = {}
) => {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return fallback;
  }
};

// Field icon mapping with improved styling
const getFieldIcon = (fieldType: string) => {
  switch (fieldType.toUpperCase()) {
    case "TEXT":
      return <FileText className="h-4 w-4" />;
    case "IDENTITY":
      return <CreditCard className="h-4 w-4" />;
    case "FILE":
    case "IMAGE":
      return <Camera className="h-4 w-4" />;
    case "ADDRESS":
      return <MapPin className="h-4 w-4" />;
    case "CHECKBOX":
      return <CheckSquare className="h-4 w-4" />;
    case "SELECT":
    case "RADIO":
      return <ChevronRight className="h-4 w-4" />;
    case "DATE":
      return <Calendar className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

// Verification step component
const VerificationStep = ({
  icon: Icon,
  title,
  description,
  status,
}: {
  /**
   * The glyph only — NOT a rendered element. The rung owns its ink: the call
   * sites used to hand in `<Fingerprint className="text-warning" />`, which
   * put an amber glyph inside whatever bubble the tone resolved to (blue, once
   * `current` started reading as IN_PROGRESS).
   */
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
}) => {
  const tCommon = useTranslations("common");
  // A rung of the stepper is a state — done, in flight, not reached yet — so its
  // hue is resolved through the canonical map rather than decided here. The
  // positional words are translated to the status each rung actually represents.
  const tone: BadgeTone =
    status === "completed"
      ? statusTone("COMPLETED")
      : status === "current"
        ? statusTone("IN_PROGRESS")
        : "neutral";
  return (
    <div className="flex items-start space-x-3">
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          TONE_BUBBLE[tone]
        )}
      >
        {status === "completed" ? (
          <CheckCircle className={cn("h-5 w-5", TONE_INK[tone])} />
        ) : (
          <Icon className={cn("h-4 w-4", TONE_INK[tone])} />
        )}
      </div>
      <div>
        <div className="flex items-center">
          <h4 className="font-medium text-sm">{title}</h4>
          {status === "current" && (
            <Badge tone={tone} className="ml-2 text-[10px]">
              {tCommon("in_progress")}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
};

/**
 * How a tone is PAINTED on this page's large status surfaces. Which tone a
 * status gets is decided once, in `lib/status-tone.ts` — these tables carry no
 * status knowledge at all.
 */
const TONE_PANEL: Record<BadgeTone, string> = {
  primary: "bg-primary/10 text-primary-ink border-primary/20",
  secondary: "bg-secondary text-secondary-foreground border-transparent",
  success: "bg-success/10 text-success-ink border-success/20",
  warning: "bg-warning/10 text-warning-ink border-warning/20",
  destructive: "bg-destructive/10 text-destructive-ink border-destructive/20",
  info: "bg-info/10 text-info-ink border-info/20",
  neutral: "bg-muted text-foreground border-border-strong",
};

/** Left-ruled note panel (admin notes / rejection reason). */
const TONE_NOTE: Record<BadgeTone, string> = {
  primary: "border-l-primary bg-primary/10",
  secondary: "border-l-border-strong bg-muted",
  success: "border-l-success bg-success/10",
  warning: "border-l-warning bg-warning/10",
  destructive: "border-l-destructive bg-destructive/10",
  info: "border-l-info bg-info/10",
  neutral: "border-l-border-strong bg-muted",
};

/** Round bubble behind a tone's icon. */
const TONE_BUBBLE: Record<BadgeTone, string> = {
  primary: "bg-primary/15",
  secondary: "bg-muted",
  success: "bg-success/15",
  warning: "bg-warning/15",
  destructive: "bg-destructive/15",
  info: "bg-info/15",
  neutral: "bg-muted",
};

/** Ink for a glyph or a line of copy sitting on the tone's own tint. */
const TONE_INK: Record<BadgeTone, string> = {
  primary: "text-primary-ink",
  secondary: "text-secondary-foreground",
  success: "text-success-ink",
  warning: "text-warning-ink",
  destructive: "text-destructive-ink",
  info: "text-info-ink",
  neutral: "text-subtle-foreground",
};

// Update the getVerificationProgress function to handle REJECTED status
const getVerificationProgress = (result: VerificationResult | undefined) => {
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

// Main component
export function ApplicationDetailsClient() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const { id } = useParams() as {
    id: string;
  };
  const router = useRouter();
  const { toast } = useToast();
  const [application, setApplication] = useState<KycApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showSupport, setShowSupport] = useState(false);

  // Fetch application data with useCallback to prevent unnecessary re-renders
  const fetchApplication = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await $fetch({
        url: `/api/user/kyc/application/${id}`,
        silentSuccess: true,
      });
      if (error) {
        throw new Error(error);
      }

      // Deconstruct the data object
      const { level: fetchedLevel, ...fetchedApplication } = data;

      // Parse the JSON strings
      const parsedData = safeJsonParse(fetchedApplication.data);
      const parsedFields = safeJsonParse(fetchedLevel.fields);
      const parsedFeatures = safeJsonParse(fetchedLevel.features);

      // Create the application object with parsed data
      setApplication({
        ...fetchedApplication,
        data: parsedData,
        level: {
          ...fetchedLevel,
          fields: parsedFields,
          features: parsedFeatures,
        },
      });
    } catch (error) {
      console.error("Failed to fetch KYC application:", error);
      toast({
        title: tCommon("error"),
        description: t("failed_to_load_kyc_application_details"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id]); // Only depend on the id parameter

  // Call fetchApplication only once when the component mounts
  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);
  // Which ICON a status gets is a label decision and stays here; the hue comes
  // from the canonical status map.
  const getStatusIcon = (status: string) => {
    const cls = cn("h-8 w-8", TONE_INK[statusTone(status)]);
    switch (status) {
      case "APPROVED":
        return <CheckCircle className={cls} />;
      case "PENDING":
        return <Clock className={cls} />;
      case "REJECTED":
        return <XCircle className={cls} />;
      case "ADDITIONAL_INFO_REQUIRED":
        return <AlertTriangle className={cls} />;
      default:
        return <Info className={cls} />;
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "Your KYC application has been approved. You now have full access to all features.";
      case "PENDING":
        return "Your KYC application is currently under review. This process typically takes 1-3 business days.";
      case "REJECTED":
        return "Your KYC application has been rejected. Please review the admin notes for more information.";
      case "ADDITIONAL_INFO_REQUIRED":
        return "Additional information is required to complete your KYC verification. Please review the admin notes and update your application.";
      default:
        return "Status information unavailable.";
    }
  };
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const renderFieldValue = (field: any, value: any) => {
    if (!value) return "Not provided";
    switch (field.type) {
      case "DATE":
        return formatDate(value);
      case "CHECKBOX":
        return value ? "Yes" : "No";
      case "SELECT":
      case "RADIO": {
        const option = field.options?.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      case "IMAGE":
      case "FILE":
        return value.name || "File uploaded";
      case "ADDRESS":
        return `${value.street || ""}, ${value.city || ""}, ${value.state || ""}, ${value.zip || ""}, ${value.country || ""}`;
      case "IDENTITY":
        return `${value.documentType || "ID"} (${value.documentNumber || "No number provided"})`;
      default:
        return typeof value === "object" ? JSON.stringify(value) : value;
    }
  };

  // Fix the renderApplicationData function to properly handle empty or missing fields
  const renderApplicationData = (data: any, fields: any) => {
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-subtle-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {tCommon("no_application_data")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {tCommon("no_application_data_was_found")}.{" "}
            {t("this_may_be_additional_information")}.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {fields.map((field: any, index: number) => {
          if (field.type === "SECTION") {
            return (
              <div key={field.id || index} className="mt-8 mb-4">
                <h3 className="text-lg font-semibold mb-2 text-foreground flex items-center">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  {field.label}
                </h3>
                {field.description && (
                  <p className="text-sm text-muted-foreground mb-4 ml-9">
                    {field.description}
                  </p>
                )}
                {field.fields && renderApplicationData(data, field.fields)}
              </div>
            );
          }

          // Make sure field.id exists and is a valid key in data
          if (!field.id || !data) {
            return null;
          }
          const value = data[field.id];
          return (
            <m.div
              key={field.id || index}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.05,
              }}
              className="grid grid-cols-3 gap-4 items-start rounded-lg p-3 hover:bg-muted transition-colors"
            >
              <div className="col-span-1">
                <div className="flex items-center">
                  <span className="mr-2 text-primary-ink bg-primary/10 p-1 rounded-md">
                    {getFieldIcon(field.type)}
                  </span>
                  <p className="font-medium text-sm">{field.label}</p>
                  {field.required && (
                    <span className="ml-1 text-destructive text-xs">*</span>
                  )}
                  {field.description && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">
                            {field.description}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                  )}
                </div>
                {!field.description && !field.tooltip && (
                  <p className="text-xs text-muted-foreground ml-7">
                    {field.placeholder || " "}
                  </p>
                )}
              </div>
              <div
                className={cn(
                  "col-span-2 p-3 rounded-md",
                  field.type === "IDENTITY" ||
                    field.type === "FILE" ||
                    field.type === "IMAGE"
                    ? "bg-muted"
                    : "bg-muted"
                )}
              >
                <p className="text-sm break-words">
                  {renderFieldValue(field, value)}
                </p>
              </div>
            </m.div>
          );
        })}
      </div>
    );
  };

  // Update the renderDocumentsTab function to handle the parsed data structure
  const renderDocumentsTab = (application: KycApplication) => {
    // Check if there's any document data in the application
    const hasDocuments =
      application.data &&
      typeof application.data === "object" &&
      Object.entries(application.data).some(([key, value]) => {
        // Check for direct file paths
        if (isKycDocumentValue(value)) {
          return true;
        }

        // Check for nested document objects
        if (value && typeof value === "object") {
          return Object.entries(value).some(
            ([nestedKey, nestedValue]) => isKycDocumentValue(nestedValue)
          );
        }
        return false;
      });
    if (!hasDocuments) {
      return (
        <div className="text-center py-16">
          <div className="bg-muted rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-10 w-10 text-subtle-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {tCommon("no_documents_found")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {tCommon("no_documents_were_found_in_your_application")}.{" "}
            {t("this_may_be_document_verification")}.
          </p>
        </div>
      );
    }

    // Collect all document files from the data
    const documents: Array<{
      key: string;
      path: string;
      label: string;
    }> = [];

    // Function to extract documents from data
    const extractDocuments = (data: any, prefix = "") => {
      if (!data || typeof data !== "object") return;
      Object.entries(data).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (isKycDocumentValue(value)) {
          // This is a document file path
          documents.push({
            key: fullKey,
            path: value,
            label: key
              .replace(/-/g, " ")
              .replace(/([A-Z])/g, " $1")
              .trim(),
          });
        } else if (value && typeof value === "object") {
          // Recursively check nested objects
          extractDocuments(value, fullKey);
        }
      });
    };
    extractDocuments(application.data);
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documents.map((doc, index) => (
            <m.div
              key={doc.key}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: index * 0.1,
              }}
            >
              <DocumentPreview
                document={doc}
                type={doc.label}
                path={doc.path}
              />
            </m.div>
          ))}
        </div>

        <div
          role="alert"
          className="bg-primary/10 border border-primary/30 rounded-lg p-4"
        >
          <div className="flex items-start">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
              <Info className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                {tCommon("document_security")}
              </div>
              <div className="text-primary mt-1">
                {tCommon("your_documents_are_encrypted_and_securely_stored")}.{" "}
                {tCommon("only_authorized_personnel_verification_process")}.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update the renderOverviewTab function to properly display verification checks
  const renderOverviewTab = (application: KycApplication) => {
    const verificationProgress = getVerificationProgress(
      application.verificationResult
    );
    const verificationStatus =
      application.verificationResult?.status || "NOT_STARTED";

    // Properly handle the checks data
    const parsedChecks = application.verificationResult?.checks
      ? typeof application.verificationResult.checks === "string"
        ? JSON.parse(application.verificationResult.checks)
        : application.verificationResult.checks
      : {};

    // Calculate passed checks correctly
    const verificationChecks: Array<{
      key: string;
      name: string;
      passed: boolean;
      description: string;
    }> = [];
    let passedChecks = 0;

    // Add selfie match check
    if (parsedChecks.selfieMatch !== undefined) {
      verificationChecks.push({
        key: "selfieMatch",
        name: "Selfie Match",
        passed: parsedChecks.selfieMatch,
        description: t("verification_of_selfie_against_id_document"),
      });
      if (parsedChecks.selfieMatch) passedChecks++;
    }

    // Add document authentic check
    if (parsedChecks.documentAuthentic !== undefined) {
      verificationChecks.push({
        key: "documentAuthentic",
        name: "Document Authentic",
        passed: parsedChecks.documentAuthentic,
        description: t("verification_of_document_authenticity"),
      });
      if (parsedChecks.documentAuthentic) passedChecks++;
    }

    // Get confidence score (convert from 0-1 to 0-100 if needed)
    const confidenceScore =
      parsedChecks.confidenceScore !== undefined
        ? parsedChecks.confidenceScore <= 1
          ? Math.round(parsedChecks.confidenceScore * 100)
          : Math.round(parsedChecks.confidenceScore)
        : 0;
    return (
      <div className="space-y-8">
        {/* Application Information Card */}
        <Card className="overflow-hidden border border-border-strong">
          <CardHeader className="pb-2 bg-muted border-b border-border-strong">
            <CardTitle className="text-lg flex items-center">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                <FileCheck className="h-3.5 w-3.5" />
              </div>
              {tCommon("application_information")}
            </CardTitle>
            <CardDescription>
              {tCommon("details_about_your_kyc_application")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
              <div className="space-y-1 bg-muted p-3 rounded-md">
                <dt className="text-xs font-medium text-muted-foreground">
                  {tCommon("application_id")}
                </dt>
                {/* Label, icon tile and typography are chrome and render in
                    both states; only the value waits, INSIDE the element that
                    carries the type styles, so the placeholder is measured by
                    the same layout the real value gets. The figure is mono and
                    tabular, so an 8-character placeholder is exactly as wide as
                    the 8-character id. */}
                <dd className="text-sm font-medium font-mono tabular-nums flex items-center">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                    <FileText className="h-3 w-3 text-primary" />
                  </span>
                  <Loadable loading={loading} placeholder="a1b2c3d4">
                    {application.id.substring(0, 8)}
                  </Loadable>
                </dd>
              </div>
              <div className="space-y-1 bg-muted p-3 rounded-md">
                <dt className="text-xs font-medium text-muted-foreground">
                  {tCommon("submitted_on")}
                </dt>
                <dd className="text-sm font-medium flex items-center">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                    <Calendar className="h-3 w-3 text-primary" />
                  </span>
                  <Loadable
                    loading={loading}
                    placeholder={t("january_1_2026_12_00_am")}
                  >
                    {formatDate(application.createdAt)}
                  </Loadable>
                </dd>
              </div>
              {application.reviewedAt && (
                <div className="space-y-1 bg-muted p-3 rounded-md">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {tCommon("reviewed_on")}
                  </dt>
                  <dd className="text-sm font-medium flex items-center">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                      <CheckCheck className="h-3 w-3 text-primary" />
                    </span>
                    {formatDate(application.reviewedAt)}
                  </dd>
                </div>
              )}
              <div className="space-y-1 bg-muted p-3 rounded-md">
                <dt className="text-xs font-medium text-muted-foreground">
                  {tCommon("last_updated")}
                </dt>
                <dd className="text-sm font-medium flex items-center">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                    <Clock className="h-3 w-3 text-primary" />
                  </span>
                  <Loadable
                    loading={loading}
                    placeholder={t("january_1_2026_12_00_am")}
                  >
                    {formatDate(application.updatedAt)}
                  </Loadable>
                </dd>
              </div>
              <div className="space-y-1 bg-muted p-3 rounded-md">
                <dt className="text-xs font-medium text-muted-foreground">
                  {tCommon("kyc_level")}
                </dt>
                <dd className="text-sm font-medium flex items-center">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                    <BadgeCheck className="h-3 w-3 text-primary" />
                  </span>
                  <Loadable loading={loading} placeholder="Identity">
                    {application.level.name}
                  </Loadable>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Admin Notes (if any) - Improved styling */}
        {application.adminNotes && (
          <div
            role="alert"
            className={cn(
              "border-l-4 shadow-sm p-4",
              // added padding for inner spacing
              TONE_NOTE[statusTone(application.status)]
            )}
          >
            <div className="flex items-start">
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-sm mr-3",
                  TONE_BUBBLE[statusTone(application.status)]
                )}
              >
                <Info
                  className={cn(
                    "h-5 w-5",
                    TONE_INK[statusTone(application.status)]
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                {/* Title */}
                <div
                  className={cn(
                    "text-lg font-semibold mb-2 whitespace-nowrap overflow-hidden text-ellipsis"
                  )}
                >
                  {application.status === "REJECTED"
                    ? tCommon("rejection_reason")
                    : application.status === "ADDITIONAL_INFO_REQUIRED"
                      ? t("additional_information_required")
                      : tCommon("admin_notes")}
                </div>
                {/* Description */}
                <div
                  className={cn(
                    "text-base",
                    TONE_INK[statusTone(application.status)]
                  )}
                >
                  {application.adminNotes}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verification Status Card */}
        <Card className="overflow-hidden border border-border-strong">
          <CardHeader className="pb-2 bg-muted border-b border-border-strong">
            <CardTitle className="text-lg flex items-center">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                <Shield className="h-3.5 w-3.5" />
              </div>
              {tCommon("verification_status")}
            </CardTitle>
            <CardDescription>
              {t("current_status_of_document_verification")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="w-full md:w-1/2">
                <VerificationScoreChart
                  score={application.verificationResult?.score || 0}
                  checks={parsedChecks}
                  passedChecks={passedChecks}
                  totalChecks={verificationChecks.length}
                  pending={loading}
                />
              </div>

              <div className="w-full md:w-1/2 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium flex items-center">
                      <Fingerprint className="h-4 w-4 mr-1.5 text-primary" />
                      {tCommon("verification_status")}
                    </h4>
                    <Badge
                      tone={statusTone(verificationStatus)}
                      className="rounded-md font-medium"
                    >
                      {/* `NOT_STARTED` is this component's fallback for a
                          MISSING verification result — while the request is in
                          flight it is a default, not an answer, so the chip
                          keeps its box and withholds the word. */}
                      <Loadable loading={loading} placeholder="PENDING">
                        {verificationStatus === "FAILED"
                          ? tCommon("rejected")
                          : verificationStatus}
                      </Loadable>
                    </Badge>
                  </div>
                  <div className="bg-muted p-1 rounded-full">
                    <Progress
                      value={verificationProgress}
                      className="h-2.5 bg-muted"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5 px-1">
                    <span>{tCommon("submitted")}</span>
                    <span>{tCommon("in_review")}</span>
                    <span>{tCommon("completed")}</span>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg border border-border">
                  <h4 className="text-sm font-medium mb-3 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1.5 text-primary" />
                    {tCommon("verification_steps")}
                  </h4>
                  <div className="space-y-4">
                    <VerificationStep
                      icon={FileText}
                      title={t("application_submitted")}
                      description={t("your_kyc_application_has_been_received")}
                      status="completed"
                    />
                    <VerificationStep
                      icon={Fingerprint}
                      title={tCommon("identity_verification")}
                      description={t("your_identity_documents_are_being_verified")}
                      status={
                        application.status === "PENDING" ||
                        application.status === "ADDITIONAL_INFO_REQUIRED"
                          ? "current"
                          : application.status === "APPROVED" ||
                              application.status === "REJECTED"
                            ? "completed"
                            : "upcoming"
                      }
                    />
                    <VerificationStep
                      icon={User}
                      title={t("admin_review")}
                      description={t("your_application_is_being_reviewed_by_our_team")}
                      status={
                        application.status === "APPROVED" ||
                        application.status === "REJECTED"
                          ? "completed"
                          : application.status === "ADDITIONAL_INFO_REQUIRED"
                            ? "current"
                            : application.status === "PENDING"
                              ? "current"
                              : "upcoming"
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Display verification checks */}
            {parsedChecks && Object.keys(parsedChecks).length > 0 && (
              <div className="mt-8">
                <h4 className="text-sm font-medium mb-4 flex items-center">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                    <CheckSquare className="h-3.5 w-3.5" />
                  </div>
                  {tCommon("verification_checks")}
                </h4>

                {/* Display summary if available */}
                {parsedChecks.summary && (
                  <div className="bg-muted p-4 rounded-lg mb-4 border border-border-strong">
                    <h5 className="text-sm font-medium mb-2">{tCommon("summary")}</h5>
                    <p className="text-sm text-muted-foreground">
                      {parsedChecks.summary}
                    </p>
                  </div>
                )}

                {/* Display issues if available */}
                {parsedChecks.issues && parsedChecks.issues.length > 0 && (
                  <div className="bg-destructive/10 p-4 rounded-lg mb-4 border border-destructive">
                    <h5 className="text-sm font-medium mb-2 text-destructive flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {tCommon("issues_detected")}
                    </h5>
                    <ul className="list-disc pl-5 space-y-1">
                      {parsedChecks.issues.map((issue: string, idx: number) => (
                        <li key={idx} className="text-sm text-destructive">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Display verification checks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {verificationChecks.map((check) => (
                    <m.div
                      key={check.key}
                      whileHover={{
                        y: -2,
                      }}
                      className="border border-border rounded-lg p-4 flex items-start bg-muted"
                    >
                      {/* The bubble is a TINT and the glyph is the on-tint ink.
                          It used to be a SOLID `bg-success` / `bg-destructive`
                          holding a `text-success` / `text-destructive` glyph —
                          the same token on itself, i.e. an invisible icon in
                          both themes. Same shape as TONE_BUBBLE/TONE_INK above. */}
                      <div
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-sm mr-3",
                          TONE_BUBBLE[check.passed ? "success" : "destructive"]
                        )}
                      >
                        {check.passed ? (
                          <CheckCircle className={cn("h-5 w-5", TONE_INK.success)} />
                        ) : (
                          <XCircle className={cn("h-5 w-5", TONE_INK.destructive)} />
                        )}
                      </div>
                      <div>
                        <h5 className="text-sm font-medium capitalize">
                          {check.name}
                        </h5>
                        <p className="text-xs text-muted-foreground mt-1">
                          {check.passed ? tCommon("passed") : tCommon("failed")}
                        </p>
                      </div>
                    </m.div>
                  ))}
                </div>

                {/* Display extracted info if available */}
                {parsedChecks.extractedInfo &&
                  Object.keys(parsedChecks.extractedInfo).length > 0 && (
                    <div className="bg-muted p-4 rounded-lg border border-border-strong">
                      <h5 className="text-sm font-medium mb-3">
                        {tCommon("extracted_information")}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                        {Object.entries(parsedChecks.extractedInfo).map(
                          ([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between text-sm py-1 border-b border-border-strong last:border-0"
                            >
                              <span className="font-medium capitalize text-muted-foreground">
                                {key
                                  .replace(/([A-Z])/g, " $1")
                                  .replace(/_/g, " ")
                                  .trim()}
                              </span>
                              <span className="text-muted-foreground">
                                {String(value)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Display confidence score if available */}
                {parsedChecks.confidenceScore !== undefined && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-medium">
                        {tCommon("confidence_score")}
                      </h5>
                      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{`${confidenceScore}%`}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          confidenceScore > 80
                            ? "bg-success"
                            : confidenceScore > 60
                              ? "bg-warning"
                              : "bg-destructive"
                        )}
                        style={{
                          width: `${confidenceScore}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Process Card */}
        <Card className="overflow-hidden border border-border-strong">
          <CardHeader className="pb-2 bg-muted border-b border-border-strong">
            <CardTitle className="text-lg flex items-center">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              {tCommon("verification_process")}
            </CardTitle>
            <CardDescription>
              {tCommon("understanding_how_our_verification_system_works")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <p className="text-sm">
                {t("our_verification_process_regulatory_requirements")}.{" "}
                {t("heres_what_happens_during_verification")}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <m.div
                  whileHover={{
                    y: -5,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className="bg-muted p-5 rounded-lg border border-border"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mb-4">
                    <Fingerprint className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="text-sm font-medium mb-2">
                    {tCommon("identity_verification")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("we_verify_your_prevent_fraud")}.
                  </p>
                </m.div>

                <m.div
                  whileHover={{
                    y: -5,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className="bg-muted p-5 rounded-lg border border-border"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mb-4">
                    <Landmark className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="text-sm font-medium mb-2">
                    {tCommon("address_verification")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("we_confirm_your_official_records")}.
                  </p>
                </m.div>

                <m.div
                  whileHover={{
                    y: -5,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className="bg-muted p-5 rounded-lg border border-border"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="text-sm font-medium mb-2">
                    {tCommon("security_checks")}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t("we_perform_additional_regulatory_requirements")}.
                  </p>
                </m.div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Required Card (if applicable).
            R3: `bg-linear-to-r from-warning to-warning` is not a gradient at
            all — two identical stops are a SOLID fill wearing a gradient's
            clothes — and it made this whole card a saturated amber slab with
            `text-warning` copy on it, i.e. unreadable. It is a tint with on-tint
            ink now, the same treatment `<Alert tone="warning">` gives. */}
        {application.status === "ADDITIONAL_INFO_REQUIRED" && (
          <Card className="overflow-hidden border border-warning/30 bg-warning/10">
            <CardHeader className="pb-2 border-b border-warning/20">
              <CardTitle className="text-lg flex items-center text-warning-ink">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning-ink mr-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                {tCommon("action_required")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-warning-ink mb-6">
                {tCommon("we_need_additional_your_verification")}.{" "}
                {t("please_update_your_as_possible")}.
              </p>
              <Link
                href={`/user/kyc/application/${application.id}/update`}
                className="inline-block"
              >
                <Button className="bg-warning hover:bg-warning/90 text-warning-foreground shadow-md">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {tCommon("update_application")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };
  /*
    ONE PAGE, THREE STATES — AND TWO OF THEM USED TO BE DIFFERENT PAGES.

    `if (loading) return ...` swapped the whole route for a narrower container
    (`max-w-4xl` against the real `max-w-5xl`, so even the page's WIDTH changed),
    a dead `<Button>` that went nowhere in place of the real back Link, two
    hardcoded `h-8`/`h-4` bars, and a `Loader2` centred in a `py-12` box. A
    spinner reserves nothing: 100% of this page — status panel, tab bar, the
    information card, the score gauge, the three-rung stepper — arrived as
    layout shift, every time, after a swap that also moved the container edges.

    `if (!application) return ...` is a real state, but it is an ANSWER, and
    `application` is null before the question has been asked. Left as a bare
    check under the removed loading swap it would tell every visitor their
    application does not exist for the length of a request. It is now a named
    conclusion, rendered as a card inside this page's own frame.
  */
  const applicationNotFound = !loading && !application;

  /* What the page reads while the fetch is in flight. See
     `PENDING_APPLICATION` — this is a value swap, not a tree swap. */
  const view = application ?? PENDING_APPLICATION;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Link href="/user/kyc" className="inline-block mr-4">
          <Button variant="ghost" className="group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {tCommon("back_to_kyc")}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{tCommon("kyc_application")}</h1>
      </div>

      <div className="grid gap-6">
        {applicationNotFound ? (
          /* Two identical stops = a solid fill, so this "not found" card painted
             a saturated red slab. Tint + on-tint ink. */
          <Card className="border border-destructive/30 bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-destructive/15 text-destructive-ink mr-2">
                  <XCircle className="h-3.5 w-3.5" />
                </div>
                {tCommon("application_not_found")}
              </CardTitle>
              <CardDescription>
                {t("the_kyc_application_be_found")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {tCommon("there_was_an_error_loading_your_kyc_application")}.{" "}
                  {tCommon("please_try_again_or_contact_support")}.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Link href="/user/kyc" className="inline-block">
                <Button>{tCommon("return_to_kyc_dashboard")}</Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
        <m.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
        >
          <Card className="overflow-hidden border border-border">
            <div
              className={cn(
                "p-6 relative",
                TONE_PANEL[statusTone(view.status)]
              )}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(view.status)}
                  <div>
                    {/* The panel, its icon and the label "Application status"
                        are chrome. The STATUS and its explanation are the two
                        things being fetched, so they are the two things that
                        wait — inside their own typography, which is what keeps
                        this two-line block exactly two lines in both states. */}
                    <h2 className="text-xl font-semibold leading-tight tracking-tight">
                      {tCommon("application_status")}:{" "}
                      <Loadable loading={loading} placeholder="PENDING">
                        {view.status.replace(/_/g, " ")}
                      </Loadable>
                    </h2>
                    <p className="text-sm mt-1">
                      <Loadable
                        loading={loading}
                        placeholder={t("your_kyc_application_is_currently_under")}
                      >
                        {getStatusText(view.status)}
                      </Loadable>
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-medium border-2 py-1 px-3"
                >
                  {tCommon("level")}
                  <Loadable loading={loading} placeholder="Identity">
                    {view.level.name}
                  </Loadable>
                </Badge>
              </div>
            </div>

            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="overview" className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    {tCommon("overview")}
                  </TabsTrigger>
                  <TabsTrigger value="details" className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    {tCommon("application_details")}
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center">
                    <Layers className="h-4 w-4 mr-2" />
                    {tCommon("documents")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {renderOverviewTab(view)}
                </TabsContent>

                <TabsContent value="details">
                  <Card className="border border-border-strong">
                    <CardHeader className="bg-muted border-b border-border-strong">
                      <CardTitle className="flex items-center">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        {tCommon("application_details")}
                      </CardTitle>
                      <CardDescription>
                        {tCommon("information_you_provided_in_your_kyc_application")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ScrollArea className="h-[500px] pr-4">
                        {view.level.fields &&
                        view.level.fields.length > 0 ? (
                          renderApplicationData(
                            view.data,
                            view.level.fields
                          )
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                              {tCommon("no_application_fields")}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">
                              {tCommon("no_application_fields_kyc_level")}.{" "}
                              {t("this_may_be_additional_information")}.
                            </p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="documents">
                  <Card className="border border-border-strong">
                    <CardHeader className="bg-muted border-b border-border-strong">
                      <CardTitle className="flex items-center">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                          <Layers className="h-3.5 w-3.5" />
                        </div>
                        {tCommon("submitted_documents")}
                      </CardTitle>
                      <CardDescription>
                        {tCommon("documents_you_provided_for_identity_verification")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {renderDocumentsTab(view)}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </m.div>
        )}

        <div className="flex flex-col md:flex-row justify-between gap-4">
          <Link href="/user/kyc" className="inline-block">
            <Button variant="outline" className="group">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              {tCommon("back_to_kyc_dashboard")}
            </Button>
          </Link>

          <div className="flex gap-2">
            {view.status === "ADDITIONAL_INFO_REQUIRED" && (
              <Link
                href={`/user/kyc/application/${view.id}/update`}
                className="inline-block"
              >
                {/* `hover:from-*`/`hover:to-*` with no `bg-gradient-*` are DEAD
                    classes — the hover did nothing. Also needs its on-fill ink. */}
                <Button className="bg-warning hover:bg-warning/90 text-warning-foreground shadow-md">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {tCommon("update_application")}
                </Button>
              </Link>
            )}

            <Button
              variant="outline"
              onClick={() => setShowSupport(!showSupport)}
              className="border-dashed group"
            >
              <MessageSquare className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
              {tCommon("need_help")}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showSupport && (
            <m.div
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
              transition={{
                duration: 0.3,
              }}
            >
              <Card className="border border-border-strong bg-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary mr-2">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    {tCommon("support")}
                  </CardTitle>
                  <CardDescription>
                    {tCommon("need_help_with_your_kyc_application")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm">{tCommon("if_you_have_to_help")}.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Link
                        href="/contact"
                        className="inline-block w-full"
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start group hover:border-primary hover:bg-primary/5"
                        >
                          <MessageSquare className="h-4 w-4 mr-2 group-hover:text-primary group-hover:scale-110 transition-all" />
                          {tCommon("contact_support")}
                        </Button>
                      </Link>
                      <Link
                        href="/faq"
                        className="inline-block w-full"
                      >
                        <Button
                          variant="outline"
                          className="w-full justify-start group hover:border-primary hover:bg-primary/5"
                        >
                          <HelpCircle className="h-4 w-4 mr-2 group-hover:text-primary group-hover:scale-110 transition-all" />
                          {tCommon("view_kyc_faq")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
export default ApplicationDetailsClient;
