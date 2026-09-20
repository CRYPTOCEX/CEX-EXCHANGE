"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
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
import { m } from "framer-motion";
import type { MediaFile } from "./types";
import { formatDimensions, formatDate, copyUrl } from "./utils";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("components");
  const tCommon = useTranslations("common");
  const [zoom, setZoom] = useState(100);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 bg-overlay/95 flex flex-col"
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-overlay-foreground/10 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-overlay-foreground hover:bg-overlay-foreground/10 hover:text-overlay-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-overlay-foreground text-sm font-medium truncate max-w-80">
              {file.name}
            </p>
            <p className="text-overlay-foreground/60 text-xs">
              {formatDimensions(file.width, file.height)}
              {file.dateModified && ` • ${formatDate(file.dateModified)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-overlay-foreground/10 rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-overlay-foreground hover:bg-overlay-foreground/20 hover:text-overlay-foreground"
                    onClick={() => setZoom(Math.max(25, zoom - 25))}
                    disabled={zoom <= 25}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tCommon("zoom_out")}</TooltipContent>
              </Tooltip>
            <span className="text-overlay-foreground text-sm min-w-12 text-center">
              {zoom}%
            </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-overlay-foreground hover:bg-overlay-foreground/20 hover:text-overlay-foreground"
                    onClick={() => setZoom(Math.min(200, zoom + 25))}
                    disabled={zoom >= 200}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tCommon("zoom_in")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-overlay-foreground hover:bg-overlay-foreground/20 hover:text-overlay-foreground"
                    onClick={() => setZoom(100)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("reset_zoom")}</TooltipContent>
              </Tooltip>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-overlay-foreground hover:bg-overlay-foreground/10 hover:text-overlay-foreground"
                    onClick={() => copyUrl(file.path)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("copy_url")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:bg-destructive/15 hover:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("delete_image")}</TooltipContent>
              </Tooltip>
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
      <div className="flex items-center justify-between p-4 border-t border-overlay-foreground/10 shrink-0">
        <Button
          variant="ghost"
          className="text-overlay-foreground/70 hover:text-overlay-foreground hover:bg-overlay-foreground/10"
          onClick={onBack}
        >
          {t("back_to_library")}
        </Button>
        {onSelect && (
          <Button onClick={onSelect} className="gap-2">
            <Check className="h-4 w-4" />
            {tCommon("select_image")}
          </Button>
        )}
      </div>
    </m.div>
  );
}
