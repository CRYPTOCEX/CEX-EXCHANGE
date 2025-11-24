"use client";

import { CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
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

export const ApplicationDetailsTab = ({
  level,
  applicationData,
  expandedSections,
  toggleSection,
  onCopy,
  copiedField,
  onViewImage,
}: ApplicationDetailsTabProps) => {
  const t = useTranslations("dashboard");
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
      case "EMAIL":
        return <Mail className="h-4 w-4" />;
      case "PHONE":
        return <Phone className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Render field value
  const renderFieldValue = (field: KycField, value: any) => {
    if (!value && value !== 0 && value !== false) {
      return (
        <div className="text-muted-foreground italic">{t("not_provided")}</div>
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
              className="h-7 w-7 p-0 opacity-70 hover:opacity-100 hover:bg-blue-50 dark:hover:bg-blue-900/30 no-print"
              onClick={() => onCopy(value, field.id)}
            >
              {copiedField === field.id ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
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
                  className="text-blue-500 dark:text-blue-400"
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
          <Badge className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
            {option?.label || value}
          </Badge>
        );
      }
      case "CHECKBOX": {
        return value ? (
          <Badge className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {t("Yes")}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
          >
            {t("No")}
          </Badge>
        );
      }
      case "RADIO": {
        const radioOption = field.options?.find((opt) => opt.value === value);
        return (
          <Badge className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800">
            {radioOption?.label || value}
          </Badge>
        );
      }
      case "IMAGE": {
        return (
          <div className="mt-2">
            <Lightbox
              src={value}
              alt={field.label}
              className="aspect-video w-full max-w-md rounded object-cover cursor-pointer transition-all hover:opacity-90"
              wrapperClassName="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 shadow-sm"
            />
          </div>
        );
      }
      case "FILE": {
        return (
          <div className="flex items-center gap-3 rounded-md border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-700 dark:text-blue-300 truncate">
                {field.label.toLowerCase().replace(/\s+/g, "-")}
                {t("pdf")}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{t("Document")}</p>
            </div>
            <div className="flex items-center gap-1 no-print">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-blue-700 dark:text-blue-400"
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
                className="h-8 w-8 p-0 text-blue-700 dark:text-blue-400"
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
              <Badge className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                {t("id_type")}
                {identityData.type || "passport"}
              </Badge>
            </div>

            {identityData["passport-scan"] && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-2">
                  {t("id_document_scan")}
                </p>
                <div className="max-w-md mx-auto">
                  <Lightbox
                    src={identityData["passport-scan"]}
                    alt="ID Document Scan"
                    className="w-full h-auto object-contain max-h-[300px]"
                    wrapperClassName="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 shadow-sm hover:shadow-md transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {identityData["passport-selfie"] && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  {t("id_selfie_verification")}
                </p>
                <div className="max-w-md mx-auto">
                  <Lightbox
                    src={identityData["passport-selfie"]}
                    alt="ID Selfie Verification"
                    className="w-full h-auto object-contain max-h-[300px]"
                    wrapperClassName="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 shadow-sm hover:shadow-md transition-all duration-200"
                  />
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
    const fieldValue = applicationData[field.id];
    const fieldIcon = getFieldIcon(field.type);

    // Special case for IDENTITY type to avoid hover effect on the entire container
    if (field.type === "IDENTITY") {
      return (
        <div key={field.id} className="border border-zinc-100 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400">
                  {fieldIcon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                    <span>{field.label}</span>
                    {field.required && (
                      <span className="text-xs bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                        {t("Required")}
                      </span>
                    )}
                  </h4>
                  {field.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {field.description}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-xs bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50 self-start sm:self-auto"
              >
                {field.type}
              </Badge>
            </div>

            <div className="mt-2 rounded-md bg-white dark:bg-zinc-900 p-3 border border-zinc-100 dark:border-zinc-700">
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
        className="group border border-zinc-100 dark:border-zinc-700 rounded-lg p-4 hover:border-zinc-200 dark:hover:border-zinc-600 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-all duration-200 bg-white dark:bg-zinc-800"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  field.type === "IMAGE" || field.type === "FILE"
                    ? "bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400"
                    : field.type === "EMAIL"
                      ? "bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400"
                      : field.type === "PHONE"
                        ? "bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400"
                        : field.type === "DATE"
                          ? "bg-purple-100 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400"
                          : field.type === "CHECKBOX"
                            ? "bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                            : field.type === "SELECT" || field.type === "RADIO"
                              ? "bg-amber-100 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                              : "bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400"
                }`}
              >
                {fieldIcon}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2">
                  <span>{field.label}</span>
                  {field.required && (
                    <span className="text-xs bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                      {t("Required")}
                    </span>
                  )}
                </h4>
                {field.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {field.description}
                  </p>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs self-start sm:self-auto ${
                field.type === "IMAGE" || field.type === "FILE"
                  ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/50"
                  : field.type === "EMAIL"
                    ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50"
                    : field.type === "PHONE"
                      ? "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/50"
                      : field.type === "DATE"
                        ? "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/50"
                        : field.type === "CHECKBOX"
                          ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
                          : field.type === "SELECT" || field.type === "RADIO"
                            ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/50"
                            : "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50"
              }`}
            >
              {field.type}
            </Badge>
          </div>

          <div className="mt-2 rounded-md bg-white dark:bg-zinc-900 p-3 border border-zinc-100 dark:border-zinc-700 transition-all duration-150 group-hover:border-zinc-200 dark:group-hover:border-zinc-600 group-hover:shadow-sm">
            {renderFieldValue(field, fieldValue)}
          </div>
        </div>
      </div>
    );
  };

  // Render section fields
  const renderSectionFields = (section: KycField, sectionIndex: number) => {
    const isExpanded = expandedSections[section.id] !== false;

    return (
      <div
        key={section.id}
        className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <div
          className="flex items-center justify-between bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-700 p-4 cursor-pointer"
          onClick={() => toggleSection(section.id)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              {sectionIndex === 0 ? (
                <User className="h-5 w-5" />
              ) : sectionIndex === 1 ? (
                <FileText className="h-5 w-5" />
              ) : sectionIndex === 2 ? (
                <Shield className="h-5 w-5" />
              ) : (
                <Layers className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {section.label}
              </h3>
              {section.description && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{section.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {section.required && (
              <Badge className="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                {t("Required")}
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6 section-content"
      >
        {/* Application Form Data - Improved Design */}
        <div className="space-y-6">
          {/* Title */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-500 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400">
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
                {t("Identity")}
              </Button>
              <Button
                variant={activeTab === "documents" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("documents")}
                className="text-xs h-8"
              >
                {t("Documents")}
              </Button>
              <Button
                variant={activeTab === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("personal")}
                className="text-xs h-8"
              >
                {t("personal_info")}
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
                {t("Identity")}
              </Button>
              <Button
                variant={activeTab === "documents" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("documents")}
                className="text-xs h-8 flex-1 min-w-0"
              >
                {t("Documents")}
              </Button>
              <Button
                variant={activeTab === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("personal")}
                className="text-xs h-8 flex-1 min-w-0"
              >
                {t("personal_info")}
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {activeTab === "all" && (
              <div className="space-y-6">
                {/* Identity Verification Section */}
                {identityFields.length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800/50 overflow-hidden">
                    <div className="p-4 border-b border-indigo-200 dark:border-indigo-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {t("identity_verification")}
                          </h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t("government-issued_identification_documents")}
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
                  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                        {t("additional_information")}
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
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800/50 overflow-hidden">
                    <div className="p-4 border-b border-indigo-200 dark:border-indigo-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {t("identity_verification")}
                          </h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t("government-issued_identification_documents")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 gap-4">
                      {identityFields.map((field) => renderField(field))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                    <UserCheck className="h-12 w-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      {t("no_identity_documents")}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      {t("this_application_doesnt_verification_documents")}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-6">
                {documentFields.length > 0 ? (
                  <div className="bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/30 rounded-xl border border-red-200 dark:border-red-800/50 overflow-hidden">
                    <div className="p-4 border-b border-red-200 dark:border-red-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-sm">
                          <Camera className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {t("document_uploads")}
                          </h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t(
                              "Files and images submitted with the application"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documentFields.map((field) => renderField(field))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                    <FileText className="h-12 w-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      {t("no_documents")}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      {t("this_application_doesnt_document_uploads")}.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "personal" && (
              <div className="space-y-6">
                {personalInfoFields.length > 0 ? (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800/50 overflow-hidden">
                    <div className="p-4 border-b border-blue-200 dark:border-blue-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-sm">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {t("personal_information")}
                          </h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {t(
                              "Basic personal details provided by the applicant"
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {personalInfoFields.map((field) => renderField(field))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                    <User className="h-12 w-12 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      {t("no_personal_information")}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      {t("this_application_doesnt_information_fields")}.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Application Metadata */}
          <div className="mt-8 bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              {t("application_metadata")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-md border border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("Level")}</p>
                <p className="font-medium">{level.name}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-md border border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("field_count")}</p>
                <p className="font-medium">{level.fields?.length || 0}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-md border border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("required_fields")}</p>
                <p className="font-medium">
                  {level.fields?.filter((f: KycField) => f.required).length ||
                    0}
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-md border border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("document_fields")}</p>
                <p className="font-medium">{documentFields.length}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </CardContent>
  );
};
