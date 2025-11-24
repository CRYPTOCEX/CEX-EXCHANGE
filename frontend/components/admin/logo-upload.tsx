"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Image, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { logoUploader, getLogoUrls, getAvailableLogoVariants } from "@/utils/logo-upload";
import { useToast } from "@/hooks/use-toast";

export default function LogoUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logoType, setLogoType] = useState<"logo" | "logo-text">("logo");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message?: string;
    updatedFiles?: string[];
    error?: string;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { toast } = useToast();
  const logoUrls = getLogoUrls();
  const logoVariants = getAvailableLogoVariants();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a logo file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const result = await logoUploader({
        file: selectedFile,
        logoType,
      });

      setUploadResult(result);

      if (result.success) {
        toast({
          title: "Logo updated successfully!",
          description: `${result.updatedFiles?.length || 0} logo files have been updated.`,
        });
        
        // Clear the form
        setSelectedFile(null);
        setPreviewUrl(null);
        
        // Reset file input
        const fileInput = document.getElementById('logo-file') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        toast({
          title: "Upload failed",
          description: result.error || "Failed to upload logo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadResult({
        success: false,
        error: "An unexpected error occurred during upload.",
      });
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadResult(null);
    
    const fileInput = document.getElementById('logo-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Logo Upload
          </CardTitle>
          <CardDescription>
            Upload new logos to update all logo variants across the platform. 
            The system will automatically generate all required sizes and formats.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Logo Type</Label>
            <RadioGroup
              value={logoType}
              onValueChange={(value) => setLogoType(value as "logo" | "logo-text")}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {logoVariants.map((variant) => (
                <div key={variant.key} className="flex items-center space-x-2">
                  <RadioGroupItem value={variant.key} id={variant.key} />
                  <Label htmlFor={variant.key} className="flex-1 cursor-pointer">
                    <div className="font-medium">{variant.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {variant.description}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <Label htmlFor="logo-file" className="text-base font-medium">
              Select Logo File
            </Label>
            <Input
              id="logo-file"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">
              Accepted formats: PNG, JPG, JPEG, WebP, SVG. Maximum size: 5MB.
            </p>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Preview</Label>
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="max-w-xs max-h-32 object-contain"
                  />
                </div>
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  {selectedFile?.name} ({(selectedFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
                </div>
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <Alert className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center gap-2">
                {uploadResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={uploadResult.success ? "text-green-800" : "text-red-800"}>
                  {uploadResult.success ? uploadResult.message : uploadResult.error}
                </AlertDescription>
              </div>
              {uploadResult.success && uploadResult.updatedFiles && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    Updated files ({uploadResult.updatedFiles.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {uploadResult.updatedFiles.slice(0, 10).map((file, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {file}
                      </Badge>
                    ))}
                    {uploadResult.updatedFiles.length > 10 && (
                      <Badge variant="secondary" className="text-xs">
                        +{uploadResult.updatedFiles.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </>
              )}
            </Button>
            {selectedFile && (
              <Button
                variant="outline"
                onClick={clearSelection}
                disabled={isUploading}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Logos Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Logos</CardTitle>
          <CardDescription>
            Preview of the current logos that will be updated when you upload new ones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <div className="border rounded-lg p-4 bg-muted/20 aspect-square flex items-center justify-center">
                <img
                  src={logoUrls.logo}
                  alt="Main logo"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = logoUrls.logoPng;
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Main Logo</p>
            </div>
            <div className="text-center space-y-2">
              <div className="border rounded-lg p-4 bg-muted/20 aspect-square flex items-center justify-center">
                <img
                  src={logoUrls.logoText}
                  alt="Logo with text"
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = logoUrls.logoTextPng;
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Logo with Text</p>
            </div>
            <div className="text-center space-y-2">
              <div className="border rounded-lg p-4 bg-muted/20 aspect-square flex items-center justify-center">
                <img
                  src={logoUrls.favicon32}
                  alt="Favicon"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="text-xs text-muted-foreground">Favicon</p>
            </div>
            <div className="text-center space-y-2">
              <div className="border rounded-lg p-4 bg-muted/20 aspect-square flex items-center justify-center">
                <img
                  src={logoUrls.appleTouchIcon}
                  alt="Apple touch icon"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="text-xs text-muted-foreground">Apple Touch Icon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 