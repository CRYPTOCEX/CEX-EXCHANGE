"use client";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";
import { useTranslations } from "next-intl";

interface ImageFieldProps {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  accept?: string;
  value: File | string | null;
  onChange: (value: File | null) => void;
  error?: string;
  touched?: boolean;
}

export function ImageField({
  id,
  label,
  description,
  required,
  accept,
  value,
  onChange,
  error,
  touched,
}: ImageFieldProps) {
  const t = useTranslations("dashboard");
  const showError = touched && error;
  const labelClasses = cn(
    "text-sm font-medium mb-1.5 block",
    showError ? "text-destructive" : ""
  );

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
        <p className="text-sm text-muted-foreground mb-1.5">{description}</p>
      )}

      <ImageUpload
        value={value}
        onChange={onChange}
        error={!!showError}
        errorMessage={error}
      />

      <AnimatePresence>{renderErrorMessage()}</AnimatePresence>
    </div>
  );
}
