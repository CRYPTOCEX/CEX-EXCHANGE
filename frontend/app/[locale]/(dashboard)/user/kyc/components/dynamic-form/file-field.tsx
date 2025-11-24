"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Upload, FileText, X, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

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
  const t = useTranslations("dashboard");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const showError = touched && error;
  const labelClasses = cn(
    "text-sm font-medium mb-1.5 block dark:text-zinc-200",
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
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="text-xs text-destructive mt-1 flex items-center gap-1"
      >
        <AlertCircle className="h-3 w-3" />
        <span>{error}</span>
      </motion.div>
    );
  };

  return (
    <div className="relative mb-4" data-field-id={id}>
      <Label htmlFor={id} className={labelClasses}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground dark:text-zinc-400 mb-1.5">
          {description}
        </p>
      )}

      {value ? (
        // File uploaded state
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/20 dark:bg-zinc-800/50 dark:border-zinc-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate dark:text-zinc-200">
                  {getFileName()}
                </span>
                <span className="text-xs text-muted-foreground dark:text-zinc-400">
                  {getFileSize() || (typeof value === "string" ? "Verified" : "")}
                </span>
              </div>
              <div className="flex items-center text-xs text-green-600 dark:text-green-400 gap-1">
                <span>✓ Uploaded successfully</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {(isImage() || typeof value === "string") && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={openFile}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image preview */}
          {isImage() && (previewUrl || typeof value === "string") && (
            <div className="relative">
              <img
                src={previewUrl || (typeof value === "string" ? value : "")}
                alt="File preview"
                className="w-full max-w-sm h-32 object-cover rounded-lg border dark:border-zinc-700"
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
              : "border-gray-200 dark:border-zinc-700",
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
          
          <div className="p-6 flex flex-col items-center gap-3 dark:bg-zinc-800/20">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 dark:from-primary/30 dark:to-primary/10 flex items-center justify-center shadow-sm">
              <Upload className="h-8 w-8 text-primary/70" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-primary/80 dark:text-primary-400 mb-1">
                {isDragOver ? "Drop file here" : "Drag and drop or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground dark:text-zinc-400">
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