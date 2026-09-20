"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AnimatePresence, m } from "framer-motion";
import { AlertCircle, Upload, FileText, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { isLegacyKycDocumentPath } from "@/utils/kyc-upload";

interface FileFieldProps {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  accept?: string;
  value: File | string | null;
  onChange: (value: File | null) => void;
  error?: string;
  touched?: boolean;
  multiple?: boolean;
}

export function FileField({
  id,
  label,
  description,
  required = false,
  accept = "image/*,application/pdf",
  value,
  onChange,
  error,
  touched,
  multiple = false,
}: FileFieldProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("dashboard_user");
  const tDashboard = useTranslations("dashboard");
  /*
   * An already-stored document the KYC storage migration has not moved cannot
   * be fetched — 6.7.2 refuses the old path at both doors. Without this the
   * applicant editing an old application gets a broken thumbnail and a green
   * "uploaded successfully" line under it, which is the most confusing pair of
   * signals this form could show. A file they have JUST picked is unaffected:
   * that renders from an object URL, not from the server.
   */
  const awaitingMigration = isLegacyKycDocumentPath(value);
  const servableValue =
    typeof value === "string" && !awaitingMigration ? value : null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const showError = touched && error;
  const labelClasses = cn(
    "text-sm font-medium mb-1.5 block text-foreground",
    showError ? "text-destructive" : ""
  );

  const handleFileSelect = (file: File | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (file) {
      // Create preview for images
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }

    onChange(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    handleFileSelect(null);
  };

  const openFile = () => {
    // Opening an unmigrated path just lands the applicant on a 404.
    if (awaitingMigration) return;
    if (typeof value === "string") {
      window.open(value, "_blank");
    } else if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
  };

  const getFileName = () => {
    if (value instanceof File) {
      return value.name;
    } else if (typeof value === "string") {
      return value.split("/").pop() || "Uploaded file";
    }
    return null;
  };

  const getFileSize = () => {
    if (value instanceof File) {
      return `${(value.size / 1024).toFixed(1)} KB`;
    }
    return null;
  };

  const isImage = () => {
    if (value instanceof File) {
      return value.type.startsWith("image/");
    } else if (typeof value === "string") {
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(value);
    }
    return false;
  };

  const renderErrorMessage = () => {
    if (!showError) return null;

    return (
      <m.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="text-xs text-destructive mt-1 flex items-center gap-1"
      >
        <AlertCircle className="h-3 w-3" />
        <span>{error}</span>
      </m.div>
    );
  };

  return (
    <div className="relative mb-4" data-field-id={id}>
      <Label htmlFor={id} className={labelClasses}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground text-muted-foreground mb-1.5">
          {description}
        </p>
      )}

      {value ? (
        // File uploaded state
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/20 dark:bg-muted/50 border-border-strong">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate text-foreground">
                  {getFileName()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getFileSize() || (typeof value === "string" ? tCommon("verified") : "")}
                </span>
              </div>
              {awaitingMigration ? (
                <div className="flex items-center text-xs text-warning-ink gap-1">
                  <span>{tDashboard("document_temporarily_unavailable")}</span>
                </div>
              ) : (
                <div className="flex items-center text-xs text-success gap-1">
                  <span>{t('uploaded_successfully')}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!awaitingMigration && (isImage() || typeof value === "string") && (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  iconOnly
                  onClick={openFile}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                size="xs"
                variant="ghost"
                iconOnly
                className="text-destructive hover:text-destructive"
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image preview */}
          {isImage() && (previewUrl || servableValue) && (
            <div className="relative">
              <img
                src={previewUrl || servableValue || ""}
                alt={t("file_preview")}
                className="w-full max-w-sm h-32 object-cover rounded-lg border border-border-strong"
              />
            </div>
          )}
        </div>
      ) : (
        // Upload area
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg transition-all cursor-pointer",
            "hover:border-primary/50 focus-within:border-primary/70 dark:hover:border-primary/60 dark:focus-within:border-primary/80",
            isDragOver
              ? "border-primary/70 bg-primary/5 dark:bg-primary/10"
              : "border-border-strong",
            showError
              ? "border-destructive focus-within:border-destructive"
              : ""
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            id={id}
            className="hidden"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
          />
          
          <div className="p-6 flex flex-col items-center gap-3 dark:bg-muted/20">
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary/70" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-primary/80 mb-1">
                {isDragOver ? t("drop_file_here") : t("drag_and_drop_or_click_to_upload")}
              </p>
              <p className="text-xs text-muted-foreground">
                {accept ? `Supports ${accept.replace(/\w+\//g, "").replace(/,/g, ", ")}` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>{renderErrorMessage()}</AnimatePresence>
    </div>
  );
} 