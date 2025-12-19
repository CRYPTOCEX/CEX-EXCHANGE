"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Minus,
  Plus,
  Copy,
  Trash2,
  Check,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import type { MediaFile } from "./types";
import { formatDimensions, formatDate, copyUrl } from "./utils";

interface MediaPreviewViewProps {
  file: MediaFile;
  onBack: () => void;
  onDelete: () => void;
  onSelect?: () => void;
}

export function MediaPreviewView({
  file,
  onBack,
  onDelete,
  onSelect,
}: MediaPreviewViewProps) {
  const [zoom, setZoom] = useState(100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 bg-black/95 flex flex-col"
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-white text-sm font-medium truncate max-w-80">
              {file.name}
            </p>
            <p className="text-white/60 text-xs">
              {formatDimensions(file.width, file.height)}
              {file.dateModified && ` • ${formatDate(file.dateModified)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => setZoom(Math.max(25, zoom - 25))}
                    disabled={zoom <= 25}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-white text-sm min-w-12 text-center">
              {zoom}%
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                    disabled={zoom >= 200}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
                    onClick={() => setZoom(100)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Zoom</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
                    onClick={() => copyUrl(file.path)}
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
                    className="h-9 w-9 text-red-400 hover:bg-red-500/20 hover:text-red-400"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Image</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Image container with zoom */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-8">
        <img
          src={file.path}
          alt={file.name}
          className="object-contain rounded-lg transition-transform duration-200 max-h-full"
          style={{
            transform: `scale(${zoom / 100})`,
            maxWidth: zoom <= 100 ? "100%" : "none",
            maxHeight: zoom <= 100 ? "100%" : "none",
          }}
        />
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between p-4 border-t border-white/10 shrink-0">
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={onBack}
        >
          Back to Library
        </Button>
        {onSelect && (
          <Button onClick={onSelect} className="gap-2">
            <Check className="h-4 w-4" />
            Select Image
          </Button>
        )}
      </div>
    </motion.div>
  );
}
