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

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on a select element or its dropdown
      const target = event.target as HTMLElement;

      // Check if the click is on a select element, option, or dropdown
      const isSelectElement =
        target.closest("select") ||
        target.tagName === "OPTION" ||
        target.getAttribute("role") === "listbox" ||
        target.getAttribute("role") === "option" ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="combobox"]') ||
        target.closest('[role="dialog"]') ||
        target.closest(".select-dropdown");

      if (isSelectElement) {
        return;
      }

      // Only close if clicking outside the modal
      if (modalRef.current && !modalRef.current.contains(target)) {
        onClose();
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Prevent scrolling on the body
    document.body.style.overflow = "hidden";

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "auto";
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

  const getHeaderColor = () => {
    switch (color) {
      case "blue":
        return "bg-blue-500 text-white dark:bg-blue-600";
      case "green":
        return "bg-green-500 text-white dark:bg-green-600";
      case "purple":
      default:
        return "bg-purple-600 text-white dark:bg-purple-700";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, rgba(0, 0, 0, 0.4) 70%)",
      }}
    >
      <div
        ref={modalRef}
        className={cn(
          "bg-white dark:bg-zinc-900 dark:border dark:border-zinc-700 rounded-lg shadow-lg w-full max-w-2xl flex flex-col overflow-hidden",
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
              className="text-white hover:bg-white/20"
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
