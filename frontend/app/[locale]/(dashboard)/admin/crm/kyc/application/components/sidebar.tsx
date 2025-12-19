import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  BarChart4,
  CheckCircle,
  Lightbulb,
  Shield,
  XCircle,
} from "lucide-react";
import { ApplicationStatus } from "./status";
import { useTranslations } from "next-intl";

interface ReviewSidebarProps {
  adminNotes: string;
  onAdminNotesChange: (notes: string) => void;
  onStatusChange: (status: ApplicationStatus) => void;
  updatingStatus: boolean;
  currentStatus: ApplicationStatus;
}

export const ReviewSidebar = ({
  adminNotes,
  onAdminNotesChange,
  onStatusChange,
  updatingStatus,
  currentStatus,
}: ReviewSidebarProps) => {
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  return (
    <div className="space-y-4">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
          <BarChart4 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
          <h3 className="text-lg font-semibold">
            {tCommon("review_application")}
          </h3>
        </div>

        {/* Action Buttons - Top Right */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white h-9 px-4"
            onClick={() => onStatusChange("APPROVED")}
            disabled={updatingStatus || currentStatus === "APPROVED"}
          >
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">
              {tCommon("approve_application")}
            </span>
            <span className="sm:hidden">Approve</span>
          </Button>

          <Button
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm h-9 px-4"
            onClick={() => onStatusChange("ADDITIONAL_INFO_REQUIRED")}
            disabled={
              updatingStatus || currentStatus === "ADDITIONAL_INFO_REQUIRED"
            }
          >
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">
              {tCommon("request_additional_info")}
            </span>
            <span className="sm:hidden">Request Info</span>
          </Button>

          <Button
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white shadow-sm h-9 px-4"
            onClick={() => onStatusChange("REJECTED")}
            disabled={updatingStatus || currentStatus === "REJECTED"}
          >
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">
              {tCommon("reject_application")}
            </span>
            <span className="sm:hidden">Reject</span>
          </Button>
        </div>
      </div>

      {/* Admin Notes Section */}
      <div>
        <label className="text-sm font-medium mb-2 block text-zinc-700 dark:text-zinc-300">
          {tCommon("admin_notes")}
        </label>
        <Textarea
          placeholder={tDashboard("add_notes_about_this_application_ellipsis")}
          value={adminNotes}
          onChange={(e) => onAdminNotesChange(e.target.value)}
          rows={2}
          className="resize-none bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
        />
      </div>
    </div>
  );
};

export const VerificationTips = () => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
        <Lightbulb className="h-5 w-5 text-amber-500 dark:text-amber-400" />
        <h3 className="text-lg font-semibold">
          {tCommon("verification_tips")}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
          <h4 className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {tCommon("check_document_authenticity")}
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
            {t("verify_that_all_users_information")}.
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {tCommon("cross_reference_information")}
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
            {t("ensure_that_all_and_documents")}.
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-lg p-4">
          <h4 className="font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {tCommon("follow_compliance_guidelines")}
          </h4>
          <p className="text-sm text-green-700 dark:text-green-400 mt-2">
            {t("adhere_to_kyc_aml_legal_compliance")}.
          </p>
        </div>
      </div>
    </div>
  );
};
