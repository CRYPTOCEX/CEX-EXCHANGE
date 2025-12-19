"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ZoomIn, Copy, Trash2, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { MediaFile } from "./types";
import { formatDimensions, formatDateTime, copyUrl } from "./utils";

interface MediaDetailsPanelProps {
  file: MediaFile;
  onClose: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onInsert?: () => void;
}

export function MediaDetailsPanel({
  file,
  onClose,
  onPreview,
  onDelete,
  onInsert,
}: MediaDetailsPanelProps) {
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 320, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-l bg-muted/30 overflow-hidden shrink-0"
    >
      <div className="w-80 h-full flex flex-col">
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <span className="font-medium">File Details</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Preview */}
              <div className="aspect-video rounded-lg border overflow-hidden bg-muted">
                <img
                  src={file.path}
                  alt={file.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* File Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    File Name
                  </label>
                  <p className="text-sm font-medium truncate">{file.name}</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Dimensions
                  </label>
                  <p className="text-sm">
                    {formatDimensions(file.width, file.height)}
                  </p>
                </div>

                {file.dateModified && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Last Modified
                    </label>
                    <p className="text-sm">{formatDateTime(file.dateModified)}</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    File URL
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={file.path}
                      readOnly
                      className="text-xs h-8 font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyUrl(file.path)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {onInsert && (
                  <Button
                    className="w-full justify-start gap-2"
                    onClick={onInsert}
                  >
                    <Check className="h-4 w-4" />
                    Insert Image
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={onPreview}
                >
                  <ZoomIn className="h-4 w-4" />
                  View Full Size
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => copyUrl(file.path)}
                >
                  <Copy className="h-4 w-4" />
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete File
                </Button>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </motion.div>
  );
}
