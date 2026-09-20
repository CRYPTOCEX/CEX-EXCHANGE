"use client";

import { useEffect } from "react";
import { useBuilderStore } from "@/store/builder-store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Skip if typing in a form field or contenteditable region. Using
      // `isContentEditable` catches rich-text editors (ProseMirror, Slate,
      // contenteditable <div>s) that the HTMLInputElement/HTMLTextAreaElement
      // checks alone would miss.
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Read the latest store state imperatively so this listener can be
      // attached once (empty dep array below) instead of rebinding on every
      // store mutation.
      const state = useBuilderStore.getState();
      if (state.isPreviewMode) return;

      // Undo: Ctrl+Z or Command+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (state.canUndo) {
          state.undoAction();
        }
        return;
      }

      // Redo: Ctrl+Y or Command+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        if (state.canRedo) {
          state.redoAction();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);
}
