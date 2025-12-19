"use client";

import { Button } from "@/components/ui/button";
import { Check, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { MediaFile } from "./types";
import { formatDimensions } from "./utils";

interface MediaGridProps {
  files: MediaFile[];
  selectedFiles: Set<string>;
  detailsFileId?: string;
  onImageClick: (file: MediaFile) => void;
  onCheckboxClick: (file: MediaFile, e?: React.MouseEvent) => void;
  onPreviewClick: (file: MediaFile) => void;
}

export function MediaGrid({
  files,
  selectedFiles,
  detailsFileId,
  onImageClick,
  onCheckboxClick,
  onPreviewClick,
}: MediaGridProps) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3 p-4">
      {files.map((file) => (
        <motion.div
          key={file.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "group relative aspect-square rounded-lg border overflow-hidden cursor-pointer transition-all duration-200",
            selectedFiles.has(file.id)
              ? "ring-1 ring-primary border-primary"
              : detailsFileId === file.id
              ? "ring-1 ring-primary border-primary"
              : "border-transparent hover:border-primary/30"
          )}
          onClick={() => onImageClick(file)}
        >
          <img
            src={file.path}
            alt={file.name}
            className="w-full h-full object-cover bg-muted"
            loading="lazy"
          />

          {/* Hover overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
              selectedFiles.has(file.id) && "opacity-100 bg-primary/30"
            )}
          >
            {/* Checkbox for bulk selection */}
            <div
              className="absolute top-2 left-2 cursor-pointer"
              onClick={(e) => onCheckboxClick(file, e)}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors hover:scale-110",
                  selectedFiles.has(file.id)
                    ? "bg-primary border-primary"
                    : "bg-white/80 border-white/50 hover:border-white"
                )}
              >
                {selectedFiles.has(file.id) && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewClick(file);
                }}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>

            {/* File name */}
            <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/80 to-transparent">
              <p className="text-xs text-white truncate font-medium">
                {file.name}
              </p>
              <p className="text-[10px] text-white/70">
                {formatDimensions(file.width, file.height)}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
