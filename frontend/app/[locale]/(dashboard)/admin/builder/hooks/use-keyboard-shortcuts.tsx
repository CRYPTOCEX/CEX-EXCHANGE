"use client";

import { useEffect } from "react";
import { useBuilderStore } from "@/store/builder-store";

export function useKeyboardShortcuts() {
  const { undoAction, redoAction, canUndo, canRedo, isPreviewMode } =
    useBuilderStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in preview mode or if target is an input/textarea
      if (
        isPreviewMode ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Undo: Ctrl+Z or Command+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undoAction();
        }
      }

      // Redo: Ctrl+Y or Command+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        if (canRedo) {
          redoAction();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [undoAction, redoAction, canUndo, canRedo, isPreviewMode]);
}
