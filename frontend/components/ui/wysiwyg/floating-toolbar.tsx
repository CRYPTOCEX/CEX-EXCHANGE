"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
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
import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 text-popover-foreground hover:text-popover-foreground hover:bg-accent",
              active && "bg-accent"
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
  );
}

export function FloatingToolbar({
  position,
  formatState,
  onFormat,
  onLink,
}: FloatingToolbarProps) {
  const t = useTranslations("components");
  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0, y: 5, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 5, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-popover text-popover-foreground shadow-lg border border-border"
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
        <div className="w-px h-4 bg-border mx-0.5" />
        <FloatingButton
          icon={<Link className="h-3.5 w-3.5" />}
          label={t("insert_link")}
          active={!!formatState.link}
          onClick={onLink}
        />
      </m.div>
    </AnimatePresence>
  );
}

export default FloatingToolbar;
