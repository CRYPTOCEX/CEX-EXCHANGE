import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status-tone";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Check,
  FileCheck,
  FileX,
  Info,
} from "lucide-react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
export type ApplicationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ADDITIONAL_INFO_REQUIRED";
/**
 * How a tone paints the non-Badge surfaces in this module (solid tiles, banner
 * washes, progress fills). This is NOT a status decision — `statusTone()` owns
 * which tone a status gets; this only says what a tone looks like here.
 *
 * Two inks, and they are not interchangeable: `text` is for type sitting on a
 * `softBg` tint, so it is the derived `--{tone}-ink` (the raw hue is only
 * guaranteed against a plain ground); `ink` is for glyphs sitting ON the solid
 * `fill`, so it is `--{tone}-foreground`.
 */
const TONE_PAINT: Record<
  BadgeTone,
  {
    text: string;
    softBg: string;
    softBorder: string;
    fill: string;
    ink: string;
    shadow: string;
  }
> = {
  primary: {
    text: "text-primary-ink",
    softBg: "bg-primary/10",
    softBorder: "border-primary/30",
    fill: "bg-primary",
    ink: "text-primary-foreground",
    shadow: "shadow-primary/25",
  },
  secondary: {
    text: "text-secondary-foreground",
    softBg: "bg-secondary",
    softBorder: "border-border-strong",
    fill: "bg-secondary",
    ink: "text-secondary-foreground",
    shadow: "shadow-secondary/25",
  },
  success: {
    text: "text-success-ink",
    softBg: "bg-success/10",
    softBorder: "border-success/30",
    fill: "bg-success",
    ink: "text-success-foreground",
    shadow: "shadow-success/25",
  },
  warning: {
    text: "text-warning-ink",
    softBg: "bg-warning/10",
    softBorder: "border-warning/30",
    fill: "bg-warning",
    ink: "text-warning-foreground",
    shadow: "shadow-warning/25",
  },
  destructive: {
    text: "text-destructive-ink",
    softBg: "bg-destructive/10",
    softBorder: "border-destructive/30",
    fill: "bg-destructive",
    ink: "text-destructive-foreground",
    shadow: "shadow-destructive/25",
  },
  info: {
    text: "text-info-ink",
    softBg: "bg-info/10",
    softBorder: "border-info/30",
    fill: "bg-info",
    ink: "text-info-foreground",
    shadow: "shadow-info/25",
  },
  neutral: {
    text: "text-subtle-foreground",
    softBg: "bg-muted",
    softBorder: "border-border",
    fill: "bg-muted",
    ink: "text-foreground",
    shadow: "shadow-muted/25",
  },
};

const paintFor = (status: ApplicationStatus) => TONE_PAINT[statusTone(status)];

export const getStatusInfo = (status: ApplicationStatus) => {
  const paint = paintFor(status);
  const colors = {
    color: paint.text,
    bgColor: paint.softBg,
    borderColor: paint.softBorder,
  };
  switch (status) {
    case "PENDING":
      return {
        icon: <Clock className="h-5 w-5" />,
        ...colors,
        label: "Pending",
        description: "This application is waiting for review",
      };
    case "APPROVED":
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        ...colors,
        label: "Approved",
        description: "This application has been approved",
      };
    case "REJECTED":
      return {
        icon: <XCircle className="h-5 w-5" />,
        ...colors,
        label: "Rejected",
        description: "This application has been rejected",
      };
    case "ADDITIONAL_INFO_REQUIRED":
      return {
        icon: <AlertCircle className="h-5 w-5" />,
        ...colors,
        label: "Additional Info Required",
        description: "More information is needed from the applicant",
      };
    default:
      return {
        icon: <AlertTriangle className="h-5 w-5" />,
        ...colors,
        label: status,
        description: "Application status",
      };
  }
};
export const getStatusProgress = (status: ApplicationStatus) => {
  switch (status) {
    case "PENDING":
      return 33;
    // First stage - application submitted and pending initial review
    case "ADDITIONAL_INFO_REQUIRED":
      return 66;
    // Middle stage - under review but needs more information
    case "APPROVED":
      return 100;
    // Final stage with positive outcome
    case "REJECTED":
      return 100;
    // Final stage with negative outcome
    default:
      return 0;
  }
};
export const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  const statusInfo = getStatusInfo(status);
  // `text-foreground` used to be appended here, which clobbered the tonal ink
  // the `tone` axis had just resolved — the label stopped carrying its status
  // colour and, on the tint, read as plain body copy. The icon needs no colour
  // override either: it inherits the badge's ink.
  return (
    <Badge
      tone={statusTone(status)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium shadow-sm"
    >
      {statusInfo.icon}
      {statusInfo.label}
    </Badge>
  );
};
export const StatusBanner = ({ status }: { status: ApplicationStatus }) => {
  const tCommon = useTranslations("common");
  const statusInfo = getStatusInfo(status);

  // Solid tile plus its paired ink. These used to be degenerate `from-x to-x`
  // gradients whose icon was painted `text-white`, and two of the four arms
  // were plain `bg-x` classes that a `bg-gradient-*` utility then overrode.
  const paint = paintFor(status);
  const tileClasses = cn(paint.fill, paint.ink);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 application-status border",
        statusInfo.bgColor,
        statusInfo.borderColor
      )}
    >
      {/* Decorative gradient overlay */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 -translate-y-1/2 translate-x-1/4",
        tileClasses
      )} />

      <div className="relative flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl shadow-lg",
            tileClasses
          )}
        >
          <div className="scale-110">{statusInfo.icon}</div>
        </div>
        <div>
          <h2 className={cn("font-bold text-lg", statusInfo.color)}>
            {statusInfo.label}
          </h2>
          <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
        </div>
      </div>
      <div className="hidden md:block relative">
        <StatusBadge status={status} />
      </div>
    </div>
  );
};
export const ProgressBar = ({ status }: { status: ApplicationStatus }) => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const progress = getStatusProgress(status);

  const paint = paintFor(status);
  const progressTile = cn(paint.fill, paint.ink);
  const activeColor = paint.text;

  const steps = [
    { label: tCommon("submitted"), threshold: 33 },
    { label: tCommon("under_review"), threshold: 66 },
    { label: tCommon("decision"), threshold: 100 }
  ];

  return (
    <div className="bg-card rounded-lg border border-border-strong p-5 progress-container">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center",
            progressTile
          )}>
            <FileCheck className="h-3.5 w-3.5" />
          </div>
          {tCommon("verification_progress")}
        </h3>
        <span className={cn("text-lg font-bold", activeColor)}>
          {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <m.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-3 rounded-full", progressTile)}
          />
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div key={step.label} className="flex flex-col items-center">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all duration-300",
              progress >= step.threshold
                ? cn("border-transparent", progressTile)
                : "bg-muted text-subtle-foreground border-border"
            )}>
              {progress >= step.threshold ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className={cn(
              "text-xs mt-2 font-medium",
              progress >= step.threshold ? activeColor : "text-subtle-foreground"
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
export const StatusConfirmation = ({
  status,
  onConfirm,
  onCancel,
}: {
  status: ApplicationStatus;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const t = useTranslations("dashboard");
  const statusInfo = getStatusInfo(status);
  const paint = paintFor(status);
  // Same fix the banner above already got: this used to paint `paint.gradient`
  // (`from-{tone} to-{tone}`) with NO `bg-gradient-*` utility anywhere on the
  // element, so the tile and the Confirm button had no background at all — and
  // the glyph on top was hardcoded `text-overlay-foreground`, i.e. a white icon
  // on the card. Solid fill plus its paired ink.
  const tileClasses = cn(paint.fill, paint.ink);

  const getConfirmationIcon = () => {
    switch (status) {
      case "APPROVED":
        return <FileCheck className="h-6 w-6" />;
      case "REJECTED":
        return <FileX className="h-6 w-6" />;
      default:
        return <Info className="h-6 w-6" />;
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={cn(
        "relative overflow-hidden rounded-xl p-5 mb-4 border",
        statusInfo.bgColor,
        statusInfo.borderColor
      )}
    >
      {/* Decorative overlay */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -translate-y-1/2 translate-x-1/4",
        paint.fill
      )} />

      <div className="relative flex items-start gap-4">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg",
          tileClasses
        )}>
          {getConfirmationIcon()}
        </div>
        <div className="flex-1">
          <h4 className={cn("font-bold text-lg", statusInfo.color)}>
            {status === "APPROVED"
              ? t("approve_this_application")
              : status === "REJECTED"
                ? t("reject_this_application")
                : t("request_additional_information")}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {status === "APPROVED"
              ? t("this_will_grant_the_user_access_to_level_features")
              : status === "REJECTED"
                ? t("this_will_deny_the_user_access_to_level_features")
                : t("the_user_will_be_notified_to")}
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              size="sm"
              tone={statusTone(status)}
              onClick={onConfirm}
              className={cn(
                "shadow-md px-5 font-medium transition-all duration-200 hover:shadow-lg hover:scale-105",
                paint.shadow
              )}
            >
              <Check className="h-4 w-4 mr-1.5" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="px-5 font-medium hover:bg-muted"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </m.div>
  );
};
export const StatusUpdateSuccess = () => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <m.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative overflow-hidden bg-success/10 border border-success/30 rounded-xl p-5 mb-4 flex items-center gap-4 no-print"
    >
      {/* Decorative overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-success/20 rounded-full -translate-y-1/2 translate-x-1/4" />

      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success text-success-foreground shadow-lg shadow-success/25">
        <CheckCircle className="h-6 w-6" />
      </div>
      <div className="relative">
        <h4 className="font-bold text-lg text-success-ink">
          {tCommon("status_updated_successfully")}
        </h4>
        <p className="text-sm text-muted-foreground">
          {t("the_application_status_has_been_updated")}
        </p>
      </div>
    </m.div>
  );
};
