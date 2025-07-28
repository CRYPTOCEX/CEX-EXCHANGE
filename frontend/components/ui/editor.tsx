"use client";

import React, { useEffect, useState } from "react";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";
import { cn } from "@/lib/utils"; // or your own classnames helper
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";

// IMPORTANT: import your custom uploader
import { imageUploader } from "@/utils/upload";

interface RichTextEditorProps {
  value?: string;
  onChange: (content: string) => void;
  placeholder?: string;
  /** Optional: subdirectory or path for your uploaded images */
  uploadDir?: string;
  /** If true, apply error styling and display an error message below */
  error?: boolean;
  /** The error message to display below the editor */
  errorMessage?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = "",
  onChange,
  placeholder = "Start typing here...",
  uploadDir = "editor",
  error = false,
  errorMessage = "",
}) => {
  // Local state to track fullscreen mode
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Configure Quill
  const { quill, quillRef } = useQuill({
    theme: "snow",
    placeholder,
    modules: {
      toolbar: {
        container: [
          [{ header: "1" }, { header: "2" }, { font: [] }],
          [{ size: [] }],
          ["bold", "italic", "underline", "strike", "blockquote"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image", "video"],
          ["clean"],
        ],
        // We'll override the default image handler below
        handlers: {},
      },
    },
    formats: [
      "header",
      "font",
      "size",
      "bold",
      "italic",
      "underline",
      "strike",
      "blockquote",
      "list",
      "link",
      "image",
      "video",
    ],
  });

  // 1) Once Quill is ready, override the image handler
  useEffect(() => {
    if (!quill) return;

    // Access the toolbar module, then override its "image" button handler
    const toolbar = quill.getModule("toolbar") as any;
    toolbar.addHandler("image", async () => {
      // Create a file input programmatically
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();

      // When user selects a file, upload it
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        try {
          const response = await imageUploader({
            file,
            dir: uploadDir,
            size: { maxWidth: 1024, maxHeight: 728 },
            oldPath: "",
          });

          if (response.url) {
            // Insert the returned image URL into Quill
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, "image", response.url, "user");
            // Move cursor forward
            quill.setSelection(range.index + 1);
          }
        } catch (err) {
          console.error("Error uploading image:", err);
          alert("Error uploading image.");
        }
      };
    });

    // Set initial content if provided and mark as initialized
    if (value && !isInitialized) {
      quill.clipboard.dangerouslyPasteHTML(value);
      setIsInitialized(true);
    }
  }, [quill, uploadDir, value, isInitialized]);

  // 2) If `value` changes externally, update Quill (but only after initialization)
  useEffect(() => {
    if (quill && isInitialized && value !== undefined) {
      const currentContent = quill.root.innerHTML;
      // Only update if the content is actually different and not just formatting differences
      if (currentContent.replace(/\s/g, '') !== value.replace(/\s/g, '')) {
        // Preserve the selection/cursor position
        const selection = quill.getSelection();
        quill.clipboard.dangerouslyPasteHTML(value);
        // Restore selection if it existed
        if (selection) {
          quill.setSelection(selection);
        }
      }
    }
  }, [quill, value, isInitialized]);

  // 3) When Quill content changes, notify the parent
  useEffect(() => {
    if (!quill) return;

    const handleChange = (delta: any, oldDelta: any, source: string) => {
      // Only emit changes from user input, not programmatic changes
      if (source === 'user') {
        onChange(quill.root.innerHTML);
      }
    };
    quill.on("text-change", handleChange);
    return () => {
      quill.off("text-change", handleChange);
    };
  }, [quill, onChange]);

  // 4) Toggle fullscreen mode
  const toggleExpand = () => setIsExpanded((prev) => !prev);

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "relative border border-zinc-300 dark:border-zinc-600 rounded-lg overflow-hidden prose dark:prose-invert max-w-none!",
          isExpanded ? "fixed inset-0 z-50 bg-white dark:bg-zinc-900" : "bg-white dark:bg-zinc-900 max-h-[400px]",
          error && "border-2 border-red-500 focus:ring-red-500 focus:ring-2"
        )}
      >
        {/* Fullscreen / Exit Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleExpand}
          className="absolute top-1 right-1 z-10"
        >
          <Icon
            icon={isExpanded ? "eva:close-fill" : "eva:expand-fill"}
            className="h-5 w-5"
          />
        </Button>

        {/* Quill Editor Container */}
        <div
          ref={quillRef}
          className={cn(
            "quillEditor overflow-auto",
            "[&_.ql-editor]:text-zinc-900 [&_.ql-editor]:dark:text-zinc-100",
            "[&_.ql-editor]:bg-transparent",
            "[&_.ql-toolbar]:border-zinc-300 [&_.ql-toolbar]:dark:border-zinc-600",
            "[&_.ql-toolbar]:bg-zinc-50 [&_.ql-toolbar]:dark:bg-zinc-800",
            "[&_.ql-toolbar_.ql-stroke]:stroke-zinc-700 [&_.ql-toolbar_.ql-stroke]:dark:stroke-zinc-300",
            "[&_.ql-toolbar_.ql-fill]:fill-zinc-700 [&_.ql-toolbar_.ql-fill]:dark:fill-zinc-300",
            "[&_.ql-toolbar_button]:text-zinc-700 [&_.ql-toolbar_button]:dark:text-zinc-300",
            "[&_.ql-toolbar_button:hover]:bg-zinc-200 [&_.ql-toolbar_button:hover]:dark:bg-zinc-700",
            "[&_.ql-picker-label]:text-zinc-700 [&_.ql-picker-label]:dark:text-zinc-300",
            "[&_.ql-picker-options]:bg-white [&_.ql-picker-options]:dark:bg-zinc-800",
            "[&_.ql-picker-item]:text-zinc-700 [&_.ql-picker-item]:dark:text-zinc-300",
            "[&_.ql-picker-item:hover]:bg-zinc-100 [&_.ql-picker-item:hover]:dark:bg-zinc-700",
            isExpanded
              ? "h-[calc(100%-2.5rem)] mt-8"
              : "min-h-[400px] max-h-[400px]"
          )}
        />
      </div>

      {/* Error Message */}
      {error && errorMessage && (
        <p className="text-red-500 text-sm mt-1 leading-normal">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default RichTextEditor;
