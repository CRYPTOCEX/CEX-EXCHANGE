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
import { getTranslations } from "next-intl/server";

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
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  return (
    <div className="space-y-4">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2 text-foreground">
          <BarChart4 className="h-5 w-5 text-primary-ink" />
          <h3 className="text-lg font-semibold">
            {tCommon("review_application")}
          </h3>
        </div>

        {/* Action Buttons - Top Right */}
        <div className="flex flex-wrap items-center gap-2">
          {/* The three decision buttons hand-rolled their fill, and each wrote
              `hover:bg-{tone}` — the SAME colour as the resting state, so the
              buttons looked dead on hover. `tone` is the axis for this and it
              ships the /90 hover with the correct paired ink. */}
          <Button
            tone="success"
            className="flex items-center gap-2 h-9"
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
            tone="primary"
            className="flex items-center gap-2 shadow-sm h-9 disabled:cursor-not-allowed"
            onClick={() => onStatusChange("ADDITIONAL_INFO_REQUIRED")}
            disabled={
              updatingStatus ||
              currentStatus === "ADDITIONAL_INFO_REQUIRED" ||
              !adminNotes.trim()
            }
            title={!adminNotes.trim() ? tCommon("please_add_notes_before_requesting_info") : ""}
          >
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">
              {tCommon("request_additional_info")}
            </span>
            <span className="sm:hidden">{t("request_info")}</span>
          </Button>

          {/* Gated on notes, exactly as "Request additional info" beside it
              already was. A rejection is the decision the applicant is most
              owed an explanation for — `sendKycEmail` copies `adminNotes` into
              the rejection email — and this was the one button that let an
              admin refuse someone with an empty box. */}
          <Button
            tone="destructive"
            className="flex items-center gap-2 shadow-sm h-9 disabled:cursor-not-allowed"
            onClick={() => onStatusChange("REJECTED")}
            disabled={
              updatingStatus ||
              currentStatus === "REJECTED" ||
              !adminNotes.trim()
            }
            title={
              !adminNotes.trim()
                ? tCommon("please_add_notes_before_requesting_info")
                : ""
            }
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
        <label className="text-sm font-medium mb-2 block text-muted-foreground">
          {tCommon("admin_notes")}
          {!adminNotes.trim() && (
            <span className="text-xs font-normal text-warning-ink ml-2">
              ({tCommon("required_for_additional_info_request")})
            </span>
          )}
        </label>
        <Textarea
          placeholder={`${tDashboard("add_notes_about_this_application")}…`}
          value={adminNotes}
          onChange={(e) => onAdminNotesChange(e.target.value)}
          rows={2}
          className="resize-none bg-card border-border-strong text-foreground placeholder:text-subtle-foreground dark:placeholder:text-muted-foreground"
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
      <div className="flex items-center gap-2 text-foreground">
        <Lightbulb className="h-5 w-5 text-warning-ink" />
        <h3 className="text-lg font-semibold">
          {tCommon("verification_tips")}
        </h3>
      </div>

      {/* Three tip cards that were three DIFFERENT recipes for one pattern: the
          compliance card carried a SOLID `bg-success` with raw `text-success` type
          on it (invisible in light mode), and the other two doubled their tint and
          border in dark via `dark:` overrides — which is what a tokenised
          `/10` + `/30` already handles in both themes. Headings keep the tone
          (on-tint ink); body copy is muted, so the tone is an accent rather than
          a wall of coloured text. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <h4 className="font-medium text-warning-ink flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {tCommon("check_document_authenticity")}
          </h4>
          <p className="text-sm text-muted-foreground mt-2">
            {t("verify_that_all_users_information")}.
          </p>
        </div>

        {/* `info`, not `primary`: this is a "read this" note, and on a theme
            whose primary is amber-adjacent the middle card was indistinguishable
            from the warning one beside it. `--info` is a deliberately distinct
            hue from `--primary` for exactly this. */}
        <div className="bg-info/10 border border-info/30 rounded-lg p-4">
          <h4 className="font-medium text-info-ink flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {tCommon("cross_reference_information")}
          </h4>
          <p className="text-sm text-muted-foreground mt-2">
            {t("ensure_that_all_and_documents")}.
          </p>
        </div>

        <div className="bg-success/10 border border-success/30 rounded-lg p-4">
          <h4 className="font-medium text-success-ink flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {tCommon("follow_compliance_guidelines")}
          </h4>
          <p className="text-sm text-muted-foreground mt-2">
            {t("adhere_to_kyc_aml_legal_compliance")}.
          </p>
        </div>
      </div>
    </div>
  );
};
