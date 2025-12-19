"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
  Trash2,
  MoreHorizontal,
  RectangleHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ImageSize = "small" | "medium" | "large" | "full";
type ImageAlign = "left" | "center" | "right";

interface ImageToolbarProps {
  position: { x: number; y: number };
  currentSize: ImageSize;
  currentAlign: ImageAlign;
  onSizeChange: (size: ImageSize) => void;
  onAlignChange: (align: ImageAlign) => void;
  onDelete: () => void;
}

const sizeOptions: { value: ImageSize; label: string; icon: React.ReactNode }[] = [
  { value: "small", label: "Small (25%)", icon: <Minimize2 className="h-4 w-4" /> },
  { value: "medium", label: "Medium (50%)", icon: <RectangleHorizontal className="h-4 w-4" /> },
  { value: "large", label: "Large (75%)", icon: <Maximize2 className="h-4 w-4" /> },
  { value: "full", label: "Full Width", icon: <Maximize2 className="h-4 w-4" /> },
];

export function ImageToolbar({
  position,
  currentSize,
  currentAlign,
  onSizeChange,
  onAlignChange,
  onDelete,
}: ImageToolbarProps) {
  return (
    <div
      className="absolute z-50 flex items-center gap-0.5 p-1 bg-popover border border-border rounded-lg shadow-lg"
      style={{
        left: position.x,
        top: position.y,
        transform: "translateX(-50%)",
      }}
    >
      {/* Alignment buttons */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={currentAlign === "left" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onAlignChange("left")}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align Left</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={currentAlign === "center" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onAlignChange("center")}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Center</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={currentAlign === "right" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onAlignChange("right")}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Align Right</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Size dropdown */}
      <DropdownMenu>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="text-xs capitalize">{currentSize}</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Image Size</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenuContent align="center">
          {sizeOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSizeChange(option.value)}
              className={cn(currentSize === option.value && "bg-accent")}
            >
              {option.icon}
              <span className="ml-2">{option.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Delete button */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete Image</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
