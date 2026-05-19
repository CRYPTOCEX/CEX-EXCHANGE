import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
export type ApplicationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "ADDITIONAL_INFO_REQUIRED";
export const getStatusInfo = (status: ApplicationStatus) => {
  switch (status) {
    case "PENDING":
      return {
        icon: <Clock className="h-5 w-5" />,
        color: "text-yellow-500 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
        borderColor: "border-yellow-200 dark:border-yellow-800/50",
        label: "Pending",
        description: "This application is waiting for review",
      };
    case "APPROVED":
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        color: "text-green-500 dark:text-green-400",
        bgColor: "bg-green-50 dark:bg-green-950/20",
        borderColor: "border-green-200 dark:border-green-800/50",
        label: "Approved",
        description: "This application has been approved",
      };
    case "REJECTED":
      return {
        icon: <XCircle className="h-5 w-5" />,
        color: "text-red-500 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/20",
        borderColor: "border-red-200 dark:border-red-800/50",
        label: "Rejected",
        description: "This application has been rejected",
      };
    case "ADDITIONAL_INFO_REQUIRED":
      return {
        icon: <AlertCircle className="h-5 w-5" />,
        color: "text-blue-500 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/20",
        borderColor: "border-blue-200 dark:border-blue-800/50",
        label: "Additional Info Required",
        description: "More information is needed from the applicant",
      };
    default:
      return {
        icon: <AlertTriangle className="h-5 w-5" />,
        color: "text-zinc-500 dark:text-zinc-400",
        bgColor: "bg-zinc-50 dark:bg-zinc-950/20",
        borderColor: "border-zinc-200 dark:border-zinc-800/50",
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
  return (
    <Badge
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium shadow-sm border",
        statusInfo.bgColor,
        statusInfo.color,
        statusInfo.borderColor
      )}
    >
      {statusInfo.icon}
      {statusInfo.label}
    </Badge>
  );
};
export const StatusBanner = ({ status }: { status: ApplicationStatus }) => {
  const tCommon = useTranslations("common");
  const statusInfo = getStatusInfo(status);

  const getGradientClasses = () => {
    switch (status) {
      case "APPROVED":
        return "from-green-500 to-emerald-600";
      case "REJECTED":
        return "from-red-500 to-rose-600";
      case "ADDITIONAL_INFO_REQUIRED":
        return "from-blue-500 to-indigo-600";
      default:
        return "from-amber-500 to-orange-600";
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 application-status border",
        status === "APPROVED"
          ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800/50"
          : status === "REJECTED"
            ? "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800/50"
            : status === "ADDITIONAL_INFO_REQUIRED"
              ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800/50"
              : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800/50"
      )}
    >
      {/* Decorative gradient overlay */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br rounded-full opacity-20 -translate-y-1/2 translate-x-1/4",
        getGradientClasses()
      )} />

      <div className="relative flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl shadow-lg bg-gradient-to-br",
            getGradientClasses()
          )}
        >
          <div className="text-white scale-110">
            {statusInfo.icon}
          </div>
        </div>
        <div>
          <h2
            className={cn(
              "font-bold text-lg",
              status === "APPROVED"
                ? "text-green-700 dark:text-green-300"
                : status === "REJECTED"
                  ? "text-red-700 dark:text-red-300"
                  : status === "ADDITIONAL_INFO_REQUIRED"
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-amber-700 dark:text-amber-300"
            )}
          >
            {statusInfo.label}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{statusInfo.description}</p>
        </div>
      </div>
      <div className="hidden md:block relative">
        <StatusBadge status={status} />
      </div>
    </div>
  );
};
export const ProgressBar = ({ status }: { status: ApplicationStatus }) => {
  const tCommon = useTranslations("common");
  const progress = getStatusProgress(status);

  const getProgressGradient = () => {
    switch (status) {
      case "APPROVED":
        return "from-green-400 to-emerald-500";
      case "REJECTED":
        return "from-red-400 to-rose-500";
      case "ADDITIONAL_INFO_REQUIRED":
        return "from-blue-400 to-indigo-500";
      default:
        return "from-amber-400 to-orange-500";
    }
  };

  const getActiveColor = () => {
    switch (status) {
      case "APPROVED":
        return "text-green-600 dark:text-green-400";
      case "REJECTED":
        return "text-red-600 dark:text-red-400";
      case "ADDITIONAL_INFO_REQUIRED":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-amber-600 dark:text-amber-400";
    }
  };

  const steps = [
    { label: "Submitted", threshold: 33 },
    { label: tCommon("under_review"), threshold: 66 },
    { label: "Decision", threshold: 100 }
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-sm progress-container">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center bg-gradient-to-br",
            getProgressGradient()
          )}>
            <FileCheck className="h-3.5 w-3.5 text-white" />
          </div>
          {tCommon("verification_progress")}
        </h3>
        <span className={cn("text-lg font-bold", getActiveColor())}>
          {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn(
              "h-3 rounded-full bg-gradient-to-r",
              getProgressGradient()
            )}
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
                ? cn(
                    "bg-gradient-to-br text-white border-transparent",
                    getProgressGradient()
                  )
                : "bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-600"
            )}>
              {progress >= step.threshold ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className={cn(
              "text-xs mt-2 font-medium",
              progress >= step.threshold ? getActiveColor() : "text-zinc-400 dark:text-zinc-500"
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
  const statusInfo = getStatusInfo(status);

  const getGradientClasses = () => {
    switch (status) {
      case "APPROVED":
        return "from-green-500 to-emerald-600";
      case "REJECTED":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-indigo-600";
    }
  };

  const getConfirmationIcon = () => {
    switch (status) {
      case "APPROVED":
        return <FileCheck className="h-6 w-6 text-white" />;
      case "REJECTED":
        return <FileX className="h-6 w-6 text-white" />;
      default:
        return <Info className="h-6 w-6 text-white" />;
    }
  };

  return (
    <motion.div
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
      {/* Decorative gradient overlay */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 bg-gradient-to-br rounded-full opacity-20 -translate-y-1/2 translate-x-1/4",
        getGradientClasses()
      )} />

      <div className="relative flex items-start gap-4">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg bg-gradient-to-br",
          getGradientClasses()
        )}>
          {getConfirmationIcon()}
        </div>
        <div className="flex-1">
          <h4 className={cn("font-bold text-lg", statusInfo.color)}>
            {status === "APPROVED"
              ? "Approve this application?"
              : status === "REJECTED"
                ? "Reject this application?"
                : "Request additional information?"}
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {status === "APPROVED"
              ? "This will grant the user access to level features."
              : status === "REJECTED"
                ? "This will deny the user access to level features."
                : "The user will be notified to provide more information."}
          </p>
          <div className="flex gap-3 mt-4">
            <Button
              size="sm"
              onClick={onConfirm}
              className={cn(
                "bg-gradient-to-r shadow-md px-5 h-9 font-medium transition-all duration-200 hover:shadow-lg hover:scale-105",
                status === "APPROVED"
                  ? "from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/25"
                  : status === "REJECTED"
                    ? "from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/25"
                    : "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/25",
                "text-white"
              )}
            >
              <Check className="h-4 w-4 mr-1.5" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="px-5 h-9 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export const StatusUpdateSuccess = () => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800/50 rounded-xl p-5 mb-4 flex items-center gap-4 no-print"
    >
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full -translate-y-1/2 translate-x-1/4" />

      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25">
        <CheckCircle className="h-6 w-6 text-white" />
      </div>
      <div className="relative">
        <h4 className="font-bold text-lg text-green-700 dark:text-green-300">
          {tCommon("status_updated_successfully")}
        </h4>
        <p className="text-sm text-green-600 dark:text-green-400">
          {t("the_application_status_has_been_updated")}
        </p>
      </div>
    </motion.div>
  );
};
