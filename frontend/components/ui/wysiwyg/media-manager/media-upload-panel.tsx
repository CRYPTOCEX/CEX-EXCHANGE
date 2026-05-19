"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  Link,
  X,
  Loader2,
  Check,
  ImageIcon,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MediaUploadPanelProps {
  onClose: () => void;
  onUpload: (files: FileList | File[]) => Promise<void>;
  onInsertUrl?: (url: string, alt?: string) => void;
  uploading: boolean;
  showUrlTab?: boolean;
}

export function MediaUploadPanel({
  onClose,
  onUpload,
  onInsertUrl,
  uploading,
  showUrlTab = true,
}: MediaUploadPanelProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter((f) => f.type.startsWith("image/"));

      if (imageFiles.length === 0) {
        setError("Please select image files");
        return;
      }

      setUploadedFiles(imageFiles);
      setError(null);

      // Start upload
      await onUpload(imageFiles);
    },
    [onUpload]
  );

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  // Handle URL preview
  const handleUrlPreview = () => {
    if (url.trim()) {
      setPreviewUrl(url.trim());
      setError(null);
    }
  };

  // Handle insert URL
  const handleInsertUrl = () => {
    const finalUrl = previewUrl || url.trim();
    if (finalUrl && onInsertUrl) {
      onInsertUrl(finalUrl, alt.trim() || undefined);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute inset-0 z-20 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Add Media</h2>
          <p className="text-xs text-muted-foreground">
            Upload files or insert from URL
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "upload" | "url")}
          className="h-full flex flex-col"
        >
          {showUrlTab ? (
            <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Files
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <Link className="h-4 w-4" />
                Insert from URL
              </TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full max-w-md grid-cols-1 mx-auto">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload Files
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="upload" className="flex-1 mt-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Drop Zone */}
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
                  uploading && "pointer-events-none opacity-50"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    e.target.files && handleFileSelect(e.target.files)
                  }
                />

                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div>
                      <p className="text-lg font-medium">Uploading...</p>
                      <p className="text-sm text-muted-foreground">
                        Please wait while your files are being uploaded
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">
                        Drop files here or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG, GIF, WEBP up to 10MB each
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload progress / results */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {uploading ? "Uploading" : "Uploaded"} files:
                  </p>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="flex-1 truncate text-sm">
                          {file.name}
                        </span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="flex-1 mt-6">
            <div className="max-w-xl mx-auto space-y-6">
              <div className="space-y-2">
                <Label htmlFor="image-url">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="image-url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleUrlPreview}
                    disabled={!url.trim()}
                  >
                    Preview
                  </Button>
                </div>
              </div>

              {/* Preview */}
              <AnimatePresence>
                {previewUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="relative rounded-lg border overflow-hidden bg-muted">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-64 w-full object-contain"
                        onError={() => {
                          setError("Failed to load image from URL");
                          setPreviewUrl(null);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 bg-background/80"
                        onClick={() => setPreviewUrl(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image-alt">Alt Text (optional)</Label>
                      <Input
                        id="image-alt"
                        value={alt}
                        onChange={(e) => setAlt(e.target.value)}
                        placeholder="Describe the image for accessibility"
                      />
                    </div>

                    <Button onClick={handleInsertUrl} className="w-full gap-2">
                      <Check className="h-4 w-4" />
                      Insert Image
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
