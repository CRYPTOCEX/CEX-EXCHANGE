"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";
import { MainToolbar } from "./main-toolbar";
import { FloatingToolbar } from "./floating-toolbar";
import { SlashCommandMenu } from "./slash-commands";
import { LinkPopover } from "./link-popover";
import { MediaManager } from "./media-manager";
import { ImageToolbar } from "./image-toolbar";
import { ImageResizer } from "./image-resizer";
import type { WysiwygEditorProps, WysiwygEditorRef, FormatState, EditorHistoryState, EditorRadius, EmailPreviewConfig } from "./types";
import {
  Maximize2,
  Minimize2,
  Code,
  Eye,
  FileText,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Image size and alignment types
type ImageSize = "small" | "medium" | "large" | "full";
type ImageAlign = "left" | "center" | "right";

// Size values for images (using inline styles for reliability)
const imageSizeValues: Record<ImageSize, string> = {
  small: "25%",
  medium: "50%",
  large: "75%",
  full: "100%",
};

// Alignment styles
const imageAlignStyles: Record<ImageAlign, { marginLeft: string; marginRight: string }> = {
  left: { marginLeft: "0", marginRight: "auto" },
  center: { marginLeft: "auto", marginRight: "auto" },
  right: { marginLeft: "auto", marginRight: "0" },
};

// Device preview sizes
type DeviceType = "desktop" | "tablet" | "mobile";

const deviceSizes: Record<DeviceType, { width: number; label: string }> = {
  desktop: { width: 1200, label: "Desktop" },
  tablet: { width: 768, label: "Tablet" },
  mobile: { width: 375, label: "Mobile" },
};

// Default format state
const defaultFormatState: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  heading: null,
  alignment: "left",
  list: null,
  link: null,
  blockquote: false,
};

// Radius classes mapping
const radiusClasses: Record<EditorRadius, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

export const WysiwygEditor = forwardRef<WysiwygEditorRef, WysiwygEditorProps>(function WysiwygEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  uploadDir = "editor",
  className,
  minHeight = 400,
  maxHeight,
  readOnly = false,
  showWordCount = true,
  onImageUpload,
  // Styling props with defaults
  variant = "default",
  radius = "lg",
  bordered = true,
  shadow = false,
  toolbarClassName,
  contentClassName,
  // User restriction - when true, media manager only shows user's own files
  userOnly = false,
  // Email preview configuration
  emailPreview,
}, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formatState, setFormatState] = useState<FormatState>(defaultFormatState);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "html">("edit");
  const [previewDevice, setPreviewDevice] = useState<DeviceType>("desktop");
  const [editorContent, setEditorContent] = useState(value);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [floatingToolbarPosition, setFloatingToolbarPosition] = useState({ x: 0, y: 0 });
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashFilter, setSlashFilter] = useState("");
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkPopoverPosition, setLinkPopoverPosition] = useState({ x: 0, y: 0 });
  const [showImageModal, setShowImageModal] = useState(false);
  const [history, setHistory] = useState<EditorHistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0 });
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageToolbarPosition, setImageToolbarPosition] = useState({ x: 0, y: 0 });
  const [isResizingImage, setIsResizingImage] = useState(false);
  const [imageWrapperRect, setImageWrapperRect] = useState<DOMRect | null>(null);
  const isComposing = useRef(false);
  const lastSavedContent = useRef(value);
  const savedSelection = useRef<Range | null>(null);

  // Save selection on blur to restore it when inserting content
  const handleBlur = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  // Expose imperative methods via ref
  useImperativeHandle(ref, () => ({
    insertContent: (content: string) => {
      if (!editorRef.current || readOnly) return;

      // Focus the editor first
      editorRef.current.focus();

      // Get selection
      const selection = window.getSelection();
      if (!selection) return;

      let range: Range;

      // Try to use saved selection first
      if (savedSelection.current && editorRef.current.contains(savedSelection.current.startContainer)) {
        range = savedSelection.current.cloneRange();
        selection.removeAllRanges();
        selection.addRange(range);
      } else if (selection.rangeCount > 0) {
        // Use current selection
        range = selection.getRangeAt(0);
      } else {
        // Create a range at the end of the editor
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // Delete any selected content first
      range.deleteContents();

      // Insert the new content
      const textNode = document.createTextNode(content);
      range.insertNode(textNode);

      // Move cursor after inserted content
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);

      // Save the new selection
      savedSelection.current = range.cloneRange();

      // Manually trigger onChange since we're bypassing the input event
      if (editorRef.current) {
        const html = editorRef.current.innerHTML;
        lastSavedContent.current = html;
        setEditorContent(html);
        onChange(html);
      }
    },
    focus: () => {
      editorRef.current?.focus();
    },
  }), [readOnly, onChange]);

  // Sync editorContent with value prop
  useEffect(() => {
    setEditorContent(value);
  }, [value]);

  // Initialize editor content when switching to edit mode or when content changes
  useEffect(() => {
    if (viewMode === "edit" && editorRef.current) {
      // Only update if different to avoid cursor jumping
      if (editorRef.current.innerHTML !== editorContent) {
        editorRef.current.innerHTML = editorContent || "";
      }
      updateWordCount();
    }
  }, [viewMode, editorContent]);

  // Update word count
  const updateWordCount = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount({ words, chars });
  }, []);

  // Get current format state based on selection
  const updateFormatState = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const newState: FormatState = {
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikethrough: document.queryCommandState("strikethrough"),
      heading: null,
      alignment: "left",
      list: null,
      link: null,
      blockquote: false,
    };

    // Check heading
    const block = getParentBlock(selection.anchorNode);
    if (block) {
      const tagName = block.tagName?.toLowerCase();
      if (tagName === "h1") newState.heading = "h1";
      else if (tagName === "h2") newState.heading = "h2";
      else if (tagName === "h3") newState.heading = "h3";
      else if (tagName === "h4") newState.heading = "h4";

      // Check alignment
      const computedStyle = window.getComputedStyle(block);
      const textAlign = computedStyle.textAlign;
      if (textAlign === "center") newState.alignment = "center";
      else if (textAlign === "right") newState.alignment = "right";
      else if (textAlign === "justify") newState.alignment = "justify";

      // Check list
      const listParent = block.closest("ul, ol");
      if (listParent) {
        newState.list = listParent.tagName === "UL" ? "bullet" : "ordered";
      }

      // Check blockquote
      if (block.closest("blockquote")) {
        newState.blockquote = true;
      }

      // Check link
      const linkElement = block.closest("a") as HTMLAnchorElement | null;
      if (linkElement) {
        newState.link = linkElement.href;
      }
    }

    setFormatState(newState);
  }, []);

  // Get parent block element
  const getParentBlock = (node: Node | null): HTMLElement | null => {
    if (!node) return null;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const display = window.getComputedStyle(element).display;
      if (display === "block" || display === "list-item") {
        return element;
      }
    }
    return getParentBlock(node.parentNode);
  };

  // Execute command
  const execCommand = useCallback(
    (command: string, value?: string) => {
      if (readOnly) return;
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      handleInput();
      updateFormatState();
    },
    [readOnly, updateFormatState]
  );

  // Format text
  const formatText = useCallback(
    (format: string) => {
      execCommand(format);
    },
    [execCommand]
  );

  // Insert heading
  const insertHeading = useCallback(
    (level: number) => {
      execCommand("formatBlock", `h${level}`);
    },
    [execCommand]
  );

  // Insert paragraph
  const insertParagraph = useCallback(() => {
    execCommand("formatBlock", "p");
  }, [execCommand]);

  // Insert list
  const insertList = useCallback(
    (type: "bullet" | "ordered") => {
      execCommand(type === "bullet" ? "insertUnorderedList" : "insertOrderedList");
    },
    [execCommand]
  );

  // Insert blockquote
  const insertBlockquote = useCallback(() => {
    execCommand("formatBlock", "blockquote");
  }, [execCommand]);

  // Insert horizontal rule
  const insertHorizontalRule = useCallback(() => {
    execCommand("insertHorizontalRule");
  }, [execCommand]);

  // Set alignment
  const setAlignment = useCallback(
    (align: "left" | "center" | "right" | "justify") => {
      execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
    },
    [execCommand]
  );

  // Insert link
  const insertLink = useCallback(
    (url: string, text?: string) => {
      if (readOnly) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      if (text && selection.isCollapsed) {
        document.execCommand("insertHTML", false, `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
      } else {
        execCommand("createLink", url);
        // Add target and rel to the newly created link
        const link = selection.anchorNode?.parentElement?.closest("a");
        if (link) {
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        }
      }
      handleInput();
      setShowLinkPopover(false);
    },
    [readOnly, execCommand]
  );

  // Remove link
  const removeLink = useCallback(() => {
    execCommand("unlink");
    setShowLinkPopover(false);
  }, [execCommand]);

  // Save current selection before opening media manager
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelection.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  // Restore saved selection
  const restoreSelection = useCallback(() => {
    if (savedSelection.current && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection.current);
      }
    }
  }, []);

  // Insert image at cursor position
  const insertImage = useCallback(
    (url: string, alt?: string) => {
      if (readOnly || !editorRef.current) return;

      // Restore the saved selection first
      restoreSelection();

      // Create image HTML with wrapper for alignment control
      const imgId = `img-${Date.now()}`;
      const img = `<figure class="wysiwyg-image my-4" style="display: block; width: 100%; max-width: 100%; margin-left: auto; margin-right: auto;" contenteditable="false" data-image-id="${imgId}"><img src="${url}" alt="${alt || ""}" style="width: 100%; height: auto; display: block;" class="rounded-lg" data-size="full" data-align="center" /><figcaption class="text-center text-sm text-muted-foreground mt-2 hidden"></figcaption></figure>`;

      // Try execCommand first
      const success = document.execCommand("insertHTML", false, img);

      // Fallback: append to end if execCommand fails
      if (!success) {
        editorRef.current.innerHTML += img;
      }

      // Trigger change
      const html = editorRef.current.innerHTML;
      lastSavedContent.current = html;
      setEditorContent(html);
      onChange(html);

      // Clear saved selection
      savedSelection.current = null;
      setShowImageModal(false);
    },
    [readOnly, onChange, restoreSelection]
  );

  // Get image properties from element
  const getImageProps = useCallback((img: HTMLImageElement) => {
    const size = (img.dataset.size as ImageSize) || "full";
    const align = (img.dataset.align as ImageAlign) || "center";
    return { size, align };
  }, []);

  // Update image toolbar position
  const updateImageToolbarPosition = useCallback((img: HTMLImageElement) => {
    if (!editorRef.current) return;

    const imgRect = img.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    setImageToolbarPosition({
      x: imgRect.left + imgRect.width / 2 - editorRect.left,
      y: imgRect.top - editorRect.top - 10,
    });
  }, []);

  // Update image size
  const updateImageSize = useCallback(
    (size: ImageSize) => {
      if (!selectedImage || !editorRef.current) return;

      selectedImage.dataset.size = size;
      // Clear custom dimensions when using preset sizes
      delete selectedImage.dataset.customWidth;
      delete selectedImage.dataset.customHeight;

      // Update the figure container
      const figure = selectedImage.closest("figure") as HTMLElement;
      if (figure) {
        figure.style.width = imageSizeValues[size];
        figure.style.height = "auto"; // Reset height for percentage sizes
        figure.style.maxWidth = "100%";
      }

      // Image should fill its container naturally (no cover/crop for percentage sizes)
      selectedImage.style.width = "100%";
      selectedImage.style.height = "auto";
      selectedImage.style.maxWidth = "100%";
      selectedImage.style.objectFit = ""; // Reset object-fit

      // Trigger change
      const html = editorRef.current.innerHTML;
      lastSavedContent.current = html;
      setEditorContent(html);
      onChange(html);

      // Update toolbar position after a small delay for reflow
      setTimeout(() => updateImageToolbarPosition(selectedImage), 10);
    },
    [selectedImage, onChange, updateImageToolbarPosition]
  );

  // Update image alignment
  const updateImageAlign = useCallback(
    (align: ImageAlign) => {
      if (!selectedImage || !editorRef.current) return;

      const figure = selectedImage.closest("figure") as HTMLElement;
      if (!figure) return;

      selectedImage.dataset.align = align;

      // Update inline styles for alignment on figure
      const alignStyle = imageAlignStyles[align];
      figure.style.marginLeft = alignStyle.marginLeft;
      figure.style.marginRight = alignStyle.marginRight;

      // Update image alignment too
      selectedImage.style.marginLeft = alignStyle.marginLeft;
      selectedImage.style.marginRight = alignStyle.marginRight;

      // Trigger change
      const html = editorRef.current.innerHTML;
      lastSavedContent.current = html;
      setEditorContent(html);
      onChange(html);
    },
    [selectedImage, onChange]
  );

  // Delete selected image
  const deleteSelectedImage = useCallback(() => {
    if (!selectedImage || !editorRef.current) return;

    const figure = selectedImage.closest("figure");
    if (figure) {
      figure.remove();
    } else {
      selectedImage.remove();
    }

    setSelectedImage(null);

    // Trigger change
    const html = editorRef.current.innerHTML;
    lastSavedContent.current = html;
    setEditorContent(html);
    onChange(html);
  }, [selectedImage, onChange]);

  // Handle image resize
  const handleImageResize = useCallback(
    (width: number, height: number) => {
      if (!selectedImage) return;

      const figure = selectedImage.closest("figure") as HTMLElement;
      if (figure) {
        // Set pixel dimensions on figure
        figure.style.width = `${width}px`;
        figure.style.height = `${height}px`;
        figure.style.maxWidth = "100%";
      }

      // Update image dimensions - image fills its container with cover (crops instead of distorts)
      selectedImage.style.width = "100%";
      selectedImage.style.height = "100%";
      selectedImage.style.objectFit = "cover"; // Cover fills area, crops excess

      // Mark as custom size
      selectedImage.dataset.size = "custom";
      selectedImage.dataset.customWidth = `${width}`;
      selectedImage.dataset.customHeight = `${height}`;

      setIsResizingImage(true);

      // Update wrapper rect for overlay positioning
      if (figure) {
        setImageWrapperRect(figure.getBoundingClientRect());
      }
    },
    [selectedImage]
  );

  // Handle resize end - save to history
  const handleImageResizeEnd = useCallback(() => {
    if (!editorRef.current) return;

    setIsResizingImage(false);

    // Trigger change and save to history
    const html = editorRef.current.innerHTML;
    lastSavedContent.current = html;
    setEditorContent(html);
    onChange(html);

    // Update toolbar position
    if (selectedImage) {
      updateImageToolbarPosition(selectedImage);
    }
  }, [onChange, selectedImage, updateImageToolbarPosition]);

  // Get max width for image resizer
  const getImageMaxWidth = useCallback(() => {
    if (!editorRef.current) return 800;
    return editorRef.current.clientWidth - 32; // Account for padding
  }, []);

  // Handle image click for selection
  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.tagName === "IMG" && editorRef.current?.contains(target)) {
        e.preventDefault();
        e.stopPropagation();

        const img = target as HTMLImageElement;
        setSelectedImage(img);
        updateImageToolbarPosition(img);

        // Add selected class (only data attribute, no visual ring - we show overlay instead)
        editorRef.current.querySelectorAll("img[data-selected]").forEach((el) => {
          el.removeAttribute("data-selected");
        });
        img.setAttribute("data-selected", "true");
      } else {
        // Deselect image when clicking elsewhere
        if (selectedImage) {
          selectedImage.removeAttribute("data-selected");
          setSelectedImage(null);
        }
      }
    },
    [selectedImage, updateImageToolbarPosition]
  );

  // Open image modal with selection saved
  const openImageModal = useCallback(() => {
    saveSelection();
    setShowImageModal(true);
  }, [saveSelection]);

  // Insert table
  const insertTable = useCallback(
    (rows: number, cols: number) => {
      if (readOnly) return;
      let html = '<table class="w-full border-collapse my-4"><thead><tr>';
      for (let c = 0; c < cols; c++) {
        html += '<th class="border border-border p-2 bg-muted">Header</th>';
      }
      html += "</tr></thead><tbody>";
      for (let r = 0; r < rows - 1; r++) {
        html += "<tr>";
        for (let c = 0; c < cols; c++) {
          html += '<td class="border border-border p-2">Cell</td>';
        }
        html += "</tr>";
      }
      html += "</tbody></table>";
      document.execCommand("insertHTML", false, html);
      handleInput();
    },
    [readOnly]
  );

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current || isComposing.current) return;
    const html = editorRef.current.innerHTML;
    if (html !== lastSavedContent.current) {
      lastSavedContent.current = html;
      setEditorContent(html);
      onChange(html);
      updateWordCount();
      // Add to history
      addToHistory(html);
    }
  }, [onChange, updateWordCount]);

  // Add to history for undo/redo
  const addToHistory = useCallback(
    (content: string) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({ content, selection: null });
        // Keep only last 50 states
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex]
  );

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0 && editorRef.current) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const state = history[newIndex];
      editorRef.current.innerHTML = state.content;
      lastSavedContent.current = state.content;
      onChange(state.content);
    }
  }, [history, historyIndex, onChange]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && editorRef.current) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const state = history[newIndex];
      editorRef.current.innerHTML = state.content;
      lastSavedContent.current = state.content;
      onChange(state.content);
    }
  }, [history, historyIndex, onChange]);

  // Handle selection change for floating toolbar
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editorRef.current?.contains(selection.anchorNode)) {
      setShowFloatingToolbar(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    setFloatingToolbarPosition({
      x: rect.left + rect.width / 2 - editorRect.left,
      y: rect.top - editorRect.top - 10,
    });
    setShowFloatingToolbar(true);
    updateFormatState();
  }, [updateFormatState]);

  // Handle keydown for shortcuts and slash commands
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readOnly) return;

      // Keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            formatText("bold");
            break;
          case "i":
            e.preventDefault();
            formatText("italic");
            break;
          case "u":
            e.preventDefault();
            formatText("underline");
            break;
          case "k": {
            e.preventDefault();
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
              const range = selection.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              const editorRect = editorRef.current?.getBoundingClientRect();
              if (editorRect) {
                setLinkPopoverPosition({
                  x: rect.left - editorRect.left,
                  y: rect.bottom - editorRect.top + 5,
                });
                setShowLinkPopover(true);
              }
            }
            break;
          }
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case "y":
            e.preventDefault();
            redo();
            break;
        }
      }

      // Slash command
      if (e.key === "/" && !showSlashMenu) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const editorRect = editorRef.current?.getBoundingClientRect();
          if (editorRect) {
            setSlashMenuPosition({
              x: rect.left - editorRect.left,
              y: rect.bottom - editorRect.top + 5,
            });
            setShowSlashMenu(true);
            setSlashFilter("");
          }
        }
      }

      // Close slash menu on escape
      if (e.key === "Escape") {
        setShowSlashMenu(false);
        setShowLinkPopover(false);
      }
    },
    [readOnly, formatText, undo, redo, showSlashMenu]
  );

  // Handle slash command filter
  const handleSlashInput = useCallback((e: React.FormEvent) => {
    if (showSlashMenu) {
      const target = e.target as HTMLDivElement;
      const text = target.innerText;
      const slashIndex = text.lastIndexOf("/");
      if (slashIndex !== -1) {
        setSlashFilter(text.substring(slashIndex + 1));
      }
    }
  }, [showSlashMenu]);

  // Execute slash command
  const executeSlashCommand = useCallback(
    (command: string) => {
      setShowSlashMenu(false);
      // Remove the slash and filter text
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current) {
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || "";
          const slashIndex = text.lastIndexOf("/");
          if (slashIndex !== -1) {
            textNode.textContent = text.substring(0, slashIndex);
          }
        }
      }

      // Execute the command
      switch (command) {
        case "h1":
          insertHeading(1);
          break;
        case "h2":
          insertHeading(2);
          break;
        case "h3":
          insertHeading(3);
          break;
        case "h4":
          insertHeading(4);
          break;
        case "paragraph":
          insertParagraph();
          break;
        case "bullet":
          insertList("bullet");
          break;
        case "ordered":
          insertList("ordered");
          break;
        case "quote":
          insertBlockquote();
          break;
        case "divider":
          insertHorizontalRule();
          break;
        case "table":
          insertTable(3, 3);
          break;
        case "image":
          setShowImageModal(true);
          break;
      }
    },
    [insertHeading, insertParagraph, insertList, insertBlockquote, insertHorizontalRule, insertTable]
  );

  // Add selection change listener
  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Initialize history with initial value
  useEffect(() => {
    if (history.length === 0 && value) {
      setHistory([{ content: value, selection: null }]);
      setHistoryIndex(0);
    }
  }, []);

  // HTML view content
  const htmlContent = useMemo(() => {
    return value || "";
  }, [value]);

  // Process email preview content with wrapper and sample data
  const emailPreviewContent = useMemo(() => {
    if (!emailPreview?.enabled) {
      return value || "";
    }

    let content = value || "";

    // Default sample data for all email template variables
    const defaultSampleData: Record<string, string> = {
      // User information
      FIRSTNAME: "John",
      LASTNAME: "Smith",
      EMAIL: "john.smith@example.com",
      PHONE: "+1 (555) 123-4567",
      COMPANY: "Acme Corporation",
      ADDRESS: "123 Main Street",
      CITY: "New York",
      STATE: "NY",
      ZIP: "10001",
      COUNTRY: "United States",
      PASSWORD: "••••••••",
      USERNAME: "johnsmith",

      // Site information
      URL: "https://example.com/action",
      SITE_NAME: "Your Platform",
      SITE_URL: "https://example.com",
      SITE_EMAIL: "support@example.com",
      SITE_PHONE: "+1 (555) 000-0000",
      SITE_ADDRESS: "456 Business Ave, Suite 100",
      LOGO_URL: "/img/logo/logo.png",

      // Dates and times
      CREATED_AT: new Date().toLocaleDateString(),
      UPDATED_AT: new Date().toLocaleDateString(),
      TIME: new Date().toLocaleTimeString(),
      DATE: new Date().toLocaleDateString(),
      LAST_LOGIN: new Date(Date.now() - 86400000).toLocaleString(),

      // Tokens and codes
      TOKEN: "ABC123XYZ789",
      CODE: "PROMO2024",

      // Transaction details
      AMOUNT: "99.99",
      CURRENCY: "USDT",
      ORDER_ID: "ORD-2024-001234",
      TRANSACTION_ID: "TXN-ABC123XYZ789",
      TRANSACTION_TYPE: "DEPOSIT",
      TRANSACTION_STATUS: "COMPLETED",
      NEW_BALANCE: "1,250.00",
      DESCRIPTION: "Wallet deposit via bank transfer",
      FEE: "2.50",
      NOTE: "Transaction processed successfully",
      REASON: "Verification required",

      // KYC related
      LEVEL: "Level 2",
      STATUS: "APPROVED",
      MESSAGE: "Your documents have been verified successfully.",

      // Investment related
      PLAN_NAME: "Premium Growth Plan",
      DURATION: "30",
      TIMEFRAME: "days",
      PROFIT: "125.50",
      RESULT: "WIN",

      // Support/Tickets
      RECEIVER_NAME: "Support Team",
      SENDER_NAME: "John Smith",
      TICKET_ID: "TKT-2024-0001",

      // Binary trading
      MARKET: "BTC/USDT",
      ENTRY_PRICE: "45,230.50",
      CLOSE_PRICE: "45,890.00",
      SIDE: "BUY",

      // Wallet operations
      ACTION: "credited",
      RECIPIENT_NAME: "Jane Doe",
      TO_ADDRESS: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      CHAIN: "Ethereum (ERC-20)",
      MEMO: "Payment for services",

      // Author status
      AUTHOR_STATUS: "APPROVED",
      APPLICATION_ID: "APP-2024-0001",

      // ICO related
      TOKEN_NAME: "SuperToken",
      TOKEN_SYMBOL: "STK",
      PHASE_NAME: "Phase 1 - Early Bird",
      CONTRIBUTION_STATUS: "CONFIRMED",
      OFFERING_NAME: "SuperToken ICO",
      PROJECT_NAME: "SuperToken Project",
      PROJECT_OWNER_NAME: "Tech Innovations Inc.",
      APPROVED_AT: new Date().toLocaleDateString(),
      REJECTION_REASON: "Insufficient documentation provided",
      FLAG_REASON: "Additional verification needed",
      ESTIMATED_REVIEW_TIME: "3-5 business days",
      INVESTOR_NAME: "John Smith",
      SELLER_NAME: "Tech Innovations Inc.",
      AMOUNT_INVESTED: "5,000.00",
      TOKEN_AMOUNT: "50,000",
      TOKEN_PRICE: "0.10",

      // Staking related
      STAKE_AMOUNT: "1,000",
      STAKE_DATE: new Date().toLocaleDateString(),
      RELEASE_DATE: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      EXPECTED_REWARD: "50.00",
      REWARD_AMOUNT: "25.00",
      DISTRIBUTION_DATE: new Date().toLocaleDateString(),

      // E-commerce
      CUSTOMER_NAME: "John Smith",
      ORDER_NUMBER: "ORD-2024-001234",
      ORDER_DATE: new Date().toLocaleDateString(),
      ORDER_TOTAL: "$299.99",
      ORDER_STATUS: "COMPLETED",
      PRODUCT_DETAILS: "<li>Product 1 - $99.99</li><li>Product 2 - $199.99</li>",

      // P2P Trading
      BUYER_NAME: "Alice Johnson",
      PRICE: "$45,500.00",
      TRADE_ID: "P2P-2024-0001",
      PARTICIPANT_NAME: "John Smith",
      OTHER_PARTY_NAME: "Alice Johnson",
      DISPUTE_REASON: "Payment not received within timeframe",
      RESOLUTION_MESSAGE: "Funds have been released to the seller after verification.",
      OFFER_ID: "OFFER-2024-0001",
      REVIEWER_NAME: "Alice Johnson",
      RATING: "5/5 Stars",
      COMMENT: "Excellent trader! Fast and reliable.",
      CURRENT_AMOUNT: "500.00",

      // Forex related
      ACCOUNT_ID: "FX-ACC-001234",

      // Futures/Liquidation
      SYMBOL: "BTC/USDT",
      MARGIN: "500.00",
      LEVERAGE: "10x",
      CURRENT_PRICE: "44,850.00",

      // Copy Trading
      DISPLAY_NAME: "ProTrader_John",
      LEADER_NAME: "CryptoMaster",
      FOLLOWER_NAME: "TradingNewbie",
      COPY_MODE: "Proportional",
      STARTED_AT: new Date().toLocaleDateString(),
      STOPPED_AT: new Date().toLocaleDateString(),
      DAYS_FOLLOWED: "45",
      RISK_LEVEL: "Medium",
      TRADING_STYLE: "Swing Trading",
      WIN_RATE: "68.5",
      MAX_DAILY_LOSS: "100",
      MAX_POSITION_SIZE: "500",
      PAUSE_REASON: "Daily loss limit reached",
      SUSPENSION_REASON: "Violation of platform terms",
      TOTAL_TRADES: "156",
      TOTAL_PROFIT: "2,450.00",
      ROI: "24.5",
      EXIT_PRICE: "46,200.00",
      YOUR_PROFIT: "85.00",
      PROFIT_SHARE_PERCENT: "20",
      LEADER_PROFIT_SHARE: "17.00",
      SUBSCRIPTION_ID: "SUB-2024-0001",
      LOSS: "45.00",
      DAILY_LOSS_LIMIT: "100",
      CURRENT_LOSS: "105.50",
      REQUIRED_AMOUNT: "250.00",
      AVAILABLE_BALANCE: "180.00",
      FOLLOWER_PROFIT: "150.00",
      PROFIT_SHARE_AMOUNT: "30.00",
      NET_PROFIT: "120.00",

      // Email template specific
      SUBJECT: emailPreview.subject || "Email Subject",
      HEADER: emailPreview.subject || "Email Header",
      FOOTER: "Your Platform",
    };

    // Merge with custom sample data
    const sampleData = { ...defaultSampleData, ...emailPreview.sampleData };

    // Replace all %VARIABLE% patterns with sample data
    content = content.replace(/%([A-Z_]+)%/g, (match, variable) => {
      return sampleData[variable] || match;
    });

    // If wrapper HTML is provided, wrap the content
    if (emailPreview.wrapperHtml) {
      let wrapper = emailPreview.wrapperHtml;

      // Replace variables in wrapper too
      wrapper = wrapper.replace(/%([A-Z_]+)%/g, (match, variable) => {
        if (variable === "MESSAGE") {
          return content;
        }
        return sampleData[variable] || match;
      });

      return wrapper;
    }

    return content;
  }, [value, emailPreview]);

  // Compute container classes based on props
  const containerClasses = cn(
    "wysiwyg-editor flex flex-col bg-background transition-colors overflow-hidden",
    // Border
    bordered && variant !== "borderless" && "border border-border",
    // Radius (not when fullscreen)
    !isFullscreen && radiusClasses[radius],
    // Shadow
    shadow && "shadow-sm",
    // Variant-specific styles
    variant === "minimal" && "bg-transparent",
    // Fullscreen override
    isFullscreen && "fixed inset-0 z-50 rounded-none border-0",
    // Full height
    "h-full",
    className
  );

  // Toolbar container classes - fixed header in flex
  const toolbarContainerClasses = cn(
    "flex-shrink-0 flex items-center justify-between px-2 py-1.5 bg-muted/50 dark:bg-muted/30 transition-colors z-20",
    bordered && variant !== "borderless" && "border-b border-border",
    toolbarClassName
  );

  // Content area classes
  const contentAreaClasses = cn(
    "wysiwyg-content legal-content outline-none p-4 transition-colors min-h-[200px]",
    "bg-background dark:bg-background",
    "text-foreground dark:text-foreground",
    !value && "empty-editor",
    contentClassName
  );

  return (
    <div
      className={containerClasses}
      style={{
        minHeight: isFullscreen ? "100vh" : minHeight,
        height: isFullscreen ? "100vh" : "100%",
      }}
    >
      {/* View Mode Tabs & Fullscreen Toggle - Sticky Header */}
      <div className={toolbarContainerClasses}>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={viewMode === "edit" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("edit")}
            className="h-7 px-2.5 text-xs gap-1.5 font-medium"
          >
            <FileText className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant={viewMode === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("preview")}
            className="h-7 px-2.5 text-xs gap-1.5 font-medium"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            type="button"
            variant={viewMode === "html" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("html")}
            className="h-7 px-2.5 text-xs gap-1.5 font-medium"
          >
            <Code className="h-3.5 w-3.5" />
            HTML
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {/* Device Preview Buttons - Only show in preview mode */}
          {viewMode === "preview" && (
            <div className="flex items-center gap-0.5 mr-2 px-1.5 py-0.5 rounded-lg bg-muted/50 dark:bg-muted/30">
              <Button
                type="button"
                variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewDevice("desktop")}
                className="h-6 w-6 p-0"
                title="Desktop (1200px)"
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewDevice("tablet")}
                className="h-6 w-6 p-0"
                title="Tablet (768px)"
              >
                <Tablet className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPreviewDevice("mobile")}
                className="h-6 w-6 p-0"
                title="Mobile (375px)"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 w-7 p-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Toolbar - Fixed below view mode tabs, only show in edit mode */}
      {viewMode === "edit" && !readOnly && (
        <div className="shrink-0 z-10">
          <MainToolbar
            formatState={formatState}
            onFormat={formatText}
            onHeading={insertHeading}
            onParagraph={insertParagraph}
            onList={insertList}
            onBlockquote={insertBlockquote}
            onDivider={insertHorizontalRule}
            onAlignment={setAlignment}
            onLink={() => {
              const selection = window.getSelection();
              if (selection && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const editorRect = editorRef.current?.getBoundingClientRect();
                if (editorRect) {
                  setLinkPopoverPosition({
                    x: rect.left - editorRect.left,
                    y: rect.bottom - editorRect.top + 5,
                  });
                  setShowLinkPopover(true);
                }
              }
            }}
            onImage={openImageModal}
            onTable={() => insertTable(3, 3)}
            onUndo={undo}
            onRedo={redo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
          />
        </div>
      )}

      {/* Editor Content - Scrollable area that takes remaining space */}
      <div className="flex-1 overflow-auto relative bg-background dark:bg-background transition-colors">
        {viewMode === "edit" && (
          <>
            {/* Editable Area */}
            <div
              ref={editorRef}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              className={contentAreaClasses}
              data-placeholder={placeholder}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onClick={handleImageClick}
              onBlur={handleBlur}
              onCompositionStart={() => (isComposing.current = true)}
              onCompositionEnd={() => {
                isComposing.current = false;
                handleInput();
              }}
              onPaste={(e) => {
                // Handle paste - clean HTML
                e.preventDefault();
                const html = e.clipboardData.getData("text/html");
                const text = e.clipboardData.getData("text/plain");
                if (html) {
                  // Clean and insert HTML
                  document.execCommand("insertHTML", false, html);
                } else {
                  document.execCommand("insertText", false, text);
                }
                handleInput();
              }}
            />

            {/* Floating Toolbar */}
            {showFloatingToolbar && !readOnly && (
              <FloatingToolbar
                position={floatingToolbarPosition}
                formatState={formatState}
                onFormat={formatText}
                onLink={() => {
                  setLinkPopoverPosition(floatingToolbarPosition);
                  setShowLinkPopover(true);
                }}
              />
            )}

            {/* Slash Command Menu */}
            {showSlashMenu && (
              <SlashCommandMenu
                position={slashMenuPosition}
                filter={slashFilter}
                onSelect={executeSlashCommand}
                onClose={() => setShowSlashMenu(false)}
              />
            )}

            {/* Link Popover */}
            {showLinkPopover && (
              <LinkPopover
                position={linkPopoverPosition}
                initialUrl={formatState.link || ""}
                onInsert={insertLink}
                onRemove={removeLink}
                onClose={() => setShowLinkPopover(false)}
              />
            )}

            {/* Image Toolbar */}
            {selectedImage && !readOnly && (
              <>
                <ImageToolbar
                  position={imageToolbarPosition}
                  currentSize={getImageProps(selectedImage).size}
                  currentAlign={getImageProps(selectedImage).align}
                  onSizeChange={updateImageSize}
                  onAlignChange={updateImageAlign}
                  onDelete={deleteSelectedImage}
                />
                {/* Image Resize Handles Overlay */}
                {(() => {
                  const figure = selectedImage.closest("figure") as HTMLElement;
                  if (!figure || !editorRef.current) return null;

                  const figureRect = figure.getBoundingClientRect();
                  const editorRect = editorRef.current.getBoundingClientRect();

                  return (
                    <div
                      className="absolute pointer-events-none group"
                      style={{
                        left: figureRect.left - editorRect.left,
                        top: figureRect.top - editorRect.top,
                        width: figureRect.width,
                        height: figureRect.height,
                      }}
                    >
                      <div className="relative w-full h-full pointer-events-auto">
                        <ImageResizer
                          imageElement={selectedImage}
                          onResize={handleImageResize}
                          onResizeEnd={handleImageResizeEnd}
                          maxWidth={getImageMaxWidth()}
                          minWidth={100}
                          minHeight={50}
                        />
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Media Manager */}
            <MediaManager
              isOpen={showImageModal}
              onClose={() => setShowImageModal(false)}
              onSelect={insertImage}
              uploadDir={uploadDir}
              onImageUpload={onImageUpload}
              userOnly={userOnly}
            />
          </>
        )}

        {viewMode === "preview" && (
          <div className="h-full flex items-start justify-center p-4 bg-muted/20 dark:bg-muted/10 overflow-auto">
            {/* Device Frame Container */}
            <div
              className={cn(
                "relative transition-all duration-300 ease-out",
                previewDevice !== "desktop" && "my-4"
              )}
              style={{
                width: previewDevice === "desktop" ? "100%" : deviceSizes[previewDevice].width,
                maxWidth: "100%",
              }}
            >
              {/* Device Frame */}
              {previewDevice !== "desktop" && (
                <div className="mb-2 text-center">
                  <span className="text-xs text-muted-foreground font-medium">
                    {deviceSizes[previewDevice].label} ({deviceSizes[previewDevice].width}px)
                  </span>
                </div>
              )}

              {/* Email Preview with iframe for full HTML rendering */}
              {emailPreview?.enabled ? (
                <iframe
                  srcDoc={emailPreviewContent}
                  className={cn(
                    "w-full border-0 transition-all duration-300",
                    previewDevice !== "desktop" && "rounded-lg shadow-lg",
                  )}
                  style={{
                    minHeight: previewDevice !== "desktop" ? "600px" : "700px",
                    height: "100%",
                  }}
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              ) : (
                /* Content Preview */
                <div
                  className={cn(
                    "wysiwyg-preview legal-content transition-all duration-300",
                    "bg-background dark:bg-background",
                    "text-foreground dark:text-foreground",
                    previewDevice !== "desktop" && "border border-border rounded-lg shadow-lg",
                    previewDevice === "desktop" && "h-full",
                    contentClassName
                  )}
                  style={{
                    padding: previewDevice === "mobile" ? "12px" : previewDevice === "tablet" ? "16px" : "16px",
                    minHeight: previewDevice !== "desktop" ? "400px" : undefined,
                  }}
                  dangerouslySetInnerHTML={{ __html: value }}
                />
              )}

              {/* Device Indicator Line for non-desktop */}
              {previewDevice !== "desktop" && (
                <div className="mt-3 flex justify-center">
                  <div className="w-16 h-1 rounded-full bg-muted-foreground/20" />
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === "html" && (
          <textarea
            className={cn(
              "w-full h-full p-4 font-mono text-sm resize-none outline-none transition-colors",
              "bg-muted/30 dark:bg-muted/20",
              "text-foreground dark:text-foreground",
              "placeholder:text-muted-foreground"
            )}
            value={htmlContent}
            onChange={(e) => {
              onChange(e.target.value);
              if (editorRef.current) {
                editorRef.current.innerHTML = e.target.value;
              }
            }}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* Word Count - Footer */}
      {showWordCount && (
        <div className={cn(
          "shrink-0 flex items-center justify-end px-3 py-1.5 text-xs transition-colors z-10",
          "bg-muted/50 dark:bg-muted/30",
          "text-muted-foreground dark:text-muted-foreground",
          bordered && variant !== "borderless" && "border-t border-border"
        )}>
          <span>{wordCount.words} words</span>
          <span className="mx-2 opacity-50">|</span>
          <span>{wordCount.chars} characters</span>
        </div>
      )}
    </div>
  );
});

export default WysiwygEditor;
