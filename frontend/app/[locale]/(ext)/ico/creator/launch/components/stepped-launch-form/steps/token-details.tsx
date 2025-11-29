"use client";

import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload"; // Make sure the path is correct
import type { FormData } from "../types";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import Image from "next/image";

interface TokenDetailsStepProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
}

export default function TokenDetailsStep({
  formData,
  updateFormData,
  errors,
}: TokenDetailsStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setFileError("File size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setFileError("Please upload an image file");
        return;
      }

      console.log("File selected:", file.name, file.size, file.type);
      updateFormData("icon", file);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemove = () => {
    updateFormData("icon", null);
    setPreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Token Name"
          placeholder="e.g. Ethereum"
          value={formData.name}
          onChange={(e) => updateFormData("name", e.target.value)}
          error={!!errors.name}
          errorMessage={errors.name}
        />

        <Input
          label="Token Symbol"
          placeholder="e.g. ETH"
          value={formData.symbol}
          onChange={(e) => updateFormData("symbol", e.target.value)}
          error={!!errors.symbol}
          errorMessage={errors.symbol}
        />
      </div>

      {/* Simplified Icon upload */}
      <div className="mt-4">
        <label className="text-sm font-medium mb-2 block">Token Icon</label>
        <div className="border-2 border-dashed rounded-lg p-6 max-w-md hover:border-primary/50 transition-colors">
          {previewUrl || (formData.icon && typeof formData.icon === 'string') ? (
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                <Image
                  src={previewUrl || (formData.icon as string)}
                  alt="Token icon"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {formData.icon instanceof File ? formData.icon.name : "Uploaded image"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formData.icon instanceof File && `${(formData.icon.size / 1024).toFixed(2)} KB`}
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm mb-2">Upload token icon</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Max 5MB • JPG, PNG, GIF, WebP
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        {fileError && (
          <p className="text-sm text-red-500 mt-1">{fileError}</p>
        )}
        {errors.icon && (
          <p className="text-sm text-red-500 mt-1">{errors.icon}</p>
        )}
      </div>
    </div>
  );
}
