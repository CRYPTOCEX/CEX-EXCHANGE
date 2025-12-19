"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Minus,
  Table,
  Image,
  Code,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SlashCommandMenuProps {
  position: { x: number; y: number };
  filter: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
}

const commands: Command[] = [
  {
    id: "h1",
    label: "Heading 1",
    description: "Large section heading",
    icon: <Heading1 className="h-4 w-4" />,
    keywords: ["h1", "heading", "title", "large"],
  },
  {
    id: "h2",
    label: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-4 w-4" />,
    keywords: ["h2", "heading", "subtitle", "medium"],
  },
  {
    id: "h3",
    label: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 className="h-4 w-4" />,
    keywords: ["h3", "heading", "small"],
  },
  {
    id: "h4",
    label: "Heading 4",
    description: "Smallest section heading",
    icon: <Heading4 className="h-4 w-4" />,
    keywords: ["h4", "heading", "tiny"],
  },
  {
    id: "paragraph",
    label: "Paragraph",
    description: "Plain text paragraph",
    icon: <Pilcrow className="h-4 w-4" />,
    keywords: ["p", "paragraph", "text", "normal"],
  },
  {
    id: "bullet",
    label: "Bullet List",
    description: "Unordered list with bullets",
    icon: <List className="h-4 w-4" />,
    keywords: ["ul", "bullet", "list", "unordered"],
  },
  {
    id: "ordered",
    label: "Numbered List",
    description: "Ordered list with numbers",
    icon: <ListOrdered className="h-4 w-4" />,
    keywords: ["ol", "numbered", "list", "ordered"],
  },
  {
    id: "quote",
    label: "Quote",
    description: "Blockquote for citations",
    icon: <Quote className="h-4 w-4" />,
    keywords: ["quote", "blockquote", "citation"],
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal line separator",
    icon: <Minus className="h-4 w-4" />,
    keywords: ["hr", "divider", "line", "separator"],
  },
  {
    id: "table",
    label: "Table",
    description: "Insert a table",
    icon: <Table className="h-4 w-4" />,
    keywords: ["table", "grid", "rows", "columns"],
  },
  {
    id: "image",
    label: "Image",
    description: "Upload or embed an image",
    icon: <Image className="h-4 w-4" />,
    keywords: ["image", "img", "picture", "photo"],
  },
];

export function SlashCommandMenu({
  position,
  filter,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    if (!filter) return commands;
    const lowerFilter = filter.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerFilter) ||
        cmd.description.toLowerCase().includes(lowerFilter) ||
        cmd.keywords.some((k) => k.includes(lowerFilter))
    );
  }, [filter]);

  // Reset selected index when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].id);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = menuRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filteredCommands.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50 w-72 max-h-80 overflow-auto rounded-lg border border-border bg-popover shadow-lg"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="p-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Insert block
          </div>
          {filteredCommands.map((command, index) => (
            <button
              type="button"
              key={command.id}
              data-index={index}
              className={cn(
                "flex items-center gap-3 w-full px-2 py-2 rounded-md text-left transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => onSelect(command.id)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-md border",
                  index === selectedIndex
                    ? "border-accent-foreground/20 bg-accent-foreground/10"
                    : "border-border bg-muted"
                )}
              >
                {command.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{command.label}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {command.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SlashCommandMenu;
