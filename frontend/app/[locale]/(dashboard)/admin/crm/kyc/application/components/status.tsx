import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
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
      variant="outline"
      className={`${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor} flex items-center gap-1 px-3 py-1.5 text-sm`}
    >
      {statusInfo.icon}
      {statusInfo.label}
    </Badge>
  );
};
export const StatusBanner = ({ status }: { status: ApplicationStatus }) => {
  const statusInfo = getStatusInfo(status);
  return (
    <div
      className={cn(
        "rounded-lg p-4 flex items-center justify-between border-l-4 application-status",
        status === "APPROVED"
          ? "bg-green-50 dark:bg-green-950/20 border-green-500 dark:border-green-400"
          : status === "REJECTED"
            ? "bg-red-50 dark:bg-red-950/20 border-red-500 dark:border-red-400"
            : status === "ADDITIONAL_INFO_REQUIRED"
              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-500 dark:border-blue-400"
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-500 dark:border-amber-400"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "bg-white dark:bg-zinc-800 p-2 rounded-full shadow-sm border border-zinc-100 dark:border-zinc-700",
            status === "APPROVED"
              ? "text-green-500 dark:text-green-400"
              : status === "REJECTED"
                ? "text-red-500 dark:text-red-400"
                : status === "ADDITIONAL_INFO_REQUIRED"
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-amber-500 dark:text-amber-400"
          )}
        >
          {statusInfo.icon}
        </div>
        <div>
          <h2
            className={cn(
              "font-medium",
              status === "APPROVED"
                ? "text-green-700 dark:text-green-300"
                : status === "REJECTED"
                  ? "text-red-700 dark:text-red-300"
                  : status === "ADDITIONAL_INFO_REQUIRED"
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-amber-700 dark:text-amber-300"
            )}
          >
            Application Status: {statusInfo.label}
          </h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{statusInfo.description}</p>
        </div>
      </div>
      <div className="hidden md:block">
        <StatusBadge status={status} />
      </div>
    </div>
  );
};
export const ProgressBar = ({ status }: { status: ApplicationStatus }) => {
  const progress = getStatusProgress(status);
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 progress-container">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Verification Progress</h3>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>
      <div className="space-y-2">
        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              status === "APPROVED"
                ? "bg-green-500 dark:bg-green-400"
                : status === "REJECTED"
                  ? "bg-red-500 dark:bg-red-400"
                  : status === "ADDITIONAL_INFO_REQUIRED"
                    ? "bg-blue-500 dark:bg-blue-400"
                    : "bg-yellow-500 dark:bg-yellow-400"
            )}
            style={{
              width: `${progress}%`,
            }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <div
            className={cn(
              "font-medium",
              progress >= 33
                ? status === "APPROVED"
                  ? "text-green-600 dark:text-green-400"
                  : status === "REJECTED"
                    ? "text-red-600 dark:text-red-400"
                    : status === "ADDITIONAL_INFO_REQUIRED"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-yellow-600 dark:text-yellow-400"
                : ""
            )}
          >
            Submitted
          </div>
          <div
            className={cn(
              "font-medium",
              progress >= 66
                ? status === "APPROVED"
                  ? "text-green-600 dark:text-green-400"
                  : status === "REJECTED"
                    ? "text-red-600 dark:text-red-400"
                    : status === "ADDITIONAL_INFO_REQUIRED"
                      ? "text-blue-600 dark:text-blue-400"
                      : ""
                : ""
            )}
          >
            Under Review
          </div>
          <div
            className={cn(
              "font-medium",
              progress >= 100
                ? status === "APPROVED"
                  ? "text-green-600 dark:text-green-400"
                  : status === "REJECTED"
                    ? "text-red-600 dark:text-red-400"
                    : ""
                : ""
            )}
          >
            Decision
          </div>
        </div>
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
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        y: 10,
      }}
      className={`${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg p-4 mb-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`${statusInfo.color} mt-1`}>{statusInfo.icon}</div>
        <div className="flex-1">
          <h4 className={`font-medium ${statusInfo.color}`}>
            {status === "APPROVED"
              ? "Approve this application?"
              : status === "REJECTED"
                ? "Reject this application?"
                : "Request additional information?"}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {status === "APPROVED"
              ? "This will grant the user access to level features."
              : status === "REJECTED"
                ? "This will deny the user access to level features."
                : "The user will be notified to provide more information."}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={onConfirm}
              className={cn(
                status === "APPROVED"
                  ? "bg-green-600 hover:bg-green-700"
                  : status === "REJECTED"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700",
                "text-white"
              )}
            >
              Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export const StatusUpdateSuccess = () => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        y: -10,
      }}
      className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-lg p-4 mb-4 flex items-center gap-3 no-print"
    >
      <div className="bg-white dark:bg-zinc-800 p-2 rounded-full border border-zinc-100 dark:border-zinc-700">
        <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
      </div>
      <div>
        <h4 className="font-medium text-green-700 dark:text-green-300">
          Status Updated Successfully
        </h4>
        <p className="text-sm text-green-600 dark:text-green-400">
          The application status has been updated and the user will be notified.
        </p>
      </div>
    </motion.div>
  );
};
