"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, Unlink, ExternalLink, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LinkPopoverProps {
  position: { x: number; y: number };
  initialUrl: string;
  onInsert: (url: string, text?: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function LinkPopover({
  position,
  initialUrl,
  onInsert,
  onRemove,
  onClose,
}: LinkPopoverProps) {
  const [url, setUrl] = useState(initialUrl || "");
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const handleSubmit = () => {
    if (url.trim()) {
      // Add https:// if no protocol
      let finalUrl = url.trim();
      if (!finalUrl.match(/^https?:\/\//)) {
        finalUrl = "https://" + finalUrl;
      }
      onInsert(finalUrl, text.trim() || undefined);
    }
  };

  const isEditing = !!initialUrl;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50 w-80 p-3 rounded-lg border border-border bg-popover shadow-lg"
        style={{
          left: position.x,
          top: position.y,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link className="h-4 w-4" />
            {isEditing ? "Edit Link" : "Insert Link"}
          </div>

          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="link-url" className="text-xs">
                URL
              </Label>
              <Input
                ref={inputRef}
                id="link-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com"
                className="h-8 text-sm"
              />
            </div>

            {!isEditing && (
              <div className="space-y-1.5">
                <Label htmlFor="link-text" className="text-xs">
                  Text (optional)
                </Label>
                <Input
                  id="link-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Link text"
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={onRemove}
                >
                  <Unlink className="h-3 w-3" />
                  Remove
                </Button>
              )}
              {url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => {
                    let finalUrl = url.trim();
                    if (!finalUrl.match(/^https?:\/\//)) {
                      finalUrl = "https://" + finalUrl;
                    }
                    window.open(finalUrl, "_blank");
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-3 text-xs gap-1"
                onClick={handleSubmit}
                disabled={!url.trim()}
              >
                <Check className="h-3 w-3" />
                {isEditing ? "Update" : "Insert"}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default LinkPopover;
