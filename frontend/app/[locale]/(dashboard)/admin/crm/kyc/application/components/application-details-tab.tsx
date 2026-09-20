"use client";

import { CardContent } from "@/components/ui/card";
import { m } from "framer-motion";
import {
  AlertTriangle,
  FileText,
  UserCheck,
  Calendar,
  CheckCircle,
  Mail,
  Phone,
  Camera,
  CreditCard,
  MapPin,
  CheckSquare,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Layers,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbox } from "@/components/ui/lightbox";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { isLegacyKycDocumentPath } from "@/utils/kyc-upload";

interface KycField {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  fields?: KycField[];
}

interface ApplicationDetailsTabProps {
  level: any;
  applicationData: Record<string, any>;
  expandedSections: Record<string, boolean>;
  toggleSection: (sectionId: string) => void;
  onCopy: (text: string, fieldId: string) => void;
  copiedField: string | null;
  onViewImage: (src: string) => void;
}

/*
 * A stored document path the KYC storage migration has not moved cannot be
 * served — 6.7.2 refuses the old location at both doors, so it 404s. For a
 * REVIEWER that is not a cosmetic broken image, it is a blocked review, and
 * the remedy is one command. Say which, rather than rendering an <img> that
 * fails silently and reads as "this platform lost the customer's passport".
 */
const UnmigratedDocument = ({ label }: { label: string }) => {
  const tDashboard = useTranslations("dashboard");
  return (
    <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 p-3">
      <AlertTriangle className="h-5 w-5 shrink-0 text-warning-ink" />
      <div className="min-w-0">
        <p className="font-medium text-warning-ink truncate">{label}</p>
        <p className="text-xs text-warning-ink">
          {tDashboard("document_awaiting_storage_migration")}
        </p>
      </div>
    </div>
  );
};

export const ApplicationDetailsTab = ({
  level,
  applicationData,
  expandedSections,
  toggleSection,
  onCopy,
  copiedField,
  onViewImage,
}: ApplicationDetailsTabProps) => {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const [activeTab, setActiveTab] = useState("all");

  // Find identity fields
  const identityFields =
    level.fields?.filter((field: KycField) => field.type === "IDENTITY") || [];

  // Find section fields
  const sectionFields =
    level.fields?.filter((field: KycField) => field.type === "SECTION") || [];

  // Find other fields (not sections and not identity)
  const otherFields =
    level.fields?.filter(
      (field: KycField) => field.type !== "SECTION" && field.type !== "IDENTITY"
    ) || [];

  // Find document fields (images and files)
  const documentFields =
    level.fields?.filter(
      (field: KycField) => field.type === "IMAGE" || field.type === "FILE"
    ) || [];

  // Find personal info fields
  const personalInfoFields =
    level.fields?.filter(
      (field: KycField) =>
        field.type === "TEXT" ||
        field.type === "EMAIL" ||
        field.type === "PHONE" ||
        field.type === "DATE"
    ) || [];

  // Get field icon based on type
  const getFieldIcon = (fieldType: string) => {
    switch (fieldType.toUpperCase()) {
      case "TEXT":
        return <FileText className="h-3.5 w-3.5" />;
      case "IDENTITY":
        return <CreditCard className="h-3.5 w-3.5" />;
      case "FILE":
      case "IMAGE":
        return <Camera className="h-3.5 w-3.5" />;
      case "ADDRESS":
        return <MapPin className="h-3.5 w-3.5" />;
      case "CHECKBOX":
        return <CheckSquare className="h-3.5 w-3.5" />;
      case "SELECT":
      case "RADIO":
        return <ChevronRight className="h-3.5 w-3.5" />;
      case "DATE":
        return <Calendar className="h-3.5 w-3.5" />;
      case "EMAIL":
        return <Mail className="h-3.5 w-3.5" />;
      case "PHONE":
        return <Phone className="h-3.5 w-3.5" />;
      default:
        return <Info className="h-3.5 w-3.5" />;
    }
  };

  // Render field value
  const renderFieldValue = (field: KycField, value: any) => {
    if (!value && value !== 0 && value !== false) {
      return (
        <div className="text-muted-foreground italic">
          {tCommon("not_provided")}
        </div>
      );
    }

    switch (field.type) {
      case "TEXT":
      case "EMAIL":
      case "PHONE":
      case "NUMBER":
      case "DATE":
      case "TEXTAREA": {
        return (
          <div className="flex items-center gap-2">
            <span className="flex-1 font-medium">{value}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-70 hover:opacity-100 hover:bg-primary/20 no-print"
              onClick={() => onCopy(value, field.id)}
            >
              {copiedField === field.id ? (
                <CheckCircle className="h-3.5 w-3.5 text-success-ink" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary-ink"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </Button>
          </div>
        );
      }
      case "SELECT": {
        const option = field.options?.find((opt) => opt.value === value);
        return (
          <Badge className="bg-primary text-primary-foreground border-transparent">
            {option?.label || value}
          </Badge>
        );
      }
      case "CHECKBOX": {
        return value ? (
          <Badge className="bg-success/10 text-foreground border-success/30 flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-success-ink" />
            {tCommon("yes")}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-destructive/10 text-foreground border-destructive/30"
          >
            {tCommon("no")}
          </Badge>
        );
      }
      case "RADIO": {
        const radioOption = field.options?.find((opt) => opt.value === value);
        return (
          <Badge className="bg-primary text-primary-foreground border-transparent">
            {radioOption?.label || value}
          </Badge>
        );
      }
      case "IMAGE": {
        if (isLegacyKycDocumentPath(value)) {
          return (
            <div className="mt-2">
              <UnmigratedDocument label={field.label} />
            </div>
          );
        }
        return (
          <div className="mt-2">
            <Lightbox
              src={value}
              alt={field.label}
              className="aspect-video w-full max-w-md rounded object-cover cursor-pointer transition-all hover:opacity-90"
              wrapperClassName="overflow-hidden rounded-md border border-border bg-surface-2 p-1"
            />
          </div>
        );
      }
      case "FILE": {
        if (isLegacyKycDocumentPath(value)) {
          return <UnmigratedDocument label={field.label} />;
        }
        return (
          <div className="flex items-center gap-3 rounded-md border border-primary bg-primary/10 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <FileText className="h-5 w-5 text-primary-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-primary-ink truncate">
                {field.label.toLowerCase().replace(/\s+/g, "-")}
                {tDashboard("pdf")}
              </p>
              <p className="text-xs text-primary-ink">
                {tCommon("document")}
              </p>
            </div>
            <div className="flex items-center gap-1 no-print">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-primary-ink"
                onClick={() => window.open(value, "_blank")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-primary-ink"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = value;
                  a.download = `${field.label.toLowerCase().replace(/\s+/g, "-")}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </Button>
            </div>
          </div>
        );
      }
      case "IDENTITY": {
        // Parse identity data if it's a string
        let identityData = value;
        if (typeof value === "string") {
          try {
            identityData = JSON.parse(value);
          } catch (e) {
            console.error("Error parsing identity data:", e);
          }
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary-ink border-primary/30">
                {tCommon("id_type")}:{" "}
                {identityData.type || "passport"}
              </Badge>
            </div>

            {identityData["passport-scan"] && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-2">
                  {tDashboard("id_document_scan")}
                </p>
                <div className="max-w-md mx-auto">
                  {isLegacyKycDocumentPath(identityData["passport-scan"]) ? (
                    <UnmigratedDocument label={tDashboard("id_document_scan")} />
                  ) : (
                    <Lightbox
                      src={identityData["passport-scan"]}
                      alt={tDashboard("id_document_scan")}
                      className="w-full h-auto object-contain max-h-[300px]"
                      wrapperClassName="overflow-hidden rounded-md border border-border bg-surface-2 p-1 transition-colors duration-200"
                    />
                  )}
                </div>
              </div>
            )}

            {identityData["passport-selfie"] && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  {tDashboard("id_selfie_verification")}
                </p>
                <div className="max-w-md mx-auto">
                  {isLegacyKycDocumentPath(identityData["passport-selfie"]) ? (
                    <UnmigratedDocument label={tDashboard("id_selfie_verification")} />
                  ) : (
                    <Lightbox
                      src={identityData["passport-selfie"]}
                      alt={tDashboard("id_selfie_verification")}
                      className="w-full h-auto object-contain max-h-[300px]"
                      wrapperClassName="overflow-hidden rounded-md border border-border bg-surface-2 p-1 transition-colors duration-200"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }
      default: {
        return <span className="font-medium">{JSON.stringify(value)}</span>;
      }
    }
  };

  // Render a field
  const renderField = (field: KycField) => {
  const tCommon = useTranslations("common");
    const fieldValue = applicationData[field.id];
    const fieldIcon = getFieldIcon(field.type);

    // Special case for IDENTITY type to avoid hover effect on the entire container
    if (field.type === "IDENTITY") {
      return (
        <div
          key={field.id}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary-ink">
                  {fieldIcon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground flex flex-wrap items-center gap-2">
                    <span>{field.label}</span>
                    {field.required && (
                      <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                        {tCommon("required")}
                      </span>
                    )}
                  </h4>
                  {field.description && (
                    <p className="text-xs text-subtle-foreground mt-0.5">
                      {field.description}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs bg-primary/10 text-foreground border-primary/30 self-start sm:self-auto"
              >
                {field.type}
              </Badge>
            </div>

            <div className="mt-2 rounded-md border border-border bg-surface-2 p-3">
              {renderFieldValue(field, fieldValue)}
            </div>
          </div>
        </div>
      );
    }

    // Regular fields with hover effect
    return (
      <div
        key={field.id}
        className="group rounded-lg border border-border bg-card p-4 transition-colors duration-200 hover:border-border-strong"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm ${
                  field.type === "IMAGE" || field.type === "FILE"
                    ? "bg-destructive/10 text-destructive-ink"
                    : field.type === "EMAIL"
                      ? "bg-success/10 text-success-ink"
                      : field.type === "PHONE"
                        ? "bg-success/10 text-success-ink"
                        : field.type === "DATE"
                          ? "bg-primary/15 text-primary-ink"
                          : field.type === "CHECKBOX"
                            ? "bg-warning/10 text-warning-ink"
                            : field.type === "SELECT" || field.type === "RADIO"
                              ? "bg-warning/10 text-warning-ink"
                              : "bg-primary/15 text-primary-ink"
                }`}
              >
                {fieldIcon}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground flex flex-wrap items-center gap-2">
                  <span>{field.label}</span>
                  {field.required && (
                    <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
                      {tCommon("required")}
                    </span>
                  )}
                </h4>
                {field.description && (
                  <p className="text-xs text-subtle-foreground mt-0.5">
                    {field.description}
                  </p>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs self-start sm:self-auto ${
                field.type === "IMAGE" || field.type === "FILE"
                  ? "bg-destructive/10 text-foreground border-destructive/30"
                  : field.type === "EMAIL"
                    ? "bg-success/10 text-foreground border-success/30"
                    : field.type === "PHONE"
                      ? "bg-success/10 text-foreground border-success/30"
                      : field.type === "DATE"
                        ? "bg-primary/10 text-foreground border-primary/30"
                        : field.type === "CHECKBOX"
                          ? "bg-warning/10 text-foreground border-warning/30"
                          : field.type === "SELECT" || field.type === "RADIO"
                            ? "bg-warning/10 text-foreground border-warning/30"
                            : "bg-primary/10 text-foreground border-primary/30"
              }`}
            >
              {field.type}
            </Badge>
          </div>

          <div className="mt-2 rounded-md border border-border bg-surface-2 p-3 transition-colors duration-150 group-hover:border-border-strong">
            {renderFieldValue(field, fieldValue)}
          </div>
        </div>
      </div>
    );
  };

  // Render section fields
  const renderSectionFields = (section: KycField, sectionIndex: number) => {
  const tCommon = useTranslations("common");
    const isExpanded = expandedSections[section.id] !== false;

    return (
      <div
        key={section.id}
        className="overflow-hidden rounded-lg border border-border bg-card transition-colors duration-200"
      >
        <div
          className="flex items-center justify-between bg-muted p-4 cursor-pointer"
          onClick={() => toggleSection(section.id)}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
              {sectionIndex === 0 ? (
                <User className="h-3.5 w-3.5" />
              ) : sectionIndex === 1 ? (
                <FileText className="h-3.5 w-3.5" />
              ) : sectionIndex === 2 ? (
                <Shield className="h-3.5 w-3.5" />
              ) : (
                <Layers className="h-3.5 w-3.5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {section.label}
              </h3>
              {section.description && (
                <p className="text-sm text-subtle-foreground">
                  {section.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {section.required && (
              <Badge className="bg-destructive text-destructive-foreground border-transparent">
                {tCommon("required")}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full no-print"
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 grid grid-cols-1 gap-4">
            {section.fields?.map((field) => renderField(field))}
          </div>
        )}
      </div>
    );
  };

  return (
    <CardContent className="pt-6">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 section-content"
      >
        {/* Application Form Data - Improved Design */}
        <div className="space-y-6">
          {/* Title */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="text-foreground">
                {t("application_form_data")}
              </span>
            </h3>

            {/* Filter tabs for application data - Desktop only */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={activeTab === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("all")}
                className="text-xs h-8"
              >
                {t("all_fields")}
              </Button>
              <Button
                variant={activeTab === "identity" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("identity")}
                className="text-xs h-8"
              >
                {tCommon("identity")}
              </Button>
              <Button
                variant={activeTab === "documents" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("documents")}
                className="text-xs h-8"
              >
                {tCommon("documents")}
              </Button>
              <Button
                variant={activeTab === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("personal")}
                className="text-xs h-8"
              >
                {tCommon("personal_info")}
              </Button>
            </div>
          </div>

          {/* Filter tabs for application data - Mobile only */}
          <div className="md:hidden">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeTab === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("all")}
                className="text-xs h-8 flex-1 min-w-0"
              >
                {t("all_fields")}
              </Button>
              <Button
                variant={activeTab === "identity" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("identity")}
                className="text-xs h-8 flex-1 min-w-0"
              >
                {tCommon("identity")}
              </Button>
              <Button
                variant={activeTab === "documents" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("documents")}
                className="text-xs h-8 flex-1 min-w-0"
              >
                {tCommon("documents")}
              </Button>
              <Button
                variant={activeTab === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("personal")}
                className="text-xs h-8 flex-1 min-w-0"
              >
                {tCommon("personal_info")}
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {activeTab === "all" && (
              <div className="space-y-6">
                {/* Identity Verification Section */}
                {identityFields.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                          <UserCheck className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {tCommon("identity_verification")}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t("government_issued_identification_documents")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 gap-4">
                      {identityFields.map((field) => renderField(field))}
                    </div>
                  </div>
                )}

                {/* Section Fields */}
                {sectionFields.length > 0 && (
                  <div className="space-y-4">
                    {sectionFields.map((section, index) =>
                      renderSectionFields(section, index)
                    )}
                  </div>
                )}

                {/* Other Fields */}
                {otherFields.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="p-4 border-b border-border bg-surface-2">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        {tCommon("additional_information")}
                      </h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {otherFields.map((field) => renderField(field))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "identity" && (
              <div className="space-y-6">
                {identityFields.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                          <UserCheck className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {tCommon("identity_verification")}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t("government_issued_identification_documents")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 gap-4">
                      {identityFields.map((field) => renderField(field))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-lg border border-dashed border-border bg-surface-2">
                    <UserCheck className="h-12 w-12 text-subtle-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      {t("no_identity_documents")}
                    </h3>
                    <p className="text-sm text-subtle-foreground max-w-md mx-auto">
                      {t("this_application_doesnt_verification_documents")}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-6">
                {documentFields.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-destructive/15 text-destructive">
                          <Camera className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {t("document_uploads")}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t("files_and_images_submitted_with_application")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documentFields.map((field) => renderField(field))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-lg border border-dashed border-border bg-surface-2">
                    <FileText className="h-12 w-12 text-subtle-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      {t("no_documents")}
                    </h3>
                    <p className="text-sm text-subtle-foreground max-w-md mx-auto">
                      {t("this_application_doesnt_document_uploads")}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "personal" && (
              <div className="space-y-6">
                {personalInfoFields.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {tCommon("personal_info")}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t("basic_personal_details_provided_by_applicant")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {personalInfoFields.map((field) => renderField(field))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 rounded-lg border border-dashed border-border bg-surface-2">
                    <User className="h-12 w-12 text-subtle-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      {t("no_personal_information")}
                    </h3>
                    <p className="text-sm text-subtle-foreground max-w-md mx-auto">
                      {t("this_application_doesnt_information_fields")}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Application Metadata */}
          <div className="mt-8 rounded-lg border border-border bg-surface-2 p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-subtle-foreground" />
              {t("application_metadata")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {tCommon("level")}
                </p>
                <p className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-foreground">
                  {level.name}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("field_count")}
                </p>
                <p className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                  {level.fields?.length || 0}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("required_fields")}
                </p>
                <p className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                  {level.fields?.filter((f: KycField) => f.required).length ||
                    0}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("document_fields")}
                </p>
                <p className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-foreground font-mono tabular-nums">
                  {documentFields.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </m.div>
    </CardContent>
  );
};
