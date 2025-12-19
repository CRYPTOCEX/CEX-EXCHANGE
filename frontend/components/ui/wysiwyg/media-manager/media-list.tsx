"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, Copy, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { MediaFile } from "./types";
import { formatDimensions, formatDate, copyUrl } from "./utils";

interface MediaListProps {
  files: MediaFile[];
  selectedFiles: Set<string>;
  detailsFileId?: string;
  onImageClick: (file: MediaFile) => void;
  onCheckboxClick: (file: MediaFile, e?: React.MouseEvent) => void;
  onPreviewClick: (file: MediaFile) => void;
}

export function MediaList({
  files,
  selectedFiles,
  detailsFileId,
  onImageClick,
  onCheckboxClick,
  onPreviewClick,
}: MediaListProps) {
  return (
    <div className="divide-y">
      {files.map((file) => (
        <motion.div
          key={file.id}
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "flex items-center gap-4 p-3 cursor-pointer transition-colors",
            selectedFiles.has(file.id)
              ? "bg-primary/10"
              : detailsFileId === file.id
              ? "bg-primary/10"
              : "hover:bg-muted/50"
          )}
          onClick={() => onImageClick(file)}
        >
          {/* Checkbox for bulk selection */}
          <div
            className="cursor-pointer"
            onClick={(e) => onCheckboxClick(file, e)}
          >
            <div
              className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors hover:scale-110",
                selectedFiles.has(file.id)
                  ? "bg-primary border-primary"
                  : "border-border hover:border-primary"
              )}
            >
              {selectedFiles.has(file.id) && (
                <Check className="h-3 w-3 text-primary-foreground" />
              )}
            </div>
          </div>
          <div className="w-14 h-14 rounded-lg border overflow-hidden shrink-0 bg-muted">
            <img
              src={file.path}
              alt={file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDimensions(file.width, file.height)}
              {file.dateModified && ` • ${formatDate(file.dateModified)}`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyUrl(file.path);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy URL</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewClick(file);
                    }}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
