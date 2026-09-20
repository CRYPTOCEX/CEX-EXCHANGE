"use client";
import { useEffect, useRef } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  title?: string; // Make title optional
  onClose: () => void;
  children: React.ReactNode;
  color?: "purple" | "blue" | "green";
  className?: string;
  showHeader?: boolean; // Add option to show/hide header
  clearSelections?: boolean; // Option to clear builder selections on mount
}

export default function Modal({
  title,
  onClose,
  children,
  color = "purple",
  className,
  showHeader = false, // Default to not showing header
  clearSelections = true, // Default to true for builder modals
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Clear builder selections when modal opens (if enabled)
  useEffect(() => {
    if (clearSelections) {
      // Dynamically import the builder store to avoid dependency issues
      import("@/store/builder-store")
        .then(({ useBuilderStore }) => {
          const store = useBuilderStore.getState();
          store.selectElement(null);
          store.selectSection(null);
          store.selectRow("", null);
          store.selectColumn("", "", null);
        })
        .catch(() => {
          // Builder store not available, ignore
        });
    }
  }, [clearSelections]);

  // Handle click outside. We listen on mouseup (not mousedown) and require the
  // mousedown to have originated outside the modal too — otherwise selecting
  // text inside the modal and releasing the mouse outside would close it.
  useEffect(() => {
    let downTarget: EventTarget | null = null;

    const isInsideSelectOrDialog = (target: HTMLElement) =>
      target.closest("select") ||
      target.tagName === "OPTION" ||
      target.getAttribute("role") === "listbox" ||
      target.getAttribute("role") === "option" ||
      target.closest('[role="listbox"]') ||
      target.closest('[role="combobox"]') ||
      target.closest('[role="dialog"]') ||
      target.closest(".select-dropdown");

    const handleMouseDown = (event: MouseEvent) => {
      downTarget = event.target;
    };

    const handleMouseUp = (event: MouseEvent) => {
      const upTarget = event.target as HTMLElement | null;
      const startTarget = downTarget as HTMLElement | null;
      // Clear the down-target immediately so a subsequent click without a
      // matching mousedown (e.g. synthesized) doesn't latch onto a stale value.
      downTarget = null;

      if (!upTarget || !startTarget) return;

      // Don't close if either end of the drag was inside a select/dialog chrome.
      if (isInsideSelectOrDialog(upTarget) || isInsideSelectOrDialog(startTarget)) {
        return;
      }

      // Only close if both mousedown AND mouseup happened outside the modal.
      if (
        modalRef.current &&
        !modalRef.current.contains(upTarget) &&
        !modalRef.current.contains(startTarget)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    // Prevent scrolling on the body, but restore whatever value was there
    // before (not a hard-coded "auto") so we don't clobber parent styling.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onClose]);

  /**
   * The `color` prop used to tint the header blue / green / purple. Colour-coding
   * a modal by an arbitrary prop is exactly the pattern the design system removes
   * (R2: the accent means "interactive", it does not carry identity), so all
   * three now resolve to the brand accent.
   *
   * The prop is still accepted so the three existing callers in the page builder
   * keep compiling; it no longer affects rendering and should be dropped when
   * those are touched.
   */
  const getHeaderColor = () => "bg-primary text-primary-foreground";

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{
        // Was a hardcoded rgba(59,130,246,…) blue over rgba(0,0,0,…); both now
        // follow the theme via the accent and overlay tokens.
        background:
          "radial-gradient(ellipse at center, hsl(var(--primary) / 0.12) 0%, hsl(var(--overlay) / 0.55) 70%)",
      }}
    >
      <div
        ref={modalRef}
        className={cn(
          "bg-card border border-border rounded-lg w-full max-w-2xl flex flex-col overflow-hidden",
          className
        )}
      >
        {/* Only show header if showHeader is true */}
        {showHeader && title && (
          <div
            className={cn(
              "flex items-center justify-between p-4",
              getHeaderColor()
            )}
          >
            <h2 className="text-xl font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-overlay-foreground hover:bg-overlay-foreground/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
