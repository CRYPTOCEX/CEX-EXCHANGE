"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle2,
  ExternalLink,
  AlignLeft,
} from "lucide-react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";

interface SettingsFieldProps {
  field: FieldDefinition;
  value: string | File;
  onChange: (key: string, value: string | File | null) => void;
  disabled?: boolean;
  /* Card-level chips (category, "requires addon") rendered INLINE beside the
     label. They can't be positioned by the card itself: every field type puts
     its own control on the card's top-right edge, and giving the chips their
     own row wasted a full line of height on a one-word tag. Only the field
     knows where its label ends, so the slot lives here. */
  meta?: React.ReactNode;
}

// Field type icons with colors
const FIELD_TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  switch: {
    icon: ToggleLeft,
    color: "text-success",
    bg: "bg-success/10",
  },
  text: { icon: Type, color: "text-primary", bg: "bg-primary/10" },
  textarea: { icon: AlignLeft, color: "text-primary", bg: "bg-primary/10" },
  url: { icon: LinkIcon, color: "text-primary", bg: "bg-primary/10" },
  number: { icon: Hash, color: "text-warning", bg: "bg-warning/10" },
  range: { icon: Hash, color: "text-warning", bg: "bg-warning/10" },
  select: {
    icon: ListFilter,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  file: { icon: Upload, color: "text-destructive", bg: "bg-destructive/10" },
};

/**
 * ONE description style, on every field type.
 *
 * A description used to be told twice and shown once and a half. Every type
 * rendered an info-tooltip beside its label carrying the whole sentence, and
 * most of them ALSO rendered that same sentence under the control — `switch`
 * clamped to two lines, `select` not at all.
 *
 * Both halves failed. `select`'s description existed only inside the tooltip,
 * so it was unreachable by touch and invisible to anyone who did not hover a
 * 14px icon — "Reasoning effort" is a five-option control whose only
 * explanation of what the options cost was behind that hover. And `line-clamp-2`
 * on a switch cut the sentence at the point it started being useful: what the
 * AI Support toggles read on screen was "offer the article that already answers
 * it — 'is this what you needed?' — with the file-anyway button sti…" and
 * "Needs the MashDiv provider. Without it the assistant answers fro…". The
 * clause that says what it costs, or what it needs, is at the END.
 *
 * These sentences are the only place a setting states its consequence, so they
 * render in full, under the control, everywhere — and the tooltip that repeated
 * them is gone rather than restated.
 */
const FIELD_DESCRIPTION = "text-xs text-muted-foreground leading-relaxed";

export const SettingsField: React.FC<SettingsFieldProps> = ({
  field,
  value = "",
  onChange,
  disabled = false,
  meta,
}) => {
  const tCommon = useTranslations("common");
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
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Label
                htmlFor={field.key}
                className="text-sm font-medium cursor-pointer leading-none"
              >
                {field.label}
              </Label>
              {meta}
            </div>
            {field.description && (
              <p className={FIELD_DESCRIPTION}>{field.description}</p>
            )}
          </div>

          <m.div whileTap={{ scale: 0.95 }}>
            <Switch
              id={field.key}
              checked={isChecked}
              onCheckedChange={(checked) =>
                onChange(field.key, checked ? "true" : "false")
              }
              className="data-[state=checked]:bg-success"
            />
          </m.div>
        </div>
      );
    }

    case "text":
    case "input":
    case "url":
    case "number": {
      // Convert value to string for display, handling numbers, strings, null, undefined
      const displayValue = value !== null && value !== undefined ? String(value) : "";
      const urlValue = typeof value === "string" ? value : (value !== null && value !== undefined ? String(value) : "");

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn("p-1.5 rounded-md", typeConfig.bg)}>
                <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
              </div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              {meta}
            </div>
          </div>

          {/* The unit rides BESIDE the input, the way `range` already renders
              it — not inside the right edge, which on a `type="number"` field
              is where the browser puts its own spinner arrows. Eleven fields
              across four settings pages declared a `suffix` that only `range`
              ever read, so every one of them rendered a bare number with its
              unit stated nowhere. */}
          <div className="flex items-center gap-2">
            <div className="relative group flex-1 min-w-0">
              <Input
                id={field.key}
                value={displayValue}
                onChange={(e) => onChange(field.key, e.target.value)}
                type={
                  field.inputType
                    ? field.inputType
                    : field.type === "url"
                      ? "url"
                      : field.type === "number"
                        ? "number"
                        : "text"
                }
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
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
            {field.suffix && (
              <span className="shrink-0 text-sm text-muted-foreground">
                {field.suffix}
              </span>
            )}
          </div>

          {field.description && (
            <p className={FIELD_DESCRIPTION}>
              {field.description}
            </p>
          )}
        </div>
      );
    }

    // Multi-line free text — for values that are genuinely a list or a
    // paragraph (IP ranges one per line, a customer-facing notice) and read
    // terribly squeezed into a single-line input.
    case "textarea": {
      const textValue =
        value !== null && value !== undefined && !(value instanceof File)
          ? String(value)
          : "";

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn("p-1.5 rounded-md", typeConfig.bg)}>
                <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
              </div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              {meta}
            </div>
          </div>

          <Textarea
            id={field.key}
            value={textValue}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={
              field.placeholder || `Enter ${field.label.toLowerCase()}`
            }
            rows={5}
            disabled={disabled}
            className="min-h-24 font-mono text-xs leading-relaxed"
          />

          {field.description && (
            <p className={FIELD_DESCRIPTION}>
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
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn("p-1.5 rounded-md", typeConfig.bg)}>
                <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
              </div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              {meta}
            </div>
            <div className="flex items-center gap-2">
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
            <p className={FIELD_DESCRIPTION}>
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
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn("p-1.5 rounded-md", typeConfig.bg)}>
                <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
              </div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              {meta}
            </div>
          </div>

          <Select
            value={selectValue}
            onValueChange={(newValue) => onChange(field.key, newValue)}
            disabled={disabled}
          >
            <SelectTrigger
              id={field.key}
              className={cn(
                "h-10 focus:ring-2 focus:ring-primary/20",
                disabled && "opacity-50 cursor-not-allowed"
              )}
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

          {field.description && (
            <p className={FIELD_DESCRIPTION}>{field.description}</p>
          )}

          {previewSrc && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3"
            >
              <Lightbox
                src={previewSrc}
                alt={tCommon("preview_1", { label: String(field.label) })}
                className="h-48 max-h-48 w-full rounded-lg border"
              />
            </m.div>
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
            meta={meta}
          />
        );
      }

      // Use regular ImageUpload for other file uploads
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className={cn("p-1.5 rounded-md", typeConfig.bg)}>
                <TypeIcon className={cn("w-3.5 h-3.5", typeConfig.color)} />
              </div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              {meta}
            </div>
            {field.fileSize && (
              <span className="text-xs text-muted-foreground">
                {field.fileSize.width}x{field.fileSize.height}px
              </span>
            )}
          </div>

          {/* `id` so the `<Label htmlFor={field.key}>` above resolves — nothing
              inside `ImageUpload` used to carry an id, so that label pointed at
              nothing.

              `title` is gone: it rendered a hardcoded English string that
              repeated the label directly above it and the `{w}x{h}px` hint
              directly beside it, three names for one field, one of them
              untranslated. */}
          <ImageUpload
            id={field.key}
            onChange={handleImageChange}
            value={previewFile || (fileValue || null)}
          />

          {field.description && (
            <p className={FIELD_DESCRIPTION}>
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
          meta={meta}
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
