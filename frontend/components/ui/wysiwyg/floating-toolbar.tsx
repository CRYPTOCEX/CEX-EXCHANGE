"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Link,
  Highlighter,
} from "lucide-react";
import type { FormatState } from "./types";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingToolbarProps {
  position: { x: number; y: number };
  formatState: FormatState;
  onFormat: (format: string) => void;
  onLink: () => void;
}

interface FloatingButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

function FloatingButton({ icon, label, active, onClick }: FloatingButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 text-white hover:text-white hover:bg-white/20",
              active && "bg-white/20"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick();
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FloatingToolbar({
  position,
  formatState,
  onFormat,
  onLink,
}: FloatingToolbarProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 5, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 5, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-zinc-900 dark:bg-zinc-800 shadow-lg border border-zinc-700"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(-50%, -100%)",
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <FloatingButton
          icon={<Bold className="h-3.5 w-3.5" />}
          label="Bold"
          active={formatState.bold}
          onClick={() => onFormat("bold")}
        />
        <FloatingButton
          icon={<Italic className="h-3.5 w-3.5" />}
          label="Italic"
          active={formatState.italic}
          onClick={() => onFormat("italic")}
        />
        <FloatingButton
          icon={<Underline className="h-3.5 w-3.5" />}
          label="Underline"
          active={formatState.underline}
          onClick={() => onFormat("underline")}
        />
        <FloatingButton
          icon={<Strikethrough className="h-3.5 w-3.5" />}
          label="Strikethrough"
          active={formatState.strikethrough}
          onClick={() => onFormat("strikethrough")}
        />
        <div className="w-px h-4 bg-zinc-600 mx-0.5" />
        <FloatingButton
          icon={<Link className="h-3.5 w-3.5" />}
          label="Insert Link"
          active={!!formatState.link}
          onClick={onLink}
        />
      </motion.div>
    </AnimatePresence>
  );
}

export default FloatingToolbar;
