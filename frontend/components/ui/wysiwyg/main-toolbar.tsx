"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Image,
  Table,
  Undo2,
  Redo2,
  ChevronDown,
  Type,
} from "lucide-react";
import type { FormatState } from "./types";

interface MainToolbarProps {
  formatState: FormatState;
  onFormat: (format: string) => void;
  onHeading: (level: number) => void;
  onParagraph: () => void;
  onList: (type: "bullet" | "ordered") => void;
  onBlockquote: () => void;
  onDivider: () => void;
  onAlignment: (align: "left" | "center" | "right" | "justify") => void;
  onLink: () => void;
  onImage: () => void;
  onTable: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({
  icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
}: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              active && "bg-accent text-accent-foreground"
            )}
            onClick={onClick}
            disabled={disabled}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="flex items-center gap-2">
          <span>{label}</span>
          {shortcut && (
            <span className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
              {shortcut}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

export function MainToolbar({
  formatState,
  onFormat,
  onHeading,
  onParagraph,
  onList,
  onBlockquote,
  onDivider,
  onAlignment,
  onLink,
  onImage,
  onTable,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: MainToolbarProps) {
  const [headingOpen, setHeadingOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);

  const getHeadingLabel = () => {
    switch (formatState.heading) {
      case "h1":
        return "Heading 1";
      case "h2":
        return "Heading 2";
      case "h3":
        return "Heading 3";
      case "h4":
        return "Heading 4";
      default:
        return "Paragraph";
    }
  };

  const getAlignmentIcon = () => {
    switch (formatState.alignment) {
      case "center":
        return <AlignCenter className="h-4 w-4" />;
      case "right":
        return <AlignRight className="h-4 w-4" />;
      case "justify":
        return <AlignJustify className="h-4 w-4" />;
      default:
        return <AlignLeft className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-background">
      {/* Undo/Redo */}
      <ToolbarButton
        icon={<Undo2 className="h-4 w-4" />}
        label="Undo"
        shortcut="Ctrl+Z"
        onClick={onUndo}
        disabled={!canUndo}
      />
      <ToolbarButton
        icon={<Redo2 className="h-4 w-4" />}
        label="Redo"
        shortcut="Ctrl+Y"
        onClick={onRedo}
        disabled={!canRedo}
      />

      <ToolbarDivider />

      {/* Heading Dropdown */}
      <Popover open={headingOpen} onOpenChange={setHeadingOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1 min-w-[100px] justify-between"
          >
            <Type className="h-4 w-4" />
            <span className="text-xs">{getHeadingLabel()}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <div className="flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-8",
                !formatState.heading && "bg-accent"
              )}
              onClick={() => {
                onParagraph();
                setHeadingOpen(false);
              }}
            >
              <Pilcrow className="h-4 w-4" />
              <span>Paragraph</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-10",
                formatState.heading === "h1" && "bg-accent"
              )}
              onClick={() => {
                onHeading(1);
                setHeadingOpen(false);
              }}
            >
              <Heading1 className="h-4 w-4" />
              <span className="text-xl font-bold">Heading 1</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-9",
                formatState.heading === "h2" && "bg-accent"
              )}
              onClick={() => {
                onHeading(2);
                setHeadingOpen(false);
              }}
            >
              <Heading2 className="h-4 w-4" />
              <span className="text-lg font-semibold">Heading 2</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-8",
                formatState.heading === "h3" && "bg-accent"
              )}
              onClick={() => {
                onHeading(3);
                setHeadingOpen(false);
              }}
            >
              <Heading3 className="h-4 w-4" />
              <span className="text-base font-semibold">Heading 3</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-8",
                formatState.heading === "h4" && "bg-accent"
              )}
              onClick={() => {
                onHeading(4);
                setHeadingOpen(false);
              }}
            >
              <Heading4 className="h-4 w-4" />
              <span className="text-sm font-semibold">Heading 4</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <ToolbarDivider />

      {/* Text Formatting */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        label="Bold"
        shortcut="Ctrl+B"
        active={formatState.bold}
        onClick={() => onFormat("bold")}
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        label="Italic"
        shortcut="Ctrl+I"
        active={formatState.italic}
        onClick={() => onFormat("italic")}
      />
      <ToolbarButton
        icon={<Underline className="h-4 w-4" />}
        label="Underline"
        shortcut="Ctrl+U"
        active={formatState.underline}
        onClick={() => onFormat("underline")}
      />
      <ToolbarButton
        icon={<Strikethrough className="h-4 w-4" />}
        label="Strikethrough"
        active={formatState.strikethrough}
        onClick={() => onFormat("strikethrough")}
      />

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        label="Bullet List"
        active={formatState.list === "bullet"}
        onClick={() => onList("bullet")}
      />
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        label="Numbered List"
        active={formatState.list === "ordered"}
        onClick={() => onList("ordered")}
      />

      <ToolbarDivider />

      {/* Block Elements */}
      <ToolbarButton
        icon={<Quote className="h-4 w-4" />}
        label="Blockquote"
        active={formatState.blockquote}
        onClick={onBlockquote}
      />
      <ToolbarButton
        icon={<Minus className="h-4 w-4" />}
        label="Horizontal Rule"
        onClick={onDivider}
      />

      <ToolbarDivider />

      {/* Alignment Dropdown */}
      <Popover open={alignOpen} onOpenChange={setAlignOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
            {getAlignmentIcon()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1" align="start">
          <div className="flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-8",
                formatState.alignment === "left" && "bg-accent"
              )}
              onClick={() => {
                onAlignment("left");
                setAlignOpen(false);
              }}
            >
              <AlignLeft className="h-4 w-4" />
              <span>Left</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-8",
                formatState.alignment === "center" && "bg-accent"
              )}
              onClick={() => {
                onAlignment("center");
                setAlignOpen(false);
              }}
            >
              <AlignCenter className="h-4 w-4" />
              <span>Center</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-8",
                formatState.alignment === "right" && "bg-accent"
              )}
              onClick={() => {
                onAlignment("right");
                setAlignOpen(false);
              }}
            >
              <AlignRight className="h-4 w-4" />
              <span>Right</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start gap-2 h-8",
                formatState.alignment === "justify" && "bg-accent"
              )}
              onClick={() => {
                onAlignment("justify");
                setAlignOpen(false);
              }}
            >
              <AlignJustify className="h-4 w-4" />
              <span>Justify</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <ToolbarDivider />

      {/* Link, Image, Table */}
      <ToolbarButton
        icon={<Link className="h-4 w-4" />}
        label="Insert Link"
        shortcut="Ctrl+K"
        active={!!formatState.link}
        onClick={onLink}
      />
      <ToolbarButton
        icon={<Image className="h-4 w-4" />}
        label="Insert Image"
        onClick={onImage}
      />
      <ToolbarButton
        icon={<Table className="h-4 w-4" />}
        label="Insert Table"
        onClick={onTable}
      />
    </div>
  );
}

export default MainToolbar;
