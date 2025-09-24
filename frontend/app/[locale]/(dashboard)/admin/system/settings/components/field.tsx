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
import { ImageUpload } from "@/components/ui/image-upload";
import { FieldDefinition } from "@/config/settings";
import { useTheme } from "next-themes";
import { Lightbox } from "@/components/ui/lightbox";
import { LogoField } from "./logo-field";

interface SettingsFieldProps {
  field: FieldDefinition;
  value: string | File;
  onChange: (key: string, value: string | File | null) => void;
}

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

  switch (field.type) {
    case "switch":
      return (
        <div className="flex items-center justify-between space-y-2">
          <div className="space-y-0.5">
            <Label htmlFor={field.key}>{field.label}</Label>
            {field.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {field.description}
              </p>
            )}
          </div>
          <Switch
            id={field.key}
            checked={
              (typeof value === 'string' && (value === "true" || value === "1")) || 
              (typeof value === 'boolean' && value) || 
              (typeof value === 'number' && value === 1)
            }
            onCheckedChange={(checked) =>
              onChange(field.key, checked ? "true" : "false")
            }
          />
        </div>
      );

    case "text":
    case "url":
    case "number":
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Input
            id={field.key}
            value={typeof value === "string" ? value : ""}
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
          />
          {field.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
        </div>
      );

    case "select": {
      const previewSrc =
        field.preview?.[currentTheme]?.[value as string] || null;
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <Select
            value={typeof value === "string" ? value : ""}
            onValueChange={(newValue) => onChange(field.key, newValue)}
          >
            <SelectTrigger id={field.key}>
              <SelectValue
                placeholder={`Select ${field.label.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {previewSrc && (
            <Lightbox
              src={previewSrc}
              alt={`${field.label} preview`}
              className="mt-2 h-72 max-h-72 max-w-sm rounded-lg"
            />
          )}
          {field.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
        </div>
      );
    }

    case "file":
      // Use LogoField for logo uploads in the logos category
      if (field.category === "logos") {
        return (
          <LogoField
            field={field}
            value={typeof value === 'string' ? value : ''}
            onChange={onChange}
          />
        );
      }
      
      // Use regular ImageUpload for other file uploads
      return (
        <div className="space-y-2">
          <Label htmlFor={field.key}>{field.label}</Label>
          <ImageUpload
            onChange={handleImageChange}
            value={previewFile || (typeof value === 'string' ? value : null)}
            title={
              field.fileSize
                ? `Upload an image (${field.fileSize.width}x${field.fileSize.height}px)`
                : "Upload an image"
            }
          />
          {field.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {field.description}
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
};
