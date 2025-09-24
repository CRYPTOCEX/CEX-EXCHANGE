"use client";

import type React from "react";
import { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { X, ImageIcon, RefreshCw, Upload, ZoomIn, Download, Eye } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ImageUploadProps {
  /**
   * Called whenever the user selects a file (or removes it).
   * Pass `null` to remove the image.
   */
  onChange: (fileOrNull: File | null) => void;
  /**
   * The current value in your form:
   * - Either a File (newly picked)
   * - A string (existing URL from server)
   * - Or null (no image yet)
   */
  value: File | string | null;
  /** Whether there's a validation error */
  error?: boolean;
  /** The error message to display, if any */
  errorMessage?: string;
  /** Optional title to display above the upload area */
  title?: string;
  /**
   * If provided, overrides the local loading state. Use this if your parent
   * needs to manage loading (e.g. while uploading to the server).
   */
  loading?: boolean;
  /** Optional removal callback */
  onRemove?: () => void;
  /** Size of the image upload component: 'default', 'sm', 'lg', 'xl', or 'adaptive' */
  size?: "xs" | "default" | "sm" | "lg" | "xl" | "adaptive";
  /** Aspect ratio for the upload area */
  aspectRatio?: "square" | "video" | "wide" | "tall" | "auto";
  /** Show image metadata and info */
  showMetadata?: boolean;
  /** Maximum file size in MB */
  maxSize?: number;
  /** Allowed image formats */
  acceptedFormats?: string[];
}

export function ImageUpload({
  onChange,
  value,
  error,
  errorMessage,
  title,
  loading,
  onRemove,
  size = "default",
  aspectRatio = "auto",
  showMetadata = true,
  maxSize = 5,
  acceptedFormats = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
}: ImageUploadProps) {
  const t = useTranslations("components/ui/image-upload");
  const [internalLoading, setInternalLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [imageMetadata, setImageMetadata] = useState<{
    width?: number;
    height?: number;
    size?: number;
    type?: string;
    name?: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const isCurrentlyLoading = loading ?? internalLoading;

  // Get dynamic sizing based on image dimensions and size prop
  const getContainerSize = () => {
    if (size === "adaptive" && imageMetadata) {
      const { width = 1, height = 1 } = imageMetadata;
      const aspectRatio = width / height;
      
      if (aspectRatio > 2) return "h-32 sm:h-40"; // Wide image
      if (aspectRatio < 0.5) return "h-80 sm:h-96"; // Tall image
      return "h-64 sm:h-80"; // Square-ish
    }
    
    switch (size) {
      case "sm": return "h-32 sm:h-40";
      case "lg": return "h-80 sm:h-96";
      case "xl": return "h-96 sm:h-[28rem]";
      default: return "h-64 sm:h-80";
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "square": return "aspect-square";
      case "video": return "aspect-video";
      case "wide": return "aspect-[3/1]";
      case "tall": return "aspect-[1/2]";
      default: return "";
    }
  };

  useEffect(() => {
    if (value instanceof File) {
      const localUrl = URL.createObjectURL(value);
      setPreviewUrl(localUrl);
      
      // Extract metadata
      const img = new window.Image();
      img.onload = () => {
        setImageMetadata({
          width: img.width,
          height: img.height,
          size: value.size,
          type: value.type,
          name: value.name,
        });
        setIsImageLoaded(true);
      };
      img.src = localUrl;
      
      return () => {
        URL.revokeObjectURL(localUrl);
      };
    } else if (typeof value === "string") {
      setPreviewUrl(value);
      setIsImageLoaded(true);
      // For URLs, we can't get metadata easily
      setImageMetadata(null);
    } else {
      setPreviewUrl(null);
      setImageMetadata(null);
      setIsImageLoaded(false);
    }
  }, [value]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      const file = acceptedFiles[0];
      
      if (rejectedFiles.length > 0) {
        // Handle rejected files
        return;
      }
      
      if (file) {
        if (loading === undefined) {
          setInternalLoading(true);
          setUploadProgress(0);
        }

        // Simulate upload progress
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(interval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        setTimeout(() => {
          clearInterval(interval);
          setUploadProgress(100);
          onChange(file);
          
          setTimeout(() => {
            if (loading === undefined) {
              setInternalLoading(false);
              setUploadProgress(0);
            }
          }, 500);
        }, 1200);
      }
    },
    [onChange, loading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFormats.reduce((acc, format) => {
      acc[format] = [];
      return acc;
    }, {} as Record<string, string[]>),
    multiple: false,
    maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
    onDragEnter: () => setIsDraggingOver(true),
    onDragLeave: () => setIsDraggingOver(false),
    onDropAccepted: () => setIsDraggingOver(false),
    onDropRejected: () => setIsDraggingOver(false),
  });

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    } else {
      onChange(null);
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getImageDimensions = () => {
    if (!imageMetadata) return null;
    return `${imageMetadata.width} × ${imageMetadata.height}`;
  };

  return (
    <div className="flex flex-col space-y-3">
      {title && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {title}
        </label>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-500 ease-out overflow-hidden group",
          "hover:shadow-lg hover:shadow-primary/5",
          isDraggingOver || isDragActive
            ? "border-primary bg-primary/5 scale-[1.02] shadow-xl shadow-primary/10"
            : previewUrl
              ? "border-primary/40 hover:border-primary/60"
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
          error && "border-red-500 bg-red-50/50 dark:bg-red-900/10",
          isCurrentlyLoading && "pointer-events-none",
          getContainerSize(),
          getAspectRatioClass()
        )}
      >
        <input {...getInputProps()} />

        {previewUrl ? (
          <div className="relative w-full h-full">
            {/* Image Preview */}
            <div className="absolute inset-0">
              <Image
                ref={imageRef}
                src={previewUrl}
                alt="Preview"
                fill
                unoptimized
                className={cn(
                  "object-cover transition-all duration-500",
                  isImageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105"
                )}
                onLoad={() => setIsImageLoaded(true)}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Loading Progress */}
            {isCurrentlyLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg p-6 text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto" />
                  <p className="text-sm font-medium">Processing image...</p>
                  <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                </div>
              </div>
            )}

            {/* Hover Controls */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-2xl p-4 space-y-3 text-center backdrop-blur-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center justify-center space-x-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <p className="font-medium text-sm">Drop new image to replace</p>
                </div>
                
                                 <div className="flex space-x-2">
                   <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     onClick={(e) => {
                       e.stopPropagation();
                       // Open image in new tab
                       window.open(previewUrl, '_blank');
                     }}
                     className="flex-1"
                   >
                     <Eye className="h-4 w-4 mr-1" />
                     View
                   </Button>
                   <Button
                     type="button"
                     variant="destructive"
                     size="sm"
                     onClick={handleRemove}
                     className="flex-1"
                   >
                     <X className="h-4 w-4 mr-1" />
                     Remove
                   </Button>
                 </div>
              </div>
            </div>

                         {/* Quick Remove Button */}
             <Button
               type="button"
               variant="destructive"
               size="icon"
               className="absolute top-3 right-3 h-8 w-8 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
               onClick={handleRemove}
             >
               <X className="h-4 w-4" />
             </Button>

            {/* Image Info Badge */}
            {showMetadata && imageMetadata && (
              <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {getImageDimensions()} • {formatFileSize(imageMetadata.size || 0)}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            {isCurrentlyLoading ? (
              <div className="space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-sm">Processing image...</p>
                  <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Animated Icon */}
                <div className={cn(
                  "relative mx-auto rounded-full bg-gradient-to-br from-primary/10 to-primary/5 transition-all duration-300 group-hover:scale-110",
                  isDraggingOver ? "scale-110 from-primary/20 to-primary/10" : "",
                  size === "xs" ? "p-2" : size === "sm" ? "p-4" : size === "lg" ? "p-8" : "p-6"
                )}>
                  <ImageIcon className={cn(
                    "text-primary transition-all duration-300",
                    isDraggingOver ? "scale-110" : "",
                    size === "xs" ? "h-6 w-6" : size === "sm" ? "h-8 w-8" : size === "lg" ? "h-16 w-16" : "h-12 w-12"
                  )} />
                  
                  {/* Animated rings */}
                  <div className={cn(
                    "absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse",
                    isDraggingOver ? "border-primary/40" : ""
                  )} />
                  <div className={cn(
                    "absolute -inset-2 rounded-full border border-primary/10 animate-ping",
                    isDraggingOver ? "border-primary/20" : ""
                  )} />
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                  <h3 className={cn(
                    "font-semibold text-gray-900 dark:text-gray-100",
                    size === "xs" ? "text-xs" : size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base"
                  )}>
                    {isDraggingOver ? "Drop your image here" : "Upload an image"}
                  </h3>
                  
                  <p className={cn(
                    "text-muted-foreground",
                    size === "xs" ? "text-xs" : size === "sm" ? "text-xs" : "text-sm"
                  )}>
                    {isDraggingOver 
                      ? "Release to upload" 
                      : "Drag & drop or click to browse"
                    }
                  </p>
                  
                  {size !== "xs" && size !== "sm" && (
                    <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                      <span>Max {maxSize}MB</span>
                      <span>•</span>
                      <span>JPG, PNG, GIF, WebP</span>
                    </div>
                  )}
                </div>

                                 {/* Upload Button */}
                 <Button
                   type="button"
                   variant="outline"
                   size={size === "xs" || size === "sm" ? "sm" : "default"}
                   className="mt-4 transition-all duration-300 hover:scale-105"
                   onClick={(e) => e.stopPropagation()}
                 >
                   <Upload className="h-4 w-4 mr-2" />
                   Choose File
                 </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata Display */}
      {showMetadata && imageMetadata && !isCurrentlyLoading && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium truncate max-w-[200px]">
                {imageMetadata.name || "Image"}
              </p>
              <p className="text-xs text-muted-foreground">
                {getImageDimensions()} • {formatFileSize(imageMetadata.size || 0)}
              </p>
            </div>
          </div>
          
                     {previewUrl && (
             <Button
               type="button"
               variant="ghost"
               size="sm"
               onClick={() => window.open(previewUrl, '_blank')}
               className="text-xs"
             >
               <ZoomIn className="h-3 w-3 mr-1" />
               View Full
             </Button>
           )}
        </div>
      )}

      {/* Error Message */}
      {error && errorMessage && (
        <div className="flex items-center space-x-2 text-red-500 text-sm p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
          <X className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
