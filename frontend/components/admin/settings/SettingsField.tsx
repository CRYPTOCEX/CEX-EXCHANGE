"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ImageUpload } from "@/components/ui/image-upload";
import { FieldDefinition } from "./types";
import { useTheme } from "next-themes";
import { Lightbox } from "@/components/ui/lightbox";
import { LogoField } from "./LogoField";
import { SocialLinksField } from "./SocialLinksField";
import { cn } from "@/lib/utils";
import {
  ToggleLeft,
  Type,
  Link as LinkIcon,
  Hash,
  ListFilter,
  Upload,
  Info,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettingsFieldProps {
  field: FieldDefinition;
  value: string | File;
  onChange: (key: string, value: string | File | null) => void;
}

// Field type icons with colors
const FIELD_TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  switch: {
    icon: ToggleLeft,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  text: { icon: Type, color: "text-blue-500", bg: "bg-blue-500/10" },
  url: { icon: LinkIcon, color: "text-violet-500", bg: "bg-violet-500/10" },
  number: { icon: Hash, color: "text-amber-500", bg: "bg-amber-500/10" },
  range: { icon: Hash, color: "text-orange-500", bg: "bg-orange-500/10" },
  select: {
    icon: ListFilter,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  file: { icon: Upload, color: "text-pink-500", bg: "bg-pink-500/10" },
};

export const SettingsField: React.FC<SettingsFieldProps> = ({
  field,
  value = "",
  onChange,
}) => {
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const { theme } = useTheme();
  const currentTheme = theme || "light";

  const handleImageChange = (fileOrNull: File | null) => {
    if (fileOrNull) {
      setPreviewFile(fileOrNull);
      onChange(field.key, fileOrNull);
    } else {
      setPreviewFile(null);
      onChange(field.key, null);
    }
  };

  const typeConfig = FIELD_TYPE_CONFIG[field.type] || FIELD_TYPE_CONFIG.text;
  const TypeIcon = typeConfig.icon;

  switch (field.type) {
    case "switch": {
      const isChecked =
        (typeof value === "string" && (value === "true" || value === "1")) ||
        (typeof value === "boolean" && value) ||
        (typeof value === "number" && value === 1);

      return (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <Label
                htmlFor={field.key}
                className="text-sm font-medium cursor-pointer leading-none"
              >
                {field.label}
              </Label>
              {field.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs text-xs"
                    >
                      {field.description}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {field.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {field.description}
              </p>
            )}
          </div>

          <motion.div whileTap={{ scale: 0.95 }}>
            <Switch
              id={field.key}
              checked={isChecked}
              onCheckedChange={(checked) =>
                onChange(field.key, checked ? "true" : "false")
              }
              className="data-[state=checked]:bg-emerald-500"
            />
          </motion.div>
        </div>
      );
    }

    case "text":
    case "url":
    case "number": {
      // Convert value to string for display, handling numbers, strings, null, undefined
      const displayValue = value !== null && value !== undefined ? String(value) : "";
      const urlValue = typeof value === "string" ? value : (value !== null && value !== undefined ? String(value) : "");

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-md", typeConfig.bg)}>
                <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
              </div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
            </div>
            {field.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {field.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="relative group">
            <Input
              id={field.key}
              value={displayValue}
              onChange={(e) => onChange(field.key, e.target.value)}
              type={
                field.type === "url"
                  ? "url"
                  : field.type === "number"
                    ? "number"
                    : "text"
              }
              min={field.min}
              max={field.max}
              step={field.step}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              className={cn(
                "h-10 transition-all",
                "focus:ring-2 focus:ring-primary/20",
                field.type === "url" && "pr-10"
              )}
            />
            {field.type === "url" && urlValue && (
              <a
                href={urlValue}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {field.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {field.description}
            </p>
          )}
        </div>
      );
    }

    case "range": {
      const numValue = parseFloat(String(value)) || field.min || 0;
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      const step = field.step ?? 1;
      const suffix = field.suffix || "";

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-md", typeConfig.bg)}>
                <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
              </div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              {field.description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {field.description}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <div className="flex items-center gap-1 min-w-20 justify-end">
                <Input
                  type="number"
                  value={numValue}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  min={min}
                  max={max}
                  step={step}
                  className="h-8 w-20 text-center text-sm"
                />
                {suffix && (
                  <span className="text-sm text-muted-foreground">{suffix}</span>
                )}
              </div>
            </div>
          </div>

          <div className="px-1">
            <Slider
              id={field.key}
              value={[numValue]}
              onValueChange={(values) => onChange(field.key, String(values[0]))}
              min={min}
              max={max}
              step={step}
              className="w-full"
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{min}{suffix}</span>
            <span>{max}{suffix}</span>
          </div>

          {field.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {field.description}
            </p>
          )}
        </div>
      );
    }

    case "select": {
      // Convert value to string for select, handling numbers, strings, null, undefined
      const selectValue = value !== null && value !== undefined ? String(value) : "";
      const previewSrc =
        field.preview?.[currentTheme]?.[selectValue] || null;
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-md", typeConfig.bg)}>
                <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
              </div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
            </div>
            {field.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {field.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <Select
            value={selectValue}
            onValueChange={(newValue) => onChange(field.key, newValue)}
          >
            <SelectTrigger
              id={field.key}
              className="h-10 focus:ring-2 focus:ring-primary/20"
            >
              <SelectValue
                placeholder={`Select ${field.label.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {selectValue === option.value && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {previewSrc && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3"
            >
              <Lightbox
                src={previewSrc}
                alt={`${field.label} preview`}
                className="h-48 max-h-48 w-full rounded-lg border"
              />
            </motion.div>
          )}
        </div>
      );
    }

    case "file": {
      // Convert value to string for file fields (URLs), handling null, undefined
      const fileValue = typeof value === "string" ? value : (value !== null && value !== undefined && !(value instanceof File) ? String(value) : "");

      // Use LogoField for logo uploads in the logos category
      if (field.category === "logos") {
        return (
          <LogoField
            field={field}
            value={fileValue}
            onChange={onChange}
          />
        );
      }

      // Use regular ImageUpload for other file uploads
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-md", typeConfig.bg)}>
                <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
              </div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
            </div>
            {field.fileSize && (
              <span className="text-xs text-muted-foreground">
                {field.fileSize.width}x{field.fileSize.height}px
              </span>
            )}
          </div>

          <ImageUpload
            onChange={handleImageChange}
            value={previewFile || (fileValue || null)}
            title={
              field.fileSize
                ? `Upload an image (${field.fileSize.width}x${field.fileSize.height}px)`
                : "Upload an image"
            }
          />

          {field.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {field.description}
            </p>
          )}
        </div>
      );
    }

    case "socialLinks": {
      // Convert value to string for socialLinks, handling null, undefined
      const socialLinksValue = value !== null && value !== undefined ? String(value) : "";
      return (
        <SocialLinksField
          field={field}
          value={socialLinksValue}
          onChange={(key, val) => onChange(key, val)}
        />
      );
    }

    case "custom":
      // Custom field type - the component is passed through customRender
      // This is handled at the SettingsTab level, not here
      return null;

    default:
      return null;
  }
};
