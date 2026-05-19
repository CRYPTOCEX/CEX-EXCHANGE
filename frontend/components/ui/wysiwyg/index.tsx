"use client";

// Main editor export
export { WysiwygEditor, default } from "./wysiwyg-editor";

// Component exports
export { MainToolbar } from "./main-toolbar";
export { FloatingToolbar } from "./floating-toolbar";
export { SlashCommandMenu } from "./slash-commands";
export { LinkPopover } from "./link-popover";
export { MediaManager } from "./media-manager";

// Type exports
export type {
  WysiwygEditorProps,
  FormatState,
  SlashCommand,
  EditorHistoryState,
  BlockType,
  EditorVariant,
  EditorRadius,
} from "./types";
