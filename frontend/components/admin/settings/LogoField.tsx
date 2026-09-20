"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Check, Loader2, Sparkles } from "lucide-react";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { useLogoCacheStore } from "@/store/logo-cache";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";

interface LogoFieldProps {
  field: {
    key: string;
    label: string;
    description?: string;
    fileSize?: { width: number; height: number };
  };
  value: string;
  onChange: (key: string, value: string) => void;
  /** Card-level chips, rendered beside the size badge. See SettingsField. */
  meta?: React.ReactNode;
}

// Map logo types to their actual file paths
const LOGO_FILE_MAPPING: Record<string, string> = {
  logo: "/img/logo/logo.webp",
  darkLogo: "/img/logo/logo-dark.webp",
  fullLogo: "/img/logo/logo-text.webp",
  darkFullLogo: "/img/logo/logo-text-dark.webp",
  cardLogo: "/img/logo/android-chrome-256x256.webp",
  favicon16: "/img/logo/favicon-16x16.webp",
  favicon32: "/img/logo/favicon-32x32.webp",
  favicon96: "/img/logo/favicon-96x96.webp",
  appleIcon57: "/img/logo/apple-icon-57x57.webp",
  appleIcon60: "/img/logo/apple-icon-60x60.webp",
  appleIcon72: "/img/logo/apple-icon-72x72.webp",
  appleIcon76: "/img/logo/apple-icon-76x76.webp",
  appleIcon114: "/img/logo/apple-icon-114x114.webp",
  appleIcon120: "/img/logo/apple-icon-120x120.webp",
  appleIcon144: "/img/logo/apple-icon-144x144.webp",
  appleIcon152: "/img/logo/apple-icon-152x152.webp",
  appleIcon180: "/img/logo/apple-icon-180x180.webp",
  androidIcon192: "/img/logo/android-chrome-192x192.webp",
  androidIcon256: "/img/logo/android-chrome-256x256.webp",
  androidIcon384: "/img/logo/android-chrome-384x384.webp",
  androidIcon512: "/img/logo/android-chrome-512x512.webp",
  msIcon144: "/img/logo/ms-icon-144x144.webp",
};

export function LogoField({ field, value, onChange, meta }: LogoFieldProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("dashboard_admin");
  const { updateLogoVersion, logoVersion } = useLogoCacheStore();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImageBlob, setUploadedImageBlob] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getActualLogoPath = () => {
    return LOGO_FILE_MAPPING[field.key] || null;
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert(tCommon("please_select_an_image_file"));
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(tCommon("file_size_must_be_less_than_10mb"));
      return;
    }

    setIsUploading(true);
    setUploadSuccess(false);
    const fileBlob = URL.createObjectURL(file);
    setPreviewUrl(fileBlob);

    try {
      const base64File = await fileToBase64(file);

      const { data, error } = await $fetch({
        url: "/api/admin/system/settings/logo",
        method: "PUT",
        body: {
          logoType: field.key,
          file: base64File,
        },
        successMessage: t("updated_successfully", { label: String(field.label) }),
      });

      if (error) {
        throw new Error(typeof error === "string" ? error : JSON.stringify(error));
      }

      onChange(field.key, data.logoUrl);
      setPreviewUrl(null);
      setUploadedImageBlob(null);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);

      if (fileBlob) {
        URL.revokeObjectURL(fileBlob);
      }

      updateLogoVersion();
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || t("failed_to_upload_logo_please_try_again");
      alert(t("failed_to_upload", { label: String(field.label), errorMessage: String(errorMessage) }));
      setPreviewUrl(null);

      const fileInput = document.getElementById(field.key) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearPreview = () => {
    setPreviewUrl(null);
    setUploadedImageBlob(null);
    const fileInput = document.getElementById(field.key) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const getDisplayLogoUrl = () => {
    const actualPath = getActualLogoPath();
    if (!actualPath) return null;
    if (!mounted) {
      return `${actualPath}?v=${logoVersion}`;
    }
    return `${actualPath}?v=${logoVersion}&t=${Date.now()}`;
  };

  const displayLogoUrl = getDisplayLogoUrl();
  // Only consider hasImage true if we have a valid, non-empty source
  const imageSource = previewUrl || uploadedImageBlob || displayLogoUrl;
  const hasImage = Boolean(imageSource && imageSource.trim() !== "");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 mb-2">
        <Label htmlFor={field.key} className="text-sm font-medium truncate">
          {field.label}
        </Label>
        <div className="flex items-center gap-1.5 shrink-0">
          {meta}
          {field.fileSize && (
            <Badge variant="secondary" className="text-xs">
              {field.fileSize.width}x{field.fileSize.height}
            </Badge>
          )}
        </div>
      </div>

      {field.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {field.description}
        </p>
      )}

      <m.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "relative flex-1 min-h-[120px] rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          "flex items-center justify-center",
          dragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : isUploading
              ? "border-muted-foreground/25 opacity-50 cursor-not-allowed"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (!isUploading) {
            const fileInput = document.getElementById(field.key) as HTMLInputElement;
            if (fileInput) {
              fileInput.value = "";
              fileInput.click();
            }
          }
        }}
      >
        <AnimatePresence>
          {dragActive && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-primary/10"
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {hasImage ? (
            <m.div
              key="preview"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative p-4"
            >
              <div className="w-20 h-20 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shadow-sm border">
                {imageSource && (
                  <Image
                    key={`${field.key}-${logoVersion}-${mounted ? Date.now() : "ssr"}`}
                    src={imageSource}
                    alt={tCommon("preview_1", { label: String(field.label) })}
                    width={80}
                    height={80}
                    className="max-w-full max-h-full object-contain"
                    unoptimized
                    onError={() => {
                      if (uploadedImageBlob) {
                        setUploadedImageBlob(null);
                      }
                    }}
                  />
                )}
              </div>

              <m.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (previewUrl) {
                    clearPreview();
                  } else if (displayLogoUrl) {
                    onChange(field.key, "");
                  }
                }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
                title={t("remove_logo")}
              >
                <X className="h-3.5 w-3.5" />
              </m.button>

              <AnimatePresence>
                {uploadSuccess && (
                  <m.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-success text-success-foreground rounded-full flex items-center justify-center shadow-lg z-10"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          ) : (
            <m.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center p-4"
            >
              <m.div
                animate={
                  isUploading
                    ? { rotate: 360 }
                    : dragActive
                      ? { y: [0, -5, 0] }
                      : {}
                }
                transition={
                  isUploading
                    ? { duration: 1, repeat: Infinity, ease: "linear" }
                    : { duration: 1.5, repeat: Infinity }
                }
                className={cn(
                  "mx-auto mb-2 h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                  dragActive ? "bg-primary/20" : "bg-muted"
                )}
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : dragActive ? (
                  <Sparkles className="h-6 w-6 text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </m.div>
              <p className="text-xs font-medium text-muted-foreground">
                {isUploading ? `${tCommon("uploading")}…` : dragActive ? t("drop_to_upload") : t("drop_or_click_to_upload")}
              </p>
            </m.div>
          )}
        </AnimatePresence>

        <Input
          id={field.key}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          disabled={isUploading}
          className="hidden"
        />
      </m.div>

      <div className="flex items-center justify-center gap-2 mt-3 h-5">
        <AnimatePresence mode="wait">
          {isUploading ? (
            <m.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">{tCommon("uploading")}…</span>
            </m.div>
          ) : previewUrl ? (
            <m.span
              key="new"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-primary font-medium"
            >
              {tCommon("new_file_selected")}
            </m.span>
          ) : displayLogoUrl ? (
            <m.div
              key="saved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-success"
            >
              <Check className="h-3 w-3" />
              <span className="text-xs font-medium">Saved</span>
            </m.div>
          ) : (
            <m.span
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground"
            >
              {t("no_logo_uploaded")}
            </m.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject("Error reading file");
    reader.readAsDataURL(file);
  });
}
