"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, Check, Loader2 } from "lucide-react";
import { $fetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { useLogoCacheStore } from "@/store/logo-cache";
import Image from "next/image";

interface LogoFieldProps {
  field: {
    key: string;
    label: string;
    description?: string;
    fileSize?: { width: number; height: number };
  };
  value: string;
  onChange: (key: string, value: string) => void;
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

export function LogoField({ field, value, onChange }: LogoFieldProps) {
  const t = useTranslations("dashboard");
  const { updateLogoVersion, logoVersion } = useLogoCacheStore();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImageBlob, setUploadedImageBlob] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only using Date.now() after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get the actual logo file path based on the logo type
  const getActualLogoPath = () => {
    return LOGO_FILE_MAPPING[field.key] || null;
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    
    console.log(`[LOGO-FIELD-DEBUG] Processing file for ${field.key}:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.error(`[LOGO-FIELD-DEBUG] Invalid file type: ${file.type}`);
      alert("Please select an image file");
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error(`[LOGO-FIELD-DEBUG] File too large: ${file.size} bytes`);
      alert("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    const fileBlob = URL.createObjectURL(file);
    setPreviewUrl(fileBlob);

    try {
      // Convert file to base64
      const base64File = await fileToBase64(file);
      console.log(`[LOGO-FIELD-DEBUG] Base64 conversion complete for ${field.key}, length: ${base64File.length}`);
      console.log(`[LOGO-FIELD-DEBUG] Base64 preview: ${base64File.substring(0, 100)}...`);

      // Upload using the new logo API
      console.log(`[LOGO-FIELD-DEBUG] Sending API request for ${field.key}`);
      const { data, error } = await $fetch({
        url: "/api/admin/system/settings/logo",
        method: "PUT",
        body: {
          logoType: field.key,
          file: base64File,
        },
        successMessage: `${field.label} updated successfully!`,
      });

      if (error) {
        console.error(`[LOGO-UPLOAD-ERROR] Logo type: ${field.key}`, error);
        throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
      }

      // Update the field value with the new logo URL
      onChange(field.key, data.logoUrl);
      
      // Clear both preview states and rely on the updated value with cache busting
      setPreviewUrl(null);
      setUploadedImageBlob(null);
      
      // Clean up the blob URL to prevent memory leaks
      if (fileBlob) {
        URL.revokeObjectURL(fileBlob);
      }
      
      // Update logo cache version to force refresh of all logo components
      updateLogoVersion();
    } catch (error: any) {
      console.error(`[LOGO-UPLOAD-CATCH] Error uploading ${field.key}:`, error);
      console.error(`[LOGO-UPLOAD-CATCH] Error type:`, typeof error);
      console.error(`[LOGO-UPLOAD-CATCH] Error message:`, error?.message);
      console.error(`[LOGO-UPLOAD-CATCH] Error stack:`, error?.stack);
      
      const errorMessage = error?.message || error?.toString() || "Failed to upload logo. Please try again.";
      alert(`Failed to upload ${field.label}: ${errorMessage}`);
      setPreviewUrl(null);
      
      // Reset the file input on error to allow retry
      const fileInput = document.getElementById(field.key) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
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
    // Reset the file input to allow re-uploading the same file
    const fileInput = document.getElementById(field.key) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Get the logo URL to display - use actual file path instead of settings value
  const getDisplayLogoUrl = () => {
    const actualPath = getActualLogoPath();
    if (!actualPath) return null;
    
    // During SSR, don't add timestamp to prevent hydration mismatch
    if (!mounted) {
      return `${actualPath}?v=${logoVersion}`;
    }
    
    // Add cache busting only after mounting
    return `${actualPath}?v=${logoVersion}&t=${Date.now()}`;
  };

  const displayLogoUrl = getDisplayLogoUrl();

  return (
    <div className="space-y-3">
      <Label htmlFor={field.key} className="text-sm font-medium">
        {field.label}
        {field.fileSize && (
          <span className="text-xs text-muted-foreground ml-2">
            ({field.fileSize.width}x{field.fileSize.height}px)
          </span>
        )}
      </Label>
      
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Area */}
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            dragActive
              ? "border-primary bg-primary/5"
              : isUploading
              ? "border-muted-foreground/25 opacity-50 cursor-not-allowed"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium mb-1">
                  {isUploading ? "Uploading..." : "Drop your logo here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP up to 10MB
                </p>
              </div>

              <div className="space-y-2">
                <Input
                  id={field.key}
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                  disabled={isUploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => {
                    const fileInput = document.getElementById(field.key) as HTMLInputElement;
                    if (fileInput) {
                      fileInput.value = ''; // Reset input to allow same file selection
                      fileInput.click();
                    }
                  }}
                >
                  {isUploading ? "Uploading..." : "Choose File"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Area */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 relative inline-block">
                <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {previewUrl || uploadedImageBlob || displayLogoUrl ? (
                    <Image
                      key={`${field.key}-${logoVersion}-${mounted ? Date.now() : 'ssr'}`} // Use stable key during SSR
                      src={previewUrl || uploadedImageBlob || displayLogoUrl || ''}
                      alt={`${field.label} preview`}
                      width={96}
                      height={96}
                      className="h-full w-full object-contain"
                      unoptimized // Allow cache busting and blob URLs
                      onError={(e) => {
                        console.log(`Failed to load image: ${(e.target as HTMLImageElement).src}`);
                        // If blob URL fails, clear it and fallback to display URL
                        if (uploadedImageBlob) {
                          setUploadedImageBlob(null);
                        }
                      }}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No logo
                    </div>
                  )}
                </div>
                {/* Red X button in top-right corner */}
                {(previewUrl || displayLogoUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (previewUrl) {
                        clearPreview();
                      } else if (displayLogoUrl) {
                        onChange(field.key, "");
                      }
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
                    title="Remove logo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium mb-1">Preview</p>
                <p className="text-xs text-muted-foreground">
                  {displayLogoUrl ? "Current logo" : "No logo uploaded"}
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                {previewUrl && (
                  <div className="text-xs text-blue-600">
                    Preview
                  </div>
                )}
                {displayLogoUrl && !previewUrl && (
                  <div className="flex items-center text-green-600">
                    <Check className="h-4 w-4 mr-1" />
                    <span className="text-xs">Saved</span>
                  </div>
                )}
                {!previewUrl && !displayLogoUrl && (
                  <div className="text-xs text-muted-foreground">
                    Ready to upload
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject("Error reading file");
    reader.readAsDataURL(file);
  });
} 