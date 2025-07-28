"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Copy,
  Download,
  Eye,
  FileText,
  HelpCircle,
  Mail,
  Maximize,
  Phone,
  UserCheck,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Layers, Shield, User } from "lucide-react";
import { useTranslations } from "next-intl";
const t = useTranslations("dashboard");
interface FieldValueProps {
  field: KycField;
  value: any;
  onCopy: (text: string, fieldId: string) => void;
  copiedField: string | null;
  onViewImage: (src: string) => void;
}
export const FieldValue = ({
  field,
  value,
  onCopy,
  copiedField,
  onViewImage,
}: FieldValueProps) => {
  const t = useTranslations("dashboard");
  if (!value && value !== 0 && value !== false) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground italic">
        <AlertCircle className="h-4 w-4" />
        <span>{t("not_provided")}</span>
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
            className="h-7 w-7 p-0 opacity-70 hover:opacity-100 hover:bg-blue-50 no-print"
            onClick={() => onCopy(value, field.id)}
          >
            {copiedField === field.id ? (
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-blue-500" />
            )}
          </Button>
        </div>
      );
    }
    case "SELECT": {
      const option = field.options?.find((opt) => opt.value === value);
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
            {option?.label || value}
          </Badge>
        </div>
      );
    }
    case "CHECKBOX": {
      return (
        <div className="flex items-center gap-2">
          {value ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {t("Yes")}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1"
            >
              <XCircle className="h-3 w-3" />
              {t("No")}
            </Badge>
          )}
        </div>
      );
    }
    case "RADIO": {
      const radioOption = field.options?.find((opt) => opt.value === value);
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">
            {radioOption?.label || value}
          </Badge>
        </div>
      );
    }
    case "IMAGE": {
      return (
        <div className="mt-2 relative group">
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-sm transition-all duration-200 group-hover:shadow-md">
            <img
              src={value || "/placeholder.svg"}
              alt={field.label}
              className="aspect-video w-full max-w-md rounded object-cover transition-all group-hover:scale-[1.01]"
              onClick={() => onViewImage(value)}
            />
          </div>
          <div className="mt-2 flex items-center justify-end gap-2 no-print">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => onViewImage(value)}
            >
              <Maximize className="h-3.5 w-3.5 mr-1.5" />
              {t("view_full_size")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                const a = document.createElement("a");
                a.href = value;
                a.download = `${field.label.toLowerCase().replace(/\s+/g, "-")}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {t("Download")}
            </Button>
          </div>
        </div>
      );
    }
    case "FILE": {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-md border border-blue-100 bg-blue-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-700 truncate">
                {field.label.toLowerCase().replace(/\s+/g, "-")}
                {t("pdf")}
              </p>
              <p className="text-xs text-blue-600">{t("Document")}</p>
            </div>
            <div className="flex items-center gap-1 no-print">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-blue-700"
                onClick={() => window.open(value, "_blank")}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-blue-700"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = value;
                  a.download = `${field.label.toLowerCase().replace(/\s+/g, "-")}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
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
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              {t("id_type")}
              {identityData.type || "passport"}
            </Badge>
          </div>

          {identityData["passport-scan"] && (
            <div className="mt-2">
              <p className="text-sm font-medium mb-2">
                {t("id_document_scan")}
              </p>
              <div className="relative">
                <div className="overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-sm hover:shadow-md transition-all duration-200">
                  <img
                    src={identityData["passport-scan"] || "/placeholder.svg"}
                    alt="ID Document Scan"
                    className="aspect-video w-full max-w-md rounded object-cover hover:scale-[1.01] transition-all"
                    onClick={() => onViewImage(identityData["passport-scan"])}
                  />
                </div>
                <div className="mt-2 flex items-center justify-end gap-2 no-print">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => onViewImage(identityData["passport-scan"])}
                  >
                    <Maximize className="h-3.5 w-3.5 mr-1.5" />
                    {t("view_full_size")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = identityData["passport-scan"];
                      a.download = `id-document-scan.jpg`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {t("Download")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {identityData["passport-selfie"] && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">
                {t("id_selfie_verification")}
              </p>
              <div className="relative">
                <div className="overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-sm hover:shadow-md transition-all duration-200">
                  <img
                    src={identityData["passport-selfie"] || "/placeholder.svg"}
                    alt="ID Selfie Verification"
                    className="aspect-video w-full max-w-md rounded object-cover hover:scale-[1.01] transition-all"
                    onClick={() => onViewImage(identityData["passport-selfie"])}
                  />
                </div>
                <div className="mt-2 flex items-center justify-end gap-2 no-print">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => onViewImage(identityData["passport-selfie"])}
                  >
                    <Maximize className="h-3.5 w-3.5 mr-1.5" />
                    {t("view_full_size")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = identityData["passport-selfie"];
                      a.download = `id-selfie-verification.jpg`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {t("Download")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    case "SECTION": {
      return null; // Sections are handled separately
    }
    default: {
      return <span className="font-medium">{JSON.stringify(value)}</span>;
    }
  }
};
interface SectionFieldProps {
  section: KycField;
  data: Record<string, any>;
  sectionIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: (text: string, fieldId: string) => void;
  copiedField: string | null;
  onViewImage: (src: string) => void;
}
export const SectionField = ({
  section,
  data,
  sectionIndex,
  isExpanded,
  onToggle,
  onCopy,
  copiedField,
  onViewImage,
}: SectionFieldProps) => {
  const t = useTranslations("dashboard");
  return (
    <div
      key={section.id}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md print-border"
    >
      <div
        className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-4 cursor-pointer"
        onClick={onToggle}
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
            <h3 className="text-lg font-semibold text-gray-900">
              {section.label}
            </h3>
            {section.description && (
              <p className="text-sm text-gray-500">{section.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {section.required && (
            <Badge className="bg-red-100 text-red-700 border-red-200">
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

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="overflow-hidden section-content"
          >
            <div className="divide-y divide-gray-100 px-4 py-2">
              {section.fields &&
                section.fields.map((field) => {
                  const fieldValue = data[field.id];

                  // Get field type color and icon
                  const getFieldTypeInfo = () => {
                    switch (field.type) {
                      case "TEXT":
                      case "TEXTAREA":
                        return {
                          color: "blue",
                          icon: <FileText className="h-4 w-4" />,
                        };
                      case "EMAIL":
                        return {
                          color: "green",
                          icon: <Mail className="h-4 w-4" />,
                        };
                      case "PHONE":
                        return {
                          color: "green",
                          icon: <Phone className="h-4 w-4" />,
                        };
                      case "NUMBER":
                      case "DATE":
                        return {
                          color: "purple",
                          icon: <Calendar className="h-4 w-4" />,
                        };
                      case "SELECT":
                      case "RADIO":
                      case "CHECKBOX":
                        return {
                          color: "amber",
                          icon: <CheckCircle className="h-4 w-4" />,
                        };
                      case "IMAGE":
                      case "FILE":
                        return {
                          color: "red",
                          icon: <FileText className="h-4 w-4" />,
                        };
                      case "IDENTITY":
                        return {
                          color: "indigo",
                          icon: <UserCheck className="h-4 w-4" />,
                        };
                      default:
                        return {
                          color: "gray",
                          icon: <FileText className="h-4 w-4" />,
                        };
                    }
                  };
                  const fieldInfo = getFieldTypeInfo();
                  return (
                    <div
                      key={field.id}
                      className="group py-4 px-2 hover:bg-gray-50 rounded-md transition-colors duration-150 print-border"
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-3">
                        <div
                          className={`hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-${fieldInfo.color}-100 text-${fieldInfo.color}-600`}
                        >
                          {fieldInfo.icon}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                <span
                                  className={`md:hidden inline-flex h-5 w-5 items-center justify-center rounded-full bg-${fieldInfo.color}-100 text-${fieldInfo.color}-600 mr-1`}
                                >
                                  {fieldInfo.icon}
                                </span>
                                {field.label}
                                {field.required && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                    {t("Required")}
                                  </span>
                                )}
                              </h4>
                              {field.description && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {field.description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-xs bg-${fieldInfo.color}-50 text-${fieldInfo.color}-600 border-${fieldInfo.color}-200`}
                            >
                              {field.type}
                            </Badge>
                          </div>

                          <div className="mt-2 rounded-md bg-gray-50 p-3 transition-all duration-150 group-hover:bg-white group-hover:shadow-sm">
                            <FieldValue
                              field={field}
                              value={fieldValue}
                              onCopy={onCopy}
                              copiedField={copiedField}
                              onViewImage={onViewImage}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
interface StandardFieldProps {
  field: KycField;
  value: any;
  onCopy: (text: string, fieldId: string) => void;
  copiedField: string | null;
  onViewImage: (src: string) => void;
}
export const StandardField = ({
  field,
  value,
  onCopy,
  copiedField,
  onViewImage,
}: StandardFieldProps) => {
  const t = useTranslations("dashboard");
  const getFieldTypeColor = () => {
    switch (field.type) {
      case "TEXT":
      case "TEXTAREA":
        return "border-l-blue-500";
      case "EMAIL":
      case "PHONE":
        return "border-l-green-500";
      case "NUMBER":
      case "DATE":
        return "border-l-purple-500";
      case "SELECT":
      case "RADIO":
      case "CHECKBOX":
        return "border-l-amber-500";
      case "IMAGE":
      case "FILE":
        return "border-l-red-500";
      case "IDENTITY":
        return "border-l-indigo-500";
      default:
        return "border-l-gray-500";
    }
  };
  return (
    <div
      className={`grid grid-cols-3 gap-4 py-4 border-t border-gray-100 dark:border-gray-800 border-l-4 ${getFieldTypeColor()} pl-3 -ml-3 rounded-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors print-border`}
    >
      <div>
        <h4 className="font-medium flex items-center">
          {field.label}
          {field.required && (
            <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
              {t("Required")}
            </span>
          )}
        </h4>
        {field.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {field.description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Badge
            variant="outline"
            className="text-xs bg-gray-50 text-gray-500 border-gray-200"
          >
            {field.type}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 no-print"
                >
                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {t("field_id")}
                  {field.id}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="col-span-2">
        <FieldValue
          field={field}
          value={value}
          onCopy={onCopy}
          copiedField={copiedField}
          onViewImage={onViewImage}
        />
      </div>
    </div>
  );
};
